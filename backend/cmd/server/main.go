package main

import (
	"log"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/database"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/router"
)

func main() {
	// 1. Configurações
	cfg := config.Load()

	// 2. Banco de dados (com suporte a SQLite e PostgreSQL + Foreign Keys ativadas)
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Erro ao inicializar banco de dados: %v", err)
	}

	// 3. Executa as Migrações SQL embutidas diretamente no binário (embed.FS)
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Erro ao obter instância sql.DB: %v", err)
	}

	if err := database.RunMigrations(cfg.DBDriver, sqlDB); err != nil {
		log.Fatalf("Erro ao executar migrações: %v", err)
	}

	log.Println("Tabelas sincronizadas com sucesso via migrations embutidas!")

	// 4. Inicializa o roteador e roda o servidor (estilo Go-Talent-Hub)
	router.Initialize(cfg, db)
}
