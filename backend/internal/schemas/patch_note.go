package schemas

import "time"

type PatchNote struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	Version     string     `json:"version" gorm:"unique;not null"`
	Title       string     `json:"title" gorm:"not null"`
	Summary     string     `json:"summary" gorm:"not null"`
	ChangesJSON string     `json:"changes_json" gorm:"default:'{}'"`
	IsPublished bool       `json:"is_published" gorm:"default:false;index"`
	PublishedAt *time.Time `json:"published_at" gorm:"index"`
	CreatedBy   string     `json:"created_by" gorm:"not null"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	Author User `json:"author,omitempty" gorm:"foreignKey:CreatedBy"`
}
