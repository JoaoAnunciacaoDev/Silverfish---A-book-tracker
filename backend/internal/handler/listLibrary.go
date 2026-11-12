package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

type LibrarySummary struct {
	Total        int64 `json:"total"`
	Reading      int64 `json:"reading"`
	WantToRead   int64 `json:"want_to_read"`
	Read         int64 `json:"read"`
	Paused       int64 `json:"paused"`
	Abandoned    int64 `json:"abandoned"`
	InCollection int64 `json:"in_collection"`
	Favorites    int64 `json:"favorites"`
}

func ListLibraryHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	status := strings.TrimSpace(c.Query("status"))
	favStr := strings.TrimSpace(c.Query("favorite"))
	inColStr := strings.TrimSpace(c.Query("in_collection"))
	q := strings.TrimSpace(c.Query("q"))

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	// 1. Calcula todas as contagens resumo da estante em uma única query agregada
	var summary LibrarySummary
	db.Model(&schemas.UserBook{}).
		Select(`
			COUNT(*) AS total,
			COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS reading,
			COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS want_to_read,
			COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS read,
			COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS paused,
			COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS abandoned,
			COALESCE(SUM(CASE WHEN in_collection = true THEN 1 ELSE 0 END), 0) AS in_collection,
			COALESCE(SUM(CASE WHEN favorite = true THEN 1 ELSE 0 END), 0) AS favorites
		`,
			schemas.StatusReading,
			schemas.StatusWantToRead,
			schemas.StatusRead,
			schemas.StatusPaused,
			schemas.StatusAbandoned,
		).
		Where("user_id = ?", user.ID).
		Scan(&summary)

	// 2. Monta consulta filtrada
	query := db.Model(&schemas.UserBook{}).
		Preload("Book").
		Where("user_id = ?", user.ID)

	if inColStr == "true" {
		query = query.Where("in_collection = true")
	} else if status != "" && schemas.IsValidUserBookStatus(status) {
		query = query.Where("status = ?", status)
	}

	if favStr == "true" {
		query = query.Where("favorite = true")
	}

	if q != "" {
		searchTerm := "%" + strings.ToLower(q) + "%"
		// Join com a tabela books para buscar por título ou autor
		query = query.Joins("JOIN books ON books.id = user_books.book_id").
			Where("LOWER(books.title) LIKE ? OR LOWER(books.author) LIKE ?", searchTerm, searchTerm)
	}

	var totalFiltered int64
	if err := query.Count(&totalFiltered).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao consultar estante")
		return
	}

	var userBooks []schemas.UserBook
	if err := query.Order("user_books.updated_at DESC").Offset(offset).Limit(limit).Find(&userBooks).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao listar livros da estante")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":   userBooks,
		"summary": summary,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total_items": totalFiltered,
		},
	})
}
