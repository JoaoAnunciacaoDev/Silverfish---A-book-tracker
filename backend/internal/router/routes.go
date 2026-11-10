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

	// Popula conquistas padrao do sistema
	handler.SeedAchievements(db)

	// Health Check ativo
	r.GET("/api/health", handler.HealthCheckHandler)

	// Rate Limiter contra força bruta: até 5 requisições rápidas por IP
	authRateLimit := middleware.RateLimiter(rate.Every(3*time.Second), 5)
	// Rate Limiter para busca externa contra abuso de cotas (Google Books / Open Library)
	searchRateLimit := middleware.RateLimiter(rate.Every(1*time.Second), 10)

	api := r.Group("/api")
	{
		// Endpoints de Autenticação (estilo Go-Talent-Hub)
		api.POST("/auth/register", authRateLimit, handler.RegisterHandler)
		api.POST("/auth/login", authRateLimit, handler.LoginHandler)
		api.POST("/auth/logout", handler.LogoutHandler)
		api.GET("/auth/me", middleware.RequireAuth(), handler.MeHandler)

		// Administração (SUPERUSER - Fase 4)
		admin := api.Group("/admin")
		admin.Use(middleware.RequireAuth(), middleware.RequireRole("SUPERUSER"))
		{
			admin.GET("/stats", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{
					"status":  "authorized",
					"message": "Painel de administração acessado com sucesso",
				})
			})
			admin.GET("/dashboard", handler.AdminDashboardStatsHandler)
			admin.GET("/users", handler.AdminListUsersHandler)
			admin.PUT("/users/:id/role", handler.AdminUpdateUserRoleHandler)
			admin.GET("/patch-notes", handler.AdminListAllPatchNotesHandler)
			admin.POST("/patch-notes", handler.AdminCreatePatchNoteHandler)
			admin.PUT("/patch-notes/:id", handler.AdminUpdatePatchNoteHandler)
			admin.DELETE("/patch-notes/:id", handler.AdminDeletePatchNoteHandler)
		}

		api.GET("/books", handler.ListBooksHandler)
		api.GET("/books/:id", handler.ShowBookHandler)
		api.GET("/books/search-external", searchRateLimit, handler.SearchExternalBooksHandler)
		api.POST("/books", middleware.RequireAuth(), handler.CreateBookHandler)
		api.POST("/books/import", middleware.RequireAuth(), handler.ImportBookHandler)

		// Avaliações de Livros
		api.GET("/books/:id/reviews", handler.ListBookReviewsHandler)
		api.POST("/books/:id/reviews", middleware.RequireAuth(), handler.CreateBookReviewHandler)
		reviews := api.Group("/reviews")
		reviews.Use(middleware.RequireAuth())
		{
			reviews.GET("/me", handler.ListMyReviewsHandler)
			reviews.PUT("/:id", handler.UpdateReviewHandler)
			reviews.DELETE("/:id", handler.DeleteReviewHandler)
		}

		// Biblioteca Pessoal (Estante do Usuário - Etapa 6)
		library := api.Group("/library")
		library.Use(middleware.RequireAuth())
		{
			library.GET("", handler.ListLibraryHandler)
			library.POST("", handler.AddToLibraryHandler)
			library.PUT("/:id", handler.UpdateLibraryBookHandler)
			library.DELETE("/:id", handler.DeleteLibraryBookHandler)
			library.PATCH("/:id/favorite", handler.ToggleFavoriteHandler)
		}

		// Sessões de Leitura (Etapa 7)
		sessions := api.Group("/reading-sessions")
		sessions.Use(middleware.RequireAuth())
		{
			sessions.POST("", handler.CreateReadingSessionHandler)
			sessions.GET("", handler.ListReadingSessionsHandler)
			sessions.GET("/today", handler.TodayReadingSummaryHandler)
			sessions.DELETE("/:id", handler.DeleteReadingSessionHandler)
		}

		// Metas Diárias e Streaks (Etapa 8)
		goals := api.Group("/goals")
		goals.Use(middleware.RequireAuth())
		{
			goals.GET("", handler.GetGoalHandler)
			goals.PUT("", handler.UpdateGoalHandler)
			goals.GET("/streak", handler.GetStreakHandler)
			goals.GET("/history", handler.GetGoalHistoryHandler)
		}

		// Estatísticas e Dashboard (Fase 2)
		stats := api.Group("/stats")
		stats.Use(middleware.RequireAuth())
		{
			stats.GET("/dashboard", handler.GetDashboardStatsHandler)
			stats.GET("/heatmap", handler.GetHeatmapHandler)
		}

		// Conquistas (Gamificação - Fase 2)
		api.GET("/achievements", middleware.RequireAuth(), handler.ListAchievementsHandler)

		// Funcionalidades Sociais, Perfis & Rankings (Fase 3)
		users := api.Group("/users")
		users.Use(middleware.RequireAuth())
		{
			users.GET("/search", handler.SearchUsersHandler)
			users.GET("/profile/:username", handler.GetUserProfileHandler)
			users.PUT("/me/profile", handler.UpdateProfileHandler)
			users.GET("/me/privacy", handler.GetPrivacySettingsHandler)
			users.PUT("/me/privacy", handler.UpdatePrivacySettingsHandler)
			users.POST("/:username/follow", handler.FollowUserHandler)
			users.DELETE("/:username/follow", handler.UnfollowUserHandler)
			users.GET("/:username/followers", handler.ListFollowersHandler)
			users.GET("/:username/following", handler.ListFollowingHandler)
			users.GET("/me/pending-follows", handler.ListPendingFollowsHandler)
			users.POST("/follows/:id/respond", handler.RespondFollowRequestHandler)
		}

		social := api.Group("/social")
		social.Use(middleware.RequireAuth())
		{
			social.GET("/feed", handler.GetFeedHandler)
			social.GET("/rankings", handler.GetLeaderboardHandler)
			social.POST("/activities/:id/like", handler.ToggleActivityLikeHandler)
			social.GET("/activities/:id/comments", handler.ListActivityCommentsHandler)
			social.POST("/activities/:id/comments", handler.CreateActivityCommentHandler)
			social.DELETE("/comments/:id", handler.DeleteActivityCommentHandler)
		}

		// Patch Notes (Notas de Atualização - Fase 4)
		api.GET("/patch-notes", handler.ListPublishedPatchNotesHandler)
		api.GET("/patch-notes/latest", handler.GetLatestPatchNoteHandler)
		api.GET("/patch-notes/:id", handler.GetPatchNoteHandler)

		// Notificações Push & Lembretes (Fase 4)
		api.GET("/notifications/vapid-public-key", handler.GetVapidPublicKeyHandler)
		notifications := api.Group("/notifications")
		notifications.Use(middleware.RequireAuth())
		{
			notifications.POST("/subscribe", handler.SubscribePushHandler)
			notifications.POST("/unsubscribe", handler.UnsubscribePushHandler)
			notifications.GET("/settings", handler.GetNotificationSettingsHandler)
			notifications.PUT("/settings", handler.UpdateNotificationSettingsHandler)
			notifications.POST("/test", handler.SendTestNotificationHandler)
		}
	}
}
