package schemas

import "time"

type DailyGoal struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	UserID          string    `json:"user_id" gorm:"not null;uniqueIndex"`
	DailyPageTarget int       `json:"daily_page_target" gorm:"not null;default:20"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type GoalHistory struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"not null;index"`
	Date      string    `json:"date" gorm:"type:date;not null;index"`
	PagesRead int       `json:"pages_read" gorm:"not null;default:0"`
	Target    int       `json:"target" gorm:"not null;default:20"`
	Met       bool      `json:"met" gorm:"not null;default:false"`
	CreatedAt time.Time `json:"created_at"`
}
