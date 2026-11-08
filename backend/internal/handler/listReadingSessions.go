package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

func ListReadingSessionsHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	date := strings.TrimSpace(c.Query("date"))
	userBookID := strings.TrimSpace(c.Query("user_book_id"))
	bookID := strings.TrimSpace(c.Query("book_id"))
	feeling := strings.TrimSpace(c.Query("feeling"))
	fromDate := strings.TrimSpace(c.Query("from_date"))
	toDate := strings.TrimSpace(c.Query("to_date"))

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	query := db.Model(&schemas.ReadingSession{}).
		Preload("UserBook.Book").
		Where("reading_sessions.user_id = ?", user.ID)

	if date != "" {
		query = query.Where("reading_sessions.read_at = ?", date)
	}
	if fromDate != "" {
		query = query.Where("reading_sessions.read_at >= ?", fromDate)
	}
	if toDate != "" {
		query = query.Where("reading_sessions.read_at <= ?", toDate)
	}
	if feeling != "" {
		query = query.Where("reading_sessions.feeling LIKE ?", "%"+feeling+"%")
	}
	if userBookID != "" {
		query = query.Where("reading_sessions.user_book_id = ?", userBookID)
	}
	if bookID != "" {
		query = query.Joins("JOIN user_books ON user_books.id = reading_sessions.user_book_id").
			Where("user_books.book_id = ?", bookID)
	}

	var totalItems int64
	if err := query.Count(&totalItems).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao contar sessoes de leitura")
		return
	}

	var sessions []schemas.ReadingSession
	if err := query.Order("reading_sessions.read_at DESC, reading_sessions.created_at DESC").Offset(offset).Limit(limit).Find(&sessions).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao listar sessoes de leitura")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sessions": sessions,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total_items": totalItems,
		},
	})
}
