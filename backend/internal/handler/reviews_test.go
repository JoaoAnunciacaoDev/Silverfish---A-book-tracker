package handler_test

import (
	"strings"
	"testing"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/handler"
)

func TestCreateReviewRequest_Validate(t *testing.T) {
	intPtr := func(v int) *int { return &v }

	tests := []struct {
		name      string
		req       handler.CreateReviewRequest
		expectErr bool
	}{
		{
			name:      "valido com nota 10 e comentario",
			req:       handler.CreateReviewRequest{Rating: intPtr(10), Comment: "Excelente livro!"},
			expectErr: false,
		},
		{
			name:      "valido com nota 0 sem comentario",
			req:       handler.CreateReviewRequest{Rating: intPtr(0), Comment: ""},
			expectErr: false,
		},
		{
			name:      "invalido sem nota",
			req:       handler.CreateReviewRequest{Rating: nil, Comment: "Sem nota"},
			expectErr: true,
		},
		{
			name:      "invalido com nota negativa",
			req:       handler.CreateReviewRequest{Rating: intPtr(-1), Comment: "Ruim"},
			expectErr: true,
		},
		{
			name:      "invalido com nota maior que 10",
			req:       handler.CreateReviewRequest{Rating: intPtr(11), Comment: "Top"},
			expectErr: true,
		},
		{
			name:      "invalido com comentario acima de 1000 caracteres",
			req:       handler.CreateReviewRequest{Rating: intPtr(8), Comment: strings.Repeat("A", 1001)},
			expectErr: true,
		},
		{
			name:      "valido com comentario exatamente 1000 caracteres",
			req:       handler.CreateReviewRequest{Rating: intPtr(8), Comment: strings.Repeat("B", 1000)},
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.expectErr {
				t.Errorf("Validate() erro = %v, expectErr = %v", err, tt.expectErr)
			}
		})
	}
}

func TestUpdateReviewRequest_Validate(t *testing.T) {
	intPtr := func(v int) *int { return &v }
	strPtr := func(v string) *string { return &v }

	tests := []struct {
		name      string
		req       handler.UpdateReviewRequest
		expectErr bool
	}{
		{
			name:      "valido alterando apenas nota",
			req:       handler.UpdateReviewRequest{Rating: intPtr(9)},
			expectErr: false,
		},
		{
			name:      "valido alterando apenas comentario",
			req:       handler.UpdateReviewRequest{Comment: strPtr("Novo comentario")},
			expectErr: false,
		},
		{
			name:      "invalido com nota maior que 10",
			req:       handler.UpdateReviewRequest{Rating: intPtr(12)},
			expectErr: true,
		},
		{
			name:      "invalido com comentario maior que 1000 chars",
			req:       handler.UpdateReviewRequest{Comment: strPtr(strings.Repeat("X", 1001))},
			expectErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if (err != nil) != tt.expectErr {
				t.Errorf("Validate() erro = %v, expectErr = %v", err, tt.expectErr)
			}
		})
	}
}
