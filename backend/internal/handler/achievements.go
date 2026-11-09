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
		Tier:        "bronze",
		TargetValue: 1,
	},
	{
		ID:          "ach-2",
		Code:        "pages_100",
		Title:       "Centurião",
		Description: "Alcançou a marca de 100 páginas lidas",
		Icon:        "Sparkles",
		Category:    "pages",
		Tier:        "bronze",
		TargetValue: 100,
	},
	{
		ID:          "ach-3",
		Code:        "pages_500",
		Title:       "Meio Milhar",
		Description: "Alcançou a marca de 500 páginas lidas",
		Icon:        "Zap",
		Category:    "pages",
		Tier:        "silver",
		TargetValue: 500,
	},
	{
		ID:          "ach-4",
		Code:        "pages_1000",
		Title:       "Leitor Voraz",
		Description: "Devorou mais de 1.000 páginas no Silverfish",
		Icon:        "Award",
		Category:    "pages",
		Tier:        "gold",
		TargetValue: 1000,
	},
	{
		ID:          "ach-14",
		Code:        "pages_2500",
		Title:       "Devorador de Capítulos",
		Description: "Alcançou a marca épica de 2.500 páginas lidas",
		Icon:        "Crown",
		Category:    "pages",
		Tier:        "diamond",
		TargetValue: 2500,
	},
	{
		ID:          "ach-5",
		Code:        "first_book",
		Title:       "Conquista Literária",
		Description: "Completou a leitura do seu primeiro livro",
		Icon:        "CheckCircle2",
		Category:    "books",
		Tier:        "bronze",
		TargetValue: 1,
	},
	{
		ID:          "ach-6",
		Code:        "books_5",
		Title:       "Traça de Livros",
		Description: "Completou 5 livros na sua estante",
		Icon:        "Library",
		Category:    "books",
		Tier:        "silver",
		TargetValue: 5,
	},
	{
		ID:          "ach-7",
		Code:        "books_10",
		Title:       "Devorador de Histórias",
		Description: "Completou 10 livros na sua estante",
		Icon:        "Crown",
		Category:    "books",
		Tier:        "gold",
		TargetValue: 10,
	},
	{
		ID:          "ach-15",
		Code:        "books_25",
		Title:       "Mestre da Biblioteca",
		Description: "Completou 25 livros concluídos na plataforma",
		Icon:        "Trophy",
		Category:    "books",
		Tier:        "diamond",
		TargetValue: 25,
	},
	{
		ID:          "ach-8",
		Code:        "streak_3",
		Title:       "Embalando o Hábito",
		Description: "Manteve 3 dias consecutivos de meta diária batida",
		Icon:        "Flame",
		Category:    "streak",
		Tier:        "bronze",
		TargetValue: 3,
	},
	{
		ID:          "ach-9",
		Code:        "streak_7",
		Title:       "Disciplina Semanal",
		Description: "Manteve uma ofensiva de 7 dias consecutivos",
		Icon:        "Flame",
		Category:    "streak",
		Tier:        "silver",
		TargetValue: 7,
	},
	{
		ID:          "ach-16",
		Code:        "streak_14",
		Title:       "Duas Semanas Imparável",
		Description: "Manteve uma ofensiva de 14 dias seguidos de leitura",
		Icon:        "Flame",
		Category:    "streak",
		Tier:        "silver",
		TargetValue: 14,
	},
	{
		ID:          "ach-10",
		Code:        "streak_30",
		Title:       "Virou Rotina",
		Description: "Manteve uma ofensiva de 30 dias consecutivos",
		Icon:        "Flame",
		Category:    "streak",
		Tier:        "gold",
		TargetValue: 30,
	},
	{
		ID:          "ach-17",
		Code:        "streak_100",
		Title:       "Fogo Eterno",
		Description: "Alcançou a marca mítica de 100 dias consecutivos de leitura",
		Icon:        "Flame",
		Category:    "streak",
		Tier:        "diamond",
		TargetValue: 100,
	},
	{
		ID:          "ach-11",
		Code:        "first_review",
		Title:       "Crítico Literário",
		Description: "Publicou sua primeira avaliação de um livro lido",
		Icon:        "Star",
		Category:    "social",
		Tier:        "bronze",
		TargetValue: 1,
	},
	{
		ID:          "ach-12",
		Code:        "shelf_10",
		Title:       "Colecionador",
		Description: "Adicionou 10 ou mais livros à sua estante pessoal",
		Icon:        "Layers",
		Category:    "shelf",
		Tier:        "bronze",
		TargetValue: 10,
	},
	{
		ID:          "ach-13",
		Code:        "varied_feelings",
		Title:       "Montanha-Russa de Emoções",
		Description: "Experimentou 4 ou mais sentimentos diferentes ao registrar leituras",
		Icon:        "Smile",
		Category:    "reading",
		Tier:        "silver",
		TargetValue: 4,
	},
	{
		ID:          "ach-18",
		Code:        "night_owl",
		Title:       "Coruja Noturna",
		Description: "Registrou uma sessão de leitura após as 22h",
		Icon:        "Moon",
		Category:    "reading",
		Tier:        "silver",
		TargetValue: 1,
	},
	{
		ID:          "ach-19",
		Code:        "weekend_warrior",
		Title:       "Maratona de Fim de Semana",
		Description: "Leu 100 ou mais páginas em uma única sessão de leitura",
		Icon:        "Rocket",
		Category:    "reading",
		Tier:        "gold",
		TargetValue: 100,
	},
	{
		ID:          "ach-20",
		Code:        "eclectic_reader",
		Title:       "Leitor Eclético",
		Description: "Leu livros de pelo menos 3 gêneros literários diferentes",
		Icon:        "Compass",
		Category:    "books",
		Tier:        "gold",
		TargetValue: 3,
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
			_ = database.Model(&existing).Updates(map[string]interface{}{
				"title":        ach.Title,
				"description":  ach.Description,
				"icon":         ach.Icon,
				"category":     ach.Category,
				"tier":         ach.Tier,
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

	// Se o usuário já conquistou todas as insígnias disponíveis, retorna imediatamente
	if len(unlockedMap) >= len(defaultAchievements) {
		return nil
	}

	// Carrega dados sob demanda apenas para categorias que ainda possuem conquistas pendentes
	var sessionCount int64
	if !unlockedMap["first_session"] {
		tx.Model(&schemas.ReadingSession{}).Where("user_id = ?", userID).Count(&sessionCount)
	}

	var totalPages int64
	if !unlockedMap["pages_100"] || !unlockedMap["pages_500"] || !unlockedMap["pages_1000"] || !unlockedMap["pages_2500"] {
		tx.Model(&schemas.ReadingSession{}).Where("user_id = ?", userID).Select("COALESCE(SUM(pages_read), 0)").Scan(&totalPages)
	}

	var booksReadCount int64
	if !unlockedMap["first_book"] || !unlockedMap["books_5"] || !unlockedMap["books_10"] || !unlockedMap["books_25"] {
		tx.Model(&schemas.UserBook{}).Where("user_id = ? AND status = ?", userID, schemas.StatusRead).Count(&booksReadCount)
	}

	var shelfCount int64
	if !unlockedMap["shelf_10"] {
		tx.Model(&schemas.UserBook{}).Where("user_id = ?", userID).Count(&shelfCount)
	}

	var reviewCount int64
	if !unlockedMap["first_review"] {
		tx.Model(&schemas.BookReview{}).Where("user_id = ?", userID).Count(&reviewCount)
	}

	var feelingCount int64
	if !unlockedMap["varied_feelings"] {
		tx.Model(&schemas.ReadingSession{}).Where("user_id = ? AND feeling IS NOT NULL AND feeling != ''", userID).Distinct("feeling").Count(&feelingCount)
	}

	var maxPagesSession int64
	if !unlockedMap["weekend_warrior"] {
		tx.Model(&schemas.ReadingSession{}).Where("user_id = ?", userID).Select("COALESCE(MAX(pages_read), 0)").Scan(&maxPagesSession)
	}

	var nightOwlCount int64
	if !unlockedMap["night_owl"] {
		var user schemas.User
		loc := time.UTC
		if err := tx.Where("id = ?", userID).First(&user).Error; err == nil && user.Timezone != "" {
			if l, lErr := time.LoadLocation(user.Timezone); lErr == nil {
				loc = l
			}
		}

		var recentSessions []schemas.ReadingSession
		tx.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&recentSessions)
		for _, s := range recentSessions {
			localHour := s.CreatedAt.In(loc).Hour()
			if localHour >= 22 || localHour <= 4 {
				nightOwlCount = 1
				break
			}
		}
	}

	var distinctGenresCount int64
	if !unlockedMap["eclectic_reader"] {
		tx.Table("user_books").
			Joins("JOIN books ON books.id = user_books.book_id").
			Where("user_books.user_id = ? AND user_books.status = ? AND books.genre != ''", userID, schemas.StatusRead).
			Distinct("books.genre").
			Count(&distinctGenresCount)
	}

	var bestStreak int
	if !unlockedMap["streak_3"] || !unlockedMap["streak_7"] || !unlockedMap["streak_14"] || !unlockedMap["streak_30"] || !unlockedMap["streak_100"] {
		var historyList []schemas.GoalHistory
		tx.Where("user_id = ?", userID).Order("date DESC").Find(&historyList)
		_, bestStreak = calculateStreaks(historyList, time.Now().Format("2006-01-02"))
	}

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
		case "pages_2500":
			return totalPages >= 2500
		case "first_book":
			return booksReadCount >= 1
		case "books_5":
			return booksReadCount >= 5
		case "books_10":
			return booksReadCount >= 10
		case "books_25":
			return booksReadCount >= 25
		case "streak_3":
			return bestStreak >= 3
		case "streak_7":
			return bestStreak >= 7
		case "streak_14":
			return bestStreak >= 14
		case "streak_30":
			return bestStreak >= 30
		case "streak_100":
			return bestStreak >= 100
		case "first_review":
			return reviewCount >= 1
		case "shelf_10":
			return shelfCount >= 10
		case "varied_feelings":
			return feelingCount >= 4
		case "night_owl":
			return nightOwlCount >= 1
		case "weekend_warrior":
			return maxPagesSession >= 100
		case "eclectic_reader":
			return distinctGenresCount >= 3
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
					"tier":        ach.Tier,
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
	Tier            string     `json:"tier"`
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

	var maxPagesSession int64
	db.Model(&schemas.ReadingSession{}).Where("user_id = ?", user.ID).Select("COALESCE(MAX(pages_read), 0)").Scan(&maxPagesSession)

	var nightOwlCount int64
	var userSessions []schemas.ReadingSession
	db.Where("user_id = ?", user.ID).Find(&userSessions)
	for _, s := range userSessions {
		if s.CreatedAt.Hour() >= 22 || s.CreatedAt.Hour() <= 4 {
			nightOwlCount = 1
			break
		}
	}

	var distinctGenresCount int64
	db.Table("user_books").
		Joins("JOIN books ON books.id = user_books.book_id").
		Where("user_books.user_id = ? AND user_books.status = ? AND books.genre != ''", user.ID, schemas.StatusRead).
		Distinct("books.genre").
		Count(&distinctGenresCount)

	var historyList []schemas.GoalHistory
	db.Where("user_id = ?", user.ID).Order("date DESC").Find(&historyList)
	today := getTodayInTimezone(user.Timezone)
	_, bestStreak := calculateStreaks(historyList, today)

	views := make([]AchievementView, 0, len(achievements))
	for _, a := range achievements {
		cur := 0
		switch a.Code {
		case "first_session":
			cur = int(sessionCount)
		case "pages_100", "pages_500", "pages_1000", "pages_2500":
			cur = int(totalPages)
		case "first_book", "books_5", "books_10", "books_25":
			cur = int(booksReadCount)
		case "streak_3", "streak_7", "streak_14", "streak_30", "streak_100":
			cur = bestStreak
		case "first_review":
			cur = int(reviewCount)
		case "shelf_10":
			cur = int(shelfCount)
		case "varied_feelings":
			cur = int(feelingCount)
		case "night_owl":
			cur = int(nightOwlCount)
		case "weekend_warrior":
			cur = int(maxPagesSession)
		case "eclectic_reader":
			cur = int(distinctGenresCount)
		}

		pct := 0
		if a.TargetValue > 0 {
			pct = int((float64(cur) / float64(a.TargetValue)) * 100)
			if pct > 100 {
				pct = 100
			}
		}

		unlockedAt, isUnlocked := unlockedMap[a.Code]
		var unlockedTimePtr *time.Time
		if isUnlocked {
			unlockedTimePtr = &unlockedAt
		}

		tier := a.Tier
		if tier == "" {
			tier = "bronze"
		}

		views = append(views, AchievementView{
			Code:            a.Code,
			Title:           a.Title,
			Description:     a.Description,
			Icon:            a.Icon,
			Category:        a.Category,
			Tier:            tier,
			TargetValue:     a.TargetValue,
			CurrentValue:    cur,
			ProgressPercent: pct,
			Unlocked:        isUnlocked,
			UnlockedAt:      unlockedTimePtr,
		})
	}

	newlyCodes := make([]string, 0, len(newly))
	for _, n := range newly {
		newlyCodes = append(newlyCodes, n.Code)
	}

	c.JSON(http.StatusOK, gin.H{
		"achievements":   views,
		"total_count":    len(views),
		"unlocked_count": len(unlockedMap),
		"newly_unlocked": newlyCodes,
	})
}
