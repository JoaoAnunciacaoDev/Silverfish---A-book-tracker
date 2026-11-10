package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateBookRequest struct {
	Title          string `json:"title"`
	Author         string `json:"author"`
	Description    string `json:"description"`
	CoverURL       string `json:"cover_url"`
	PageCount      int    `json:"page_count"`
	Genre          string `json:"genre"`
	ISBN           string `json:"isbn"`
	OpenLibraryKey string `json:"open_library_key"`
	AddToShelf     *bool  `json:"add_to_shelf"`
	ShelfStatus    string `json:"shelf_status"`
}

func (r *CreateBookRequest) Validate() error {
	r.Title = strings.TrimSpace(r.Title)
	r.Author = strings.TrimSpace(r.Author)
	r.Description = strings.TrimSpace(r.Description)
	r.CoverURL = strings.TrimSpace(r.CoverURL)
	r.Genre = strings.TrimSpace(r.Genre)
	r.ISBN = strings.TrimSpace(r.ISBN)
	r.OpenLibraryKey = strings.TrimSpace(r.OpenLibraryKey)

	if r.Title == "" {
		return errors.New("o título do livro é obrigatório")
	}
	if len([]rune(r.Title)) > 500 {
		return errors.New("o título não pode ultrapassar 500 caracteres")
	}
	if r.Author == "" {
		return errors.New("o autor do livro é obrigatório")
	}
	if len([]rune(r.Author)) > 300 {
		return errors.New("o autor não pode ultrapassar 300 caracteres")
	}
	if r.PageCount <= 0 {
		return errors.New("o livro deve ter pelo menos 1 página")
	}
	if r.PageCount > 50000 {
		return errors.New("o livro não pode exceder 50.000 páginas")
	}

	return nil
}

func CreateBookHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	request := CreateBookRequest{}
	if err := c.BindJSON(&request); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := request.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Chave externa opcional: se vazia, persiste como NULL no banco para não colidir no UNIQUE index
	var openLibKey *string
	if request.OpenLibraryKey != "" {
		openLibKey = &request.OpenLibraryKey
	}

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
			sendError(c, http.StatusConflict, "este livro já está cadastrado no catálogo")
			return
		}
		sendError(c, http.StatusInternalServerError, "erro ao salvar livro no catálogo")
		return
	}

	// Por padrão, ao cadastrar um livro, adiciona-o automaticamente à estante do usuário
	shouldAddToShelf := request.AddToShelf == nil || *request.AddToShelf
	if shouldAddToShelf {
		status := schemas.StatusWantToRead
		if request.ShelfStatus != "" && schemas.IsValidUserBookStatus(request.ShelfStatus) && request.ShelfStatus != schemas.StatusInCollection {
			status = request.ShelfStatus
		}
		userBook := schemas.UserBook{
			ID:           uuid.NewString(),
			UserID:       user.ID,
			BookID:       book.ID,
			Status:       status,
			Favorite:     false,
			InCollection: true,
			CurrentPage:  0,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
		_ = db.Create(&userBook).Error
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Livro cadastrado e adicionado à sua estante com sucesso",
		"book":    book,
	})
}
