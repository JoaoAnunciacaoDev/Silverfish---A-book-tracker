package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// getOrCreatePrivacySettings obtém ou inicializa as configurações de privacidade
func getOrCreatePrivacySettings(userID string) schemas.UserPrivacySettings {
	var settings schemas.UserPrivacySettings
	if err := db.Where("user_id = ?", userID).First(&settings).Error; err != nil {
		settings = schemas.UserPrivacySettings{
			ID:                uuid.NewString(),
			UserID:            userID,
			ProfileVisibility: schemas.VisibilityPublic,
			LibraryVisibility: schemas.VisibilityPublic,
			StatsVisibility:   schemas.VisibilityPublic,
			JournalVisibility: schemas.VisibilityFollowers,
			CreatedAt:         time.Now(),
			UpdatedAt:         time.Now(),
		}
		_ = db.Create(&settings).Error
	}
	return settings
}

// GetUserProfileHandler obtém o perfil de um usuário respeitando privacidade
func GetUserProfileHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	currentUser := userVal.(*schemas.User)
	username := strings.TrimSpace(c.Param("username"))

	var targetUser schemas.User
	if err := db.Where("username = ?", username).First(&targetUser).Error; err != nil {
		sendError(c, http.StatusNotFound, "usuário não encontrado")
		return
	}

	isSelf := targetUser.ID == currentUser.ID

	// Checa relação de follow
	var follow schemas.Follow
	isFollowing := false
	isPending := false
	if !isSelf {
		if err := db.Where("follower_id = ? AND following_id = ?", currentUser.ID, targetUser.ID).First(&follow).Error; err == nil {
			if follow.Status == schemas.FollowStatusAccepted {
				isFollowing = true
			} else if follow.Status == schemas.FollowStatusPending {
				isPending = true
			}
		}
	}

	var reverseFollow schemas.Follow
	isFollowedBy := false
	if !isSelf {
		if err := db.Where("follower_id = ? AND following_id = ? AND status = ?", targetUser.ID, currentUser.ID, schemas.FollowStatusAccepted).First(&reverseFollow).Error; err == nil {
			isFollowedBy = true
		}
	}

	// Contadores sociais
	var followersCount int64
	var followingCount int64
	_ = db.Model(&schemas.Follow{}).Where("following_id = ? AND status = ?", targetUser.ID, schemas.FollowStatusAccepted).Count(&followersCount).Error
	_ = db.Model(&schemas.Follow{}).Where("follower_id = ? AND status = ?", targetUser.ID, schemas.FollowStatusAccepted).Count(&followingCount).Error

	privacy := getOrCreatePrivacySettings(targetUser.ID)

	canViewFullProfile := isSelf || !targetUser.IsPrivate || isFollowing

	response := gin.H{
		"id":              targetUser.ID,
		"username":        targetUser.Username,
		"display_name":    targetUser.DisplayName,
		"bio":             targetUser.Bio,
		"avatar_url":      targetUser.AvatarURL,
		"is_private":      targetUser.IsPrivate,
		"is_self":         isSelf,
		"is_following":    isFollowing,
		"is_pending":      isPending,
		"is_followed_by":  isFollowedBy,
		"followers_count": followersCount,
		"following_count": followingCount,
		"can_view_full":   canViewFullProfile,
		"created_at":      targetUser.CreatedAt,
	}

	if canViewFullProfile {
		// Estatísticas públicas
		canViewStats := isSelf || privacy.StatsVisibility == schemas.VisibilityPublic || (privacy.StatsVisibility == schemas.VisibilityFollowers && isFollowing)
		if canViewStats {
			var totalPages int64
			_ = db.Model(&schemas.ReadingSession{}).Where("user_id = ?", targetUser.ID).Select("COALESCE(SUM(pages_read), 0)").Scan(&totalPages).Error

			var totalBooksRead int64
			_ = db.Model(&schemas.UserBook{}).Where("user_id = ? AND status = ?", targetUser.ID, schemas.StatusRead).Count(&totalBooksRead).Error

			var historyList []schemas.GoalHistory
			_ = db.Where("user_id = ?", targetUser.ID).Order("date DESC").Find(&historyList).Error
			today := getTodayInTimezone(targetUser.Timezone)
			currentStreak, bestStreak := calculateStreaks(historyList, today)

			response["stats"] = gin.H{
				"total_pages_read": totalPages,
				"total_books_read": totalBooksRead,
				"current_streak":   currentStreak,
				"best_streak":      bestStreak,
			}
		}

		// Conquistas desbloqueadas
		var userAchievements []schemas.UserAchievement
		_ = db.Preload("Achievement").Where("user_id = ?", targetUser.ID).Order("unlocked_at DESC").Find(&userAchievements).Error
		response["achievements"] = userAchievements

		// Livros da estante pública
		canViewLibrary := isSelf || privacy.LibraryVisibility == schemas.VisibilityPublic || (privacy.LibraryVisibility == schemas.VisibilityFollowers && isFollowing)
		if canViewLibrary {
			var userBooks []schemas.UserBook
			_ = db.Preload("Book").Where("user_id = ?", targetUser.ID).Order("updated_at DESC").Find(&userBooks).Error
			response["library"] = userBooks
		}
	}

	c.JSON(http.StatusOK, response)
}

type UpdateProfileRequest struct {
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	AvatarURL   *string `json:"avatar_url"`
	Timezone    *string `json:"timezone"`
	IsPrivate   *bool   `json:"is_private"`
}

