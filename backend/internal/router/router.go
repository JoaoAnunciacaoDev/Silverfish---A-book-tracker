package router

import (
	"log"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Initialize(cfg *config.Config, db *gorm.DB) {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Configuração de segurança de Proxies:
	// nil desativa a confiança cega em cabeçalhos X-Forwarded-For arbitrários,
	// prevenindo ataques de IP spoofing e eliminando o aviso do Gin.
	if err := r.SetTrustedProxies(nil); err != nil {
		log.Printf("Aviso ao configurar trusted proxies: %v", err)
	}

	// Middleware de CORS
	r.Use(middleware.CORS(cfg))

	// Inicializa as rotas
	initializeRoutes(r, cfg, db)

	// Sobe o servidor
	log.Printf("Servidor rodando em http://localhost:%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Erro ao iniciar servidor: %v", err)
	}
}
