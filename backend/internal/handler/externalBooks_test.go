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

func TestIsRelevantResult(t *testing.T) {
	// Casos de lixo de OCR e falsos positivos do Google Books que DEVEM ser descartados
	junkItems := []struct {
		item  ExternalBookItem
		query string
	}{
		{
			item:  ExternalBookItem{Title: "Bookzine Mundo dos Super-Heróis - Volume 24", Author: "Autor Desconhecido"},
			query: "turma da mônica jovem 50",
		},
		{
			item:  ExternalBookItem{Title: "Os Donos da Rua: Representatividade Racial", Author: "Rodrigo Sérgio"},
			query: "turma da mônica jovem 50",
		},
		{
			item:  ExternalBookItem{Title: "De Volta a Ti", Author: "Amy Lea"},
			query: "turma da mônica jovem casamento",
		},
		{
			item:  ExternalBookItem{Title: "O ansioso e abençoado triplex", Author: "Erdnaxela Holmes"},
			query: "turma da mônica jovem casamento",
		},
	}

	for _, tt := range junkItems {
		if isRelevantResult(tt.item, tt.query) {
			t.Errorf("esperava que %q fosse considerado IRRELEVANTE para query %q, mas foi aceito", tt.item.Title, tt.query)
		}
	}

	// Casos válidos que DEVEM ser aceitos
	validItems := []struct {
		item  ExternalBookItem
		query string
	}{
		{
			item:  ExternalBookItem{Title: "Turma da Mônica Jovem - Edição 50", Author: "Mauricio de Sousa"},
			query: "turma da monica jovem 50",
		},
		{
			item:  ExternalBookItem{Title: "Turma da Monica Jovem", Author: "Maurício de Sousa"},
			query: "turma da mônica jovem",
		},
		{
			item:  ExternalBookItem{Title: "O Hobbit", Author: "J.R.R. Tolkien"},
			query: "hobbit",
		},
	}

	for _, tt := range validItems {
		if !isRelevantResult(tt.item, tt.query) {
			t.Errorf("esperava que %q fosse considerado RELEVANTE para query %q, mas foi rejeitado", tt.item.Title, tt.query)
		}
	}
}
