package handler

import (
	"net/http"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

func TodayReadingSummaryHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	today := getTodayInTimezone(user.Timezone)

	var totalPagesRead int64
	db.Model(&schemas.ReadingSession{}).
		Where("user_id = ? AND read_at = ?", user.ID, today).
		Select("COALESCE(SUM(pages_read), 0)").
		Scan(&totalPagesRead)

	var sessions []schemas.ReadingSession
	db.Preload("UserBook.Book").
		Where("user_id = ? AND read_at = ?", user.ID, today).
		Order("created_at DESC").
		Find(&sessions)

	c.JSON(http.StatusOK, gin.H{
		"date":             today,
		"total_pages_read": totalPagesRead,
		"sessions_count":   len(sessions),
		"sessions":         sessions,
	})
}
