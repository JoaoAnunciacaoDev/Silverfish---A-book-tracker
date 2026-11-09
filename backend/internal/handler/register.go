package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Email       string `json:"email"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
	Timezone    string `json:"timezone"`
}

func isAlphaNumericUnderscore(s string) bool {
	for _, r := range s {
		if !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') && r != '_' {
			return false
		}
	}
	return true
}

func isStrongPassword(p string) bool {
	if len(p) < 8 {
		return false
	}
	var hasUpper, hasNumber bool
	for _, r := range p {
		if r >= 'A' && r <= 'Z' {
			hasUpper = true
		}
		if r >= '0' && r <= '9' {
			hasNumber = true
		}
	}
	return hasUpper && hasNumber
}

func (r *RegisterRequest) Validate() error {
	r.Email = strings.ToLower(strings.TrimSpace(r.Email))
	r.Username = strings.ToLower(strings.TrimSpace(r.Username))
	r.DisplayName = strings.TrimSpace(r.DisplayName)
	r.Timezone = strings.TrimSpace(r.Timezone)

	if r.Email == "" || !strings.Contains(r.Email, "@") {
		return errors.New("email inválido ou ausente")
	}

	if len(r.Username) < 3 || len(r.Username) > 30 || !isAlphaNumericUnderscore(r.Username) {
		return errors.New("nome de usuário deve ter entre 3 e 30 caracteres (apenas letras, números e _)")
	}

	if r.DisplayName == "" {
		return errors.New("nome de exibição é obrigatório")
	}

	if !isStrongPassword(r.Password) {
		return errors.New("a senha deve ter no mínimo 8 caracteres, contendo pelo menos uma letra maiúscula e um número")
	}

	if r.Timezone == "" {
		r.Timezone = "America/Sao_Paulo"
	}
	if _, err := time.LoadLocation(r.Timezone); err != nil {
		return errors.New("fuso horário IANA inválido")
	}

	return nil
}

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

	// Todo usuário cadastrado inicia com papel padrão USER (promoção a SUPERUSER é feita explicitamente via SQL)
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
