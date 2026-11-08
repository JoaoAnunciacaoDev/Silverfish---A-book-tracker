package schemas

import "time"

type Book struct {
	ID             string    `json:"id" gorm:"primaryKey"`
	Title          string    `json:"title" gorm:"not null;index"`
	Author         string    `json:"author" gorm:"not null;index"`
	Description    string    `json:"description"`
	CoverURL       string    `json:"cover_url"`
	PageCount      int       `json:"page_count" gorm:"not null"`
	Genre          string    `json:"genre"`
	ISBN           string    `json:"isbn"`
	OpenLibraryKey *string   `json:"open_library_key" gorm:"uniqueIndex"`
	CreatedBy      *string   `json:"created_by"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
