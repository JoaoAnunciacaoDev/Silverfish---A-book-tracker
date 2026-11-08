package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func MeHandler(c *gin.Context) {
	userVal, exists := c.Get("currentUser")
	if !exists {
		sendError(c, http.StatusUnauthorized, "não autenticado")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": userVal,
	})
}
