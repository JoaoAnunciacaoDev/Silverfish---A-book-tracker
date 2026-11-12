package handler

import (
	"testing"

	"github.com/JoaoAnunciacaoDev/Silverfish---A-book-tracker/backend/internal/schemas"
)

func TestGetMonthDateBounds(t *testing.T) {
	tests := []struct {
		month     string
		wantStart string
		wantEnd   string
		wantOK    bool
	}{
		{"2026-11", "2026-11-01", "2026-11-30", true},
		{"2026-02", "2026-02-01", "2026-02-28", true},
		{"2024-02", "2024-02-01", "2024-02-29", true},
		{"2026-12", "2026-12-01", "2026-12-31", true},
		{"invalid", "", "", false},
	}

	for _, tt := range tests {
		start, end, ok := getMonthDateBounds(tt.month)
		if ok != tt.wantOK || start != tt.wantStart || end != tt.wantEnd {
			t.Errorf("getMonthDateBounds(%q) = (%q, %q, %v), want (%q, %q, %v)",
				tt.month, start, end, ok, tt.wantStart, tt.wantEnd, tt.wantOK)
		}
	}
}

func TestCalculateStreaks_NormalizesRFC3339Dates(t *testing.T) {
	history := []schemas.GoalHistory{
		{Date: "2026-11-12T00:00:00Z", Met: true},
		{Date: "2026-11-11T00:00:00Z", Met: true},
		{Date: "2026-11-09T00:00:00Z", Met: true},
	}

	cur, best := calculateStreaks(history, "2026-11-12")
	if cur != 2 {
		t.Errorf("currentStreak = %d, want 2", cur)
	}
	if best != 2 {
		t.Errorf("bestStreak = %d, want 2", best)
	}

	singleDay := []schemas.GoalHistory{
		{Date: "2026-11-12T00:00:00Z", Met: true},
	}
	cur, best = calculateStreaks(singleDay, "2026-11-12")
	if cur != 1 || best != 1 {
		t.Errorf("singleDay = (%d, %d), want (1, 1)", cur, best)
	}
}