func (r *UpdateProfileRequest) Validate() error {
	if r.DisplayName != nil {
		*r.DisplayName = strings.TrimSpace(*r.DisplayName)
		if len([]rune(*r.DisplayName)) < 2 || len([]rune(*r.DisplayName)) > 50 {
			return errors.New("o nome de exibição deve ter entre 2 e 50 caracteres")
		}
	}
	if r.Bio != nil {
		*r.Bio = strings.TrimSpace(*r.Bio)
		if len([]rune(*r.Bio)) > 250 {
			return errors.New("a biografia não pode ultrapassar 250 caracteres")
		}
	}
	if r.Timezone != nil {
		*r.Timezone = strings.TrimSpace(*r.Timezone)
		if _, err := time.LoadLocation(*r.Timezone); err != nil {
			return errors.New("fuso horário inválido")
		}
	}
	return nil
}

// UpdateProfileHandler atualiza as informações do perfil do usuário logado
func UpdateProfileHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	var req UpdateProfileRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := req.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	if req.DisplayName != nil {
		user.DisplayName = *req.DisplayName
	}
	if req.Bio != nil {
		user.Bio = *req.Bio
	}
	if req.AvatarURL != nil {
		user.AvatarURL = *req.AvatarURL
	}
	if req.Timezone != nil {
		user.Timezone = *req.Timezone
	}
	if req.IsPrivate != nil {
		user.IsPrivate = *req.IsPrivate
	}

	user.UpdatedAt = time.Now()
	if err := db.Save(user).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao salvar alterações de perfil")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Perfil atualizado com sucesso",
		"user":    user,
	})
}

// GetPrivacySettingsHandler obtém as configurações de privacidade do usuário
func GetPrivacySettingsHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	settings := getOrCreatePrivacySettings(user.ID)

	c.JSON(http.StatusOK, gin.H{
		"privacy":    settings,
		"is_private": user.IsPrivate,
	})
}

type UpdatePrivacySettingsRequest struct {
	ProfileVisibility *string `json:"profile_visibility"`
	LibraryVisibility *string `json:"library_visibility"`
	StatsVisibility   *string `json:"stats_visibility"`
	JournalVisibility *string `json:"journal_visibility"`
	IsPrivate         *bool   `json:"is_private"`
}

func isValidVisibility(v string) bool {
	return v == schemas.VisibilityPublic || v == schemas.VisibilityFollowers || v == schemas.VisibilityPrivate
}

// UpdatePrivacySettingsHandler altera a privacidade do perfil e módulos
func UpdatePrivacySettingsHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	var req UpdatePrivacySettingsRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	settings := getOrCreatePrivacySettings(user.ID)

	if req.ProfileVisibility != nil {
		if !isValidVisibility(*req.ProfileVisibility) {
			sendError(c, http.StatusBadRequest, "visibilidade de perfil inválida")
			return
		}
		settings.ProfileVisibility = *req.ProfileVisibility
	}
	if req.LibraryVisibility != nil {
		if !isValidVisibility(*req.LibraryVisibility) {
			sendError(c, http.StatusBadRequest, "visibilidade da estante inválida")
			return
		}
		settings.LibraryVisibility = *req.LibraryVisibility
	}
	if req.StatsVisibility != nil {
		if !isValidVisibility(*req.StatsVisibility) {
			sendError(c, http.StatusBadRequest, "visibilidade das estatísticas inválida")
			return
		}
		settings.StatsVisibility = *req.StatsVisibility
	}
	if req.JournalVisibility != nil {
		if !isValidVisibility(*req.JournalVisibility) {
			sendError(c, http.StatusBadRequest, "visibilidade do diário inválida")
			return
		}
		settings.JournalVisibility = *req.JournalVisibility
	}

	settings.UpdatedAt = time.Now()
	if err := db.Save(&settings).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao atualizar configurações de privacidade")
		return
	}

	if req.IsPrivate != nil && *req.IsPrivate != user.IsPrivate {
		user.IsPrivate = *req.IsPrivate
		_ = db.Model(user).Update("is_private", user.IsPrivate).Error
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Configurações de privacidade salvas com sucesso",
		"privacy":    settings,
		"is_private": user.IsPrivate,
	})
}

// SearchUsersHandler busca leitores na comunidade
func SearchUsersHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	query := strings.TrimSpace(c.Query("q"))

	if query == "" {
		c.JSON(http.StatusOK, gin.H{"users": []interface{}{}})
		return
	}

	searchPattern := "%" + query + "%"
	var users []schemas.User
	if err := db.Where("(username LIKE ? OR display_name LIKE ?) AND id != ?", searchPattern, searchPattern, user.ID).
		Limit(20).
		Find(&users).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro na busca de leitores")
		return
	}

	// Mapeia quem o usuário já segue
	var followingIDs []string
	_ = db.Model(&schemas.Follow{}).
		Where("follower_id = ? AND status = ?", user.ID, schemas.FollowStatusAccepted).
		Pluck("following_id", &followingIDs).Error

	followingMap := make(map[string]bool)
	for _, id := range followingIDs {
		followingMap[id] = true
	}

	type UserSearchResult struct {
		ID          string `json:"id"`
		Username    string `json:"username"`
		DisplayName string `json:"display_name"`
		Bio         string `json:"bio"`
		AvatarURL   string `json:"avatar_url"`
		IsPrivate   bool   `json:"is_private"`
		IsFollowing bool   `json:"is_following"`
	}

	results := make([]UserSearchResult, 0, len(users))
	for _, u := range users {
		results = append(results, UserSearchResult{
			ID:          u.ID,
			Username:    u.Username,
			DisplayName: u.DisplayName,
			Bio:         u.Bio,
			AvatarURL:   u.AvatarURL,
			IsPrivate:   u.IsPrivate,
			IsFollowing: followingMap[u.ID],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"users": results,
		"total": len(results),
	})
}
