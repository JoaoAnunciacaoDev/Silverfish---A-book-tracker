package handler

import (
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

// ToggleInCollectionHandler alterna a flag booleana in_collection do livro na estante
func ToggleInCollectionHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	id := c.Param("id")

	var userBook schemas.UserBook
	if err := db.Where("id = ? AND user_id = ?", id, user.ID).First(&userBook).Error; err != nil {
		sendError(c, http.StatusNotFound, "livro não encontrado na sua estante")
		return
	}

	userBook.InCollection = !userBook.InCollection
	userBook.UpdatedAt = time.Now()

	if err := db.Model(&userBook).Updates(map[string]interface{}{
		"in_collection": userBook.InCollection,
		"updated_at":    userBook.UpdatedAt,
	}).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao alternar status de coleção")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Coleção atualizada com sucesso",
		"in_collection": userBook.InCollection,
	})
}
