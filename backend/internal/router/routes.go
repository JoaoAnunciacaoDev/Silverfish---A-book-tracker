package router

import (
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/handler"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/middleware"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
	"gorm.io/gorm"
)

func initializeRoutes(r *gin.Engine, cfg *config.Config, db *gorm.DB) {
	// Inicializa os manipuladores com as dependências do banco e configuração
	handler.InitializeHandler(db, cfg)

	// Health Check ativo
	r.GET("/api/health", handler.HealthCheckHandler)

	// Rate Limiter contra força bruta: até 5 requisições rápidas por IP
	authRateLimit := middleware.RateLimiter(rate.Every(3*time.Second), 5)

	api := r.Group("/api")
	{
		// Endpoints de Autenticação (estilo Go-Talent-Hub)
		api.POST("/auth/register", authRateLimit, handler.RegisterHandler)
		api.POST("/auth/login", authRateLimit, handler.LoginHandler)
		api.POST("/auth/logout", handler.LogoutHandler)
		api.GET("/auth/me", middleware.RequireAuth(), handler.MeHandler)

		// Administração (SUPERUSER)
		admin := api.Group("/admin")
		admin.Use(middleware.RequireAuth(), middleware.RequireRole("SUPERUSER"))
		{
			admin.GET("/stats", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"status":  "authorized",
					"message": "Painel de administração acessado com sucesso",
				})
			})
		}

		api.GET("/books", handler.ListBooksHandler)
		api.GET("/books/:id", handler.ShowBookHandler)
		api.GET("/books/search-external", handler.SearchExternalBooksHandler)
		api.POST("/books", middleware.RequireAuth(), handler.CreateBookHandler)
		api.POST("/books/import", middleware.RequireAuth(), handler.ImportBookHandler)
	}
}
