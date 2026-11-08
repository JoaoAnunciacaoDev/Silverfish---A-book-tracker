package handler

import (
	"net/http"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

func LogoutHandler(c *gin.Context) {
	token, err := c.Cookie(SessionCookieName)
	if err == nil && token != "" {
		hashedToken := HashSessionToken(token)
		db.Where("token = ?", hashedToken).Delete(&schemas.Session{})
	}

	isProd := cfg.Env == "production"
	c.SetCookie(SessionCookieName, "", -1, "/", "", isProd, true)

	sendSuccess(c, http.StatusOK, "Logout realizado com sucesso", nil)
}
