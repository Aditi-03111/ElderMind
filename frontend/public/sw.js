const CACHE_NAME = 'eldermind-v2'

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/medication.html',
  '/activity.html',
  '/alert.html',
  '/summary.html',
  '/support.html',
  '/manifest.webmanifest',
  '/pwa-icon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const cache = await caches.open(CACHE_NAME)
          cache.put('/index.html', response.clone())
          return response
        } catch {
          return (await caches.match('/index.html')) || Response.error()
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached

      try {
        const response = await fetch(request)
        const url = new URL(request.url)
        if (url.origin === self.location.origin && response.ok) {
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, response.clone())
        }
        return response
      } catch {
        if (request.mode === 'navigate') {
          return (await caches.match('/index.html')) || Response.error()
        }
        return Response.error()
      }
    })(),
  )
})
