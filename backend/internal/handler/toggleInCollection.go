package handler

import (
	"net/http"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

// ToggleInCollectionHandler alterna a flag de coleção física/digital de um livro na estante
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
	if err := db.Model(&userBook).Update("in_collection", userBook.InCollection).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao atualizar posse na coleção")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Coleção atualizada com sucesso",
		"in_collection": userBook.InCollection,
	})
}
