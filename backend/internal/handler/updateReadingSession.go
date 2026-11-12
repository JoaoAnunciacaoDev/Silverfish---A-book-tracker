package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UpdateReadingSessionRequest struct {
	StartPage     int     `json:"start_page"`
	EndPage       int     `json:"end_page"`
	ReadAt        string  `json:"read_at"`
	Comprehension *int    `json:"comprehension"`
	Feeling       *string `json:"feeling"`
	Notes         *string `json:"notes"`
}

func (r *UpdateReadingSessionRequest) Validate() error {
	r.ReadAt = schemas.NormalizeDateOnly(r.ReadAt)

	if r.StartPage < 0 {
		return errors.New("a pagina inicial nao pode ser negativa")
	}
	if r.EndPage <= r.StartPage {
		return errors.New("a pagina final deve ser maior que a pagina inicial")
	}
	if (r.EndPage - r.StartPage) > 2000 {
		return errors.New("uma única sessão de leitura não pode exceder 2.000 páginas")
	}
	if r.Comprehension != nil && (*r.Comprehension < 1 || *r.Comprehension > 5) {
		return errors.New("a compreensao deve ser uma nota de 1 a 5")
	}
	if r.ReadAt != "" {
		if _, err := time.Parse("2006-01-02", r.ReadAt); err != nil {
			return errors.New("a data da leitura deve estar no formato YYYY-MM-DD")
		}
	}

	return nil
}

// recalculateUserBookProgressTx recalcula CurrentPage e Status do UserBook com base nas sessões persistidas.
func recalculateUserBookProgressTx(tx *gorm.DB, userBook *schemas.UserBook, now time.Time) error {
	var remainingSessions []schemas.ReadingSession
	if err := tx.Where("user_book_id = ?", userBook.ID).Order("end_page DESC").Find(&remainingSessions).Error; err != nil {
		return err
	}

	if len(remainingSessions) > 0 {
		userBook.CurrentPage = remainingSessions[0].EndPage
		if userBook.Book.PageCount > 0 && userBook.CurrentPage >= userBook.Book.PageCount {
			userBook.Status = schemas.StatusRead
			if userBook.FinishedAt == nil {
				userBook.FinishedAt = &now
			}
		} else {
			if userBook.Status == schemas.StatusRead || userBook.Status == schemas.StatusWantToRead {
				userBook.Status = schemas.StatusReading
			}
			if userBook.StartedAt == nil {
				userBook.StartedAt = &now
			}
			userBook.FinishedAt = nil
		}
	} else {
		userBook.CurrentPage = 0
		userBook.FinishedAt = nil
		userBook.StartedAt = nil
		if userBook.Status == schemas.StatusRead || userBook.Status == schemas.StatusReading {
			userBook.Status = schemas.StatusWantToRead
		}
	}
	userBook.UpdatedAt = now

	return tx.Save(userBook).Error
}

func normalizeOptionalText(val *string) *string {
	if val == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*val)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func UpdateReadingSessionHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	id := c.Param("id")

	var request UpdateReadingSessionRequest
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
	notFound := false

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", id, user.ID).First(&session).Error; err != nil {
			notFound = true
			return errors.New("sessao de leitura nao encontrada")
		}

		var userBook schemas.UserBook
		if err := tx.Preload("Book").Where("id = ? AND user_id = ?", session.UserBookID, user.ID).First(&userBook).Error; err != nil {
			return errors.New("livro da estante associado nao encontrado")
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
			Where("user_book_id = ? AND id != ? AND start_page < ? AND end_page > ?", userBook.ID, session.ID, request.EndPage, request.StartPage).
			Count(&overlappingCount).Error; err != nil {
			return err
		}
		if overlappingCount > 0 {
			return errors.New("o intervalo de paginas informado se sobrepoe a outra sessao ja registrada")
		}

		oldReadAt := schemas.NormalizeDateOnly(session.ReadAt)
		newReadAt := oldReadAt
		if request.ReadAt != "" {
			newReadAt = request.ReadAt
		}
		if newReadAt == "" {
			newReadAt = getTodayInTimezone(user.Timezone)
		}

		session.StartPage = request.StartPage
		session.EndPage = request.EndPage
		session.PagesRead = request.EndPage - request.StartPage
		session.ReadAt = newReadAt
		session.Comprehension = request.Comprehension
		if request.Feeling != nil {
			session.Feeling = normalizeOptionalText(request.Feeling)
		}
		if request.Notes != nil {
			session.Notes = normalizeOptionalText(request.Notes)
		}

		if err := tx.Save(&session).Error; err != nil {
			return err
		}

		if err := recalculateUserBookProgressTx(tx, &userBook, now); err != nil {
			return err
		}

		if oldReadAt != "" && oldReadAt != newReadAt {
			if err := syncGoalHistoryTx(tx, user.ID, oldReadAt); err != nil {
				return err
			}
		}
		if err := syncGoalHistoryTx(tx, user.ID, newReadAt); err != nil {
			return err
		}

		session.UserBook = userBook
		return nil
	})

	if err != nil {
		if notFound {
			sendError(c, http.StatusNotFound, err.Error())
		} else {
			sendError(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	_ = CheckAndUnlockAchievements(db, user.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Sessao de leitura atualizada com sucesso",
		"session": session,
	})
}
