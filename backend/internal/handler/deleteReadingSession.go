package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func DeleteReadingSessionHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	id := c.Param("id")

	err := db.Transaction(func(tx *gorm.DB) error {
		var session schemas.ReadingSession
		if err := tx.Where("id = ? AND user_id = ?", id, user.ID).First(&session).Error; err != nil {
			return errors.New("sessao de leitura nao encontrada")
		}

		var userBook schemas.UserBook
		if err := tx.Preload("Book").Where("id = ? AND user_id = ?", session.UserBookID, user.ID).First(&userBook).Error; err != nil {
			return errors.New("livro da estante associado nao encontrado")
		}

		date := schemas.NormalizeDateOnly(session.ReadAt)

		// Exclui a sessao
		if err := tx.Delete(&session).Error; err != nil {
			return err
		}

		// Recalcula o progresso e o status da estante com base nas sessoes restantes
		if err := recalculateUserBookProgressTx(tx, &userBook, time.Now()); err != nil {
			return err
		}

		// Recalcula historico da meta para a data da sessao removida
		if err := syncGoalHistoryTx(tx, user.ID, date); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		if err.Error() == "sessao de leitura nao encontrada" {
			sendError(c, http.StatusNotFound, err.Error())
		} else {
			sendError(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Sessao de leitura removida com sucesso",
	})
}
