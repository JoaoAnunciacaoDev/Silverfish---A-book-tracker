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

// ToggleActivityLikeHandler curte ou descurte uma atividade do feed
func ToggleActivityLikeHandler(c *gin.Context) {
	user := c.MustGet("currentUser").(*schemas.User)
	activityID := c.Param("id")

	var activity schemas.Activity
	if err := db.First(&activity, "id = ?", activityID).Error; err != nil {
		sendError(c, http.StatusNotFound, "atividade não encontrada")
		return
	}

	var existingLike schemas.ActivityLike
	err := db.Where("activity_id = ? AND user_id = ?", activityID, user.ID).First(&existingLike).Error

	liked := false
	if err == nil {
		// Descurtir
		if delErr := db.Delete(&existingLike).Error; delErr != nil {
			sendError(c, http.StatusInternalServerError, "erro ao remover curtida")
			return
		}
		liked = false
	} else {
		// Curtir
		newLike := schemas.ActivityLike{
			ID:         uuid.NewString(),
			ActivityID: activityID,
			UserID:     user.ID,
			CreatedAt:  time.Now(),
		}
		if err := db.Create(&newLike).Error; err != nil {
			sendError(c, http.StatusInternalServerError, "erro ao registrar curtida")
			return
		}
		liked = true
	}

	var likesCount int64
	_ = db.Model(&schemas.ActivityLike{}).Where("activity_id = ?", activityID).Count(&likesCount).Error

	c.JSON(http.StatusOK, gin.H{
		"liked":       liked,
		"likes_count": likesCount,
	})
}

// ListActivityCommentsHandler lista os comentários de uma atividade
func ListActivityCommentsHandler(c *gin.Context) {
	activityID := c.Param("id")

	var activity schemas.Activity
	if err := db.First(&activity, "id = ?", activityID).Error; err != nil {
		sendError(c, http.StatusNotFound, "atividade não encontrada")
		return
	}

	var comments []schemas.ActivityComment
	if err := db.Preload("User").
		Where("activity_id = ?", activityID).
		Order("created_at ASC").
		Find(&comments).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao carregar comentários")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"comments": comments,
		"total":    len(comments),
	})
}

type CreateCommentRequest struct {
	Content string `json:"content"`
}

func (r *CreateCommentRequest) Validate() error {
	r.Content = strings.TrimSpace(r.Content)
	if r.Content == "" {
		return errors.New("o comentário não pode ser vazio")
	}
	if len([]rune(r.Content)) > 500 {
		return errors.New("o comentário não pode exceder 500 caracteres")
	}
	return nil
}

// CreateActivityCommentHandler adiciona um comentário de incentivo em uma atividade
func CreateActivityCommentHandler(c *gin.Context) {
	user := c.MustGet("currentUser").(*schemas.User)
	activityID := c.Param("id")

	var activity schemas.Activity
	if err := db.First(&activity, "id = ?", activityID).Error; err != nil {
		sendError(c, http.StatusNotFound, "atividade não encontrada")
		return
	}

	var req CreateCommentRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := req.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	now := time.Now()
	comment := schemas.ActivityComment{
		ID:         uuid.NewString(),
		ActivityID: activityID,
		UserID:     user.ID,
		Content:    req.Content,
		CreatedAt:  now,
	}

	if err := db.Create(&comment).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao salvar comentário")
		return
	}

	comment.User = *user

	c.JSON(http.StatusCreated, gin.H{
		"message": "Comentário adicionado com sucesso",
		"comment": comment,
	})
}

// DeleteActivityCommentHandler remove um comentário próprio ou por moderador
func DeleteActivityCommentHandler(c *gin.Context) {
	user := c.MustGet("currentUser").(*schemas.User)
	commentID := c.Param("id")

	var comment schemas.ActivityComment
	if err := db.First(&comment, "id = ?", commentID).Error; err != nil {
		sendError(c, http.StatusNotFound, "comentário não encontrado")
		return
	}

	if comment.UserID != user.ID && user.Role != "SUPERUSER" {
		sendError(c, http.StatusForbidden, "você só pode remover seus próprios comentários")
		return
	}

	if err := db.Delete(&comment).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao excluir comentário")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Comentário removido com sucesso",
	})
}
