package handler_test

import (
	"testing"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/handler"
)

func TestCreatePatchNoteRequest_Validate(t *testing.T) {
	tests := []struct {
		name      string
		req       handler.CreatePatchNoteRequest
		expectErr bool
	}{
		{
			name: "valido com versao, titulo e resumo",
			req: handler.CreatePatchNoteRequest{
				Version: "v1.4.0",
				Title:   "Lançamento da Fase 4",
				Summary: "Notificações push, painel administrativo e patch notes.",
			},
			expectErr: false,
		},
		{
			name: "invalido sem versao",
			req: handler.CreatePatchNoteRequest{
				Version: "",
				Title:   "Titulo",
				Summary: "Resumo",
			},
			expectErr: true,
		},
		{
			name: "invalido sem titulo",
			req: handler.CreatePatchNoteRequest{
				Version: "v1.4.0",
				Title:   "",
				Summary: "Resumo",
			},
			expectErr: true,
		},
		{
			name: "invalido sem resumo",
			req: handler.CreatePatchNoteRequest{
				Version: "v1.4.0",
				Title:   "Titulo",
				Summary: "",
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

func TestSubscribePushRequest_Validate(t *testing.T) {
	tests := []struct {
		name      string
		req       handler.SubscribePushRequest
		expectErr bool
	}{
		{
			name: "valido com endpoint e chaves",
			req: handler.SubscribePushRequest{
				Endpoint: "https://fcm.googleapis.com/fcm/send/sample-token",
				Keys: handler.PushSubscriptionKeys{
					P256dh: "BMockP256dhKey...",
					Auth:   "MockAuthSecret...",
				},
			},
			expectErr: false,
		},
		{
			name: "invalido sem endpoint",
			req: handler.SubscribePushRequest{
				Endpoint: "",
				Keys: handler.PushSubscriptionKeys{
					P256dh: "key",
					Auth:   "auth",
				},
			},
			expectErr: true,
		},
		{
			name: "invalido sem chaves",
			req: handler.SubscribePushRequest{
				Endpoint: "https://example.com/push",
				Keys: handler.PushSubscriptionKeys{
					P256dh: "",
					Auth:   "",
				},
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
