package handler

import (
	"github.com/gin-gonic/gin"
)

func sendError(c *gin.Context, statusCode int, message string) {
	c.Header("Content-Type", "application/json")
	c.JSON(statusCode, gin.H{
		"error":  message,
		"status": statusCode,
	})
}

func sendSuccess(c *gin.Context, statusCode int, message string, data any) {
	c.Header("Content-Type", "application/json")
	response := gin.H{
		"status": statusCode,
	}
	if message != "" {
		response["message"] = message
	}
	if data != nil {
		response["data"] = data
	}
	c.JSON(statusCode, response)
}
