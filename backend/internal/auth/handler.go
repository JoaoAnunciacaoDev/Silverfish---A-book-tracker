package auth

import (
	"net/http"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"github.com/gin-gonic/gin"
)

const SessionCookieName = "silverfish_session"

type Handler struct {
	service *Service
	cfg     *config.Config
}

func NewHandler(service *Service, cfg *config.Config) *Handler {
	return &Handler{service: service, cfg: cfg}
}

func (h *Handler) Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	user, err := h.service.Register(input)
	if err != nil {
		if err == ErrUserAlreadyExists {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		if err == ErrInvalidUsername || err == ErrInvalidTimezone || err == ErrWeakPassword {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar conta"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Conta criada com sucesso",
		"user":    user,
	})
}

func (h *Handler) Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	user, rawToken, err := h.service.Login(input)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email/usuário ou senha incorretos"})
		return
	}

	isProd := h.cfg.Env == "production"
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		SessionCookieName,
		rawToken,
		int(7*24*60*60),
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

func (h *Handler) Logout(c *gin.Context) {
	token, err := c.Cookie(SessionCookieName)
	if err == nil && token != "" {
		_ = h.service.Logout(token)
	}

	isProd := h.cfg.Env == "production"
	c.SetCookie(SessionCookieName, "", -1, "/", "", isProd, true)

	c.JSON(http.StatusOK, gin.H{"message": "Logout realizado com sucesso"})
}

func (h *Handler) Me(c *gin.Context) {
	userVal, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": userVal})
}
