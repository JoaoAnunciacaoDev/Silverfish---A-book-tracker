package handler

import (
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var defaultAchievements = []schemas.Achievement{
	{
		ID:          "ach-1",
		Code:        "first_session",
		Title:       "É apenas o começo",
		Description: "Registrou sua primeira sessão de leitura no Silverfish",
		Icon:        "BookOpen",
		Category:    "reading",
		TargetValue: 1,
	},
	{
		ID:          "ach-2",
		Code:        "pages_100",
		Title:       "Centurião",
		Description: "Alcançou a marca de 100 páginas lidas",
		Icon:        "Sparkles",
		Category:    "pages",
		TargetValue: 100,
	},
	{
		ID:          "ach-3",
		Code:        "pages_500",
		Title:       "Meio Milhar",
		Description: "Alcançou a marca de 500 páginas lidas",
		Icon:        "Zap",
		Category:    "pages",
		TargetValue: 500,
	},
	{
		ID:          "ach-4",
		Code:        "pages_1000",
		Title:       "Leitor em Crescimento",
		Description: "Devorou mais de 1.000 páginas no Silverfish",
		Icon:        "Award",
		Category:    "pages",
		TargetValue: 1000,
	},
	{
		ID:          "ach-5",
		Code:        "first_book",
		Title:       "Conquista Literária",
		Description: "Completou a leitura do seu primeiro livro",
		Icon:        "CheckCircle2",
		Category:    "books",
		TargetValue: 1,
	},
	{
		ID:          "ach-6",
		Code:        "books_5",
		Title:       "Traça de Livros",
		Description: "Completou 5 livros na sua estante",
		Icon:        "Library",
		Category:    "books",
		TargetValue: 5,
	},
	{
		ID:          "ach-7",
		Code:        "books_10",
		Title:       "Devorador de Histórias",
		Description: "Completou 10 livros na sua estante",
		Icon:        "Crown",
		Category:    "books",
		TargetValue: 10,
	},
	{
		ID:          "ach-8",
		Code:        "streak_3",
		Title:       "Embalando o Hábito",
		Description: "Manteve 3 dias consecutivos de meta diária batida",
		Icon:        "Flame",
		Category:    "streak",
		TargetValue: 3,
	},
	{
		ID:          "ach-9",
		Code:        "streak_7",
		Title:       "Disciplina",
		Description: "Manteve uma ofensiva de 7 dias consecutivos",
		Icon:        "Flame",
		Category:    "streak",
		TargetValue: 7,
	},
	{
		ID:          "ach-10",
		Code:        "streak_30",
		Title:       "Virou Rotina",
		Description: "Manteve uma ofensiva lendária de 30 dias consecutivos",
		Icon:        "Flame",
		Category:    "streak",
		TargetValue: 30,
	},
	{
		ID:          "ach-11",
		Code:        "first_review",
		Title:       "Crítico Literário",
		Description: "Publicou sua primeira avaliação de um livro lido",
		Icon:        "Star",
		Category:    "social",
		TargetValue: 1,
	},
	{
		ID:          "ach-12",
		Code:        "shelf_10",
		Title:       "Colecionador",
		Description: "Adicionou 10 ou mais livros à sua estante pessoal",
		Icon:        "Layers",
		Category:    "shelf",
		TargetValue: 10,
	},
	{
		ID:          "ach-13",
		Code:        "varied_feelings",
		Title:       "Montanha-Russa de Emoções",
		Description: "Experimentou 4 ou mais sentimentos diferentes ao registrar leituras",
		Icon:        "Smile",
		Category:    "reading",
		TargetValue: 4,
	},
}

// SeedAchievements popula as conquistas padrão se ainda não existirem ou sincroniza se foram editadas
func SeedAchievements(database *gorm.DB) {
	for _, ach := range defaultAchievements {
		var existing schemas.Achievement
		if err := database.Where("code = ?", ach.Code).First(&existing).Error; err != nil {
			ach.CreatedAt = time.Now()
			_ = database.Create(&ach).Error
		} else {
			// Atualiza títulos, descrições, ícones e categorias caso tenham sido editados no código
			_ = database.Model(&existing).Updates(map[string]interface{}{
				"title":        ach.Title,
				"description":  ach.Description,
				"icon":         ach.Icon,
				"category":     ach.Category,
				"target_value": ach.TargetValue,
			}).Error
		}
	}
}

// CheckAndUnlockAchievements avalia e desbloqueia conquistas pendentes do usuário
func CheckAndUnlockAchievements(tx *gorm.DB, userID string) []schemas.Achievement {
	var newlyUnlocked []schemas.Achievement

	// Mapeia conquistas já desbloqueadas
	var userAchs []schemas.UserAchievement
	tx.Where("user_id = ?", userID).Find(&userAchs)
	unlockedMap := make(map[string]bool)
	for _, ua := range userAchs {
		unlockedMap[ua.AchievementCode] = true
	}

	// 1. Contagem de sessões
	var sessionCount int64
	tx.Model(&schemas.ReadingSession{}).Where("user_id = ?", userID).Count(&sessionCount)

	// 2. Total de páginas lidas
	var totalPages int64
	tx.Model(&schemas.ReadingSession{}).Where("user_id = ?", userID).Select("COALESCE(SUM(pages_read), 0)").Scan(&totalPages)

	// 3. Livros concluídos
	var booksReadCount int64
	tx.Model(&schemas.UserBook{}).Where("user_id = ? AND status = ?", userID, schemas.StatusRead).Count(&booksReadCount)

	// 4. Livros na estante
	var shelfCount int64
	tx.Model(&schemas.UserBook{}).Where("user_id = ?", userID).Count(&shelfCount)

	// 5. Avaliações feitas
	var reviewCount int64
	tx.Model(&schemas.BookReview{}).Where("user_id = ?", userID).Count(&reviewCount)

	// 6. Sentimentos distintos
	var feelingCount int64
	tx.Model(&schemas.ReadingSession{}).Where("user_id = ? AND feeling IS NOT NULL AND feeling != ''", userID).Distinct("feeling").Count(&feelingCount)

	// 7. Melhor streak histórico
	var historyList []schemas.GoalHistory
	tx.Where("user_id = ?", userID).Order("date DESC").Find(&historyList)
	_, bestStreak := calculateStreaks(historyList, time.Now().Format("2006-01-02"))

	qualifies := func(code string) bool {
		switch code {
		case "first_session":
			return sessionCount >= 1
		case "pages_100":
			return totalPages >= 100
		case "pages_500":
			return totalPages >= 500
		case "pages_1000":
			return totalPages >= 1000
		case "first_book":
			return booksReadCount >= 1
		case "books_5":
			return booksReadCount >= 5
		case "books_10":
			return booksReadCount >= 10
		case "streak_3":
			return bestStreak >= 3
		case "streak_7":
			return bestStreak >= 7
		case "streak_30":
			return bestStreak >= 30
		case "first_review":
			return reviewCount >= 1
		case "shelf_10":
			return shelfCount >= 10
		case "varied_feelings":
			return feelingCount >= 4
		default:
			return false
		}
	}

	now := time.Now()
	for _, ach := range defaultAchievements {
		if !unlockedMap[ach.Code] && qualifies(ach.Code) {
			ua := schemas.UserAchievement{
				ID:              uuid.NewString(),
				UserID:          userID,
				AchievementCode: ach.Code,
				UnlockedAt:      now,
			}
			if err := tx.Create(&ua).Error; err == nil {
				unlockedMap[ach.Code] = true
				newlyUnlocked = append(newlyUnlocked, ach)
				_ = RecordActivity(tx, userID, schemas.ActivityAchievementUnlocked, nil, map[string]interface{}{
					"code":        ach.Code,
					"title":       ach.Title,
					"description": ach.Description,
					"icon":        ach.Icon,
				})
			}
		}
	}

	return newlyUnlocked
}

type AchievementView struct {
	Code            string     `json:"code"`
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	Icon            string     `json:"icon"`
	Category        string     `json:"category"`
	TargetValue     int        `json:"target_value"`
	CurrentValue    int        `json:"current_value"`
	ProgressPercent int        `json:"progress_percent"`
	Unlocked        bool       `json:"unlocked"`
	UnlockedAt      *time.Time `json:"unlocked_at"`
}

// ListAchievementsHandler lista todas as medalhas e o progresso do usuário
func ListAchievementsHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	// Garante que conquistas recém-alcançadas sejam avaliadas
	newly := CheckAndUnlockAchievements(db, user.ID)

	var achievements []schemas.Achievement
	if err := db.Order("target_value ASC").Find(&achievements).Error; err != nil {
		achievements = defaultAchievements
	}

	var userAchs []schemas.UserAchievement
	db.Where("user_id = ?", user.ID).Find(&userAchs)
	unlockedMap := make(map[string]time.Time)
	for _, ua := range userAchs {
		unlockedMap[ua.AchievementCode] = ua.UnlockedAt
	}

	// Métricas atuais do usuário
	var sessionCount int64
	db.Model(&schemas.ReadingSession{}).Where("user_id = ?", user.ID).Count(&sessionCount)

	var totalPages int64
	db.Model(&schemas.ReadingSession{}).Where("user_id = ?", user.ID).Select("COALESCE(SUM(pages_read), 0)").Scan(&totalPages)

	var booksReadCount int64
	db.Model(&schemas.UserBook{}).Where("user_id = ? AND status = ?", user.ID, schemas.StatusRead).Count(&booksReadCount)

	var shelfCount int64
	db.Model(&schemas.UserBook{}).Where("user_id = ?", user.ID).Count(&shelfCount)

	var reviewCount int64
	db.Model(&schemas.BookReview{}).Where("user_id = ?", user.ID).Count(&reviewCount)

	var feelingCount int64
	db.Model(&schemas.ReadingSession{}).Where("user_id = ? AND feeling IS NOT NULL AND feeling != ''", user.ID).Distinct("feeling").Count(&feelingCount)

	var historyList []schemas.GoalHistory
	db.Where("user_id = ?", user.ID).Order("date DESC").Find(&historyList)
	_, bestStreak := calculateStreaks(historyList, time.Now().Format("2006-01-02"))

	getCurrentValue := func(code string) int {
		switch code {
		case "first_session":
			return int(sessionCount)
		case "pages_100", "pages_500", "pages_1000":
			return int(totalPages)
		case "first_book", "books_5", "books_10":
			return int(booksReadCount)
		case "streak_3", "streak_7", "streak_30":
			return bestStreak
		case "first_review":
			return int(reviewCount)
		case "shelf_10":
			return int(shelfCount)
		case "varied_feelings":
			return int(feelingCount)
		default:
			return 0
		}
	}

	var views []AchievementView
	totalUnlocked := 0

	for _, ach := range achievements {
		unlockedAt, isUnlocked := unlockedMap[ach.Code]
		currentVal := getCurrentValue(ach.Code)
		progress := 0
		if ach.TargetValue > 0 {
			progress = int((float64(currentVal) / float64(ach.TargetValue)) * 100)
			if progress > 100 {
				progress = 100
			}
		}
		if isUnlocked {
			progress = 100
			totalUnlocked++
		}

		var unlockedAtPtr *time.Time
		if isUnlocked {
			unlockedAtPtr = &unlockedAt
		}

		views = append(views, AchievementView{
			Code:            ach.Code,
			Title:           ach.Title,
			Description:     ach.Description,
			Icon:            ach.Icon,
			Category:        ach.Category,
			TargetValue:     ach.TargetValue,
			CurrentValue:    currentVal,
			ProgressPercent: progress,
			Unlocked:        isUnlocked,
			UnlockedAt:      unlockedAtPtr,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"achievements":     views,
		"total_count":      len(views),
		"unlocked_count":   totalUnlocked,
		"newly_unlocked":   newly,
	})
}
