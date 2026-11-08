package middleware

import (
	"net/http"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"github.com/gin-gonic/gin"
)

// CORS configura as origens autorizadas de forma estrita
func CORS(cfg *config.Config) gin.HandlerFunc {
	allowedOrigins := map[string]bool{
		cfg.FrontendURL:         true,
		"http://localhost:5173": true,
		"http://127.0.0.1:5173": true,
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		if allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, " +
			"X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}