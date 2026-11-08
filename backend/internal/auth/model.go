package auth

import (
	"time"
)

type User struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	Email        string    `json:"email" gorm:"unique;not null"`
	Username     string    `json:"username" gorm:"unique;not null"`
	DisplayName  string    `json:"display_name" gorm:"not null"`
	PasswordHash string    `json:"-" gorm:"not null"`
	Role         string    `json:"role"`
	Timezone     string    `json:"timezone"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Session struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"not null;index"`
	Token     string    `json:"token" gorm:"unique;not null;index"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

// DTOs (Data Transfer Objects) para as requisições
type RegisterInput struct {
	Email       string `json:"email" binding:"required,email"`
	Username    string `json:"username" binding:"required,min=3,max=30"`
	Password    string `json:"password" binding:"required,min=6"`
	DisplayName string `json:"display_name" binding:"required"`
	Timezone    string `json:"timezone"`
}
type LoginInput struct {
	EmailOrUsername string `json:"email_or_username" binding:"required"`
	Password        string `json:"password" binding:"required"`
}
