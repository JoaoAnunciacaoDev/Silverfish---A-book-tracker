package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"gorm.io/gorm"
)

var (
	db  *gorm.DB
	cfg *config.Config
)

const SessionCookieName = "silverfish_session"

func InitializeHandler(database *gorm.DB, configuration *config.Config) {
	db = database
	cfg = configuration
}

// HashSessionToken gera o HMAC-SHA256 do token usando a SESSION_SECRET
func HashSessionToken(rawToken string) string {
	mac := hmac.New(sha256.New, []byte(cfg.SessionSecret))
	mac.Write([]byte(rawToken))
	return hex.EncodeToString(mac.Sum(nil))
}

// GetDB expõe o banco para os middlewares quando necessário
func GetDB() *gorm.DB {
	return db
}

// GetConfig expõe a configuração para os middlewares
func GetConfig() *config.Config {
	return cfg
}
