package handler

import (
	"errors"
	"strings"
	"time"
)

type RegisterRequest struct {
	Email       string `json:"email"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
	Timezone    string `json:"timezone"`
}

func isAlphaNumericUnderscore(s string) bool {
	for _, r := range s {
		if !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') && r != '_' {
			return false
		}
	}
	return true
}

func isStrongPassword(p string) bool {
	if len(p) < 8 {
		return false
	}
	var hasUpper, hasNumber bool
	for _, r := range p {
		if r >= 'A' && r <= 'Z' {
			hasUpper = true
		}
		if r >= '0' && r <= '9' {
			hasNumber = true
		}
	}
	return hasUpper && hasNumber
}

func (r *RegisterRequest) Validate() error {
	r.Email = strings.ToLower(strings.TrimSpace(r.Email))
	r.Username = strings.ToLower(strings.TrimSpace(r.Username))
	r.DisplayName = strings.TrimSpace(r.DisplayName)
	r.Timezone = strings.TrimSpace(r.Timezone)

	if r.Email == "" || !strings.Contains(r.Email, "@") {
		return errors.New("email inválido ou ausente")
	}

	if len(r.Username) < 3 || len(r.Username) > 30 || !isAlphaNumericUnderscore(r.Username) {
		return errors.New("nome de usuário deve ter entre 3 e 30 caracteres (apenas letras, números e _)")
	}

	if r.DisplayName == "" {
		return errors.New("nome de exibição é obrigatório")
	}

	if !isStrongPassword(r.Password) {
		return errors.New("a senha deve ter no mínimo 8 caracteres, contendo pelo menos uma letra maiúscula e um número")
	}

	if r.Timezone == "" {
		r.Timezone = "America/Sao_Paulo"
	}
	if _, err := time.LoadLocation(r.Timezone); err != nil {
		return errors.New("fuso horário IANA inválido")
	}

	return nil
}

type LoginRequest struct {
	EmailOrUsername string `json:"email_or_username"`
	Password        string `json:"password"`
}

func (r *LoginRequest) Validate() error {
	r.EmailOrUsername = strings.ToLower(strings.TrimSpace(r.EmailOrUsername))
	if r.EmailOrUsername == "" {
		return errors.New("email ou nome de usuário é obrigatório")
	}
	if r.Password == "" {
		return errors.New("senha é obrigatória")
	}
	return nil
}
