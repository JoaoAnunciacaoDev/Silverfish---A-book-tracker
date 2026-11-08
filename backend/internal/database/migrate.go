package database

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/migrations"
	"github.com/golang-migrate/migrate/v4"
	migratedb "github.com/golang-migrate/migrate/v4/database"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

// RunMigrations executa as migrações SQL embutidas diretamente no binário Go
func RunMigrations(dbDriver string, sqlDB *sql.DB) error {
	var driverInstance migratedb.Driver
	var err error

	switch dbDriver {
	case "sqlite":
		driverInstance, err = sqlite3.WithInstance(sqlDB, &sqlite3.Config{})
	case "postgres":
		driverInstance, err = postgres.WithInstance(sqlDB, &postgres.Config{})
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

	log.Println("Migrações de banco de dados executadas com sucesso (via embed.FS)!")
	return nil
}
