package handler

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func LoginHandler(c *gin.Context) {
	request := LoginRequest{}
	if err := c.BindJSON(&request); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := request.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Busca usuário por email ou por username
	var user schemas.User
	if err := db.Where("email = ? OR username = ?", request.EmailOrUsername, request.EmailOrUsername).First(&user).Error; err != nil {
		sendError(c, http.StatusUnauthorized, "email/usuário ou senha incorretos")
		return
	}

	// Compara hash bcrypt
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(request.Password)); err != nil {
		sendError(c, http.StatusUnauthorized, "email/usuário ou senha incorretos")
		return
	}

	// Gera 32 bytes criptograficamente seguros para o token bruto do cookie
	rawTokenBytes := make([]byte, 32)
	if _, err := rand.Read(rawTokenBytes); err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao gerar sessão")
		return
	}
	rawToken := hex.EncodeToString(rawTokenBytes)

	// Salva no banco o HMAC-SHA256 do token usando SESSION_SECRET
	session := schemas.Session{
		ID:        uuid.NewString(),
		UserID:    user.ID,
		Token:     HashSessionToken(rawToken),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		CreatedAt: time.Now(),
	}

	if err := db.Create(&session).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao registrar sessão no banco")
		return
	}

	// Define cookie seguro HttpOnly
	isProd := cfg.Env == "production"
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		SessionCookieName,
		rawToken,
		int(7*24*60*60), // 7 dias
		"/",
		"",
		isProd,
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "Login realizado com sucesso",
		"user":    user,
	})
}
