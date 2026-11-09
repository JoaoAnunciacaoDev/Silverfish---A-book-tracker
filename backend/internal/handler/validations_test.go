package handler_test

import (
	"strings"
	"testing"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/handler"
)

func TestCreateBookRequest_Validate(t *testing.T) {
	tests := []struct {
		name      string
		req       handler.CreateBookRequest
		expectErr bool
	}{
		{
			name: "valido com campos normais",
			req: handler.CreateBookRequest{
				Title:     "O Senhor dos Anéis",
				Author:    "J.R.R. Tolkien",
				PageCount: 1200,
			},
			expectErr: false,
		},
		{
			name: "invalido sem titulo",
			req: handler.CreateBookRequest{
				Title:     "",
				Author:    "J.R.R. Tolkien",
				PageCount: 1200,
			},
			expectErr: true,
		},
		{
			name: "invalido sem autor",
			req: handler.CreateBookRequest{
				Title:     "O Senhor dos Anéis",
				Author:    "",
				PageCount: 1200,
			},
			expectErr: true,
		},
		{
			name: "invalido com paginas zero ou negativas",
			req: handler.CreateBookRequest{
				Title:     "O Senhor dos Anéis",
				Author:    "J.R.R. Tolkien",
				PageCount: 0,
			},
			expectErr: true,
		},
		{
			name: "invalido com paginas acima de 50000",
			req: handler.CreateBookRequest{
				Title:     "O Senhor dos Anéis",
				Author:    "J.R.R. Tolkien",
				PageCount: 50001,
			},
			expectErr: true,
		},
		{
			name: "invalido com titulo maior que 500 caracteres",
			req: handler.CreateBookRequest{
				Title:     strings.Repeat("A", 501),
				Author:    "J.R.R. Tolkien",
				PageCount: 300,
			},
			expectErr: true,
		},
		{
			name: "invalido com autor maior que 300 caracteres",
			req: handler.CreateBookRequest{
				Title:     "Título Válido",
				Author:    strings.Repeat("B", 301),
				PageCount: 300,
			},
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

func TestCreateReadingSessionRequest_Validate(t *testing.T) {
	tests := []struct {
		name      string
		req       handler.CreateReadingSessionRequest
		expectErr bool
	}{
		{
			name: "valido com intervalo normal",
			req: handler.CreateReadingSessionRequest{
				UserBookID: "book-123",
				StartPage:  10,
				EndPage:    50,
			},
			expectErr: false,
		},
		{
			name: "invalido sem user_book_id",
			req: handler.CreateReadingSessionRequest{
				UserBookID: "   ",
				StartPage:  0,
				EndPage:    10,
			},
			expectErr: true,
		},
		{
			name: "invalido com start page negativa",
			req: handler.CreateReadingSessionRequest{
				UserBookID: "book-123",
				StartPage:  -1,
				EndPage:    10,
			},
			expectErr: true,
		},
		{
			name: "invalido com end page menor ou igual a start page",
			req: handler.CreateReadingSessionRequest{
				UserBookID: "book-123",
				StartPage:  20,
				EndPage:    20,
			},
			expectErr: true,
		},
		{
			name: "invalido com mais de 2000 paginas em uma unica sessao",
			req: handler.CreateReadingSessionRequest{
				UserBookID: "book-123",
				StartPage:  0,
				EndPage:    2001,
			},
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
