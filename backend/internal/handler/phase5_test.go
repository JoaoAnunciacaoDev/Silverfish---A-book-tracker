package handler_test

import (
	"strings"
	"testing"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/handler"
)

func TestCreateCommentRequest_Validate(t *testing.T) {
	tests := []struct {
		name      string
		req       handler.CreateCommentRequest
		expectErr bool
	}{
		{
			name:      "valido com comentario simples",
			req:       handler.CreateCommentRequest{Content: "Parabéns pela meta batida!"},
			expectErr: false,
		},
		{
			name:      "invalido vazio",
			req:       handler.CreateCommentRequest{Content: "   "},
			expectErr: true,
		},
		{
			name:      "invalido excedendo 500 caracteres",
			req:       handler.CreateCommentRequest{Content: strings.Repeat("A", 501)},
			expectErr: true,
		},
		{
			name:      "valido com exatamente 500 caracteres",
			req:       handler.CreateCommentRequest{Content: strings.Repeat("B", 500)},
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
