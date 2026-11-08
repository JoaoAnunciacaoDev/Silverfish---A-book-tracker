package auth

import (
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateUser(user *User) error {
	return r.db.Create(user).Error
}

func (r *Repository) FindUserByID(id string) (*User, error) {
	var user User
	err := r.db.Where("id = ?", id).First(&user).Error
	return &user, err
}

func (r *Repository) FindUserByUsername(username string) (*User, error) {
	var user User
	err := r.db.Where("username = ?", username).First(&user).Error
	return &user, err
}

func (r *Repository) FindUserByEmail(email string) (*User, error) {
	var user User
	err := r.db.Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *Repository) CreateSession(session *Session) error {
	return r.db.Create(session).Error
}

func (r *Repository) FindSessionByToken(token string) (*Session, error) {
	var session Session
	err := r.db.Where("token = ? AND expires_at > ?", token, time.Now()).First(&session).Error
	return &session, err
}

func (r *Repository) DeleteSessionByToken(token string) error {
	return r.db.Where("token = ?", token).Delete(&Session{}).Error
}

// DeleteExpiredSessions remove sessões cuja data de expiração já passou
func (r *Repository) DeleteExpiredSessions() error {
	return r.db.Where("expires_at < ?", time.Now()).Delete(&Session{}).Error
}
