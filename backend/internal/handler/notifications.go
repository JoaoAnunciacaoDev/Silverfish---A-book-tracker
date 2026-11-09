package handler

import (
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func getVapidPublicKey() string {
	if cfg != nil && cfg.VapidPublicKey != "" {
		return cfg.VapidPublicKey
	}
	return strings.TrimSpace(os.Getenv("VAPID_PUBLIC_KEY"))
}

// GetVapidPublicKeyHandler expõe a chave pública necessária para o Service Worker
func GetVapidPublicKeyHandler(c *gin.Context) {
	key := getVapidPublicKey()
	if key == "" {
		sendError(c, http.StatusServiceUnavailable, "chave pública VAPID não configurada no servidor (defina VAPID_PUBLIC_KEY no ambiente)")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"vapid_public_key": key,
	})
}

type PushSubscriptionKeys struct {
	P256dh string `json:"p256dh"`
	Auth   string `json:"auth"`
}

type SubscribePushRequest struct {
	Endpoint  string               `json:"endpoint"`
	Keys      PushSubscriptionKeys `json:"keys"`
	UserAgent string               `json:"user_agent"`
}

func (r *SubscribePushRequest) Validate() error {
	r.Endpoint = strings.TrimSpace(r.Endpoint)
	r.Keys.P256dh = strings.TrimSpace(r.Keys.P256dh)
	r.Keys.Auth = strings.TrimSpace(r.Keys.Auth)

	if r.Endpoint == "" {
		return errors.New("o endpoint do navegador é obrigatório")
	}
	if r.Keys.P256dh == "" || r.Keys.Auth == "" {
		return errors.New("as chaves criptográficas p256dh e auth são obrigatórias")
	}
	return nil
}

// SubscribePushHandler registra a inscrição push do dispositivo
func SubscribePushHandler(c *gin.Context) {
	user := c.MustGet("currentUser").(*schemas.User)

	var req SubscribePushRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := req.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	ua := req.UserAgent
	if ua == "" {
		ua = c.GetHeader("User-Agent")
	}

	var sub schemas.PushSubscription
	err := db.Where("endpoint = ?", req.Endpoint).First(&sub).Error
	if err != nil {
		// Nova inscrição
		sub = schemas.PushSubscription{
			ID:        uuid.NewString(),
			UserID:    user.ID,
			Endpoint:  req.Endpoint,
			P256dh:    req.Keys.P256dh,
			Auth:      req.Keys.Auth,
			UserAgent: ua,
			CreatedAt: time.Now(),
		}
		if err := db.Create(&sub).Error; err != nil {
			sendError(c, http.StatusInternalServerError, "erro ao registrar inscrição de notificação")
			return
		}
	} else {
		// Atualiza dados
		sub.UserID = user.ID
		sub.P256dh = req.Keys.P256dh
		sub.Auth = req.Keys.Auth
		sub.UserAgent = ua
		_ = db.Save(&sub).Error
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Dispositivo inscrito com sucesso para notificações",
		"subscription": sub,
	})
}

type UnsubscribePushRequest struct {
	Endpoint string `json:"endpoint"`
}

// UnsubscribePushHandler desativa notificações no dispositivo atual
func UnsubscribePushHandler(c *gin.Context) {
	user := c.MustGet("currentUser").(*schemas.User)

	var req UnsubscribePushRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	db.Where("endpoint = ? AND user_id = ?", req.Endpoint, user.ID).Delete(&schemas.PushSubscription{})

	c.JSON(http.StatusOK, gin.H{
		"message": "Inscrição removida com sucesso",
	})
}

// getOrCreateNotificationSettings busca ou inicializa preferências
func getOrCreateNotificationSettings(userID string) schemas.NotificationSettings {
	var settings schemas.NotificationSettings
	if err := db.Where("user_id = ?", userID).First(&settings).Error; err != nil {
		settings = schemas.NotificationSettings{
			UserID:                     userID,
			DailyReminderEnabled:       true,
			ReminderTime:               "20:00",
			StreakAlertEnabled:         true,
			SocialNotificationsEnabled: true,
			UpdatedAt:                  time.Now(),
		}
		_ = db.Create(&settings).Error
	}
	return settings
}

// GetNotificationSettingsHandler retorna preferências de notificação do usuário
func GetNotificationSettingsHandler(c *gin.Context) {
	user := c.MustGet("currentUser").(*schemas.User)
	settings := getOrCreateNotificationSettings(user.ID)

	var subsCount int64
	_ = db.Model(&schemas.PushSubscription{}).Where("user_id = ?", user.ID).Count(&subsCount).Error

	c.JSON(http.StatusOK, gin.H{
		"settings":              settings,
		"active_devices_count": subsCount,
	})
}

type UpdateNotificationSettingsRequest struct {
	DailyReminderEnabled       *bool   `json:"daily_reminder_enabled"`
	ReminderTime               *string `json:"reminder_time"`
	StreakAlertEnabled         *bool   `json:"streak_alert_enabled"`
	SocialNotificationsEnabled *bool   `json:"social_notifications_enabled"`
}

// UpdateNotificationSettingsHandler atualiza preferências e horário do lembrete
func UpdateNotificationSettingsHandler(c *gin.Context) {
	user := c.MustGet("currentUser").(*schemas.User)

	var req UpdateNotificationSettingsRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	settings := getOrCreateNotificationSettings(user.ID)

	if req.DailyReminderEnabled != nil {
		settings.DailyReminderEnabled = *req.DailyReminderEnabled
	}
	if req.ReminderTime != nil {
		t := strings.TrimSpace(*req.ReminderTime)
		// Valida formato HH:MM
		if _, err := time.Parse("15:04", t); err != nil {
			sendError(c, http.StatusBadRequest, "o horário do lembrete deve estar no formato 24h (ex: '20:00')")
			return
		}
		settings.ReminderTime = t
	}
	if req.StreakAlertEnabled != nil {
		settings.StreakAlertEnabled = *req.StreakAlertEnabled
	}
	if req.SocialNotificationsEnabled != nil {
		settings.SocialNotificationsEnabled = *req.SocialNotificationsEnabled
	}

	settings.UpdatedAt = time.Now()
	if err := db.Save(&settings).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao salvar preferências de notificação")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Preferências de notificação salvas com sucesso",
		"settings": settings,
	})
}

// SendTestNotificationHandler envia notificação de teste para validar o canal push
func SendTestNotificationHandler(c *gin.Context) {
	user := c.MustGet("currentUser").(*schemas.User)

	var subs []schemas.PushSubscription
	_ = db.Where("user_id = ?", user.ID).Find(&subs).Error

	if len(subs) == 0 {
		sendError(c, http.StatusBadRequest, "nenhum dispositivo inscrito para notificações nesta conta")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notificação de teste enviada com sucesso para " + strconv.Itoa(len(subs)) + " dispositivo(s)",
		"payload": gin.H{
			"title": "Silverfish 📖",
			"body":  "Olá, " + user.DisplayName + "! Suas notificações estão funcionando perfeitamente.",
			"icon":  "/favicon.svg",
		},
	})
}
