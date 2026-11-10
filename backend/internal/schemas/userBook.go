package schemas

import "time"

const (
	StatusWantToRead = "want_to_read"
	StatusReading    = "reading"
	StatusRead       = "read"
	StatusPaused     = "paused"
	StatusAbandoned  = "abandoned"
)

func IsValidUserBookStatus(s string) bool {
	switch s {
	case StatusWantToRead, StatusReading, StatusRead, StatusPaused, StatusAbandoned:
		return true
	default:
		return false
	}
}

type UserBook struct {
	ID           string     `json:"id" gorm:"primaryKey"`
	UserID       string     `json:"user_id" gorm:"not null;index"`
	BookID       string     `json:"book_id" gorm:"not null;index"`
	Status       string     `json:"status" gorm:"not null;default:'want_to_read';index"`
	Favorite     bool       `json:"favorite" gorm:"not null;default:false"`
	InCollection bool       `json:"in_collection" gorm:"not null;default:false;index"`
	CurrentPage  int        `json:"current_page" gorm:"not null;default:0"`
	StartedAt    *time.Time `json:"started_at"`
	FinishedAt   *time.Time `json:"finished_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	// Relacionamentos
	Book Book  `json:"book" gorm:"foreignKey:BookID"`
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}
