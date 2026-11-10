package schemas_test

import (
	"testing"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
)

func TestIsValidUserBookStatus(t *testing.T) {
	validStatuses := []string{
		schemas.StatusWantToRead,
		schemas.StatusReading,
		schemas.StatusRead,
		schemas.StatusPaused,
		schemas.StatusAbandoned,
	}

	for _, s := range validStatuses {
		if !schemas.IsValidUserBookStatus(s) {
			t.Errorf("esperava que status '%s' fosse valido", s)
		}
	}

	invalidStatuses := []string{"", "invalid", "reading_now", "finished"}
	for _, s := range invalidStatuses {
		if schemas.IsValidUserBookStatus(s) {
			t.Errorf("esperava que status '%s' fosse invalido", s)
		}
	}
}

func TestGoalHistoryTableName(t *testing.T) {
	gh := schemas.GoalHistory{}
	if gh.TableName() != "goal_history" {
		t.Errorf("esperava 'goal_history', obteve '%s'", gh.TableName())
	}
}
