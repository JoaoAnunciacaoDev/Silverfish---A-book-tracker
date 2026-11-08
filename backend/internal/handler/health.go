package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func HealthCheckHandler(c *gin.Context) {
	sqlDB, err := db.DB()
	if err != nil || sqlDB.Ping() != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":    "unhealthy",
			"service":   "silverfish-api",
			"database":  "disconnected",
			"error":     "falha na conexão com o banco de dados",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "silverfish-api",
		"database":  cfg.DBDriver,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
