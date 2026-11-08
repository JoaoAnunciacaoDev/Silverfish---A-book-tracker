package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RecordActivity cria um evento de atividade no feed social
func RecordActivity(txOrDb *gorm.DB, userID string, activityType string, bookID *string, metadata map[string]interface{}) error {
	var metaStr string
	if metadata != nil {
		bytes, err := json.Marshal(metadata)
		if err == nil {
			metaStr = string(bytes)
		}
	}

	activity := schemas.Activity{
		ID:        uuid.NewString(),
		UserID:    userID,
		Type:      activityType,
		BookID:    bookID,
		Metadata:  metaStr,
		CreatedAt: time.Now(),
	}

	return txOrDb.Create(&activity).Error
}

// GetFeedHandler retorna as atividades recentes de amigos e do próprio usuário
func GetFeedHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Busca IDs dos usuários seguidos com status accepted
	var followingIDs []string
	_ = db.Model(&schemas.Follow{}).
		Where("follower_id = ? AND status = ?", user.ID, schemas.FollowStatusAccepted).
		Pluck("following_id", &followingIDs).Error

	// Inclui também as atividades do próprio usuário
	targetUserIDs := append(followingIDs, user.ID)

	var total int64
	db.Model(&schemas.Activity{}).Where("user_id IN (?)", targetUserIDs).Count(&total)

	var activities []schemas.Activity
	if err := db.Preload("User").Preload("Book").
		Where("user_id IN (?)", targetUserIDs).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&activities).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao carregar feed social")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"activities": activities,
		"page":       page,
		"limit":      limit,
		"total":      total,
	})
}

// FollowUserHandler segue um usuário pelo username
func FollowUserHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	username := strings.TrimSpace(c.Param("username"))

	if strings.EqualFold(username, user.Username) {
		sendError(c, http.StatusBadRequest, "você não pode seguir a si mesmo")
		return
	}

	var targetUser schemas.User
	if err := db.Where("username = ?", username).First(&targetUser).Error; err != nil {
		sendError(c, http.StatusNotFound, "usuário não encontrado")
		return
	}

	var existingFollow schemas.Follow
	err := db.Where("follower_id = ? AND following_id = ?", user.ID, targetUser.ID).First(&existingFollow).Error
	if err == nil {
		if existingFollow.Status == schemas.FollowStatusPending {
			c.JSON(http.StatusOK, gin.H{
				"message": "Solicitação para seguir já está pendente",
				"status":  existingFollow.Status,
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message": "Você já segue este usuário",
			"status":  existingFollow.Status,
		})
		return
	}

	status := schemas.FollowStatusAccepted
	if targetUser.IsPrivate {
		status = schemas.FollowStatusPending
	}

	follow := schemas.Follow{
		ID:          uuid.NewString(),
		FollowerID:  user.ID,
		FollowingID: targetUser.ID,
		Status:      status,
		CreatedAt:   time.Now(),
	}

	if err := db.Create(&follow).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao seguir usuário")
		return
	}

	message := "Agora você está seguindo @" + targetUser.Username
	if status == schemas.FollowStatusPending {
		message = "Solicitação enviada para @" + targetUser.Username
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": message,
		"status":  status,
		"follow":  follow,
	})
}

// UnfollowUserHandler cancela o relacionamento de seguidor
func UnfollowUserHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	username := strings.TrimSpace(c.Param("username"))

	var targetUser schemas.User
	if err := db.Where("username = ?", username).First(&targetUser).Error; err != nil {
		sendError(c, http.StatusNotFound, "usuário não encontrado")
		return
	}

	res := db.Where("follower_id = ? AND following_id = ?", user.ID, targetUser.ID).Delete(&schemas.Follow{})
	if res.Error != nil {
		sendError(c, http.StatusInternalServerError, "erro ao deixar de seguir")
		return
	}

	if res.RowsAffected == 0 {
		sendError(c, http.StatusBadRequest, "você não segue este usuário")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Você deixou de seguir @" + targetUser.Username,
	})
}

