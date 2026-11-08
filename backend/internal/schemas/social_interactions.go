package schemas

import "time"

type ActivityLike struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	ActivityID string    `json:"activity_id" gorm:"not null;index"`
	UserID     string    `json:"user_id" gorm:"not null;index"`
	CreatedAt  time.Time `json:"created_at"`

	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type ActivityComment struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	ActivityID string    `json:"activity_id" gorm:"not null;index"`
	UserID     string    `json:"user_id" gorm:"not null;index"`
	Content    string    `json:"content" gorm:"not null"`
	CreatedAt  time.Time `json:"created_at"`

	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}
