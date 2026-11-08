package migrations

import "embed"

// FS embute todos os arquivos .sql de migração diretamente no executável Go
//
//go:embed *.sql
var FS embed.FS
