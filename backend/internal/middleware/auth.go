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

		// Consulta única via JOIN entre sessions e users para reduzir round-trips ao banco
		type sessionWithUser struct {
			SessionID string    `gorm:"column:session_id"`
			ExpiresAt time.Time `gorm:"column:expires_at"`
			schemas.User
		}

		var row sessionWithUser
		err = db.Table("sessions").
			Select("sessions.id AS session_id, sessions.expires_at AS expires_at, users.*").
			Joins("INNER JOIN users ON users.id = sessions.user_id").
			Where("sessions.token = ?", hashedToken).
			Take(&row).Error
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Sessão inválida ou não encontrada"})
			return
		}

		// Limpeza sob demanda: se a sessão expirou, remove e exige novo login
		if row.ExpiresAt.Before(time.Now()) {
			db.Where("id = ?", row.SessionID).Delete(&schemas.Session{})
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Sessão expirada. Faça login novamente."})
			return
		}

		user := row.User
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
