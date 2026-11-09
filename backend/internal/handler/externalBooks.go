package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ImportBookRequest struct {
	Title          string `json:"title"`
	Author         string `json:"author"`
	Description    string `json:"description"`
	CoverURL       string `json:"cover_url"`
	PageCount      int    `json:"page_count"`
	Genre          string `json:"genre"`
	ISBN           string `json:"isbn"`
	OpenLibraryKey string `json:"open_library_key"`
}

func (r *ImportBookRequest) Validate() error {
	r.Title = strings.TrimSpace(r.Title)
	r.Author = strings.TrimSpace(r.Author)
	r.OpenLibraryKey = strings.TrimSpace(r.OpenLibraryKey)

	if r.Title == "" {
		return errors.New("título é obrigatório")
	}
	if r.OpenLibraryKey == "" {
		return errors.New("chave do livro é obrigatória para importação")
	}
	if r.PageCount <= 0 {
		r.PageCount = 100 // fallback caso a API não informe páginas
	}
	return nil
}

type ExternalBookItem struct {
	OpenLibraryKey string `json:"open_library_key"` // Identificador externo único (Google Books ou Open Library)
	Title          string `json:"title"`
	Author         string `json:"author"`
	Description    string `json:"description"`
	CoverURL       string `json:"cover_url"`
	PageCount      int    `json:"page_count"`
	Year           int    `json:"year"`
	Genre          string `json:"genre"`
	ISBN           string `json:"isbn"`
	InCatalog      bool   `json:"in_catalog"`
	LocalBookID    string `json:"local_book_id,omitempty"`
}

// Estruturas da Open Library
type openLibrarySearchResponse struct {
	NumFound int `json:"numFound"`
	Docs     []struct {
		Key              string   `json:"key"`
		Title            string   `json:"title"`
		AuthorName       []string `json:"author_name"`
		CoverI           int      `json:"cover_i"`
		NumberOfPages    int      `json:"number_of_pages_median"`
		FirstPublishYear int      `json:"first_publish_year"`
		ISBN             []string `json:"isbn"`
	} `json:"docs"`
}

type openLibraryEditionsResponse struct {
	Entries []struct {
		Key           string   `json:"key"`
		Title         string   `json:"title"`
		Subtitle      string   `json:"subtitle"`
		NumberOfPages int      `json:"number_of_pages"`
		PublishDate   string   `json:"publish_date"`
		Covers        []int    `json:"covers"`
		ISBN13        []string `json:"isbn_13"`
		ISBN10        []string `json:"isbn_10"`
	} `json:"entries"`
}

// Estruturas do Google Books API
type googleBookVolume struct {
	ID         string `json:"id"`
	VolumeInfo struct {
		Title               string   `json:"title"`
		Authors             []string `json:"authors"`
		Description         string   `json:"description"`
		PublishedDate       string   `json:"publishedDate"`
		PageCount           int      `json:"pageCount"`
		Categories          []string `json:"categories"`
		IndustryIdentifiers []struct {
			Type       string `json:"type"`
			Identifier string `json:"identifier"`
		} `json:"industryIdentifiers"`
		ImageLinks struct {
			SmallThumbnail string `json:"smallThumbnail"`
			Thumbnail      string `json:"thumbnail"`
		} `json:"imageLinks"`
	} `json:"volumeInfo"`
}

type googleBooksResponse struct {
	TotalItems int                `json:"totalItems"`
	Items      []googleBookVolume `json:"items"`
}

// cleanISBN verifica se a string é um ISBN de 10 ou 13 dígitos
func cleanISBN(s string) (string, bool) {
	cleaned := strings.ReplaceAll(strings.ReplaceAll(s, "-", ""), " ", "")
	if len(cleaned) == 10 || len(cleaned) == 13 {
		isNumeric := true
		for i, c := range cleaned {
			if i == len(cleaned)-1 && (c == 'X' || c == 'x') {
				continue
			}
			if c < '0' || c > '9' {
				isNumeric = false
				break
			}
		}
		if isNumeric {
			return cleaned, true
		}
	}
	return "", false
}

// stripAccents normaliza caracteres acentuados para minúsculas sem acentos
func stripAccents(s string) string {
	replacer := strings.NewReplacer(
		"á", "a", "à", "a", "ã", "a", "â", "a", "ä", "a",
		"é", "e", "è", "e", "ê", "e", "ë", "e",
		"í", "i", "ì", "i", "î", "i", "ï", "i",
		"ó", "o", "ò", "o", "õ", "o", "ô", "o", "ö", "o",
		"ú", "u", "ù", "u", "û", "u", "ü", "u",
		"ç", "c", "ñ", "n",
	)
	return replacer.Replace(strings.ToLower(s))
}

