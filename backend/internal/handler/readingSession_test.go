package handler_test

import (
	"testing"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/handler"
	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
)

func TestNormalizeDateOnly(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"2026-11-11", "2026-11-11"},
		{"2026-11-11T00:00:00Z", "2026-11-11"},
		{" 2026-11-11T15:30:00-03:00 ", "2026-11-11"},
		{"", ""},
		{"invalid", "invalid"},
	}

	for _, tt := range tests {
		got := schemas.NormalizeDateOnly(tt.input)
		if got != tt.want {
			t.Errorf("NormalizeDateOnly(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestCreateReadingSessionRequest_ReadAtValidation(t *testing.T) {
	intPtr := func(v int) *int { return &v }

	tests := []struct {
		name      string
		req       handler.CreateReadingSessionRequest
		expectErr bool
		wantDate  string
	}{
		{
			name: "valido com data ISO normalizada",
			req: handler.CreateReadingSessionRequest{
				UserBookID:    "ub-1",
				StartPage:     0,
				EndPage:       25,
				ReadAt:        "2026-11-11T00:00:00Z",
				Comprehension: intPtr(4),
			},
			expectErr: false,
			wantDate:  "2026-11-11",
		},
		{
			name: "invalido formato de data",
			req: handler.CreateReadingSessionRequest{
				UserBookID: "ub-1",
				StartPage:  0,
				EndPage:    10,
				ReadAt:     "11/11/2026",
			},
			expectErr: true,
		},
		{
			name: "invalido end_page menor ou igual start_page",
			req: handler.CreateReadingSessionRequest{
				UserBookID: "ub-1",
				StartPage:  20,
				EndPage:    20,
			},
			expectErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := tt.req
			err := req.Validate()
			if (err != nil) != tt.expectErr {
				t.Fatalf("Validate() err = %v, expectErr = %v", err, tt.expectErr)
			}
			if !tt.expectErr && tt.wantDate != "" && req.ReadAt != tt.wantDate {
				t.Errorf("ReadAt = %q, want %q", req.ReadAt, tt.wantDate)
			}
		})
	}
}

func TestUpdateReadingSessionRequest_Validate(t *testing.T) {
	intPtr := func(v int) *int { return &v }

	tests := []struct {
		name      string
		req       handler.UpdateReadingSessionRequest
		expectErr bool
		wantDate  string
	}{
		{
			name: "valido atualizando paginas e data",
			req: handler.UpdateReadingSessionRequest{
				StartPage:     10,
				EndPage:       42,
				ReadAt:        "2026-11-10",
				Comprehension: intPtr(5),
			},
			expectErr: false,
			wantDate:  "2026-11-10",
		},
		{
			name: "valido sem data preserva vazio",
			req: handler.UpdateReadingSessionRequest{
				StartPage: 0,
				EndPage:   15,
			},
			expectErr: false,
			wantDate:  "",
		},
		{
			name: "invalido pagina negativa",
			req: handler.UpdateReadingSessionRequest{
				StartPage: -1,
				EndPage:   10,
			},
			expectErr: true,
		},
		{
			name: "invalido compreensao fora do intervalo",
			req: handler.UpdateReadingSessionRequest{
				StartPage:     0,
				EndPage:       10,
				Comprehension: intPtr(6),
			},
			expectErr: true,
		},
		{
			name: "invalido data malformada",
			req: handler.UpdateReadingSessionRequest{
				StartPage: 0,
				EndPage:   10,
				ReadAt:    "2026-13-45",
			},
			expectErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := tt.req
			err := req.Validate()
			if (err != nil) != tt.expectErr {
				t.Fatalf("Validate() err = %v, expectErr = %v", err, tt.expectErr)
			}
			if !tt.expectErr && req.ReadAt != tt.wantDate {
				t.Errorf("ReadAt = %q, want %q", req.ReadAt, tt.wantDate)
			}
		})
	}
}
