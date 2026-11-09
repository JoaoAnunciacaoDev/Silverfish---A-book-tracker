package database

import (
	"fmt"
	"log"
	"strings"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// SanitizePostgresURL limpa parâmetros conflitantes gerados automaticamente por provedores como o Neon
func SanitizePostgresURL(rawURL string) string {
	cleaned := strings.ReplaceAll(rawURL, "&channel_binding=require", "")
	cleaned = strings.ReplaceAll(cleaned, "channel_binding=require&", "")
	cleaned = strings.ReplaceAll(cleaned, "?channel_binding=require", "?")
	cleaned = strings.ReplaceAll(cleaned, "-pooler.", ".")
	return strings.TrimRight(cleaned, "?&")
}

// Connect conecta ao banco de dados usando as configurações fornecidas e retorna uma instância do GORM DB.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch cfg.DBDriver {
	case "sqlite":
		dialector = sqlite.Open(cfg.DBSource)
	case "postgres":
		cleanSource := SanitizePostgresURL(cfg.DBSource)
		dialector = postgres.Open(cleanSource)
	default:
		return nil, fmt.Errorf("driver de banco de dados não suportado: %s", cfg.DBDriver)
	}

	logLevel := logger.Info
	if cfg.Env == "production" {
		logLevel = logger.Error
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao conectar ao banco de dados (%s): %w", cfg.DBDriver, err)
	}

	// SQLite não ativa chaves estrangeiras por padrão; habilitamos explicitamente
	if cfg.DBDriver == "sqlite" {
		if err := db.Exec("PRAGMA foreign_keys = ON;").Error; err != nil {
			return nil, fmt.Errorf("falha ao habilitar foreign keys no sqlite: %w", err)
		}
	}

	log.Printf("Conectado ao banco de dados com sucesso (%s)", cfg.DBDriver)
	return db, nil
}