// isRelevantResult verifica se o livro retornado tem relação genuína com a busca do usuário,
// eliminando ruído/lixo de OCR de livros não relacionados (ex: revistas de super-heróis ao buscar Turma da Mônica).
func isRelevantResult(item ExternalBookItem, query string) bool {
	cleanQuery := stripAccents(query)
	cleanTitle := stripAccents(item.Title)
	cleanAuthor := stripAccents(item.Author)
	cleanDesc := stripAccents(item.Description)

	stopwords := map[string]bool{
		"de": true, "da": true, "do": true, "das": true, "dos": true,
		"em": true, "no": true, "na": true, "nos": true, "nas": true,
		"por": true, "para": true, "com": true, "sem": true,
		"um": true, "uma": true, "uns": true, "umas": true,
		"o": true, "a": true, "os": true, "as": true, "e": true,
		"livro": true, "volume": true, "edicao": true,
	}

	rawWords := strings.Fields(cleanQuery)
	var meaningfulWords []string
	for _, w := range rawWords {
		clean := strings.Trim(w, "#º°.,-()\":;'!?")
		if len(clean) >= 3 && !stopwords[clean] {
			meaningfulWords = append(meaningfulWords, clean)
		}
	}

	if len(meaningfulWords) == 0 {
		return true
	}

	matchedCount := 0
	for _, w := range meaningfulWords {
		if strings.Contains(cleanTitle, w) || strings.Contains(cleanAuthor, w) {
			matchedCount++
		}
	}

	// Para buscas com 3 ou mais palavras (ex: "turma da monica jovem 50"),
	// exige que pelo menos 2 palavras significativas estejam no título ou no autor.
	if len(meaningfulWords) >= 3 {
		if matchedCount >= 2 {
			return true
		}
		// Se bater pelo menos 1 palavra no título/autor e a frase inteira constar na descrição
		if matchedCount >= 1 && strings.Contains(cleanDesc, cleanQuery) {
			return true
		}
		return false
	}

	// Para buscas curtas (1 ou 2 palavras), pelo menos 1 deve estar no título ou autor
	return matchedCount >= 1
}

// rankSearchResults reordena os resultados priorizando correspondência de título, autor, edições específicas e volumes
func rankSearchResults(items []ExternalBookItem, query string) []ExternalBookItem {
	if len(items) <= 1 {
		return items
	}

	cleanQuery := strings.TrimSpace(stripAccents(query))
	queryWords := strings.Fields(cleanQuery)

	// Extrai palavras significativas da busca (sem stopwords e com len >= 3)
	stopwords := map[string]bool{
		"de": true, "da": true, "do": true, "das": true, "dos": true,
		"em": true, "no": true, "na": true, "nos": true, "nas": true,
		"por": true, "para": true, "com": true, "sem": true,
		"um": true, "uma": true, "uns": true, "umas": true,
		"o": true, "a": true, "os": true, "as": true, "e": true,
		"livro": true, "volume": true, "edicao": true,
	}

	var meaningfulQueryWords []string
	for _, w := range queryWords {
		clean := strings.Trim(w, "#º°.,-()\":;'!?")
		if len(clean) >= 3 && !stopwords[clean] {
			meaningfulQueryWords = append(meaningfulQueryWords, clean)
		}
	}

	var numbers []string
	for _, w := range queryWords {
		clean := strings.Trim(w, "#º°.,-()")
		if _, err := strconv.Atoi(clean); err == nil && len(clean) > 0 {
			numbers = append(numbers, clean)
		}
	}

	type scoredItem struct {
		item  ExternalBookItem
		score int
		index int
	}

	scored := make([]scoredItem, len(items))
	for i, it := range items {
		score := 0
		cleanTitle := strings.TrimSpace(stripAccents(it.Title))
		cleanDesc := strings.TrimSpace(stripAccents(it.Description))
		cleanAuthor := strings.TrimSpace(stripAccents(it.Author))

		// 1. Prioridade máxima para números de volume / edição pesquisados (ex: turma da monica jovem 50)
		for _, num := range numbers {
			hasNumberInTitle := false
			patterns := []string{
				" " + num + " ", " " + num + ":", " " + num + "-", " " + num + " -",
				"#" + num, "nº " + num, "nº" + num, "vol " + num, "vol. " + num, "vol." + num,
				"edição " + num, "ed. " + num, "edicao " + num, "ed " + num,
				"(" + num + ")", "[" + num + "]",
			}
			for _, pat := range patterns {
				if strings.Contains(cleanTitle, pat) {
					hasNumberInTitle = true
					break
				}
			}
			if !hasNumberInTitle {
				if strings.HasPrefix(cleanTitle, num+" ") || strings.HasSuffix(cleanTitle, " "+num) || cleanTitle == num {
					hasNumberInTitle = true
				}
			}

			if hasNumberInTitle {
				score += 200 // Prioridade máxima para a edição numérica desejada
			} else if strings.Contains(cleanTitle, num) {
				score += 80
			} else if strings.Contains(cleanDesc, num) {
				score += 20
			}
		}

		// 2. Correspondência exata ou em frase do título
		if cleanTitle == cleanQuery {
			score += 200
		} else if strings.Contains(cleanQuery, cleanTitle) && len(cleanTitle) >= 4 {
			// Ex: Título "A realidade em jogo" contido na busca "realidade em jogo da jane mcgonigal"
			score += 120
		} else if strings.Contains(cleanTitle, cleanQuery) {
			score += 90
		}

		// 3. Pontuação por presença das palavras significativas da busca no título
		for _, w := range meaningfulQueryWords {
			if strings.Contains(cleanTitle, w) {
				score += 25
			}
		}

		// 4. Match de autor (verifica se a query contém o autor ou se palavras do autor constam na busca)
		if cleanAuthor != "" && cleanAuthor != "autor desconhecido" {
			if strings.Contains(cleanQuery, cleanAuthor) {
				score += 80 // O usuário digitou o nome completo do autor na query
			} else {
				authorWords := strings.Fields(cleanAuthor)
				for _, aw := range authorWords {
					cleanAW := strings.Trim(aw, "#º°.,-()\":;'!?")
					if len(cleanAW) >= 3 && !stopwords[cleanAW] && strings.Contains(cleanQuery, cleanAW) {
						score += 30 // Palavra do nome do autor (ex: "jane", "mcgonigal") presente na busca
					}
				}
			}
		}

		// 5. Capa existente (melhor experiência visual)
		if it.CoverURL != "" {
			score += 10
		}

		// 6. ISBN existente
		if it.ISBN != "" {
			score += 5
		}

		scored[i] = scoredItem{item: it, score: score, index: i}
	}

	// Ordenação estável decrescente por score
	sort.SliceStable(scored, func(i, j int) bool {
		if scored[i].score != scored[j].score {
			return scored[i].score > scored[j].score
		}
		return scored[i].index < scored[j].index
	})

	results := make([]ExternalBookItem, len(items))
	for i, s := range scored {
		results[i] = s.item
	}
	return results
}

