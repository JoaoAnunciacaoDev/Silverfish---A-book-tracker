package database

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// SanitizePostgresPoolerURL remove apenas parâmetros incompatíveis com drivers legados,
// preservando o endpoint -pooler do Neon para uso em runtime serverless.
func SanitizePostgresPoolerURL(rawURL string) string {
	cleaned := strings.ReplaceAll(rawURL, "&channel_binding=require", "")
	cleaned = strings.ReplaceAll(cleaned, "channel_binding=require&", "")
	cleaned = strings.ReplaceAll(cleaned, "?channel_binding=require", "?")
	return strings.TrimRight(cleaned, "?&")
}

// SanitizePostgresURL limpa parâmetros conflitantes e remove "-pooler." para conexões diretas (ex: migrações).
func SanitizePostgresURL(rawURL string) string {
	cleaned := SanitizePostgresPoolerURL(rawURL)
	cleaned = strings.ReplaceAll(cleaned, "-pooler.", ".")
	return strings.TrimRight(cleaned, "?&")
}

// SyncSchemas sincroniza schemas GORM garantindo compatibilidade.
// No SQLite (usado em testes/desenvolvimento local), roda AutoMigrate para criar as tabelas.
// No PostgreSQL (produção serverless no Vercel), o AutoMigrate para 18 modelos é evitado
// porque realiza dezenas de introspecções e tentativas de drop/create de constraints via rede,
// ultrapassando o timeout de 30s de inicialização da Vercel. As migrations embutidas (golang-migrate)
// e queries pontuais cuidam do Postgres de forma instantânea (<200ms).
func SyncSchemas(db *gorm.DB) error {
	if db.Dialector.Name() == "sqlite" {
		models := []interface{}{
			&schemas.User{},
			&schemas.Session{},
			&schemas.Book{},
			&schemas.UserBook{},
			&schemas.ReadingSession{},
			&schemas.DailyGoal{},
			&schemas.GoalHistory{},
			&schemas.Achievement{},
			&schemas.UserAchievement{},
			&schemas.Follow{},
			&schemas.UserPrivacySettings{},
			&schemas.Activity{},
			&schemas.PushSubscription{},
			&schemas.NotificationSettings{},
			&schemas.PatchNote{},
			&schemas.ActivityLike{},
			&schemas.ActivityComment{},
			&schemas.BookReview{},
		}

		for _, m := range models {
			if err := db.AutoMigrate(m); err != nil {
				log.Printf("[AutoMigrate] aviso ao sincronizar %T: %v", m, err)
			}
		}
	}

	return nil
}

// Connect conecta ao banco de dados usando as configurações fornecidas e retorna uma instância do GORM DB.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch cfg.DBDriver {
	case "sqlite":
		dialector = sqlite.Open(cfg.DBSource)
	case "postgres":
		// Preserva -pooler. e desabilita prepared statements para compatibilidade com PgBouncer/Neon pooler
		poolerSource := SanitizePostgresPoolerURL(cfg.DBSource)
		dialector = postgres.New(postgres.Config{
			DSN:                  poolerSource,
			PreferSimpleProtocol: true,
		})
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
	} else if sqlDB, sqlErr := db.DB(); sqlErr == nil {
		// Ajusta pool para ambiente serverless (conexões curtas via pooler)
		sqlDB.SetMaxIdleConns(2)
		sqlDB.SetMaxOpenConns(5)
		sqlDB.SetConnMaxLifetime(3 * time.Minute)
	}

	log.Printf("Conectado ao banco de dados com sucesso (%s)", cfg.DBDriver)
	return db, nil
}
