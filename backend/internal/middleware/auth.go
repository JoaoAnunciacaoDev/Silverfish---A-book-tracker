package middleware

import (
	"net/http"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/auth"
	"github.com/gin-gonic/gin"
)

// RequireAuth valida o cookie de sessão via HMAC e injeta o usuário no contexto
func RequireAuth(authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(auth.SessionCookieName)
		if err != nil || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Acesso não autorizado"})
			return
		}

		user, err := authService.ValidateSession(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Sessão inválida ou expirada"})
			return
		}

		c.Set("currentUser", user)
		c.Next()
	}
}

// RequireRole garante que o usuário logado possui um dos papéis autorizados (ex: "SUPERUSER")
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userVal, exists := c.Get("currentUser")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
			return
		}

		user, ok := userVal.(*auth.User)
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
