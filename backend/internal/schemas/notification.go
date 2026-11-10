package schemas

import "time"

type PushSubscription struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"not null;index"`
	Endpoint  string    `json:"endpoint" gorm:"unique;not null;index"`
	P256dh    string    `json:"p256dh" gorm:"not null"`
	Auth      string    `json:"auth" gorm:"not null"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`

	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

type NotificationSettings struct {
	UserID                     string    `json:"user_id" gorm:"primaryKey"`
	DailyReminderEnabled       bool      `json:"daily_reminder_enabled" gorm:"default:true"`
	ReminderTime               string    `json:"reminder_time" gorm:"default:'20:00'"`
	StreakAlertEnabled         bool      `json:"streak_alert_enabled" gorm:"default:true"`
	SocialNotificationsEnabled bool      `json:"social_notifications_enabled" gorm:"default:true"`
	LastReminderDate           string    `json:"last_reminder_date" gorm:"default:''"`
	UpdatedAt                  time.Time `json:"updated_at"`
}
