package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
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
		return errors.New("open_library_key é obrigatório para importação")
	}
	if r.PageCount <= 0 {
		r.PageCount = 100 // fallback caso a Open Library não informe páginas
	}
	return nil
}

type openLibrarySearchResponse struct {
	Docs []struct {
		Key              string   `json:"key"`
		Title            string   `json:"title"`
		AuthorName       []string `json:"author_name"`
		CoverI           int      `json:"cover_i"`
		NumberOfPages    int      `json:"number_of_pages_median"`
		FirstPublishYear int      `json:"first_publish_year"`
		ISBN             []string `json:"isbn"`
	} `json:"docs"`
}

type ExternalBookItem struct {
	OpenLibraryKey string `json:"open_library_key"`
	Title          string `json:"title"`
	Author         string `json:"author"`
	CoverURL       string `json:"cover_url"`
	PageCount      int    `json:"page_count"`
	Year           int    `json:"year"`
	ISBN           string `json:"isbn"`
	InCatalog      bool   `json:"in_catalog"`
	LocalBookID    string `json:"local_book_id,omitempty"`
}

// SearchExternalBooksHandler busca obras na Open Library de forma segura e cruza com o catálogo local
func SearchExternalBooksHandler(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		sendError(c, http.StatusBadRequest, "o parâmetro de busca 'q' é obrigatório")
		return
	}

	apiURL := fmt.Sprintf("https://openlibrary.org/search.json?q=%s&limit=15", url.QueryEscape(q))

	// [P1] Cliente HTTP com timeout de 10s associado ao contexto da requisição
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, apiURL, nil)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao preparar requisição externa")
		return
	}
	req.Header.Set("User-Agent", "SilverfishBookTracker/1.0 (https://github.com/JoaoAnunciacaoDev/Silverfish)")

	resp, err := client.Do(req)
	if err != nil {
		sendError(c, http.StatusGatewayTimeout, "tempo limite esgotado ao consultar a Open Library")
		return
	}
	defer resp.Body.Close()

	// [P1] Tratamento de respostas não-200 da Open Library
	if resp.StatusCode == http.StatusTooManyRequests {
		sendError(c, http.StatusTooManyRequests, "limite de requisições excedido na Open Library. Tente novamente em instantes.")
		return
	}
	if resp.StatusCode != http.StatusOK {
		sendError(c, http.StatusBadGateway, fmt.Sprintf("a Open Library respondeu com erro (código %d)", resp.StatusCode))
		return
	}

	var olResp openLibrarySearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&olResp); err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao ler resposta da Open Library")
		return
	}

	// 1. Coleta todas as chaves retornadas pela Open Library
	keys := make([]string, 0, len(olResp.Docs))
	for _, doc := range olResp.Docs {
		if doc.Key != "" {
			keys = append(keys, doc.Key)
		}
	}

	// [P2] Consulta nosso banco local e NÃO ignora erros!
	existingMap := make(map[string]string)
	if len(keys) > 0 {
		var existingBooks []schemas.Book
		if err := db.Where("open_library_key IN ?", keys).Find(&existingBooks).Error; err != nil {
			sendError(c, http.StatusInternalServerError, "falha ao verificar duplicidade no catálogo local")
			return
		}
		for _, b := range existingBooks {
			if b.OpenLibraryKey != nil {
				existingMap[*b.OpenLibraryKey] = b.ID
			}
		}
	}

	// 3. Monta os resultados informando se o livro já está no catálogo
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
			pages = 100 // estimativa padrão caso a edição não tenha número de páginas
		}

		localID, inCatalog := existingMap[doc.Key]

		results = append(results, ExternalBookItem{
			OpenLibraryKey: doc.Key,
			Title:          doc.Title,
			Author:         author,
			CoverURL:       coverURL,
			PageCount:      pages,
			Year:           doc.FirstPublishYear,
			ISBN:           isbn,
			InCatalog:      inCatalog,
			LocalBookID:    localID,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"count":   len(results),
	})
}

// ImportBookHandler importa uma obra da Open Library para o catálogo local
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

	// Idempotência: Se o livro já foi importado antes por qualquer usuário, retorna o existente sem duplicar!
	var existing schemas.Book
	if err := db.Where("open_library_key = ?", request.OpenLibraryKey).First(&existing).Error; err == nil {
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
			// Caso de corrida: outro usuário importou no mesmo instante
			var raced schemas.Book
			if errFind := db.Where("open_library_key = ?", request.OpenLibraryKey).First(&raced).Error; errFind == nil {
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
		"message": "Livro importado com sucesso para o catálogo",
		"book":    book,
	})
}
