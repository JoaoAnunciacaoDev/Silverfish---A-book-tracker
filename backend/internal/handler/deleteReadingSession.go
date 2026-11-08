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

		date := session.ReadAt
		userBookID := session.UserBookID

		// Exclui a sessao
		if err := tx.Delete(&session).Error; err != nil {
			return err
		}

		// Recalcula o progresso e o status da estante com base nas sessoes restantes
		var remainingSessions []schemas.ReadingSession
		if err := tx.Where("user_book_id = ?", userBookID).Order("end_page DESC").Find(&remainingSessions).Error; err != nil {
			return err
		}

		now := time.Now()
		if len(remainingSessions) > 0 {
			userBook.CurrentPage = remainingSessions[0].EndPage
			if userBook.Book.PageCount > 0 && userBook.CurrentPage >= userBook.Book.PageCount {
				userBook.Status = schemas.StatusRead
				if userBook.FinishedAt == nil {
					userBook.FinishedAt = &now
				}
			} else {
				userBook.Status = schemas.StatusReading
				userBook.FinishedAt = nil
			}
		} else {
			userBook.CurrentPage = 0
			userBook.FinishedAt = nil
			userBook.StartedAt = nil
			if userBook.Status == schemas.StatusRead || userBook.Status == schemas.StatusReading {
				userBook.Status = schemas.StatusWantToRead
			}
		}
		userBook.UpdatedAt = now

		if err := tx.Save(&userBook).Error; err != nil {
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
