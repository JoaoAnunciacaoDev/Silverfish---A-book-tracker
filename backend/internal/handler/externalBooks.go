package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
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

// Estruturas do Google Books API
type googleBooksResponse struct {
	TotalItems int `json:"totalItems"`
	Items      []struct {
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
	} `json:"items"`
}

func fetchGoogleBooks(ctx context.Context, query string, startIndex, limit int, apiKey string) (*googleBooksResponse, error) {
	apiURL := fmt.Sprintf(
		"https://www.googleapis.com/books/v1/volumes?q=%s&startIndex=%d&maxResults=%d",
		url.QueryEscape(query),
		startIndex,
		limit,
	)
	if apiKey != "" {
		apiURL += fmt.Sprintf("&key=%s", url.QueryEscape(apiKey))
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "SilverfishBookTracker/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google books retornou status %d", resp.StatusCode)
	}

	var gResp googleBooksResponse
	if err := json.NewDecoder(resp.Body).Decode(&gResp); err != nil {
		return nil, err
	}

	return &gResp, nil
}

func searchGoogleBooks(ctx context.Context, q string, page, limit int, apiKey string) ([]ExternalBookItem, int, error) {
	startIndex := (page - 1) * limit

	var gResp *googleBooksResponse
	var err error

	// Se a consulta não contém operadores específicos, tenta primeiro buscar no título (intitle:)
	// Isso evita que termos comuns (como "a", "em", "jogo") caiam no OCR de texto completo de milhões de livros.
	if !strings.Contains(q, ":") {
		gResp, err = fetchGoogleBooks(ctx, "intitle:"+q, startIndex, limit, apiKey)
		if err != nil || gResp == nil || len(gResp.Items) == 0 {
			// Fallback para busca aberta geral
			gResp, err = fetchGoogleBooks(ctx, q, startIndex, limit, apiKey)
		}
	} else {
		gResp, err = fetchGoogleBooks(ctx, q, startIndex, limit, apiKey)
	}

	if err != nil {
		return nil, 0, err
	}
	if gResp == nil || len(gResp.Items) == 0 {
		return nil, 0, nil
	}

	results := make([]ExternalBookItem, 0, len(gResp.Items))
	for _, item := range gResp.Items {
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

		results = append(results, ExternalBookItem{
			OpenLibraryKey: "google:" + item.ID,
			Title:          info.Title,
			Author:         author,
			Description:    info.Description,
			CoverURL:       coverURL,
			PageCount:      pages,
			Year:           year,
			Genre:          genre,
			ISBN:           isbn,
		})
	}

	return results, gResp.TotalItems, nil
}

func searchOpenLibrary(ctx context.Context, q string, page, limit int) ([]ExternalBookItem, int, error) {
	apiURL := fmt.Sprintf("https://openlibrary.org/search.json?q=%s&page=%d&limit=%d", url.QueryEscape(q), page, limit)

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

	return results, olResp.NumFound, nil
}

// enrichWithCatalogStatus verifica se os livros encontrados já foram salvos no acervo local (por chave ou ISBN)
func enrichWithCatalogStatus(items []ExternalBookItem) error {
	if len(items) == 0 {
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

// SearchExternalBooksHandler busca no Google Books (acervo brasileiro) com fallback para Open Library
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

	var results []ExternalBookItem
	var totalItems int
	var err error

	googleKey := ""
	if cfg != nil {
		googleKey = cfg.GoogleBooksAPIKey
	}

	// 1. Tenta buscar no Google Books (prioridade para catálogo nacional)
	results, totalItems, err = searchGoogleBooks(c.Request.Context(), q, page, limit, googleKey)

	// 2. Se o Google Books falhar ou não retornar nenhum resultado, faz fallback para a Open Library
	if err != nil || len(results) == 0 {
		olResults, olTotal, olErr := searchOpenLibrary(c.Request.Context(), q, page, limit)
		if olErr == nil && len(olResults) > 0 {
			results = olResults
			totalItems = olTotal
			err = nil
		}
	}

	if err != nil && len(results) == 0 {
		sendError(c, http.StatusBadGateway, "não foi possível consultar os provedores de livros no momento")
		return
	}

	// 3. Marca os livros que já estão salvos no acervo local
	if err := enrichWithCatalogStatus(results); err != nil {
		sendError(c, http.StatusInternalServerError, "falha ao verificar acervo local")
		return
	}

	totalPages := 0
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
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