func fetchGoogleBooks(ctx context.Context, query string, startIndex, limit int, apiKey string) (*googleBooksResponse, error) {
	if apiKey == "" && cfg != nil && cfg.GoogleBooksAPIKey != "" {
		apiKey = cfg.GoogleBooksAPIKey
	}

	apiURL := fmt.Sprintf(
		"https://www.googleapis.com/books/v1/volumes?q=%s&printType=books&startIndex=%d&maxResults=%d",
		url.QueryEscape(query),
		startIndex,
		limit,
	)
	if apiKey != "" {
		apiURL += fmt.Sprintf("&key=%s", url.QueryEscape(apiKey))
	}

	client := &http.Client{Timeout: 10 * time.Second}

	var lastErr error
	maxAttempts := 2

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("User-Agent", "SilverfishBookTracker/1.0")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			if attempt < maxAttempts && ctx.Err() == nil {
				time.Sleep(300 * time.Millisecond)
				continue
			}
			return nil, err
		}

		if resp.StatusCode == http.StatusOK {
			var gResp googleBooksResponse
			if err := json.NewDecoder(resp.Body).Decode(&gResp); err != nil {
				resp.Body.Close()
				return nil, err
			}
			resp.Body.Close()
			return &gResp, nil
		}

		if resp.StatusCode == http.StatusTooManyRequests {
			resp.Body.Close()
			log.Println("[GOOGLE BOOKS][ERRO 429] Too Many Requests: Limite excedido na API do Google Books. Verifique se GOOGLE_BOOKS_API_KEY está configurada no ambiente.")
			lastErr = errors.New("google books retornou status 429 (Too Many Requests - GOOGLE_BOOKS_API_KEY ausente ou cota esgotada)")
			if attempt < maxAttempts && ctx.Err() == nil {
				time.Sleep(400 * time.Millisecond)
				continue
			}
			return nil, lastErr
		}

		if resp.StatusCode == http.StatusServiceUnavailable && attempt < maxAttempts && ctx.Err() == nil {
			resp.Body.Close()
			time.Sleep(300 * time.Millisecond)
			continue
		}

		status := resp.StatusCode
		resp.Body.Close()
		return nil, fmt.Errorf("google books retornou status %d", status)
	}

	return nil, lastErr
}

