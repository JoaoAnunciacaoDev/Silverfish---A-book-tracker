package handler

import (
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

func ToggleFavoriteHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	id := c.Param("id")

	var userBook schemas.UserBook
	if err := db.Where("id = ? AND user_id = ?", id, user.ID).First(&userBook).Error; err != nil {
		sendError(c, http.StatusNotFound, "livro não encontrado na sua estante")
		return
	}

	userBook.Favorite = !userBook.Favorite
	userBook.UpdatedAt = time.Now()

	if err := db.Model(&userBook).Updates(map[string]interface{}{
		"favorite":   userBook.Favorite,
		"updated_at": userBook.UpdatedAt,
	}).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao alternar favorito")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Favorito atualizado com sucesso",
		"favorite": userBook.Favorite,
	})
}