// ListFollowersHandler lista os seguidores de um usuário
func ListFollowersHandler(c *gin.Context) {
	username := strings.TrimSpace(c.Param("username"))

	var targetUser schemas.User
	if err := db.Where("username = ?", username).First(&targetUser).Error; err != nil {
		sendError(c, http.StatusNotFound, "usuário não encontrado")
		return
	}

	var follows []schemas.Follow
	if err := db.Preload("Follower").
		Where("following_id = ? AND status = ?", targetUser.ID, schemas.FollowStatusAccepted).
		Find(&follows).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao listar seguidores")
		return
	}

	type UserSummary struct {
		ID          string `json:"id"`
		Username    string `json:"username"`
		DisplayName string `json:"display_name"`
		Bio         string `json:"bio"`
		AvatarURL   string `json:"avatar_url"`
	}

	followers := make([]UserSummary, 0, len(follows))
	for _, f := range follows {
		followers = append(followers, UserSummary{
			ID:          f.Follower.ID,
			Username:    f.Follower.Username,
			DisplayName: f.Follower.DisplayName,
			Bio:         f.Follower.Bio,
			AvatarURL:   f.Follower.AvatarURL,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"username":  targetUser.Username,
		"followers": followers,
		"total":     len(followers),
	})
}

// ListFollowingHandler lista quem o usuário segue
func ListFollowingHandler(c *gin.Context) {
	username := strings.TrimSpace(c.Param("username"))

	var targetUser schemas.User
	if err := db.Where("username = ?", username).First(&targetUser).Error; err != nil {
		sendError(c, http.StatusNotFound, "usuário não encontrado")
		return
	}

	var follows []schemas.Follow
	if err := db.Preload("Following").
		Where("follower_id = ? AND status = ?", targetUser.ID, schemas.FollowStatusAccepted).
		Find(&follows).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao listar seguidos")
		return
	}

	type UserSummary struct {
		ID          string `json:"id"`
		Username    string `json:"username"`
		DisplayName string `json:"display_name"`
		Bio         string `json:"bio"`
		AvatarURL   string `json:"avatar_url"`
	}

	following := make([]UserSummary, 0, len(follows))
	for _, f := range follows {
		following = append(following, UserSummary{
			ID:          f.Following.ID,
			Username:    f.Following.Username,
			DisplayName: f.Following.DisplayName,
			Bio:         f.Following.Bio,
			AvatarURL:   f.Following.AvatarURL,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"username":  targetUser.Username,
		"following": following,
		"total":     len(following),
	})
}

// ListPendingFollowsHandler lista as solicitações de seguidores pendentes
func ListPendingFollowsHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	var follows []schemas.Follow
	if err := db.Preload("Follower").
		Where("following_id = ? AND status = ?", user.ID, schemas.FollowStatusPending).
		Order("created_at DESC").
		Find(&follows).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao listar solicitações pendentes")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"pending_requests": follows,
		"total":            len(follows),
	})
}

type RespondFollowRequest struct {
	Action string `json:"action"` // "accept" ou "reject"
}

