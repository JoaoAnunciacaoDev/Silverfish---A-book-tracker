package router

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/middleware"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Initialize(cfg *config.Config, db *gorm.DB) {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Desativa confiança cega em proxies para evitar IP spoofing
	if err := r.SetTrustedProxies(nil); err != nil {
		log.Printf("Aviso ao configurar trusted proxies: %v", err)
	}

	// Middleware de CORS
	r.Use(middleware.CORS(cfg))

	// Inicializa as rotas
	initializeRoutes(r, cfg, db)

	// Configuração do servidor HTTP para suportar Graceful Shutdown
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	// Rotina em segundo plano: limpa sessoes expiradas periodicamente a cada 1 hora
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			if result := db.Where("expires_at < ?", time.Now()).Delete(&schemas.Session{}); result.Error != nil {
				log.Printf("Aviso: falha na limpeza periodica de sessoes: %v", result.Error)
			} else if result.RowsAffected > 0 {
				log.Printf("Limpeza periodica: %d sessoes expiradas removidas", result.RowsAffected)
			}
		}
	}()

	// Inicia o servidor HTTP em uma goroutine separada
	go func() {
		log.Printf("Servidor rodando em http://localhost:%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Erro fatal no servidor HTTP: %v", err)
		}
	}()

	// Canal para escutar sinais de encerramento do sistema operacional
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Bloqueia a execução até receber SIGINT (Ctrl+C) ou SIGTERM (Docker/K8s/systemd)
	<-quit
	log.Println("Sinal de encerramento recebido. Finalizando requisições em andamento...")

	// Contexto com timeout de 5 segundos para que requisições ativas concluam com segurança
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Erro ao forçar encerramento do servidor: %v", err)
	}

	log.Println("Servidor Silverfish encerrado graciosamente com sucesso!")
}
