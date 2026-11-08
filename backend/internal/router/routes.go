package router

import (
	"log"
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/auth"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/middleware"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
	"gorm.io/gorm"
)

func initializeRoutes(r *gin.Engine, cfg *config.Config, db *gorm.DB) {
	// Health Check ativo (verifica a conectividade real com o banco de dados)
	r.GET("/api/health", func(c *gin.Context) {
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
	})

	// Agrupamento principal /api
	api := r.Group("/api")
	{
		// Módulo: Autenticação
		authRepo := auth.NewRepository(db)
		authService := auth.NewService(authRepo, cfg)
		authHandler := auth.NewHandler(authService, cfg)

		// Rotina em segundo plano para limpeza de sessões expiradas a cada 1 hora
		go func() {
			ticker := time.NewTicker(1 * time.Hour)
			defer ticker.Stop()
			for range ticker.C {
				if err := authService.CleanExpiredSessions(); err != nil {
					log.Printf("Aviso: falha ao limpar sessões expiradas: %v", err)
				}
			}
		}()

		// Rate Limiter contra brute force: até 5 requisições rápidas, recarregando 1 a cada 3 segundos
		authRateLimit := middleware.RateLimiter(rate.Every(3*time.Second), 5)

		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", authRateLimit, authHandler.Register)
			authGroup.POST("/login", authRateLimit, authHandler.Login)
			authGroup.POST("/logout", authHandler.Logout)
			authGroup.GET("/me", middleware.RequireAuth(authService), authHandler.Me)
		}

		// Módulo: Administração (Exige login E papel SUPERUSER)
		adminGroup := api.Group("/admin")
		adminGroup.Use(middleware.RequireAuth(authService), middleware.RequireRole("SUPERUSER"))
		{
			adminGroup.GET("/stats", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"status":  "authorized",
					"message": "Painel de administração acessado com sucesso pelo SUPERUSER",
				})
			})
		}
	}
}
