package schemas

import "time"

type User struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	Email        string    `json:"email" gorm:"unique;not null"`
	Username     string    `json:"username" gorm:"unique;not null"`
	DisplayName  string    `json:"display_name" gorm:"not null"`
	PasswordHash string    `json:"-" gorm:"not null"`
	Role         string    `json:"role" gorm:"default:USER"`
	Timezone     string    `json:"timezone" gorm:"default:America/Sao_Paulo"`
	Bio          string    `json:"bio" gorm:"default:''"`
	AvatarURL    string    `json:"avatar_url" gorm:"default:''"`
	IsPrivate    bool      `json:"is_private" gorm:"default:false"`
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