func parseGoogleBookItem(item googleBookVolume) ExternalBookItem {
	info := item.VolumeInfo

	author := "Autor Desconhecido"
	if len(info.Authors) > 0 {
		author = strings.Join(info.Authors, ", ")
	}

	// Capa em HTTPS
	coverURL := info.ImageLinks.Thumbnail
	if coverURL == "" {
		coverURL = info.ImageLinks.SmallThumbnail
	}
	if strings.HasPrefix(coverURL, "http://") {
		coverURL = "https://" + coverURL[7:]
	}

	// Extrai ISBN (prioriza ISBN_13)
	isbn := ""
	for _, idf := range info.IndustryIdentifiers {
		if idf.Type == "ISBN_13" {
			isbn = idf.Identifier
			break
		}
		if isbn == "" && idf.Type == "ISBN_10" {
			isbn = idf.Identifier
		}
	}

	// Extrai ano
	year := 0
	if len(info.PublishedDate) >= 4 {
		year, _ = strconv.Atoi(info.PublishedDate[:4])
	}

	genre := ""
	if len(info.Categories) > 0 {
		genre = info.Categories[0]
	}

	pages := info.PageCount
	if pages <= 0 {
		pages = 100
	}

	return ExternalBookItem{
		OpenLibraryKey: "google:" + item.ID,
		Title:          info.Title,
		Author:         author,
		Description:    info.Description,
		CoverURL:       coverURL,
		PageCount:      pages,
		Year:           year,
		Genre:          genre,
		ISBN:           isbn,
	}
}

// prepareSearchTerms limpa pontuações como dois-pontos de subtítulos (ex: "Manual do Game UX: Um guia...")
// que quebram os seletores de campo do Google Books ("UX:"), e extrai o título principal antes do separador.
func prepareSearchTerms(q string) (cleaned string, mainTitle string) {
	trimmed := strings.TrimSpace(q)
	lower := strings.ToLower(trimmed)

	// Se for busca intencional com prefixos reservados, preserva
	if strings.HasPrefix(lower, "isbn:") || strings.HasPrefix(lower, "intitle:") || strings.HasPrefix(lower, "inauthor:") || strings.HasPrefix(lower, "subject:") {
		return trimmed, ""
	}

	if strings.Contains(trimmed, ":") {
		parts := strings.SplitN(trimmed, ":", 2)
		mainTitle = strings.TrimSpace(parts[0])
		cleaned = strings.Join(strings.Fields(strings.ReplaceAll(trimmed, ":", " ")), " ")
		return cleaned, mainTitle
	}

	return trimmed, ""
}

func searchGoogleBooks(ctx context.Context, q string, page, limit int, apiKey string) ([]ExternalBookItem, int, error) {
	startIndex := (page - 1) * limit

	// 1. Se for um ISBN, busca direta
	if isbn, isISBN := cleanISBN(q); isISBN {
		gResp, err := fetchGoogleBooks(ctx, "isbn:"+isbn, startIndex, limit, apiKey)
		if err != nil {
			return nil, 0, err
		}
		if gResp == nil || len(gResp.Items) == 0 {
			return []ExternalBookItem{}, 0, nil
		}
		var results []ExternalBookItem
		for _, it := range gResp.Items {
			results = append(results, parseGoogleBookItem(it))
		}
		return results, gResp.TotalItems, nil
	}

	cleanedQuery, mainTitle := prepareSearchTerms(q)

	seenIDs := make(map[string]bool)
	var candidateItems []ExternalBookItem
	totalEstimate := 0

	// 2. Busca com intitle:
	// Prioriza o mainTitle (caso o usuário tenha inserido título: subtítulo) ou a busca limpa inteira
	intitleCandidates := []string{}
	if mainTitle != "" && len(mainTitle) >= 3 {
		intitleCandidates = append(intitleCandidates, mainTitle)
	}
	if cleanedQuery != "" && cleanedQuery != mainTitle {
		intitleCandidates = append(intitleCandidates, cleanedQuery)
	}

	for _, itQuery := range intitleCandidates {
		intitleQuery := "intitle:" + itQuery
		if titleResp, tErr := fetchGoogleBooks(ctx, intitleQuery, startIndex, limit, apiKey); tErr == nil && titleResp != nil {
			if titleResp.TotalItems > totalEstimate {
				totalEstimate = titleResp.TotalItems
			}
			for _, it := range titleResp.Items {
				if seenIDs[it.ID] {
					continue
				}
				seenIDs[it.ID] = true
				parsed := parseGoogleBookItem(it)
				if isRelevantResult(parsed, q) {
					candidateItems = append(candidateItems, parsed)
				}
			}
		}
	}

	// 3. Busca geral com a query higienizada (sem dois-pontos soltos que quebram o parser do Google Books)
	generalResp, gErr := fetchGoogleBooks(ctx, cleanedQuery, startIndex, limit, apiKey)
	if gErr == nil && generalResp != nil {
		if generalResp.TotalItems > totalEstimate {
			totalEstimate = generalResp.TotalItems
		}
		for _, it := range generalResp.Items {
			if seenIDs[it.ID] {
				continue
			}
			seenIDs[it.ID] = true
			parsed := parseGoogleBookItem(it)
			if isRelevantResult(parsed, q) {
				candidateItems = append(candidateItems, parsed)
			}
		}
	}

	// 4. Fallback sem conectivos/preposições (ex: "realidade em jogo da jane mcgonigal" -> "realidade em jogo jane mcgonigal")
	if len(candidateItems) == 0 {
		targetQuery := cleanedQuery
		if mainTitle != "" {
			targetQuery = mainTitle
		}
		noPreps := strings.ToLower(targetQuery)
		for _, prep := range []string{" da ", " de ", " do ", " das ", " dos ", " em ", " por ", " com "} {
			noPreps = strings.ReplaceAll(noPreps, prep, " ")
		}
		noPreps = strings.Join(strings.Fields(noPreps), " ")
		if noPreps != "" && noPreps != strings.ToLower(targetQuery) {
			if npResp, npErr := fetchGoogleBooks(ctx, noPreps, startIndex, limit, apiKey); npErr == nil && npResp != nil {
				for _, it := range npResp.Items {
					if seenIDs[it.ID] {
						continue
					}
					seenIDs[it.ID] = true
					parsed := parseGoogleBookItem(it)
					if isRelevantResult(parsed, q) {
						candidateItems = append(candidateItems, parsed)
					}
				}
			}
		}
	}

	if gErr != nil && len(candidateItems) == 0 {
		return []ExternalBookItem{}, 0, gErr
	}

	// Reordena os resultados priorizando a melhor correspondência
	rankedResults := rankSearchResults(candidateItems, q)
	if rankedResults == nil {
		rankedResults = []ExternalBookItem{}
	}

	return rankedResults, totalEstimate, nil
}

