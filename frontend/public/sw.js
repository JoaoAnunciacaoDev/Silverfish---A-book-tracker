// Service Worker do Silverfish — PWA & Web Push

const CACHE_NAME = 'silverfish-cache-v2'
const DEFAULT_NOTIFICATION_URL = '/?tab=library'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Suporte a Cache Offline básico para navegação resiliente
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ignora requisições de API ou métodos não-GET para não interferir nas chamadas dinâmicas
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api')) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => {
          if (cachedResponse) return cachedResponse
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
          return undefined
        })

      return cachedResponse || fetchPromise
    })
  )
})

// Web Push Notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'Silverfish 📖',
    body: 'Hora de ler! Não perca o progresso da sua ofensiva.',
    icon: '/favicon.svg',
    url: DEFAULT_NOTIFICATION_URL,
  }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || DEFAULT_NOTIFICATION_URL },
    vibrate: [100, 50, 100],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl = event.notification.data?.url || DEFAULT_NOTIFICATION_URL
  const targetUrl = new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus()
          const clientPath = new URL(client.url).pathname
          if (clientPath === '/' || clientPath === '/index.html') {
            client.postMessage({ type: 'SILVERFISH_NAVIGATE', url: rawUrl })
          } else if ('navigate' in client) {
            await client.navigate(targetUrl).catch(() => {})
          }
          return client
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    })
  )
})
