package schemas

import "time"

const (
	VisibilityPublic    = "public"
	VisibilityFollowers = "followers"
	VisibilityPrivate   = "private"

	FollowStatusAccepted = "accepted"
	FollowStatusPending  = "pending"

	ActivityBookStarted         = "BOOK_STARTED"
	ActivityBookFinished        = "BOOK_FINISHED"
	ActivityGoalMet             = "GOAL_MET"
	ActivityStreakMilestone     = "STREAK_MILESTONE"
	ActivityReadingSession      = "READING_SESSION"
	ActivityReviewPosted        = "REVIEW_POSTED"
	ActivityAchievementUnlocked = "ACHIEVEMENT_UNLOCKED"
)

type UserPrivacySettings struct {
	ID                string    `json:"id" gorm:"primaryKey"`
	UserID            string    `json:"user_id" gorm:"unique;not null"`
	ProfileVisibility string    `json:"profile_visibility" gorm:"default:public"`
	LibraryVisibility string    `json:"library_visibility" gorm:"default:public"`
	StatsVisibility   string    `json:"stats_visibility" gorm:"default:public"`
	JournalVisibility string    `json:"journal_visibility" gorm:"default:followers"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Follow struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	FollowerID  string    `json:"follower_id" gorm:"not null;index"`
	FollowingID string    `json:"following_id" gorm:"not null;index"`
	Status      string    `json:"status" gorm:"default:accepted"`
	CreatedAt   time.Time `json:"created_at"`

	Follower  User `json:"follower,omitempty" gorm:"foreignKey:FollowerID"`
	Following User `json:"following,omitempty" gorm:"foreignKey:FollowingID"`
}

type Activity struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"user_id" gorm:"not null;index"`
	Type      string    `json:"type" gorm:"not null;index"`
	BookID    *string   `json:"book_id,omitempty"`
	Metadata  string    `json:"metadata,omitempty"` // JSON string
	CreatedAt time.Time `json:"created_at" gorm:"index"`

	User User  `json:"user" gorm:"foreignKey:UserID"`
	Book *Book `json:"book,omitempty" gorm:"foreignKey:BookID"`
}