func searchOpenLibrary(ctx context.Context, q string, page, limit int) ([]ExternalBookItem, int, error) {
	cleanedQuery, _ := prepareSearchTerms(q)
	apiURL := fmt.Sprintf("https://openlibrary.org/search.json?q=%s&page=%d&limit=%d", url.QueryEscape(cleanedQuery), page, limit)

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("User-Agent", "SilverfishBookTracker/1.0 (https://github.com/JoaoAnunciacaoDev/Silverfish)")

	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, 0, errors.New("limite de requisições excedido na Open Library")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("open library retornou status %d", resp.StatusCode)
	}

	var olResp openLibrarySearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&olResp); err != nil {
		return nil, 0, err
	}

	// Fallback sem preposições/conectivos se a Open Library não encontrar nada
	if len(olResp.Docs) == 0 && !strings.Contains(q, ":") {
		cleaned := q
		for _, prep := range []string{" da ", " de ", " do ", " das ", " dos ", " em ", " por ", " com ", " the ", " of "} {
			cleaned = strings.ReplaceAll(cleaned, prep, " ")
		}
		cleaned = strings.Join(strings.Fields(cleaned), " ")
		if cleaned != "" && cleaned != q {
			altURL := fmt.Sprintf("https://openlibrary.org/search.json?q=%s&page=%d&limit=%d", url.QueryEscape(cleaned), page, limit)
			if altReq, altErr := http.NewRequestWithContext(ctx, http.MethodGet, altURL, nil); altErr == nil {
				altReq.Header.Set("User-Agent", "SilverfishBookTracker/1.0 (https://github.com/JoaoAnunciacaoDev/Silverfish)")
				if altResp, altErr2 := client.Do(altReq); altErr2 == nil {
					defer altResp.Body.Close()
					if altResp.StatusCode == http.StatusOK {
						var altOlResp openLibrarySearchResponse
						if json.NewDecoder(altResp.Body).Decode(&altOlResp) == nil && len(altOlResp.Docs) > 0 {
							olResp = altOlResp
						}
					}
				}
			}
		}
	}

	// Extrai números da busca para buscar edições específicas caso o usuário procure um volume (ex: 50)
	var numbers []string
	for _, w := range strings.Fields(q) {
		clean := strings.Trim(w, "#º°.,-()")
		if _, err := strconv.Atoi(clean); err == nil && len(clean) > 0 {
			numbers = append(numbers, clean)
		}
	}

	results := make([]ExternalBookItem, 0, len(olResp.Docs))
	for _, doc := range olResp.Docs {
		author := "Autor Desconhecido"
		if len(doc.AuthorName) > 0 {
			author = doc.AuthorName[0]
		}

		coverURL := ""
		if doc.CoverI > 0 {
			coverURL = fmt.Sprintf("https://covers.openlibrary.org/b/id/%d-M.jpg", doc.CoverI)
		}

		isbn := ""
		if len(doc.ISBN) > 0 {
			isbn = doc.ISBN[0]
		}

		pages := doc.NumberOfPages
		if pages <= 0 {
			pages = 100
		}

		// Se o usuário buscou um número (ex: 50) e o registro é uma Work (/works/...),
		// consulta as edições para trazer o volume/edição exata (ex: Turma da Mônica Jovem - O Casamento do Século - Vol.50)
		matchedSpecificEdition := false
		if len(numbers) > 0 && strings.HasPrefix(doc.Key, "/works/") {
			edURL := fmt.Sprintf("https://openlibrary.org%s/editions.json?limit=25", doc.Key)
			if edReq, edErr := http.NewRequestWithContext(ctx, http.MethodGet, edURL, nil); edErr == nil {
				edReq.Header.Set("User-Agent", "SilverfishBookTracker/1.0 (https://github.com/JoaoAnunciacaoDev/Silverfish)")
				edClient := &http.Client{Timeout: 4 * time.Second}
				if edResp, edDoErr := edClient.Do(edReq); edDoErr == nil {
					defer edResp.Body.Close()
					if edResp.StatusCode == http.StatusOK {
						var edData openLibraryEditionsResponse
						if json.NewDecoder(edResp.Body).Decode(&edData) == nil && len(edData.Entries) > 0 {
							for _, entry := range edData.Entries {
								combinedTitle := entry.Title
								if entry.Subtitle != "" {
									combinedTitle = fmt.Sprintf("%s - %s", entry.Title, entry.Subtitle)
								}
								for _, num := range numbers {
									if strings.Contains(combinedTitle, num) {
										edCover := coverURL
										if len(entry.Covers) > 0 && entry.Covers[0] > 0 {
											edCover = fmt.Sprintf("https://covers.openlibrary.org/b/id/%d-M.jpg", entry.Covers[0])
										}
										edYear := doc.FirstPublishYear
										if len(entry.PublishDate) >= 4 {
											if y, errY := strconv.Atoi(entry.PublishDate[len(entry.PublishDate)-4:]); errY == nil {
												edYear = y
											}
										}
										edISBN := isbn
										if len(entry.ISBN13) > 0 {
											edISBN = entry.ISBN13[0]
										} else if len(entry.ISBN10) > 0 {
											edISBN = entry.ISBN10[0]
										}
										edPages := entry.NumberOfPages
										if edPages <= 0 {
											edPages = pages
										}

										results = append(results, ExternalBookItem{
											OpenLibraryKey: entry.Key,
											Title:          combinedTitle,
											Author:         author,
											CoverURL:       edCover,
											PageCount:      edPages,
											Year:           edYear,
											ISBN:           edISBN,
										})
										matchedSpecificEdition = true
										break
									}
								}
							}
						}
					}
				}
			}
		}

		if !matchedSpecificEdition {
			results = append(results, ExternalBookItem{
				OpenLibraryKey: doc.Key,
				Title:          doc.Title,
				Author:         author,
				CoverURL:       coverURL,
				PageCount:      pages,
				Year:           doc.FirstPublishYear,
				ISBN:           isbn,
			})
		}
	}

	// Reordena também os resultados da Open Library
	rankedResults := rankSearchResults(results, q)

	return rankedResults, olResp.NumFound, nil
}

