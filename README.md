# Silverfish — A Book Tracker 📖

Plataforma completa de incentivo à leitura e construção de hábitos diários através de metas personalizadas, ofensivas (*streaks*), diário detalhado de leituras, gamificação e rede social de leitores.

---

## Tecnologias Utilizadas

### Backend
- **Linguagem:** Go 1.27
- **Web Framework:** [Gin Gonic](https://gin-gonic.com/)
- **ORM & Banco de Dados:** [GORM](https://gorm.io/) com drivers para SQLite (desenvolvimento) e PostgreSQL (produção).
- **Migrações:** [golang-migrate](https://github.com/golang-migrate/migrate) com migrações SQL embutidas diretamente no binário (`embed.FS`).
- **Criptografia & Sessões:** `golang.org/x/crypto/bcrypt`, `crypto/hmac`, `crypto/sha256`.

### Frontend
- **Framework & UI:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 8](https://vitejs.dev/).
- **Estilização:** [Tailwind CSS v4](https://tailwindcss.com/).
- **Roteamento & Estado:** [TanStack Router](https://tanstack.com/router) & [TanStack Query](https://tanstack.com/query).
- **Linter & Qualidade:** [Oxlint](https://oxc.rs/) para análises estáticas ultravelozes.
- **Ícones & Efeitos:** [Lucide Icons](https://lucide.dev/), Canvas Confetti.

---

## Como Executar o Projeto Localmente

### Pré-requisitos
- [Go](https://go.dev/dl/) (versão 1.23 ou superior)
- [Bun](https://bun.sh/) (versão 1.0 ou superior)
- [Git](https://git-scm.com/)

---

### Backend

1. Entre no diretório do backend e configure o `.env`:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Exemplo de variáveis para desenvolvimento local:
   ```env
   PORT=8080
   ENV=development
   DB_DRIVER=sqlite
   DB_SOURCE=silverfish.db
   SESSION_SECRET=uma_chave_secreta_aleatoria_com_mais_de_32_caracteres_aqui
   FRONTEND_URL=http://localhost:5173
   ```

3. Inicie o servidor:
   ```bash
   go run cmd/server/main.go
   ```
   *O servidor iniciará em `http://localhost:8080` com as migrações executadas automaticamente.*

---

### Frontend

1. Em outro terminal, entre no diretório do frontend:
   ```bash
   cd frontend
   bun install
   ```

2. Execute o servidor de desenvolvimento:
   ```bash
   bun dev
   ```
   *Acesse a aplicação em `http://localhost:5173`. O Vite está configurado para encaminhar chamadas `/api` automaticamente para o backend na porta 8080.*

---

## Testes e Integração Contínua (CI)

Para rodar as validações manualmente na sua máquina:
```bash
# Backend
cd backend
go vet ./...
go test -v ./...

# Frontend
cd frontend
bun run lint
bun run build
```

---

## Estrutura de Pastas

```text
silverfish/
├── .github/
│   └── workflows/
│       └── ci.yml               # Pipeline de CI (Lint e Testes)
├── backend/
│   ├── cmd/server/main.go       # Ponto de entrada do backend
│   ├── internal/
│   │   ├── config/              # Leitura de variáveis de ambiente
│   │   ├── database/            # Conexão GORM (SQLite / Postgres)
│   │   ├── handler/             # Handlers HTTP REST e regras de negócio
│   │   ├── middleware/          # Auth, CORS, Rate Limit e Logger
│   │   ├── router/              # Mapeamento de rotas e workers em background
│   │   └── schemas/             # Modelos GORM e DTOs de validação
│   └── migrations/              # Migrações SQL numeradas (.up.sql / .down.sql)
└── frontend/
    ├── public/                  # Ícones, manifest.webmanifest e sw.js (PWA)
    ├── src/
    │   ├── api/                 # Clientes HTTP (fetch com credentials)
    │   ├── components/          # Componentes visuais reutilizáveis e modais
    │   ├── features/            # Módulos da aplicação (auth, reading, social, admin, etc.)
    │   ├── types/               # Tipagens TypeScript centralizadas
    │   └── main.tsx             # Bootstrap do React 19 e rotas
    ├── package.json
    └── vite.config.ts
```

