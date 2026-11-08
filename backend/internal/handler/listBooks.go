package handler

import (
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
	"github.com/gin-gonic/gin"
)

type PaginationMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

func ListBooksHandler(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))

	// 1. Lê parâmetros de paginação (padrão: 15 livros por lote)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "15"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 15 // teto de 50 para evitar sobrecarga no banco
	}

	offset := (page - 1) * limit

	var books []schemas.Book
	var totalItems int64

	query := db.Model(&schemas.Book{})

	// 2. Filtro de busca por título ou autor
	if q != "" {
		searchTerm := "%" + strings.ToLower(q) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(author) LIKE ?", searchTerm, searchTerm)
	}

	// 3. Conta o total de registros que atendem ao filtro
	if err := query.Count(&totalItems).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao contar livros do catálogo")
		return
	}

	// 4. Busca apenas o lote paginado solicitado
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&books).Error; err != nil {
		sendError(c, http.StatusInternalServerError, "erro ao consultar catálogo de livros")
		return
	}

	totalPages := 0
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
	}

	c.JSON(http.StatusOK, gin.H{
		"books": books,
		"pagination": PaginationMeta{
			Page:       page,
			Limit:      limit,
			TotalItems: totalItems,
			TotalPages: totalPages,
			HasNext:    page < totalPages,
			HasPrev:    page > 1,
		},
	})
}