// RespondFollowRequestHandler aceita ou rejeita uma solicitação de seguidor
func RespondFollowRequestHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	followID := c.Param("id")

	var req RespondFollowRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	var follow schemas.Follow
	if err := db.Where("id = ? AND following_id = ?", followID, user.ID).First(&follow).Error; err != nil {
		sendError(c, http.StatusNotFound, "solicitação não encontrada")
		return
	}

	if req.Action == "accept" {
		follow.Status = schemas.FollowStatusAccepted
		if err := db.Save(&follow).Error; err != nil {
			sendError(c, http.StatusInternalServerError, "erro ao aceitar solicitação")
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Solicitação aceita com sucesso"})
	} else if req.Action == "reject" {
		if err := db.Delete(&follow).Error; err != nil {
			sendError(c, http.StatusInternalServerError, "erro ao rejeitar solicitação")
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Solicitação rejeitada com sucesso"})
	} else {
		sendError(c, http.StatusBadRequest, "ação inválida (use 'accept' ou 'reject')")
	}
}

type LeaderboardEntry struct {
	Rank          int             `json:"rank"`
	User          schemas.User    `json:"user"`
	Score         int             `json:"score"`
	ScoreLabel    string          `json:"score_label"`
	IsCurrentUser bool            `json:"is_current_user"`
	Badge         *string         `json:"badge,omitempty"`
}

// GetLeaderboardHandler calcula os rankings sociais entre seguidores e o usuário logado
func GetLeaderboardHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	criterion := strings.ToLower(c.DefaultQuery("criterion", "pages"))
	if criterion != "pages" && criterion != "books" && criterion != "streak" {
		criterion = "pages"
	}

	// Mês de referência (default: mês atual no fuso do usuário YYYY-MM)
	nowStr := getTodayInTimezone(user.Timezone)
	month := c.DefaultQuery("month", nowStr[:7])

	// Coleta IDs dos usuários participantes do ranking: quem o usuário segue aceito + ele mesmo
	var followingIDs []string
	_ = db.Model(&schemas.Follow{}).
		Where("follower_id = ? AND status = ?", user.ID, schemas.FollowStatusAccepted).
		Pluck("following_id", &followingIDs).Error

	participantIDs := append(followingIDs, user.ID)

	var participants []schemas.User
	if err := db.Where("id IN (?)", participantIDs).Find(&participants).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao carregar participantes do ranking")
		return
	}

	var entries []LeaderboardEntry

	for _, p := range participants {
		score := 0
		var label string

		switch criterion {
		case "books":
			// Livros concluídos no mês
			startMonth := month + "-01 00:00:00"
			endMonth := month + "-31 23:59:59"
			var booksCount int64
			_ = db.Model(&schemas.UserBook{}).
				Where("user_id = ? AND status = ? AND finished_at BETWEEN ? AND ?", p.ID, schemas.StatusRead, startMonth, endMonth).
				Count(&booksCount).Error
			score = int(booksCount)
			label = "livros lidos"

		case "streak":
			// Streak atual
			var historyList []schemas.GoalHistory
			_ = db.Where("user_id = ?", p.ID).Order("date DESC").Find(&historyList).Error
			todayP := getTodayInTimezone(p.Timezone)
			currentStreak, _ := calculateStreaks(historyList, todayP)
			score = currentStreak
			label = "dias de ofensiva"

		default: // "pages"
			// Páginas lidas no mês
			var totalPages int64
			_ = db.Model(&schemas.ReadingSession{}).
				Where("user_id = ? AND read_at LIKE ?", p.ID, month+"%").
				Select("COALESCE(SUM(pages_read), 0)").
				Scan(&totalPages).Error
			score = int(totalPages)
			label = "páginas lidas"
		}

		entries = append(entries, LeaderboardEntry{
			User:          p,
			Score:         score,
			ScoreLabel:    label,
			IsCurrentUser: p.ID == user.ID,
		})
	}

	// Ordena decrescente por score
	for i := 0; i < len(entries); i++ {
		for j := i + 1; j < len(entries); j++ {
			if entries[j].Score > entries[i].Score {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}

	// Atribui posições e medalhas
	for i := range entries {
		entries[i].Rank = i + 1
		if i == 0 {
			b := "gold"
			entries[i].Badge = &b
		} else if i == 1 {
			b := "silver"
			entries[i].Badge = &b
		} else if i == 2 {
			b := "bronze"
			entries[i].Badge = &b
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"criterion":   criterion,
		"month":       month,
		"leaderboard": entries,
		"total":       len(entries),
	})
}
