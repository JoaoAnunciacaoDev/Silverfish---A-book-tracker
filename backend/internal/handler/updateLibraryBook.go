package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

type UpdateLibraryBookRequest struct {
	Status       *string `json:"status"`
	CurrentPage  *int    `json:"current_page"`
	InCollection *bool   `json:"in_collection"`
}

func (r *UpdateLibraryBookRequest) Validate() error {
	if r.Status != nil {
		*r.Status = strings.TrimSpace(*r.Status)
		if !schemas.IsValidUserBookStatus(*r.Status) {
			return errors.New("status de leitura inválido")
		}
	}

	if r.CurrentPage != nil && *r.CurrentPage < 0 {
		return errors.New("a página atual não pode ser negativa")
	}

	return nil
}

func UpdateLibraryBookHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	id := c.Param("id")

	request := UpdateLibraryBookRequest{}
	if err := c.BindJSON(&request); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := request.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	var userBook schemas.UserBook
	if err := db.Preload("Book").Where("id = ? AND user_id = ?", id, user.ID).First(&userBook).Error; err != nil {
		sendError(c, http.StatusNotFound, "livro não encontrado na sua estante")
		return
	}

	now := time.Now()

	// 1. Atualização de status
	if request.Status != nil {
		newStatus := *request.Status
		if newStatus == schemas.StatusInCollection {
			newStatus = schemas.StatusWantToRead
			userBook.InCollection = true
		}
		if newStatus != userBook.Status {
			userBook.Status = newStatus

			switch newStatus {
			case schemas.StatusReading:
				if userBook.StartedAt == nil {
					userBook.StartedAt = &now
				}
				userBook.FinishedAt = nil

			case schemas.StatusRead:
				if userBook.StartedAt == nil {
					userBook.StartedAt = &now
				}
				userBook.FinishedAt = &now
				if userBook.Book.PageCount > 0 {
					userBook.CurrentPage = userBook.Book.PageCount
				}

			case schemas.StatusWantToRead, schemas.StatusPaused, schemas.StatusAbandoned:
				userBook.FinishedAt = nil
			}
		}
	}

	// 2. Atualização de flag de coleção
	if request.InCollection != nil {
		userBook.InCollection = *request.InCollection
	}

	// 3. Atualização de página atual
	if request.CurrentPage != nil {
		newPage := *request.CurrentPage
		if userBook.Book.PageCount > 0 && newPage > userBook.Book.PageCount {
			newPage = userBook.Book.PageCount
		}
		userBook.CurrentPage = newPage

		// Se o leitor alcançou ou ultrapassou a última página, conclui automaticamente o livro!
		if userBook.Book.PageCount > 0 && userBook.CurrentPage >= userBook.Book.PageCount {
			userBook.Status = schemas.StatusRead
			if userBook.FinishedAt == nil {
				userBook.FinishedAt = &now
			}
		} else if userBook.CurrentPage > 0 && userBook.Status == schemas.StatusWantToRead {
			// Se começou a folhear/ler, move automaticamente para "reading"
			userBook.Status = schemas.StatusReading
			if userBook.StartedAt == nil {
				userBook.StartedAt = &now
			}
		}
	}

	userBook.UpdatedAt = now

	if err := db.Save(&userBook).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao atualizar livro na estante")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Livro atualizado com sucesso",
		"item":    userBook,
	})
}
