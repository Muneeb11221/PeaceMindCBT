const CACHE_NAME = 'peacemind-v2'; // Incremented version
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './js/storage.js',
  './js/safety.js',
  './js/ai.js',
  './js/app.js',
  './manifest.json'
];

// External assets that might fail (CDN)
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap',
  'https://unpkg.com/feather-icons'
];

/**
 * Installation: Cache local assets first. CDNs are added gracefully 
 * to prevent the entire SW installation from failing if a CDN is down.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // 1. Cache essential local assets
      await cache.addAll(ASSETS_TO_CACHE);

      // 2. Cache external assets individually to handle failures gracefully
      await Promise.allSettled(
        EXTERNAL_ASSETS.map(url => 
          fetch(url, { mode: 'no-cors' }).then(response => {
            return cache.put(url, response);
          }).catch(err => console.warn('Failed to cache external asset:', url, err))
        )
      );

      return self.skipWaiting();
    })
  );
});

/**
 * Fetch Strategy: Cache First, falling back to Network.
 * Navigation requests fall back to index.html if offline.
 */
self.addEventListener('fetch', event => {
  // Ignore non-GET requests and API calls
  if (event.request.method !== 'GET' || 
      event.request.url.includes('peacemind-ai-cbt.onrender.com') || 
      event.request.url.includes('192.168.1.101') || 
      event.request.url.includes('localhost') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        // Don't cache if not a success or if it's an opaque response (status 0)
        // unless we explicitly want to (like for CDNs).
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // OFFLINE FALLBACK: For navigation requests, return the cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

/**
 * Activation: Cleanup old caches.
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
