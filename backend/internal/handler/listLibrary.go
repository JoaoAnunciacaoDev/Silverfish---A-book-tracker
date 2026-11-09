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

	// 1. Calcula contagens resumo da estante do usuário em consultas otimizadas
	var summary LibrarySummary
	type statusTally struct {
		Status string `gorm:"column:status"`
		Total  int64  `gorm:"column:total"`
	}
	var tallies []statusTally
	db.Model(&schemas.UserBook{}).
		Select("status, COUNT(*) as total").
		Where("user_id = ?", user.ID).
		Group("status").
		Scan(&tallies)

	for _, t := range tallies {
		summary.Total += t.Total
		switch t.Status {
		case schemas.StatusReading:
			summary.Reading = t.Total
		case schemas.StatusWantToRead:
			summary.WantToRead = t.Total
		case schemas.StatusRead:
			summary.Read = t.Total
		case schemas.StatusPaused:
			summary.Paused = t.Total
		case schemas.StatusAbandoned:
			summary.Abandoned = t.Total
		case schemas.StatusInCollection:
			summary.InCollection = t.Total
		}
	}
	db.Model(&schemas.UserBook{}).Where("user_id = ? AND favorite = true", user.ID).Count(&summary.Favorites)

	// 2. Monta consulta filtrada
	query := db.Model(&schemas.UserBook{}).
		Preload("Book").
		Where("user_id = ?", user.ID)

	if status != "" && schemas.IsValidUserBookStatus(status) {
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
