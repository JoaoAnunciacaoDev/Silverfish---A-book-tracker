package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

// AdminDashboardStatsHandler retorna métricas agregadas da plataforma para a administração
func AdminDashboardStatsHandler(c *gin.Context) {
	var totalUsers int64
	_ = db.Model(&schemas.User{}).Count(&totalUsers).Error

	var totalBooks int64
	_ = db.Model(&schemas.Book{}).Count(&totalBooks).Error

	var totalSessions int64
	_ = db.Model(&schemas.ReadingSession{}).Count(&totalSessions).Error

	var totalPagesRead int64
	_ = db.Model(&schemas.ReadingSession{}).Select("COALESCE(SUM(pages_read), 0)").Scan(&totalPagesRead).Error

	var totalReviews int64
	_ = db.Model(&schemas.BookReview{}).Count(&totalReviews).Error

	// Novos usuários nos últimos 30 dias
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	var newUsersLast30Days int64
	_ = db.Model(&schemas.User{}).Where("created_at >= ?", thirtyDaysAgo).Count(&newUsersLast30Days).Error

	// Usuários ativos no mês atual (com sessões de leitura registradas)
	currentMonth := time.Now().Format("2006-01")
	var activeUsersThisMonth int64
	_ = db.Model(&schemas.ReadingSession{}).
		Where("read_at LIKE ?", currentMonth+"%").
		Distinct("user_id").
		Count(&activeUsersThisMonth).Error

	// Leitores com maiores recordes de ofensiva
	var topUsers []schemas.User
	_ = db.Order("created_at ASC").Limit(5).Find(&topUsers).Error

	type StreakerSummary struct {
		ID          string `json:"id"`
		Username    string `json:"username"`
		DisplayName string `json:"display_name"`
		Streak      int    `json:"streak"`
	}

	streakers := make([]StreakerSummary, 0, len(topUsers))
	for _, u := range topUsers {
		var history []schemas.GoalHistory
		_ = db.Where("user_id = ?", u.ID).Order("date DESC").Find(&history).Error
		today := getTodayInTimezone(u.Timezone)
		cur, _ := calculateStreaks(history, today)
		streakers = append(streakers, StreakerSummary{
			ID:          u.ID,
			Username:    u.Username,
			DisplayName: u.DisplayName,
			Streak:      cur,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"overview": gin.H{
			"total_users":              totalUsers,
			"new_users_last_30_days":   newUsersLast30Days,
			"active_users_this_month":  activeUsersThisMonth,
			"total_books":              totalBooks,
			"total_sessions":           totalSessions,
			"total_pages_read":         totalPagesRead,
			"total_reviews":            totalReviews,
		},
		"top_streakers": streakers,
	})
}

type AdminUserView struct {
	ID             string    `json:"id"`
	Email          string    `json:"email"`
	Username       string    `json:"username"`
	DisplayName    string    `json:"display_name"`
	Role           string    `json:"role"`
	IsPrivate      bool      `json:"is_private"`
	TotalPagesRead int64     `json:"total_pages_read"`
	TotalBooksRead int64     `json:"total_books_read"`
	CreatedAt      time.Time `json:"created_at"`
}

// AdminListUsersHandler lista todos os usuários da plataforma com paginação e filtros
func AdminListUsersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	queryStr := strings.TrimSpace(c.Query("q"))
	roleFilter := strings.TrimSpace(c.Query("role"))

	query := db.Model(&schemas.User{})

	if queryStr != "" {
		pattern := "%" + queryStr + "%"
		query = query.Where("username LIKE ? OR email LIKE ? OR display_name LIKE ?", pattern, pattern, pattern)
	}

	if roleFilter != "" {
		query = query.Where("role = ?", strings.ToUpper(roleFilter))
	}

	var total int64
	query.Count(&total)

	var users []schemas.User
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao listar usuários")
		return
	}

	userViews := make([]AdminUserView, 0, len(users))
	for _, u := range users {
		var pages int64
		_ = db.Model(&schemas.ReadingSession{}).Where("user_id = ?", u.ID).Select("COALESCE(SUM(pages_read), 0)").Scan(&pages).Error

		var books int64
		_ = db.Model(&schemas.UserBook{}).Where("user_id = ? AND status = ?", u.ID, schemas.StatusRead).Count(&books).Error

		userViews = append(userViews, AdminUserView{
			ID:             u.ID,
			Email:          u.Email,
			Username:       u.Username,
			DisplayName:    u.DisplayName,
			Role:           u.Role,
			IsPrivate:      u.IsPrivate,
			TotalPagesRead: pages,
			TotalBooksRead: books,
			CreatedAt:      u.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"users": userViews,
		"page":  page,
		"limit": limit,
		"total": total,
	})
}

type UpdateUserRoleRequest struct {
	Role string `json:"role"`
}

// AdminUpdateUserRoleHandler altera os privilégios de um usuário (USER ou SUPERUSER)
func AdminUpdateUserRoleHandler(c *gin.Context) {
	currentAdmin := c.MustGet("currentUser").(*schemas.User)
	userID := c.Param("id")

	var req UpdateUserRoleRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	newRole := strings.ToUpper(strings.TrimSpace(req.Role))
	if newRole != "USER" && newRole != "SUPERUSER" {
		sendError(c, http.StatusBadRequest, "o papel deve ser 'USER' ou 'SUPERUSER'")
		return
	}

	// Impede que o próprio admin revogue seus próprios privilégios
	if currentAdmin.ID == userID && newRole != "SUPERUSER" {
		sendError(c, http.StatusForbidden, "você não pode remover seus próprios privilégios de administrador")
		return
	}

	var targetUser schemas.User
	if err := db.First(&targetUser, "id = ?", userID).Error; err != nil {
		sendError(c, http.StatusNotFound, "usuário não encontrado")
		return
	}

	targetUser.Role = newRole
	targetUser.UpdatedAt = time.Now()

	if err := db.Save(&targetUser).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao alterar papel do usuário")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Papel do usuário atualizado com sucesso",
		"user_id": targetUser.ID,
		"role":    targetUser.Role,
	})
}
