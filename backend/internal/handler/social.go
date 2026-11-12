package handler

import (
	"encoding/json"
	"fmt"
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

	type ActivityLikerSummary struct {
		ID          string `json:"id"`
		Username    string `json:"username"`
		DisplayName string `json:"display_name"`
		AvatarURL   string `json:"avatar_url"`
	}

	type ActivityFeedView struct {
		schemas.Activity
		LikesCount    int64                  `json:"likes_count"`
		HasLiked      bool                   `json:"has_liked"`
		CommentsCount int64                  `json:"comments_count"`
		LikedBy       []ActivityLikerSummary `json:"liked_by"`
	}

	feedViews := make([]ActivityFeedView, 0, len(activities))

	if len(activities) > 0 {
		actIDs := make([]string, len(activities))
		for i, act := range activities {
			actIDs[i] = act.ID
		}

		type ActCount struct {
			ActivityID string `gorm:"column:activity_id"`
			Total      int64  `gorm:"column:total"`
		}

		var likeCounts []ActCount
		_ = db.Model(&schemas.ActivityLike{}).
			Select("activity_id, COUNT(*) as total").
			Where("activity_id IN (?)", actIDs).
			Group("activity_id").
			Scan(&likeCounts).Error
		likesMap := make(map[string]int64, len(likeCounts))
		for _, lc := range likeCounts {
			likesMap[lc.ActivityID] = lc.Total
		}

		var allLikes []schemas.ActivityLike
		_ = db.Preload("User").
			Where("activity_id IN (?)", actIDs).
			Order("created_at DESC").
			Find(&allLikes).Error

		likedByMap := make(map[string][]ActivityLikerSummary, len(activities))
		userLikedMap := make(map[string]bool, len(activities))
		for _, like := range allLikes {
			if like.UserID == user.ID {
				userLikedMap[like.ActivityID] = true
			}
			if like.User.ID != "" && len(likedByMap[like.ActivityID]) < 3 {
				likedByMap[like.ActivityID] = append(likedByMap[like.ActivityID], ActivityLikerSummary{
					ID:          like.User.ID,
					Username:    like.User.Username,
					DisplayName: like.User.DisplayName,
					AvatarURL:   like.User.AvatarURL,
				})
			}
		}

		var commentCounts []ActCount
		_ = db.Model(&schemas.ActivityComment{}).
			Select("activity_id, COUNT(*) as total").
			Where("activity_id IN (?)", actIDs).
			Group("activity_id").
			Scan(&commentCounts).Error
		commentsMap := make(map[string]int64, len(commentCounts))
		for _, cc := range commentCounts {
			commentsMap[cc.ActivityID] = cc.Total
		}

		for _, act := range activities {
			likedBy := likedByMap[act.ID]
			if likedBy == nil {
				likedBy = []ActivityLikerSummary{}
			}
			feedViews = append(feedViews, ActivityFeedView{
				Activity:      act,
				LikesCount:    likesMap[act.ID],
				HasLiked:      userLikedMap[act.ID],
				CommentsCount: commentsMap[act.ID],
				LikedBy:       likedBy,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"activities": feedViews,
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

	// Período de referência: por padrão anual (com suporte a seleção de ano ou mês)
	nowStr := getTodayInTimezone(user.Timezone)
	year := strings.TrimSpace(c.Query("year"))
	month := strings.TrimSpace(c.Query("month"))

	isAnnual := false
	var startPeriod, endPeriod string
	var startPages, endPages string
	var periodLabelYear string

	if year != "" {
		isAnnual = true
		startPeriod = year + "-01-01 00:00:00"
		endPeriod = year + "-12-31 23:59:59"
		startPages = year + "-01-01"
		endPages = year + "-12-31"
		periodLabelYear = year
	} else if month != "" {
		mStart, mEnd, ok := getMonthDateBounds(month)
		if !ok {
			sendError(c, http.StatusBadRequest, "formato de mes invalido (use YYYY-MM)")
			return
		}
		startPeriod = mStart + " 00:00:00"
		endPeriod = mEnd + " 23:59:59"
		startPages = mStart
		endPages = mEnd
	} else {
		// Padrão: ano corrente
		isAnnual = true
		year = nowStr[:4]
		startPeriod = year + "-01-01 00:00:00"
		endPeriod = year + "-12-31 23:59:59"
		startPages = year + "-01-01"
		endPages = year + "-12-31"
		periodLabelYear = year
	}

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

	type ParticipantScore struct {
		UserID string `gorm:"column:user_id"`
		Total  int64  `gorm:"column:total"`
	}

	bookCountsMap := make(map[string]int)
	pageSumsMap := make(map[string]int)
	historiesByUser := make(map[string][]schemas.GoalHistory)

	switch criterion {
	case "books":
		var bookCounts []ParticipantScore
		_ = db.Model(&schemas.UserBook{}).
			Select("user_id, COUNT(*) as total").
			Where("user_id IN (?) AND status = ? AND finished_at BETWEEN ? AND ?", participantIDs, schemas.StatusRead, startPeriod, endPeriod).
			Group("user_id").
			Scan(&bookCounts).Error
		for _, bc := range bookCounts {
			bookCountsMap[bc.UserID] = int(bc.Total)
		}
	case "streak":
		var allHistories []schemas.GoalHistory
		_ = db.Where("user_id IN (?)", participantIDs).Order("date DESC").Find(&allHistories).Error
		for _, gh := range allHistories {
			historiesByUser[gh.UserID] = append(historiesByUser[gh.UserID], gh)
		}
	default: // "pages"
		var pageSums []ParticipantScore
		_ = db.Model(&schemas.ReadingSession{}).
			Select("user_id, COALESCE(SUM(pages_read), 0) as total").
			Where("user_id IN (?) AND read_at >= ? AND read_at <= ?", participantIDs, startPages, endPages).
			Group("user_id").
			Scan(&pageSums).Error
		for _, ps := range pageSums {
			pageSumsMap[ps.UserID] = int(ps.Total)
		}
	}

	for _, p := range participants {
		score := 0
		var label string

		switch criterion {
		case "books":
			score = bookCountsMap[p.ID]
			if isAnnual {
				label = fmt.Sprintf("livros em %s", periodLabelYear)
			} else {
				label = "livros no mês"
			}
		case "streak":
			todayP := getTodayInTimezone(p.Timezone)
			currentStreak, _ := calculateStreaks(historiesByUser[p.ID], todayP)
			score = currentStreak
			label = "dias de ofensiva"
		default: // "pages"
			score = pageSumsMap[p.ID]
			if isAnnual {
				label = fmt.Sprintf("páginas em %s", periodLabelYear)
			} else {
				label = "páginas no mês"
			}
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
		"year":        year,
		"month":       month,
		"leaderboard": entries,
		"total":       len(entries),
	})
}
