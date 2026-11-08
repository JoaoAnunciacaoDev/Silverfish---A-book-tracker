package database

import (
	"fmt"

	"github.com/silverfish---a-book-tracker/backend/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Conecta ao banco de dados usando as configurações fornecidas e retorna uma instância do GORM DB.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch cfg.DBDriver {
	case "sqlite":
		dialector = sqlite.Open(cfg.DBSource)
	case "postgres":
		dialector = postgres.Open(cfg.DBSource)
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

	return db, nil
}
