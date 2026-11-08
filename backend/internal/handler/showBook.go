package handler

import (
	"net/http"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

func ShowBookHandler(c *gin.Context) {
	id := c.Param("id")

	var book schemas.Book
	if err := db.First(&book, "id = ?", id).Error; err != nil {
		sendError(c, http.StatusNotFound, "livro não encontrado no catálogo")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"book": book,
	})
}
