package main

import (
	"log"
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/database"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load() // Carrega as configurações

	db, err := database.Connect(cfg) // Conecta ao banco de dados
	if err != nil {
		log.Fatalf("Erro ao inicializar banco de dados: %v", err)
	}

	_ = db // Use a instância do banco de dados conforme necessário

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode) // Define o modo de produção para o Gin
	}

	r := gin.Default()

	// Middleware de CORS
	r.Use(
		func(c *gin.Context) {
			origin := c.Request.Header.Get("Origin")

			if origin == cfg.FrontendURL || cfg.Env == "development" {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
				c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, "+
					"Accept-Encoding, X_CSRF-Token, Authorization, accept, origin, Cache-Caontrol, X-Requested-With")
				c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
			}

			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(http.StatusNoContent)
				return
			}

			c.Next()
		},
	)

	r.GET("/api/health",
		func(c *gin.Context) {
			c.JSON(
				http.StatusOK,
				gin.H{
					"status":    "ok",
					"service":   "silverfish-api",
					"timestamp": time.Now().UTC().Format(time.RFC3339),
					"database":  cfg.DBDriver,
				},
			)
		},
	)

	log.Printf("Servidor rodando em http://localhost:%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}
}
