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

type AddToLibraryRequest struct {
	BookID      string `json:"book_id"`
	Status      string `json:"status"`
	CurrentPage int    `json:"current_page"`
	Favorite    bool   `json:"favorite"`
}

func (r *AddToLibraryRequest) Validate() error {
	r.BookID = strings.TrimSpace(r.BookID)
	r.Status = strings.TrimSpace(r.Status)

	if r.BookID == "" {
		return errors.New("o campo book_id é obrigatório")
	}

	if r.Status == "" {
		r.Status = schemas.StatusWantToRead
	}

	if !schemas.IsValidUserBookStatus(r.Status) {
		return errors.New("status de leitura inválido")
	}

	if r.CurrentPage < 0 {
		return errors.New("a página atual não pode ser negativa")
	}

	return nil
}

func AddToLibraryHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	request := AddToLibraryRequest{}
	if err := c.BindJSON(&request); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := request.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 1. Verifica se o livro existe no acervo
	var book schemas.Book
	if err := db.First(&book, "id = ?", request.BookID).Error; err != nil {
		sendError(c, http.StatusNotFound, "livro não encontrado no acervo")
		return
	}

	// 2. Valida limite de páginas
	if book.PageCount > 0 && request.CurrentPage > book.PageCount {
		request.CurrentPage = book.PageCount
	}

	// 3. Verifica se o livro já está na estante do usuário (idempotência)
	var existing schemas.UserBook
	if err := db.Where("user_id = ? AND book_id = ?", user.ID, request.BookID).First(&existing).Error; err == nil {
		sendError(c, http.StatusConflict, "este livro já está na sua estante")
		return
	}

	now := time.Now()
	var startedAt *time.Time
	var finishedAt *time.Time

	if request.Status == schemas.StatusReading {
		startedAt = &now
	} else if request.Status == schemas.StatusRead {
		startedAt = &now
		finishedAt = &now
		if book.PageCount > 0 {
			request.CurrentPage = book.PageCount
		}
	}

	userBook := schemas.UserBook{
		ID:          uuid.NewString(),
		UserID:      user.ID,
		BookID:      book.ID,
		Status:      request.Status,
		Favorite:    request.Favorite,
		CurrentPage: request.CurrentPage,
		StartedAt:   startedAt,
		FinishedAt:  finishedAt,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := db.Create(&userBook).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao adicionar livro à estante")
		return
	}

	// Preenche o livro no retorno
	userBook.Book = book

	c.JSON(http.StatusCreated, gin.H{
		"message": "Livro adicionado à estante com sucesso",
		"item":    userBook,
	})
}
