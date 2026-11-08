package handler

import (
	"net/http"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

func DeleteReadingSessionHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	id := c.Param("id")

	var session schemas.ReadingSession
	if err := db.Where("id = ? AND user_id = ?", id, user.ID).First(&session).Error; err != nil {
		sendError(c, http.StatusNotFound, "sessao de leitura nao encontrada")
		return
	}

	date := session.ReadAt

	if err := db.Delete(&session).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao excluir sessao de leitura")
		return
	}

	// Recalcula historico da meta para a data da sessao removida
	syncGoalHistory(user.ID, date)

	c.JSON(http.StatusOK, gin.H{
		"message": "Sessao de leitura removida com sucesso",
	})
}