// enrichWithCatalogStatus verifica se os livros encontrados já foram salvos no acervo local (por chave ou ISBN)
func enrichWithCatalogStatus(items []ExternalBookItem) error {
	if db == nil || len(items) == 0 {
		return nil
	}

	keys := make([]string, 0, len(items))
	isbns := make([]string, 0, len(items))
	for _, it := range items {
		if it.OpenLibraryKey != "" {
			keys = append(keys, it.OpenLibraryKey)
		}
		if it.ISBN != "" {
			isbns = append(isbns, it.ISBN)
		}
	}

	var existingBooks []schemas.Book
	query := db.Model(&schemas.Book{})
	if len(keys) > 0 && len(isbns) > 0 {
		query = query.Where("open_library_key IN ? OR (isbn != '' AND isbn IN ?)", keys, isbns)
	} else if len(keys) > 0 {
		query = query.Where("open_library_key IN ?", keys)
	} else if len(isbns) > 0 {
		query = query.Where("isbn != '' AND isbn IN ?", isbns)
	} else {
		return nil
	}

	if err := query.Find(&existingBooks).Error; err != nil {
		return err
	}

	existingKeyMap := make(map[string]string)
	existingISBNMap := make(map[string]string)
	for _, b := range existingBooks {
		if b.OpenLibraryKey != nil && *b.OpenLibraryKey != "" {
			existingKeyMap[*b.OpenLibraryKey] = b.ID
		}
		if b.ISBN != "" {
			existingISBNMap[b.ISBN] = b.ID
		}
	}

	for i := range items {
		if localID, ok := existingKeyMap[items[i].OpenLibraryKey]; ok {
			items[i].InCatalog = true
			items[i].LocalBookID = localID
		} else if items[i].ISBN != "" {
			if localID, ok := existingISBNMap[items[i].ISBN]; ok {
				items[i].InCatalog = true
				items[i].LocalBookID = localID
			}
		}
	}

	return nil
}

