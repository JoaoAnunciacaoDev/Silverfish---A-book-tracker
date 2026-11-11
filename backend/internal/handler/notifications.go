package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func getVapidPublicKey() string {
	if cfg != nil && cfg.VapidPublicKey != "" {
		return cfg.VapidPublicKey
	}
	return strings.TrimSpace(os.Getenv("VAPID_PUBLIC_KEY"))
}

func getVapidPrivateKey() string {
	if cfg != nil && cfg.VapidPrivateKey != "" {
		return cfg.VapidPrivateKey
	}
	return strings.TrimSpace(os.Getenv("VAPID_PRIVATE_KEY"))
}

func getVapidSubject() string {
	if cfg != nil && cfg.VapidSubject != "" {
		return cfg.VapidSubject
	}
	sub := strings.TrimSpace(os.Getenv("VAPID_SUBJECT"))
	if sub == "" {
		return "mailto:suporte@silverfish.app"
	}
	return sub
}

type WebPushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Icon  string `json:"icon,omitempty"`
	Badge string `json:"badge,omitempty"`
	URL   string `json:"url,omitempty"`
}

func sendWebPush(sub schemas.PushSubscription, payload WebPushPayload) error {
	pubKey := getVapidPublicKey()
	privKey := getVapidPrivateKey()
	subject := getVapidSubject()

	if pubKey == "" || privKey == "" {
		return errors.New("chaves VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY não configuradas no servidor")
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	s := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}

	resp, err := webpush.SendNotification(payloadBytes, s, &webpush.Options{
		Subscriber:      subject,
		VAPIDPublicKey:  pubKey,
		VAPIDPrivateKey: privKey,
		TTL:             86400,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
		log.Printf("[WebPush] Dispositivo desinscrito pelo navegador (%d). Removendo: %s", resp.StatusCode, sub.ID)
		_ = db.Delete(&sub).Error
		return fmt.Errorf("inscrição expirada ou cancelada (HTTP %d)", resp.StatusCode)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("falha ao enviar push: status %d", resp.StatusCode)
	}

	return nil
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
		// Normaliza para horário em ponto (ex: '20:00')
		parts := strings.Split(t, ":")
		if h, err := strconv.Atoi(parts[0]); err == nil && h >= 0 && h <= 23 {
			t = fmt.Sprintf("%02d:00", h)
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

// SendTestNotificationHandler envia notificação de teste real para validar o canal push
func SendTestNotificationHandler(c *gin.Context) {
	user := c.MustGet("currentUser").(*schemas.User)

	var subs []schemas.PushSubscription
	_ = db.Where("user_id = ?", user.ID).Find(&subs).Error

	if len(subs) == 0 {
		sendError(c, http.StatusBadRequest, "nenhum dispositivo inscrito para notificações nesta conta. Ative o botão de lembretes no navegador primeiro.")
		return
	}

	payload := WebPushPayload{
		Title: "Silverfish 📖",
		Body:  "Olá, " + user.DisplayName + "! Suas notificações push estão funcionando perfeitamente.",
		Icon:  "/favicon.svg",
		Badge: "/favicon.svg",
		URL:   "/app/library",
	}

	sentCount := 0
	var lastErr error
	for _, sub := range subs {
		if err := sendWebPush(sub, payload); err != nil {
			log.Printf("[WebPush] Erro ao enviar teste para sub %s: %v", sub.ID, err)
			lastErr = err
		} else {
			sentCount++
		}
	}

	if sentCount == 0 && lastErr != nil {
		sendError(c, http.StatusInternalServerError, "falha ao enviar notificação: "+lastErr.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    fmt.Sprintf("Notificação de teste enviada com sucesso para %d dispositivo(s)", sentCount),
		"successful": sentCount,
		"total":      len(subs),
		"payload":    payload,
	})
}

// CronRemindersHandler verifica todos os usuários com lembrete diário ativado e envia push
// no horário configurado pelo usuário, respeitando o timezone individual de cada um.
func CronRemindersHandler(c *gin.Context) {
	// Proteção opcional por CRON_SECRET (usada pela Vercel Cron ou cron-job externo)
	expectedSecret := ""
	if cfg != nil && cfg.CronSecret != "" {
		expectedSecret = strings.TrimSpace(cfg.CronSecret)
	} else {
		expectedSecret = strings.TrimSpace(os.Getenv("CRON_SECRET"))
	}

	if expectedSecret != "" {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		querySecret := strings.TrimSpace(c.Query("secret"))
		bearerSecret := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))

		if bearerSecret != expectedSecret && querySecret != expectedSecret {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "não autorizado (CRON_SECRET inválido ou ausente)"})
			return
		}
	}

	var allSettings []schemas.NotificationSettings
	if err := db.Where("daily_reminder_enabled = ?", true).Find(&allSettings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao buscar configurações de notificação"})
		return
	}

	nowUTC := time.Now().UTC()
	var sentCount int
	var skippedReadCount int
	var skippedHourCount int
	var failedCount int

	for _, s := range allSettings {
		var user schemas.User
		if err := db.First(&user, "id = ?", s.UserID).Error; err != nil {
			continue
		}

		tz := user.Timezone
		if tz == "" {
			tz = "America/Sao_Paulo"
		}
		loc, err := time.LoadLocation(tz)
		if err != nil {
			loc, _ = time.LoadLocation("America/Sao_Paulo")
		}

		userLocal := nowUTC.In(loc)
		userToday := userLocal.Format("2006-01-02")

		// Se já foi enviado um lembrete para este usuário hoje no seu fuso, pula (evita repetições)
		if s.LastReminderDate == userToday {
			continue
		}

		// Valida se a hora local do usuário bate com o reminder_time (ex: "20:00")
		reminderTime := strings.TrimSpace(s.ReminderTime)
		if reminderTime == "" {
			reminderTime = "20:00"
		}

		parts := strings.Split(reminderTime, ":")
		if len(parts) != 2 {
			continue
		}
		targetHour, _ := strconv.Atoi(parts[0])

		// Verifica se a hora atual local coincide com a hora do lembrete
		if userLocal.Hour() != targetHour {
			skippedHourCount++
			continue
		}

		// Verifica se o usuário já realizou leitura hoje no seu timezone
		var sessionsToday int64
		_ = db.Model(&schemas.ReadingSession{}).Where("user_id = ? AND read_at = ?", user.ID, userToday).Count(&sessionsToday).Error
		if sessionsToday > 0 {
			// Já leu hoje! Marca como resolvido hoje para não notificar de novo
			s.LastReminderDate = userToday
			s.UpdatedAt = time.Now()
			_ = db.Save(&s).Error
			skippedReadCount++
			continue
		}

		// Busca inscrições push do usuário
		var subs []schemas.PushSubscription
		_ = db.Where("user_id = ?", user.ID).Find(&subs).Error
		if len(subs) == 0 {
			continue
		}

		// Monta mensagem motivacional personalizada com detecção real de ofensiva ativa
		var historyList []schemas.GoalHistory
		_ = db.Where("user_id = ?", user.ID).Order("date asc").Find(&historyList).Error
		currentStreak, _ := calculateStreaks(historyList, userToday)

		title := "Hora da leitura! 📖"
		body := fmt.Sprintf("Olá, %s! Que tal ler algumas páginas agora para manter seu hábito literário?", user.DisplayName)

		if s.StreakAlertEnabled && currentStreak > 0 {
			title = fmt.Sprintf("Não perca sua ofensiva de %d dias! 🔥", currentStreak)
			body = fmt.Sprintf("Olá, %s! Sua sequência de %d dias está em risco hoje. Leia agora para mantê-la viva! 🔥", user.DisplayName, currentStreak)
		}

		payload := WebPushPayload{
			Title: title,
			Body:  body,
			Icon:  "/favicon.svg",
			Badge: "/favicon.svg",
			URL:   "/app/library",
		}

		userSent := false
		for _, sub := range subs {
			if err := sendWebPush(sub, payload); err != nil {
				log.Printf("[WebPush] Falha ao enviar lembrete para user %s: %v", user.ID, err)
				failedCount++
			} else {
				userSent = true
				sentCount++
			}
		}

		if userSent {
			s.LastReminderDate = userToday
			s.UpdatedAt = time.Now()
			_ = db.Save(&s).Error
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":              "Cron de lembretes executado com sucesso",
		"sent_notifications":   sentCount,
		"skipped_already_read": skippedReadCount,
		"skipped_wrong_hour":   skippedHourCount,
		"failed":               failedCount,
	})
}
