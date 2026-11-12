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

type UpdateGoalRequest struct {
	DailyPageTarget int `json:"daily_page_target"`
}

func (r *UpdateGoalRequest) Validate() error {
	if r.DailyPageTarget < 1 || r.DailyPageTarget > 1000 {
		return errors.New("a meta diaria deve ser entre 1 e 1000 paginas")
	}
	return nil
}

func getOrCreateDailyGoal(userID string) schemas.DailyGoal {
	var goal schemas.DailyGoal
	if err := db.Where("user_id = ?", userID).First(&goal).Error; err != nil {
		goal = schemas.DailyGoal{
			ID:              uuid.NewString(),
			UserID:          userID,
			DailyPageTarget: 20,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}
		_ = db.Create(&goal).Error
	}
	return goal
}

func GetGoalHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	goal := getOrCreateDailyGoal(user.ID)
	today := getTodayInTimezone(user.Timezone)

	var todayHistory schemas.GoalHistory
	_ = db.Where("user_id = ? AND date = ?", user.ID, today).First(&todayHistory).Error

	pagesRead := todayHistory.PagesRead
	target := goal.DailyPageTarget
	met := pagesRead >= target
	percentage := 0
	if target > 0 {
		percentage = int((float64(pagesRead) / float64(target)) * 100)
		if percentage > 100 {
			percentage = 100
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"daily_page_target": target,
		"today": gin.H{
			"date":       today,
			"pages_read": pagesRead,
			"target":     target,
			"met":        met,
			"percentage": percentage,
		},
	})
}

func UpdateGoalHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	request := UpdateGoalRequest{}
	if err := c.BindJSON(&request); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON invalido")
		return
	}

	if err := request.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	goal := getOrCreateDailyGoal(user.ID)
	goal.DailyPageTarget = request.DailyPageTarget
	goal.UpdatedAt = time.Now()

	if err := db.Save(&goal).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao atualizar meta diaria")
		return
	}

	// Atualiza meta de hoje no historico
	today := getTodayInTimezone(user.Timezone)
	syncGoalHistory(user.ID, today)

	c.JSON(http.StatusOK, gin.H{
		"message":           "Meta diaria atualizada com sucesso",
		"daily_page_target": goal.DailyPageTarget,
	})
}

// getMonthDateBounds retorna primeiro e último dia válidos ("YYYY-MM-DD") de um mês "YYYY-MM".
func getMonthDateBounds(yearMonth string) (string, string, bool) {
	t, err := time.Parse("2006-01", strings.TrimSpace(yearMonth))
	if err != nil {
		return "", "", false
	}
	firstDay := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
	lastDay := firstDay.AddDate(0, 1, -1)
	return firstDay.Format("2006-01-02"), lastDay.Format("2006-01-02"), true
}

func calculateStreaks(historyList []schemas.GoalHistory, today string) (currentStreak int, bestStreak int) {
	if len(historyList) == 0 {
		return 0, 0
	}

	today = schemas.NormalizeDateOnly(today)

	// Mapeia datas cumpridas em conjunto para busca O(1)
	metDates := make(map[string]bool)
	for _, h := range historyList {
		if h.Met {
			dateKey := schemas.NormalizeDateOnly(h.Date)
			if dateKey != "" {
				metDates[dateKey] = true
			}
		}
	}

	todayTime, err := time.Parse("2006-01-02", today)
	if err != nil {
		todayTime = time.Now()
	}

	yesterday := todayTime.AddDate(0, 0, -1).Format("2006-01-02")

	// Calcula streak atual
	currentStreak = 0
	checkTime := todayTime

	if metDates[today] {
		// Se hoje ja foi cumprido, conta hoje e volta nos dias anteriores
		for {
			dateStr := checkTime.Format("2006-01-02")
			if metDates[dateStr] {
				currentStreak++
				checkTime = checkTime.AddDate(0, 0, -1)
			} else {
				break
			}
		}
	} else if metDates[yesterday] {
		// Se hoje ainda nao foi cumprido mas ontem foi, a sequencia continua ativa ate o fim do dia
		checkTime = todayTime.AddDate(0, 0, -1)
		for {
			dateStr := checkTime.Format("2006-01-02")
			if metDates[dateStr] {
				currentStreak++
				checkTime = checkTime.AddDate(0, 0, -1)
			} else {
				break
			}
		}
	}

	// Calcula melhor streak historico (maior sequencia de dias consecutivos)
	bestStreak = 0
	tempStreak := 0
	var prevDate time.Time

	for i, h := range historyList {
		if !h.Met {
			tempStreak = 0
			continue
		}

		dateKey := schemas.NormalizeDateOnly(h.Date)
		currentDate, err := time.Parse("2006-01-02", dateKey)
		if err != nil {
			continue
		}

		if i == 0 || tempStreak == 0 {
			tempStreak = 1
		} else if prevDate.AddDate(0, 0, -1).Format("2006-01-02") == dateKey {
			tempStreak++
		} else if prevDate.Format("2006-01-02") != dateKey {
			tempStreak = 1
		}

		prevDate = currentDate
		if tempStreak > bestStreak {
			bestStreak = tempStreak
		}
	}

	if currentStreak > bestStreak {
		bestStreak = currentStreak
	}

	return currentStreak, bestStreak
}

func GetStreakHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	today := getTodayInTimezone(user.Timezone)

	var historyList []schemas.GoalHistory
	db.Where("user_id = ?", user.ID).Order("date DESC").Find(&historyList)

	currentStreak, bestStreak := calculateStreaks(historyList, today)

	todayMet := false
	for _, h := range historyList {
		if schemas.NormalizeDateOnly(h.Date) == today && h.Met {
			todayMet = true
			break
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"current_streak": currentStreak,
		"best_streak":    bestStreak,
		"today_met":      todayMet,
	})
}

func GetGoalHistoryHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	month := strings.TrimSpace(c.Query("month")) // Ex: 2026-11

	query := db.Model(&schemas.GoalHistory{}).Where("user_id = ?", user.ID)
	if month != "" {
		monthStart, monthEnd, ok := getMonthDateBounds(month)
		if !ok {
			sendError(c, http.StatusBadRequest, "formato de mes invalido (use YYYY-MM)")
			return
		}
		query = query.Where("date >= ? AND date <= ?", monthStart, monthEnd)
	}

	var history []schemas.GoalHistory
	if err := query.Order("date DESC").Find(&history).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao consultar historico de metas")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"history": history,
	})
}
