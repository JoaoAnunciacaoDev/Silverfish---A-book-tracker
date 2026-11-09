# ==========================================
# Estágio 1: Build (Compilação da aplicação)
# ==========================================
FROM golang:alpine AS builder

# Dependências necessárias para compilação CGO (exigido pelo driver SQLite mattn/go-sqlite3)
RUN apk add --no-cache gcc musl-dev git ca-certificates tzdata

WORKDIR /app

# Cache inteligente de camadas com as dependências Go
COPY go.mod go.sum ./
RUN go mod download

# Copia o código-fonte do backend (incluindo migrations embutidas)
COPY . .

# Compila o binário estaticamente otimizado
RUN CGO_ENABLED=1 GOOS=linux go build -trimpath -ldflags="-s -w" -o /app/server ./cmd/server

# ==========================================
# Estágio 2: Runtime (Imagem de produção)
# ==========================================
FROM alpine:3.21

# Utilitários de execução:
# - ca-certificates: requisições HTTPS externas (Google Books / Open Library)
# - tzdata: suporte a fusos horários configurados pelos usuários
# - curl: utilizado no health check
RUN apk add --no-cache ca-certificates tzdata curl

# Usuário não-root por boas práticas de segurança
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Diretório para persistência do banco SQLite caso utilizado em volume
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

# Copia o executável compilado
COPY --from=builder --chown=appuser:appgroup /app/server /app/server

USER appuser

# Variáveis padrão
ENV PORT=8080 \
    ENV=production \
    GIN_MODE=release \
    DB_DRIVER=sqlite \
    DB_SOURCE=/app/data/silverfish.db

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

ENTRYPOINT ["/app/server"]
