package handler

import (
	"testing"
)

func TestCleanISBN(t *testing.T) {
	tests := []struct {
		input    string
		expected string
		isISBN   bool
	}{
		{"978-85-426-0428-1", "9788542604281", true},
		{"854260428X", "854260428X", true},
		{"9788542604281", "9788542604281", true},
		{"turma da mônica", "", false},
		{"12345", "", false},
	}

	for _, tt := range tests {
		got, ok := cleanISBN(tt.input)
		if ok != tt.isISBN || got != tt.expected {
			t.Errorf("cleanISBN(%q) = (%q, %v); expected (%q, %v)", tt.input, got, ok, tt.expected, tt.isISBN)
		}
	}
}

func TestRankSearchResults(t *testing.T) {
	items := []ExternalBookItem{
		{
			Title:  "Turma da Mônica Jovem - Volume 1",
			Author: "Mauricio de Sousa",
		},
		{
			Title:  "Turma da Mônica Jovem - Edição 50: O Casamento do Século",
			Author: "Mauricio de Sousa",
		},
		{
			Title:  "Turma da Mônica Jovem - Volume 2",
			Author: "Mauricio de Sousa",
		},
	}

	ranked := rankSearchResults(items, "turma da mônica jovem edição 50")
	if len(ranked) != 3 {
		t.Fatalf("esperava 3 itens, obteve %d", len(ranked))
	}

	// O item com "Edição 50" DEVE ser o primeiro colocado
	if ranked[0].Title != "Turma da Mônica Jovem - Edição 50: O Casamento do Século" {
		t.Errorf("esperava que a Edição 50 ficasse em primeiro lugar, mas veio: %q", ranked[0].Title)
	}
}
