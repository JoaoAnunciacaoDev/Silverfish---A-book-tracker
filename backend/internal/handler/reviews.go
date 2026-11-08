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

type CreateReviewRequest struct {
	Rating  *int   `json:"rating"`
	Comment string `json:"comment"`
}

func (r *CreateReviewRequest) Validate() error {
	if r.Rating == nil {
		return errors.New("a nota é obrigatória (de 0 a 10)")
	}
	if *r.Rating < 0 || *r.Rating > 10 {
		return errors.New("a nota deve estar entre 0 e 10")
	}

	r.Comment = strings.TrimSpace(r.Comment)
	if len([]rune(r.Comment)) > 1000 {
		return errors.New("o comentário não pode ultrapassar 1000 caracteres")
	}

	return nil
}

type UpdateReviewRequest struct {
	Rating  *int    `json:"rating"`
	Comment *string `json:"comment"`
}

func (r *UpdateReviewRequest) Validate() error {
	if r.Rating != nil && (*r.Rating < 0 || *r.Rating > 10) {
		return errors.New("a nota deve estar entre 0 e 10")
	}

	if r.Comment != nil {
		*r.Comment = strings.TrimSpace(*r.Comment)
		if len([]rune(*r.Comment)) > 1000 {
			return errors.New("o comentário não pode ultrapassar 1000 caracteres")
		}
	}

	return nil
}

// CreateBookReviewHandler cria uma nova avaliação para um livro lido
func CreateBookReviewHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	bookID := c.Param("id")

	var req CreateReviewRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := req.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// 1. Verifica se o livro existe
	var book schemas.Book
	if err := db.First(&book, "id = ?", bookID).Error; err != nil {
		sendError(c, http.StatusNotFound, "livro não encontrado")
		return
	}

	// 2. Verifica se o usuário tem o livro na estante com status "read"
	var userBook schemas.UserBook
	if err := db.Where("user_id = ? AND book_id = ? AND status = ?", user.ID, bookID, schemas.StatusRead).First(&userBook).Error; err != nil {
		sendError(c, http.StatusBadRequest, "você só pode avaliar livros marcados como 'Lidos' na sua estante")
		return
	}

	now := time.Now()
	review := schemas.BookReview{
		ID:        uuid.NewString(),
		UserID:    user.ID,
		BookID:    bookID,
		Rating:    *req.Rating,
		Comment:   req.Comment,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := db.Create(&review).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao registrar avaliação")
		return
	}

	review.User = user
	review.Book = &book

	c.JSON(http.StatusCreated, gin.H{
		"message": "Avaliação registrada com sucesso",
		"review":  review,
	})
}

// ListBookReviewsHandler lista avaliações de um livro específico
func ListBookReviewsHandler(c *gin.Context) {
	bookID := c.Param("id")

	var reviews []schemas.BookReview
	if err := db.Preload("User").Where("book_id = ?", bookID).Order("created_at DESC").Find(&reviews).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao consultar avaliações")
		return
	}

	// Calcula média
	var avgRating float64
	var count int64
	db.Model(&schemas.BookReview{}).Where("book_id = ?", bookID).Count(&count)
	if count > 0 {
		var sum int64
		db.Model(&schemas.BookReview{}).Where("book_id = ?", bookID).Select("COALESCE(SUM(rating), 0)").Scan(&sum)
		avgRating = float64(sum) / float64(count)
	}

	c.JSON(http.StatusOK, gin.H{
		"reviews":     reviews,
		"count":       count,
		"average":     avgRating,
	})
}

// ListMyReviewsHandler lista todas as avaliações feitas pelo usuário autenticado
func ListMyReviewsHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	var reviews []schemas.BookReview
	if err := db.Preload("Book").Where("user_id = ?", user.ID).Order("created_at DESC").Find(&reviews).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao consultar suas avaliações")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reviews": reviews,
		"count":   len(reviews),
	})
}

// UpdateReviewHandler atualiza nota ou comentário de uma avaliação do próprio usuário
func UpdateReviewHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	reviewID := c.Param("id")

	var req UpdateReviewRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := req.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	var review schemas.BookReview
	if err := db.Where("id = ? AND user_id = ?", reviewID, user.ID).First(&review).Error; err != nil {
		sendError(c, http.StatusNotFound, "avaliação não encontrada")
		return
	}

	if req.Rating != nil {
		review.Rating = *req.Rating
	}
	if req.Comment != nil {
		review.Comment = *req.Comment
	}
	review.UpdatedAt = time.Now()

	if err := db.Save(&review).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao salvar avaliação")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Avaliação atualizada com sucesso",
		"review":  review,
	})
}

// DeleteReviewHandler exclui uma avaliação existente
func DeleteReviewHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	reviewID := c.Param("id")

	var review schemas.BookReview
	if err := db.Where("id = ? AND user_id = ?", reviewID, user.ID).First(&review).Error; err != nil {
		sendError(c, http.StatusNotFound, "avaliação não encontrada")
		return
	}

	if err := db.Delete(&review).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao excluir avaliação")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Avaliação excluída com sucesso",
	})
}
