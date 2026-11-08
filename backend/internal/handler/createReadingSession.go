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

type CreateReadingSessionRequest struct {
	UserBookID    string  `json:"user_book_id"`
	StartPage     int     `json:"start_page"`
	EndPage       int     `json:"end_page"`
	ReadAt        string  `json:"read_at"`
	Comprehension *int    `json:"comprehension"`
	Feeling       *string `json:"feeling"`
	Notes         *string `json:"notes"`
}

func (r *CreateReadingSessionRequest) Validate() error {
	r.UserBookID = strings.TrimSpace(r.UserBookID)
	r.ReadAt = strings.TrimSpace(r.ReadAt)

	if r.UserBookID == "" {
		return errors.New("o campo user_book_id e obrigatorio")
	}
	if r.StartPage < 0 {
		return errors.New("a pagina inicial nao pode ser negativa")
	}
	if r.EndPage <= r.StartPage {
		return errors.New("a pagina final deve ser maior que a pagina inicial")
	}
	if r.Comprehension != nil && (*r.Comprehension < 1 || *r.Comprehension > 5) {
		return errors.New("a compreensao deve ser uma nota de 1 a 5")
	}

	return nil
}

func getTodayInTimezone(tz string) string {
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}
	return time.Now().In(loc).Format("2006-01-02")
}

func syncGoalHistory(userID, date string) {
	// 1. Obtem a meta diaria configurada do usuario (padrao 20 paginas)
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

	// 2. Soma todas as paginas lidas nessa data
	var totalPagesRead int64
	db.Model(&schemas.ReadingSession{}).
		Where("user_id = ? AND read_at = ?", userID, date).
		Select("COALESCE(SUM(pages_read), 0)").
		Scan(&totalPagesRead)

	target := goal.DailyPageTarget
	met := int(totalPagesRead) >= target

	// 3. Atualiza ou insere o historico da meta
	var history schemas.GoalHistory
	err := db.Where("user_id = ? AND date = ?", userID, date).First(&history).Error
	if err != nil {
		history = schemas.GoalHistory{
			ID:        uuid.NewString(),
			UserID:    userID,
			Date:      date,
			PagesRead: int(totalPagesRead),
			Target:    target,
			Met:       met,
			CreatedAt: time.Now(),
		}
		_ = db.Create(&history).Error
	} else {
		history.PagesRead = int(totalPagesRead)
		history.Target = target
		history.Met = met
		_ = db.Save(&history).Error
	}
}

func CreateReadingSessionHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	request := CreateReadingSessionRequest{}
	if err := c.BindJSON(&request); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON invalido")
		return
	}

	if err := request.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	var userBook schemas.UserBook
	if err := db.Preload("Book").Where("id = ? AND user_id = ?", request.UserBookID, user.ID).First(&userBook).Error; err != nil {
		sendError(c, http.StatusNotFound, "livro nao encontrado na sua estante")
		return
	}

	if userBook.Book.PageCount > 0 && request.EndPage > userBook.Book.PageCount {
		request.EndPage = userBook.Book.PageCount
	}

	pagesRead := request.EndPage - request.StartPage

	// Define data da sessao considerando fuso horario do usuario
	readAt := request.ReadAt
	if readAt == "" {
		readAt = getTodayInTimezone(user.Timezone)
	}

	now := time.Now()
	session := schemas.ReadingSession{
		ID:            uuid.NewString(),
		UserID:        user.ID,
		UserBookID:    userBook.ID,
		StartPage:     request.StartPage,
		EndPage:       request.EndPage,
		PagesRead:     pagesRead,
		ReadAt:        readAt,
		Comprehension: request.Comprehension,
		Feeling:       request.Feeling,
		Notes:         request.Notes,
		CreatedAt:     now,
	}

	if err := db.Create(&session).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao registrar sessao de leitura")
		return
	}

	// Atualiza progresso do livro na estante
	userBook.CurrentPage = request.EndPage
	userBook.UpdatedAt = now

	if userBook.Book.PageCount > 0 && userBook.CurrentPage >= userBook.Book.PageCount {
		userBook.Status = schemas.StatusRead
		if userBook.FinishedAt == nil {
			userBook.FinishedAt = &now
		}
	} else if userBook.Status == schemas.StatusWantToRead {
		userBook.Status = schemas.StatusReading
		if userBook.StartedAt == nil {
			userBook.StartedAt = &now
		}
	}

	_ = db.Save(&userBook).Error

	// Sincroniza historico da meta diaria e streak
	syncGoalHistory(user.ID, readAt)

	session.UserBook = userBook

	c.JSON(http.StatusCreated, gin.H{
		"message": "Sessao de leitura registrada com sucesso",
		"session": session,
	})
}
