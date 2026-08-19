const CACHE_NAME = 'viacamper-cache-v2026-v39';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/logo-192x192.png',
  '/logo-512x512.png',
  '/maskable-icon-192x192.png',
  '/maskable-icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Loop through assets and add them individually to make sure
      // one failing request does not cancel the entire service worker installation!
      return Promise.all(
        ASSETS_TO_CACHE.map((asset) => {
          return cache.add(asset)
            .then(() => {
              console.log(`Successfully cached: ${asset}`);
            })
            .catch((err) => {
              console.warn(`Could not cache asset: ${asset}`, err);
            });
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Crucial for installability criteria
self.addEventListener('fetch', (event) => {
  // Only handle GET requests with local schema
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Bypass service worker caching for local user uploads and category image files
  // as well as any API requests to ensure real-time data is not cached statically
  const url = new URL(event.request.url);
  const path = url.pathname.toLowerCase();
  
  if (path.startsWith('/api/')) {
    return;
  }
  
  // Do NOT bypass if the request matches one of our core shell asset routes which must be offline-available for installability
  const isCoreAsset = ASSETS_TO_CACHE.includes(path) || path === '/' || path === '/manifest.json' || path === '/index.html' || path.endsWith('manifest.json');
  
  if (!isCoreAsset && (
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.endsWith('.webp') ||
    path.endsWith('.svg') ||
    path.startsWith('/uploads/')
  )) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to update cache (stale-while-revalidate pattern)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => { /* ignore background network errors */ });
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Cache dynamically loaded page sub-assets
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If offline, return index.html for SPA page navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
