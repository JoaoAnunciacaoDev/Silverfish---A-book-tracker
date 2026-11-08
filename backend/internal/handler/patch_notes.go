package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreatePatchNoteRequest struct {
	Version     string                 `json:"version"`
	Title       string                 `json:"title"`
	Summary     string                 `json:"summary"`
	Changes     map[string]interface{} `json:"changes"`
	IsPublished bool                   `json:"is_published"`
}

func (r *CreatePatchNoteRequest) Validate() error {
	r.Version = strings.TrimSpace(r.Version)
	r.Title = strings.TrimSpace(r.Title)
	r.Summary = strings.TrimSpace(r.Summary)

	if r.Version == "" {
		return errors.New("o campo versão é obrigatório (ex: v1.3.0)")
	}
	if r.Title == "" {
		return errors.New("o título da atualização é obrigatório")
	}
	if r.Summary == "" {
		return errors.New("o resumo da atualização é obrigatório")
	}
	return nil
}

type UpdatePatchNoteRequest struct {
	Title       *string                 `json:"title"`
	Summary     *string                 `json:"summary"`
	Changes     map[string]interface{} `json:"changes"`
	IsPublished *bool                   `json:"is_published"`
}

// ListPublishedPatchNotesHandler lista notas de atualização visíveis a todos os usuários
func ListPublishedPatchNotesHandler(c *gin.Context) {
	var notes []schemas.PatchNote
	if err := db.Preload("Author").
		Where("is_published = ?", true).
		Order("published_at DESC, created_at DESC").
		Find(&notes).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao listar notas de atualização")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"patch_notes": notes,
		"total":       len(notes),
	})
}

// GetLatestPatchNoteHandler retorna a versão mais recente publicada
func GetLatestPatchNoteHandler(c *gin.Context) {
	var note schemas.PatchNote
	if err := db.Where("is_published = ?", true).
		Order("published_at DESC, created_at DESC").
		First(&note).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"latest": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"latest": note})
}

// GetPatchNoteHandler busca uma nota por ID ou versão
func GetPatchNoteHandler(c *gin.Context) {
	idOrVersion := strings.TrimSpace(c.Param("id"))

	var note schemas.PatchNote
	if err := db.Preload("Author").
		Where("(id = ? OR version = ?) AND is_published = ?", idOrVersion, idOrVersion, true).
		First(&note).Error; err != nil {
		sendError(c, http.StatusNotFound, "nota de atualização não encontrada")
		return
	}

	c.JSON(http.StatusOK, gin.H{"patch_note": note})
}

// AdminListAllPatchNotesHandler lista todas as notas (incluindo rascunhos) para administradores
func AdminListAllPatchNotesHandler(c *gin.Context) {
	var notes []schemas.PatchNote
	if err := db.Preload("Author").
		Order("created_at DESC").
		Find(&notes).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao listar notas no painel admin")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"patch_notes": notes,
		"total":       len(notes),
	})
}

// AdminCreatePatchNoteHandler cria uma nova versão (SUPERUSER)
func AdminCreatePatchNoteHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)

	var req CreatePatchNoteRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	if err := req.Validate(); err != nil {
		sendError(c, http.StatusBadRequest, err.Error())
		return
	}

	changesStr := "{}"
	if req.Changes != nil {
		if bytes, err := json.Marshal(req.Changes); err == nil {
			changesStr = string(bytes)
		}
	}

	now := time.Now()
	var publishedAt *time.Time
	if req.IsPublished {
		publishedAt = &now
	}

	note := schemas.PatchNote{
		ID:          uuid.NewString(),
		Version:     req.Version,
		Title:       req.Title,
		Summary:     req.Summary,
		ChangesJSON: changesStr,
		IsPublished: req.IsPublished,
		PublishedAt: publishedAt,
		CreatedBy:   user.ID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := db.Create(&note).Error; err != nil {
		if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "unique") {
			sendError(c, http.StatusBadRequest, "já existe uma nota de atualização cadastrada com esta versão")
			return
		}
		sendError(c, http.StatusInternalServerError, "erro ao criar nota de atualização")
		return
	}

	// Se já for criada publicada, injeta anúncio no Feed Social
	if note.IsPublished {
		_ = RecordActivity(db, user.ID, "PATCH_NOTE_PUBLISHED", nil, map[string]interface{}{
			"version": note.Version,
			"title":   note.Title,
			"summary": note.Summary,
		})
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Nota de atualização criada com sucesso",
		"patch_note": note,
	})
}

// AdminUpdatePatchNoteHandler edita ou publica uma versão (SUPERUSER)
func AdminUpdatePatchNoteHandler(c *gin.Context) {
	userVal, _ := c.Get("currentUser")
	user := userVal.(*schemas.User)
	id := c.Param("id")

	var req UpdatePatchNoteRequest
	if err := c.BindJSON(&req); err != nil {
		sendError(c, http.StatusBadRequest, "formato JSON inválido")
		return
	}

	var note schemas.PatchNote
	if err := db.First(&note, "id = ?", id).Error; err != nil {
		sendError(c, http.StatusNotFound, "nota de atualização não encontrada")
		return
	}

	now := time.Now()
	wasPublished := note.IsPublished

	if req.Title != nil {
		note.Title = strings.TrimSpace(*req.Title)
	}
	if req.Summary != nil {
		note.Summary = strings.TrimSpace(*req.Summary)
	}
	if req.Changes != nil {
		if bytes, err := json.Marshal(req.Changes); err == nil {
			note.ChangesJSON = string(bytes)
		}
	}
	if req.IsPublished != nil {
		note.IsPublished = *req.IsPublished
		if *req.IsPublished && !wasPublished {
			note.PublishedAt = &now
		}
	}

	note.UpdatedAt = now
	if err := db.Save(&note).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao atualizar nota de atualização")
		return
	}

	// Se acabou de ser publicada, publica no feed da comunidade
	if note.IsPublished && !wasPublished {
		_ = RecordActivity(db, user.ID, "PATCH_NOTE_PUBLISHED", nil, map[string]interface{}{
			"version": note.Version,
			"title":   note.Title,
			"summary": note.Summary,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Nota de atualização atualizada com sucesso",
		"patch_note": note,
	})
}

// AdminDeletePatchNoteHandler remove uma nota (SUPERUSER)
func AdminDeletePatchNoteHandler(c *gin.Context) {
	id := c.Param("id")

	res := db.Delete(&schemas.PatchNote{}, "id = ?", id)
	if res.Error != nil {
		sendError(c, http.StatusInternalServerError, "erro ao excluir nota de atualização")
		return
	}
	if res.RowsAffected == 0 {
		sendError(c, http.StatusNotFound, "nota de atualização não encontrada")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Nota de atualização removida com sucesso",
	})
}