// SearchExternalBooksHandler busca no Google Books, Open Library ou em ambos concorrentemente (híbrido)
func SearchExternalBooksHandler(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		sendError(c, http.StatusBadRequest, "o parâmetro de busca 'q' é obrigatório")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "15"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 40 {
		limit = 15
	}

	providerParam := strings.ToLower(strings.TrimSpace(c.DefaultQuery("provider", "all")))

	googleKey := ""
	if cfg != nil {
		googleKey = cfg.GoogleBooksAPIKey
	}

	if googleKey == "" {
		log.Printf("[BUSCA EXTERNA] AVISO: GOOGLE_BOOKS_API_KEY ausente nas variáveis de ambiente. Consultando Google Books como requisição anônima...")
	} else {
		log.Printf("[BUSCA EXTERNA] GOOGLE_BOOKS_API_KEY ativa.")
	}

	log.Printf("[BUSCA EXTERNA] Iniciando busca por '%s' (página %d, provedor '%s')", q, page, providerParam)

	var (
		candidateResults []ExternalBookItem
		totalItems       int
		providerUsed     string
		fallbackUsed     bool
	)

	switch providerParam {
	case "google", "google_books":
		gbResults, gbTotal, gbErr := searchGoogleBooks(c.Request.Context(), q, page, limit, googleKey)
		if gbErr != nil && len(gbResults) == 0 {
			sendError(c, http.StatusBadGateway, "não foi possível consultar o Google Books no momento")
			return
		}
		candidateResults = gbResults
		providerUsed = "google_books"
		totalItems = gbTotal
		if page == 1 && len(gbResults) < limit {
			totalItems = len(gbResults)
		} else if totalItems < (page-1)*limit+len(gbResults) {
			totalItems = (page-1)*limit + len(gbResults)
		}

	case "openlibrary", "open_library":
		olResults, olTotal, olErr := searchOpenLibrary(c.Request.Context(), q, page, limit)
		if olErr != nil && len(olResults) == 0 {
			sendError(c, http.StatusBadGateway, "não foi possível consultar a Open Library no momento")
			return
		}
		candidateResults = olResults
		providerUsed = "open_library"
		totalItems = olTotal
		if page == 1 && len(olResults) < limit {
			totalItems = len(olResults)
		} else if totalItems < (page-1)*limit+len(olResults) {
			totalItems = (page-1)*limit + len(olResults)
		}

	default: // "all" ou híbrido (Google Books + Open Library simultâneos)
		providerUsed = "hybrid"
		var (
			gbResults []ExternalBookItem
			gbTotal   int
			gbErr     error
			olResults []ExternalBookItem
			olTotal   int
			olErr     error
			wg        sync.WaitGroup
		)

		wg.Add(2)
		go func() {
			defer wg.Done()
			gbResults, gbTotal, gbErr = searchGoogleBooks(c.Request.Context(), q, page, limit, googleKey)
		}()
		go func() {
			defer wg.Done()
			olResults, olTotal, olErr = searchOpenLibrary(c.Request.Context(), q, page, limit)
		}()
		wg.Wait()

		if gbErr != nil {
			log.Printf("[GOOGLE BOOKS] Erro na consulta híbrida: %v", gbErr)
		}
		if olErr != nil {
			log.Printf("[OPEN LIBRARY] Erro na consulta híbrida: %v", olErr)
		}

		if (gbErr != nil && olErr != nil) && len(gbResults) == 0 && len(olResults) == 0 {
			sendError(c, http.StatusBadGateway, "não foi possível consultar os provedores de livros no momento")
			return
		}

		// Junta os resultados evitando duplicatas estritas de ISBN ou título exato + autor exato
		seenMap := make(map[string]bool)
		for _, it := range gbResults {
			key := fmt.Sprintf("%s|%s", stripAccents(it.Title), stripAccents(it.Author))
			if it.ISBN != "" {
				key = it.ISBN
			}
			seenMap[key] = true
			candidateResults = append(candidateResults, it)
		}

		for _, it := range olResults {
			key := fmt.Sprintf("%s|%s", stripAccents(it.Title), stripAccents(it.Author))
			if it.ISBN != "" {
				key = it.ISBN
			}
			if seenMap[key] {
				continue
			}
			seenMap[key] = true
			candidateResults = append(candidateResults, it)
		}

		estimatedTotal := gbTotal
		if olTotal > estimatedTotal {
			estimatedTotal = olTotal
		}

		// Cálculo estável de paginação
		if page == 1 && len(candidateResults) < limit {
			totalItems = len(candidateResults)
		} else {
			totalItems = estimatedTotal
			minItems := (page-1)*limit + len(candidateResults)
			if totalItems < minItems {
				totalItems = minItems
			}
		}

		if gbErr != nil && len(olResults) > 0 {
			providerUsed = "open_library"
			fallbackUsed = true
		} else if len(olResults) > 0 && len(gbResults) == 0 {
			providerUsed = "open_library"
		} else if len(gbResults) > 0 && len(olResults) == 0 {
			providerUsed = "google_books"
		}
	}

	// Reordena os resultados estritamente relevantes pela melhor correspondência da query e edições numéricas
	results := rankSearchResults(candidateResults, q)

	// 3. Se for a primeira página, inclui obras cadastradas localmente no sistema que correspondam à busca
	if page == 1 && db != nil {
		var localBooks []schemas.Book
		pattern := "%" + strings.ToLower(q) + "%"
		if errDb := db.Where("LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR isbn = ?", pattern, pattern, q).
			Limit(5).
			Find(&localBooks).Error; errDb == nil && len(localBooks) > 0 {

			for _, b := range localBooks {
				key := "local:" + b.ID
				if b.OpenLibraryKey != nil && *b.OpenLibraryKey != "" {
					key = *b.OpenLibraryKey
				}

				// Verifica se a obra já não consta na lista externa para evitar duplicatas
				alreadyInResults := false
				for idx, r := range results {
					if (r.LocalBookID != "" && r.LocalBookID == b.ID) ||
						(r.OpenLibraryKey != "" && r.OpenLibraryKey == key) ||
						(b.ISBN != "" && r.ISBN == b.ISBN) ||
						(strings.EqualFold(r.Title, b.Title) && strings.EqualFold(r.Author, b.Author)) {
						results[idx].InCatalog = true
						results[idx].LocalBookID = b.ID
						alreadyInResults = true
						break
					}
				}

				if !alreadyInResults {
					localItem := ExternalBookItem{
						OpenLibraryKey: key,
						Title:          b.Title,
						Author:         b.Author,
						Description:    b.Description,
						CoverURL:       b.CoverURL,
						PageCount:      b.PageCount,
						Genre:          b.Genre,
						ISBN:           b.ISBN,
						InCatalog:      true,
						LocalBookID:    b.ID,
					}
					// Insere no início com destaque
					results = append([]ExternalBookItem{localItem}, results...)
					totalItems++
				}
			}
		}
	}

	// 4. Marca os livros que já estão salvos no acervo local
	if err := enrichWithCatalogStatus(results); err != nil {
		sendError(c, http.StatusInternalServerError, "falha ao verificar acervo local")
		return
	}

	totalPages := 0
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
	}

	if results == nil {
		results = []ExternalBookItem{}
	}

	c.JSON(http.StatusOK, gin.H{
		"results":       results,
		"provider":      providerUsed,
		"fallback_used": fallbackUsed,
		"pagination": PaginationMeta{
			Page:       page,
			Limit:      limit,
			TotalItems: int64(totalItems),
			TotalPages: totalPages,
			HasNext:    page < totalPages,
			HasPrev:    page > 1,
		},
	})
}

