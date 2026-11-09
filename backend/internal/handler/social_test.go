package handler_test

import (
	"strings"
	"testing"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/handler"
)

func TestUpdateProfileRequest_Validate(t *testing.T) {
	strPtr := func(v string) *string { return &v }

	tests := []struct {
		name      string
		req       handler.UpdateProfileRequest
		expectErr bool
	}{
		{
			name: "valido com display name e bio",
			req: handler.UpdateProfileRequest{
				DisplayName: strPtr("Leitor Ávido"),
				Bio:         strPtr("Amante de ficção científica e fantasia"),
				Timezone:    strPtr("America/Sao_Paulo"),
			},
			expectErr: false,
		},
		{
			name: "invalido com display name muito curto",
			req: handler.UpdateProfileRequest{
				DisplayName: strPtr("A"),
			},
			expectErr: true,
		},
		{
			name: "invalido com bio acima de 250 caracteres",
			req: handler.UpdateProfileRequest{
				Bio: strPtr(strings.Repeat("B", 251)),
			},
			expectErr: true,
		},
		{
			name: "invalido com timezone inexistente",
			req: handler.UpdateProfileRequest{
				Timezone: strPtr("Planeta/Marte"),
			},
			expectErr: true,
		},
		{
			name: "valido com bio no limite de 250 caracteres",
			req: handler.UpdateProfileRequest{
				Bio: strPtr(strings.Repeat("C", 250)),
			},
			expectErr: false,
		},
		{
			name: "invalido com avatar url acima de 1000 caracteres",
			req: handler.UpdateProfileRequest{
				AvatarURL: strPtr("https://example.com/" + strings.Repeat("a", 1001)),
			},
			expectErr: true,
		},
		{
			name: "valido com avatar url normal",
			req: handler.UpdateProfileRequest{
				AvatarURL: strPtr("https://example.com/avatar.png"),
			},
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
