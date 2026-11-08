package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func RegisterHandler(c *gin.Context) {
	request := RegisterRequest{}
	if err := c.BindJSON(&request); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := request.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Verifica duplicidade no banco
	var existing schemas.User
	if err := db.Where("email = ? OR username = ?", request.Email, request.Username).First(&existing).Error; err == nil {
		sendError(c, http.StatusConflict, "email ou nome de usuário já em uso")
		return
	}

	// Criptografa senha com bcrypt
	hash, err := bcrypt.GenerateFromPassword([]byte(request.Password), bcrypt.DefaultCost)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao processar senha")
		return
	}

	user := schemas.User{
		ID:           uuid.NewString(),
		Email:        request.Email,
		Username:     request.Username,
		PasswordHash: string(hash),
		DisplayName:  request.DisplayName,
		Role:         "USER",
		Timezone:     request.Timezone,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := db.Create(&user).Error; err != nil {
		errStr := strings.ToLower(err.Error())
		if strings.Contains(errStr, "unique") || strings.Contains(errStr, "23505") {
			sendError(c, http.StatusConflict, "email ou nome de usuário já em uso")
			return
		}
		sendError(c, http.StatusInternalServerError, "erro ao salvar usuário no banco")
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Conta criada com sucesso",
		"user":    user,
	})
}