// ImportBookHandler salva uma obra externa (Google Books ou Open Library) no acervo local
func ImportBookHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	request := ImportBookRequest{}
	if err := c.BindJSON(&request); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := request.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Idempotência: Se o livro já foi importado por chave externa ou por ISBN, retorna o existente sem duplicar!
	var existing schemas.Book
	query := db.Where("open_library_key = ?", request.OpenLibraryKey)
	if request.ISBN != "" {
		query = db.Where("open_library_key = ? OR (isbn != '' AND isbn = ?)", request.OpenLibraryKey, request.ISBN)
	}

	if err := query.First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "Livro já constava no catálogo",
			"book":    existing,
		})
		return
	}

	openLibKey := &request.OpenLibraryKey

	book := schemas.Book{
		ID:             uuid.NewString(),
		Title:          request.Title,
		Author:         request.Author,
		Description:    request.Description,
		CoverURL:       request.CoverURL,
		PageCount:      request.PageCount,
		Genre:          request.Genre,
		ISBN:           request.ISBN,
		OpenLibraryKey: openLibKey,
		CreatedBy:      &user.ID,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := db.Create(&book).Error; err != nil {
		errStr := strings.ToLower(err.Error())
		if strings.Contains(errStr, "unique") || strings.Contains(errStr, "23505") {
			var raced schemas.Book
			if errFind := query.First(&raced).Error; errFind == nil {
				c.JSON(http.StatusOK, gin.H{
					"message": "Livro já constava no catálogo",
					"book":    raced,
				})
				return
			}
		}
		sendError(c, http.StatusInternalServerError, "erro ao salvar livro importado")
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Livro adicionado ao acervo com sucesso",
		"book":    book,
	})
}
