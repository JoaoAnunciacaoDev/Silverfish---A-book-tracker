package middleware

import (
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/handler"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

// RequireAuth valida a sessão no banco e limpa automaticamente se estiver expirada (Lazy Cleanup)
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(handler.SessionCookieName)
		if err != nil || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Acesso não autorizado"})
			return
		}

		db := handler.GetDB()
		hashedToken := handler.HashSessionToken(token)

		// 1. Busca a sessão no banco
		var session schemas.Session
		if err := db.Where("token = ?", hashedToken).First(&session).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Sessão inválida ou não encontrada"})
			return
		}

		// 2. Limpeza sob demanda: Se a sessão expirou, deleta do banco na hora e manda pro login!
		if session.ExpiresAt.Before(time.Now()) {
			db.Delete(&session)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Sessão expirada. Faça login novamente."})
			return
		}

		// 3. Busca o usuário dono da sessão
		var user schemas.User
		if err := db.Where("id = ?", session.UserID).First(&user).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Usuário não encontrado"})
			return
		}

		c.Set("currentUser", &user)
		c.Next()
	}
}

// RequireRole garante que o usuário logado possui um dos papéis autorizados
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userVal, exists := c.Get("currentUser")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
			return
		}

		user, ok := userVal.(*schemas.User)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Erro interno ao ler usuário"})
			return
		}

		for _, role := range allowedRoles {
			if user.Role == role {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Acesso não autorizado para o seu perfil"})
	}
}
