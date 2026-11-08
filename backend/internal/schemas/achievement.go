package schemas

import "time"

type Achievement struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Code        string    `json:"code" gorm:"not null;uniqueIndex"`
	Title       string    `json:"title" gorm:"not null"`
	Description string    `json:"description" gorm:"not null"`
	Icon        string    `json:"icon" gorm:"not null"`
	Category    string    `json:"category" gorm:"not null"`
	TargetValue int       `json:"target_value" gorm:"not null;default:1"`
	CreatedAt   time.Time `json:"created_at"`
}

type UserAchievement struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	UserID          string    `json:"user_id" gorm:"not null;index"`
	AchievementCode string    `json:"achievement_code" gorm:"not null;index"`
	UnlockedAt      time.Time `json:"unlocked_at"`

	Achievement *Achievement `json:"achievement,omitempty" gorm:"foreignKey:AchievementCode;references:Code"`
}
