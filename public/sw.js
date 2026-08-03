// Service Worker for Worship Planner PWA
const CACHE_NAME = 'worship-planner-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      // Clean old caches
      caches.keys().then(keys => 
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
    ])
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // For API requests: stale-while-revalidate (instant from cache, update in background)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request)
        
        // Always fetch fresh in background
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone())
          }
          return networkResponse
        }).catch(() => cachedResponse)

        // Return cached immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // For page navigations and assets: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
