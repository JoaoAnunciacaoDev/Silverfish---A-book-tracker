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

	var sessions []schemas.ReadingSession
	db.Preload("UserBook.Book").
		Where("user_id = ? AND read_at = ?", user.ID, today).
		Order("created_at DESC").
		Find(&sessions)

	var totalPagesRead int64
	for _, s := range sessions {
		totalPagesRead += int64(s.PagesRead)
	}

	c.JSON(http.StatusOK, gin.H{
		"date":             today,
		"total_pages_read": totalPagesRead,
		"sessions_count":   len(sessions),
		"sessions":         sessions,
	})
}
