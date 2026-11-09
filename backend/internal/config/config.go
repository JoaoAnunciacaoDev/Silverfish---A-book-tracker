package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	Env               string
	DBDriver          string
	DBSource          string
	SessionSecret     string
	FrontendURL       string
	GoogleBooksAPIKey string
	VapidPublicKey    string
	VapidPrivateKey   string
	VapidSubject      string
}

// Load lê o arquivo .env e retorna um ponteiro para a struct Config preenchida com as variáveis de ambiente.
func Load() *Config {
	envPaths := []string{".env", "backend/.env", "../.env", "../../.env"}
	loaded := false
	for _, p := range envPaths {
		if err := godotenv.Load(p); err == nil {
			log.Printf("Arquivo .env carregado com sucesso de: %s\n", p)
			loaded = true
			break
		}
	}
	if !loaded {
		log.Println("Aviso: nenhum arquivo .env encontrado, lendo variáveis do sistema.")
	}

	cfg := &Config{
		Port:              getEnv("PORT", "8080"),
		Env:               getEnv("ENV", "development"),
		DBDriver:          getEnv("DB_DRIVER", "sqlite"),
		DBSource:          getEnv("DB_SOURCE", "silverfish.db"),
		SessionSecret:     getEnv("SESSION_SECRET", "silverfish-secret-key-12345"),
		FrontendURL:       getEnv("FRONTEND_URL", "http://localhost:5173"),
		GoogleBooksAPIKey: getEnv("GOOGLE_BOOKS_API_KEY", ""),
		VapidPublicKey:    getEnv("VAPID_PUBLIC_KEY", ""),
		VapidPrivateKey:   getEnv("VAPID_PRIVATE_KEY", ""),
		VapidSubject:      getEnv("VAPID_SUBJECT", "mailto:suporte@silverfish.app"),
	}

	// Validação estrita para ambiente de produção
	if cfg.Env == "production" {
		if cfg.SessionSecret == "silverfish-secret-key-12345" || len(cfg.SessionSecret) < 32 {
			log.Fatal("ERRO DE SEGURANÇA: SESSION_SECRET obrigatório com no mínimo 32 caracteres em ambiente de produção!")
		}
	}

	return cfg
}

// getEnv tenta conseguir as variáveis de ambiente, em caso de falha retorna um fallback.
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}

	return fallback
}
