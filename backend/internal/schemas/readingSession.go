package schemas

import "time"

type ReadingSession struct {
	ID            string    `json:"id" gorm:"primaryKey"`
	UserID        string    `json:"user_id" gorm:"not null;index"`
	UserBookID    string    `json:"user_book_id" gorm:"not null;index"`
	StartPage     int       `json:"start_page" gorm:"not null"`
	EndPage       int       `json:"end_page" gorm:"not null"`
	PagesRead     int       `json:"pages_read" gorm:"not null"`
	ReadAt        string    `json:"read_at" gorm:"type:date;not null;index"`
	Comprehension *int      `json:"comprehension"`
	Feeling       *string   `json:"feeling"`
	Notes         *string   `json:"notes"`
	CreatedAt     time.Time `json:"created_at"`

	UserBook UserBook `json:"user_book" gorm:"foreignKey:UserBookID"`
}
