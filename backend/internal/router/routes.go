package router

import (
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
	// Health Check
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   "silverfish-api",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"database":  cfg.DBDriver,
		})
	})

	// Agrupamento principal /api
	api := r.Group("/api")
	{
		// Módulo: Autenticação
		authRepo := auth.NewRepository(db)
		authService := auth.NewService(authRepo, cfg)
		authHandler := auth.NewHandler(authService, cfg)

		// Rate Limiter contra brute force: até 5 requisições em rajada, recarregando 1 a cada 3 segundos
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
