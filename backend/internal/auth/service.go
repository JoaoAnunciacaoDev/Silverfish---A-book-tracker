package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/config"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserAlreadyExists  = errors.New("email ou nome de usuário já em uso")
	ErrInvalidCredentials = errors.New("credenciais inválidas")
	ErrSessionExpired     = errors.New("sessão expirada ou inválida")
	ErrInvalidTimezone    = errors.New("fuso horário inválido")
	ErrInvalidUsername    = errors.New("nome de usuário deve ter entre 3 e 30 caracteres (apenas letras, números e _)")
)

type Service struct {
	repo *Repository
	cfg  *config.Config
}

func NewService(repo *Repository, cfg *config.Config) *Service {
	return &Service{repo: repo, cfg: cfg}
}

// hashToken calcula o HMAC-SHA256 do token usando a SESSION_SECRET
func (s *Service) hashToken(rawToken string) string {
	mac := hmac.New(sha256.New, []byte(s.cfg.SessionSecret))
	mac.Write([]byte(rawToken))
	return hex.EncodeToString(mac.Sum(nil))
}

func isAlphaNumericUnderscore(s string) bool {
	for _, r := range s {
		if !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9') && r != '_' {
			return false
		}
	}
	return true
}

func (s *Service) Register(input RegisterInput) (*User, error) {
	// 1. Normalização ANTES de qualquer validação ou consulta
	normalizedEmail := strings.ToLower(strings.TrimSpace(input.Email))
	normalizedUsername := strings.ToLower(strings.TrimSpace(input.Username))

	// 2. Validação rigorosa pós-normalização
	if len(normalizedUsername) < 3 || len(normalizedUsername) > 30 || !isAlphaNumericUnderscore(normalizedUsername) {
		return nil, ErrInvalidUsername
	}

	// 3. Validação rigorosa do fuso horário IANA
	tz := strings.TrimSpace(input.Timezone)
	if tz == "" {
		tz = "America/Sao_Paulo"
	}
	if _, err := time.LoadLocation(tz); err != nil {
		return nil, ErrInvalidTimezone
	}

	// 4. Checagem de duplicidade com dados normalizados
	if _, err := s.repo.FindUserByEmail(normalizedEmail); err == nil {
		return nil, ErrUserAlreadyExists
	}
	if _, err := s.repo.FindUserByUsername(normalizedUsername); err == nil {
		return nil, ErrUserAlreadyExists
	}

	// 5. Hash da senha com bcrypt
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &User{
		ID:           uuid.NewString(),
		Email:        normalizedEmail,
		Username:     normalizedUsername,
		PasswordHash: string(hash),
		DisplayName:  strings.TrimSpace(input.DisplayName),
		Role:         "USER",
		Timezone:     tz,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.repo.CreateUser(user); err != nil {
		// Trata colisão em condição de concorrência (Unique constraint violation)
		errStr := strings.ToLower(err.Error())
		if strings.Contains(errStr, "unique") || strings.Contains(errStr, "23505") {
			return nil, ErrUserAlreadyExists
		}
		return nil, err
	}

	return user, nil
}

func (s *Service) Login(input LoginInput) (*User, string, error) {
	// Normalização
	loginTarget := strings.ToLower(strings.TrimSpace(input.EmailOrUsername))

	user, err := s.repo.FindUserByEmail(loginTarget)
	if err != nil {
		user, err = s.repo.FindUserByUsername(loginTarget)
		if err != nil {
			return nil, "", ErrInvalidCredentials
		}
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, "", ErrInvalidCredentials
	}

	// Gera 32 bytes criptograficamente seguros para o cookie
	rawTokenBytes := make([]byte, 32)
	if _, err := rand.Read(rawTokenBytes); err != nil {
		return nil, "", err
	}
	rawToken := hex.EncodeToString(rawTokenBytes)

	// Salva no banco APENAS o HMAC hash do token (protegendo a SESSION_SECRET)
	session := &Session{
		ID:        uuid.NewString(),
		UserID:    user.ID,
		Token:     s.hashToken(rawToken),
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		CreatedAt: time.Now(),
	}

	if err := s.repo.CreateSession(session); err != nil {
		return nil, "", err
	}

	// Retorna o token bruto que será colocado no cookie do navegador
	return user, rawToken, nil
}

func (s *Service) ValidateSession(rawToken string) (*User, error) {
	hashedToken := s.hashToken(rawToken)
	session, err := s.repo.FindSessionByToken(hashedToken)
	if err != nil {
		return nil, ErrSessionExpired
	}

	return s.repo.FindUserByID(session.UserID)
}

func (s *Service) Logout(rawToken string) error {
	hashedToken := s.hashToken(rawToken)
	return s.repo.DeleteSessionByToken(hashedToken)
}
