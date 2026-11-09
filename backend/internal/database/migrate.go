package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/migrations"
	"github.com/golang-migrate/migrate/v4"
	migratedb "github.com/golang-migrate/migrate/v4/database"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	_ "github.com/lib/pq"
)

// RunMigrations executa as migrações SQL embutidas diretamente no binário Go
func RunMigrations(dbDriver string, dbSource string, sqlDB *sql.DB) error {
	var driverInstance migratedb.Driver
	var err error

	targetDB := sqlDB
	var directDB *sql.DB

	// Caso específico do Neon / PgBouncer:
	// O endpoint "-pooler" opera em transaction pooling e não suporta pg_advisory_lock do golang-migrate,
	// e parâmetros como channel_binding quebram drivers legados.
	if dbDriver == "postgres" {
		cleanedSource := SanitizePostgresURL(dbSource)
		if cleanedSource != dbSource || strings.Contains(dbSource, "-pooler.") {
			directDB, err = sql.Open("postgres", cleanedSource)
			if err == nil {
				targetDB = directDB
				defer directDB.Close()
				log.Println("Migrações: utilizando conexão sanitizada (sem pooler e sem channel_binding) para suportar advisory locks.")
			}
		}
	}

	switch dbDriver {
	case "sqlite":
		driverInstance, err = sqlite3.WithInstance(targetDB, &sqlite3.Config{})
	case "postgres":
		driverInstance, err = postgres.WithInstance(targetDB, &postgres.Config{})
	default:
		return fmt.Errorf("driver de migração não suportado: %s", dbDriver)
	}

	if err != nil {
		return fmt.Errorf("falha ao criar driver de migração: %w", err)
	}

	sourceDriver, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("falha ao carregar migrations embutidas: %w", err)
	}

	m, err := migrate.NewWithInstance(
		"iofs",
		sourceDriver,
		dbDriver,
		driverInstance,
	)
	if err != nil {
		return fmt.Errorf("falha ao instanciar migrator: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("erro ao rodar migrações: %w", err)
	}

	return nil
}
