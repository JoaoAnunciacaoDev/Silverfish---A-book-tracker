package schemas

import "time"

type BookReview struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"not null;index"`
	BookID    string    `json:"book_id" gorm:"not null;index"`
	Rating    int       `json:"rating" gorm:"not null"`
	Comment   string    `json:"comment" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relacionamentos
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Book *Book `json:"book,omitempty" gorm:"foreignKey:BookID"`
}
