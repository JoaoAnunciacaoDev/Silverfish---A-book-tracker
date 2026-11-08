package handler

import (
	"net/http"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

func DeleteLibraryBookHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	id := c.Param("id")

	result := db.Where("id = ? AND user_id = ?", id, user.ID).Delete(&schemas.UserBook{})
	if result.Error != nil {
		sendError(c, http.StatusInternalServerError, "erro ao remover livro da estante")
		return
	}

	if result.RowsAffected == 0 {
		sendError(c, http.StatusNotFound, "livro não encontrado na sua estante")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Livro removido da sua estante com sucesso",
	})
}
