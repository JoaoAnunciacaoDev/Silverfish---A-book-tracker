package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
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
	_ = syncGoalHistoryTx(db, userID, date)
}

func syncGoalHistoryTx(tx *gorm.DB, userID, date string) error {
	var goal schemas.DailyGoal
	if err := tx.Where("user_id = ?", userID).First(&goal).Error; err != nil {
		goal = schemas.DailyGoal{
			ID:              uuid.NewString(),
			UserID:          userID,
			DailyPageTarget: 20,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}
		if err := tx.Create(&goal).Error; err != nil {
			return err
		}
	}

	var totalPagesRead int64
	if err := tx.Model(&schemas.ReadingSession{}).
		Where("user_id = ? AND read_at = ?", userID, date).
		Select("COALESCE(SUM(pages_read), 0)").
		Scan(&totalPagesRead).Error; err != nil {
		return err
	}

	target := goal.DailyPageTarget
	met := int(totalPagesRead) >= target

	var history schemas.GoalHistory
	err := tx.Where("user_id = ? AND date = ?", userID, date).First(&history).Error
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
		return tx.Create(&history).Error
	}

	history.PagesRead = int(totalPagesRead)
	history.Target = target
	history.Met = met
	return tx.Save(&history).Error
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

	var session schemas.ReadingSession
	now := time.Now()

	err := db.Transaction(func(tx *gorm.DB) error {
		var userBook schemas.UserBook
		if err := tx.Preload("Book").Where("id = ? AND user_id = ?", request.UserBookID, user.ID).First(&userBook).Error; err != nil {
			return errors.New("livro nao encontrado na sua estante")
		}

		if userBook.Status == schemas.StatusRead {
			return errors.New("este livro ja foi concluido")
		}

		if request.StartPage < userBook.CurrentPage {
			return errors.New("a pagina inicial nao pode ser menor que o progresso atual do livro")
		}

		if userBook.Book.PageCount > 0 {
			if request.StartPage >= userBook.Book.PageCount {
				return errors.New("a pagina inicial nao pode ser maior ou igual ao total de paginas do livro")
			}
			if request.EndPage > userBook.Book.PageCount {
				request.EndPage = userBook.Book.PageCount
			}
			if request.EndPage <= request.StartPage {
				return errors.New("a pagina final deve ser maior que a pagina inicial")
			}
		}

		var overlappingCount int64
		if err := tx.Model(&schemas.ReadingSession{}).
			Where("user_book_id = ? AND start_page < ? AND end_page > ?", userBook.ID, request.EndPage, request.StartPage).
			Count(&overlappingCount).Error; err != nil {
			return err
		}
		if overlappingCount > 0 {
			return errors.New("o intervalo de paginas informado se sobrepoe a uma sessao ja registrada")
		}

		readAt := request.ReadAt
		if readAt == "" {
			readAt = getTodayInTimezone(user.Timezone)
		}

		pagesRead := request.EndPage - request.StartPage

		session = schemas.ReadingSession{
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

		if err := tx.Create(&session).Error; err != nil {
			return err
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

		if err := tx.Save(&userBook).Error; err != nil {
			return err
		}

		// Sincroniza meta diaria e streak atomicamente dentro da transacao
		if err := syncGoalHistoryTx(tx, user.ID, readAt); err != nil {
			return err
		}

		session.UserBook = userBook
		return nil
	})

	if err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	// Avalia e desbloqueia conquistas pendentes do usuario
	_ = CheckAndUnlockAchievements(db, user.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Sessao de leitura registrada com sucesso",
		"session": session,
	})
}
