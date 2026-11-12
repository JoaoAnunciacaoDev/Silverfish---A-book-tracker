package database

import (
	"database/sql"
	"fmt"
	"io/fs"
	"log"
	"strconv"
	"strings"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/migrations"
	"github.com/golang-migrate/migrate/v4"
	migratedb "github.com/golang-migrate/migrate/v4/database"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	_ "github.com/lib/pq"
)

func getLatestEmbeddedMigrationVersion() int64 {
	entries, err := fs.ReadDir(migrations.FS, ".")
	if err != nil {
		return 0
	}
	var latest int64
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".up.sql") {
			continue
		}
		parts := strings.SplitN(entry.Name(), "_", 2)
		if len(parts) < 2 {
			continue
		}
		if v, err := strconv.ParseInt(parts[0], 10, 64); err == nil && v > latest {
			latest = v
		}
	}
	return latest
}

// RunMigrations executa as migrações SQL embutidas diretamente no binário Go
func RunMigrations(dbDriver string, dbSource string, sqlDB *sql.DB) error {
	// Fast-path para Postgres serverless: se todas as migrações já estão aplicadas sem dirty state,
	// evita abrir uma segunda conexão direta e adquirir advisory lock a cada cold start.
	if dbDriver == "postgres" {
		if latest := getLatestEmbeddedMigrationVersion(); latest > 0 {
			var version int64
			var dirty bool
			err := sqlDB.QueryRow("SELECT version, dirty FROM schema_migrations LIMIT 1").Scan(&version, &dirty)
			if err == nil && !dirty && version >= latest {
				return nil
			}
		}
	}
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
		if strings.Contains(err.Error(), "Dirty database version") {
			version, dirty, vErr := m.Version()
			if vErr == nil && dirty {
				log.Printf("Detectado estado dirty na migração versão %d. Forçando e reaplicando migrações...", version)
				targetVer := int(version) - 1
				if targetVer < 0 {
					targetVer = 0
				}
				if forceErr := m.Force(targetVer); forceErr == nil {
					if upErr := m.Up(); upErr == nil || upErr == migrate.ErrNoChange {
						log.Println("Migrações recuperadas e aplicadas com sucesso após dirty state!")
						return nil
					} else {
						log.Printf("Aviso ao tentar reaplicar migrações: %v", upErr)
					}
				}
			}
		}
		return fmt.Errorf("erro ao rodar migrações: %w", err)
	}

	return nil
}
