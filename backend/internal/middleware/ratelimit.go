package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type client struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	clients = make(map[string]*client)
	mu      sync.Mutex
)

// Inicia rotina em background para limpar IPs inativos e evitar vazamento de memória
func init() {
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			mu.Lock()
			for ip, c := range clients {
				if time.Since(c.lastSeen) > 10*time.Minute {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()
}

// RateLimiter aplica controle de fluxo por IP usando o algoritmo Token Bucket
func RateLimiter(r rate.Limit, burst int) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		mu.Lock()
		cl, exists := clients[ip]
		if !exists {
			cl = &client{limiter: rate.NewLimiter(r, burst)}
			clients[ip] = cl
		}
		cl.lastSeen = time.Now()
		limiter := cl.limiter
		mu.Unlock()

		if !limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Muitas requisições. Por favor, aguarde alguns segundos antes de tentar novamente.",
			})
			return
		}

		c.Next()
	}
}
