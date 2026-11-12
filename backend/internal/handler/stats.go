package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

type MonthlyReadingStat struct {
	Month    string `json:"month"`
	Pages    int64  `json:"pages"`
	Sessions int64  `json:"sessions"`
}

type DayActivity struct {
	Date     string `json:"date"`
	Pages    int64  `json:"pages"`
	Sessions int64  `json:"sessions"`
}

// GetDashboardStatsHandler calcula estatísticas agregadas do usuário
func GetDashboardStatsHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	today := getTodayInTimezone(user.Timezone)
	now, err := time.Parse("2006-01-02", today)
	if err != nil {
		now = time.Now()
	}

	currentYear := now.Format("2006")
	currentMonth := now.Format("2006-01")
	sevenDaysAgo := now.AddDate(0, 0, -6).Format("2006-01-02")

	yearStart := currentYear + "-01-01"
	yearEnd := currentYear + "-12-31"
	monthStart, monthEnd, ok := getMonthDateBounds(currentMonth)
	if !ok {
		monthStart = currentMonth + "-01"
		monthEnd = today
	}

	// 1. Livros lidos, lendo, na coleção e contagem histórica por ano em 1 consulta enxuta
	type userBookStatRow struct {
		Status       string     `gorm:"column:status"`
		InCollection bool       `gorm:"column:in_collection"`
		FinishedAt   *time.Time `gorm:"column:finished_at"`
	}
	var userBookRows []userBookStatRow
	db.Model(&schemas.UserBook{}).
		Select("status, in_collection, finished_at").
		Where("user_id = ?", user.ID).
		Find(&userBookRows)

	var totalBooksRead int64
	var totalBooksReading int64
	var inCollectionCount int64
	var booksReadThisYear int64
	booksByYearMap := make(map[string]int)

	for _, ub := range userBookRows {
		if ub.InCollection {
			inCollectionCount++
		}
		if ub.Status == schemas.StatusReading {
			totalBooksReading++
		} else if ub.Status == schemas.StatusRead {
			totalBooksRead++
			if ub.FinishedAt != nil {
				y := ub.FinishedAt.Format("2006")
				booksByYearMap[y]++
				if y == currentYear {
					booksReadThisYear++
				}
			}
		}
	}

	// 2 & 3. Páginas lidas (total, ano, mês, semana) e dias ativos em 1 query agregada
	type readingAggregates struct {
		TotalPages int64 `gorm:"column:total_pages"`
		YearPages  int64 `gorm:"column:year_pages"`
		MonthPages int64 `gorm:"column:month_pages"`
		WeekPages  int64 `gorm:"column:week_pages"`
		ActiveDays int64 `gorm:"column:active_days"`
	}
	var readAgg readingAggregates
	db.Model(&schemas.ReadingSession{}).
		Select(`
			COALESCE(SUM(pages_read), 0) AS total_pages,
			COALESCE(SUM(CASE WHEN read_at >= ? AND read_at <= ? THEN pages_read ELSE 0 END), 0) AS year_pages,
			COALESCE(SUM(CASE WHEN read_at >= ? AND read_at <= ? THEN pages_read ELSE 0 END), 0) AS month_pages,
			COALESCE(SUM(CASE WHEN read_at >= ? THEN pages_read ELSE 0 END), 0) AS week_pages,
			COUNT(DISTINCT read_at) AS active_days
		`, yearStart, yearEnd, monthStart, monthEnd, sevenDaysAgo).
		Where("user_id = ?", user.ID).
		Scan(&readAgg)

	totalPagesRead := readAgg.TotalPages
	yearPagesRead := readAgg.YearPages
	monthPagesRead := readAgg.MonthPages
	weekPagesRead := readAgg.WeekPages
	daysWithReading := readAgg.ActiveDays

	var dailyAverage float64
	if daysWithReading > 0 {
		dailyAverage = float64(totalPagesRead) / float64(daysWithReading)
	}

	// 4 & 5. Streaks e taxa de metas batidas em 1 única busca de histórico
	var historyList []schemas.GoalHistory
	db.Select("date, met").Where("user_id = ?", user.ID).Order("date DESC").Find(&historyList)
	currentStreak, bestStreak := calculateStreaks(historyList, today)

	totalGoalDays := int64(len(historyList))
	var metGoalDays int64
	for _, h := range historyList {
		if h.Met {
			metGoalDays++
		}
	}

	var goalCompletionRate float64
	if totalGoalDays > 0 {
		goalCompletionRate = (float64(metGoalDays) / float64(totalGoalDays)) * 100
	}

	// 6. Leituras mensais no ano corrente (portável para SQLite e PostgreSQL)
	type rawSessionStat struct {
		ReadAt    string `gorm:"column:read_at"`
		PagesRead int64  `gorm:"column:pages_read"`
	}
	var yearSessions []rawSessionStat
	db.Model(&schemas.ReadingSession{}).
		Where("user_id = ? AND read_at >= ? AND read_at <= ?", user.ID, yearStart, yearEnd).
		Select("read_at, pages_read").
		Find(&yearSessions)

	monthlyMap := make(map[string]*MonthlyReadingStat)
	for _, s := range yearSessions {
		if len(s.ReadAt) >= 7 {
			m := s.ReadAt[:7]
			if entry, ok := monthlyMap[m]; ok {
				entry.Pages += s.PagesRead
				entry.Sessions++
			} else {
				monthlyMap[m] = &MonthlyReadingStat{
					Month:    m,
					Pages:    s.PagesRead,
					Sessions: 1,
				}
			}
		}
	}
	var monthly []MonthlyReadingStat
	for m := 1; m <= 12; m++ {
		mStr := fmt.Sprintf("%s-%02d", currentYear, m)
		if entry, ok := monthlyMap[mStr]; ok {
			monthly = append(monthly, *entry)
		}
	}

	// 7. Total de avaliações feitas
	var reviewsCount int64
	db.Model(&schemas.BookReview{}).Where("user_id = ?", user.ID).Count(&reviewsCount)

	c.JSON(http.StatusOK, gin.H{
		"books": gin.H{
			"read":           totalBooksRead,
			"reading":        totalBooksReading,
			"in_collection":  inCollectionCount,
			"read_this_year": booksReadThisYear,
			"by_year":        booksByYearMap,
		},
		"pages": gin.H{
			"total":         totalPagesRead,
			"this_year":     yearPagesRead,
			"this_month":    monthPagesRead,
			"last_7_days":   weekPagesRead,
			"daily_average": dailyAverage,
			"active_days":   daysWithReading,
		},
		"streaks": gin.H{
			"current":              currentStreak,
			"best":                 bestStreak,
			"goal_completion_rate": goalCompletionRate,
			"total_days_tracked":   totalGoalDays,
			"met_days_count":       metGoalDays,
		},
		"reviews_count":    reviewsCount,
		"monthly_overview": monthly,
	})
}

// GetHeatmapHandler retorna o mapa de calor de páginas lidas nos últimos 365 dias
func GetHeatmapHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	today := getTodayInTimezone(user.Timezone)
	now, err := time.Parse("2006-01-02", today)
	if err != nil {
		now = time.Now()
	}

	startDate := now.AddDate(-1, 0, 0).Format("2006-01-02")

	var activities []DayActivity
	db.Model(&schemas.ReadingSession{}).
		Where("user_id = ? AND read_at >= ?", user.ID, startDate).
		Select("read_at as date, COALESCE(SUM(pages_read), 0) as pages, COUNT(id) as sessions").
		Group("read_at").
		Order("read_at ASC").
		Scan(&activities)

	for i := range activities {
		activities[i].Date = schemas.NormalizeDateOnly(activities[i].Date)
	}

	c.JSON(http.StatusOK, gin.H{
		"start_date": startDate,
		"end_date":   today,
		"activities": activities,
	})
}
