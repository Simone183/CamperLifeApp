const CACHE_NAME = 'viacamper-cache-v2026-v20523';
const ASSETS_TO_CACHE = [
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

// Activate Event - purge old application bundles but PROTECT offline map tile caches!
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Never purge offline map caches or persistent user data!
          if (
            cache.startsWith('viacamper-offline') ||
            cache.startsWith('viacamper-tiles') ||
            cache.startsWith('viacamper-persistent')
          ) {
            console.log('[SW] Preserving offline map cache:', cache);
            return Promise.resolve();
          }

          if (cache !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

const TILE_CACHE_NAME = 'viacamper-tiles-fast-v1';

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const reqUrl = event.request.url;

  // Fast Cache-First strategy for map tiles & vector glyphs (Google Maps, Carto, OpenFreeMap)
  if (
    reqUrl.includes('.google.com/vt') ||
    reqUrl.includes('basemaps.cartocdn.com/') ||
    reqUrl.includes('tiles.openfreemap.org/') ||
    reqUrl.includes('arcgisonline.com/ArcGIS/rest/services/')
  ) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedTile) => {
          if (cachedTile) {
            return cachedTile;
          }
          return fetch(event.request).then((netRes) => {
            if (netRes && (netRes.status === 200 || netRes.type === 'opaque')) {
              try {
                cache.put(event.request, netRes.clone());
              } catch (_) {}
            }
            return netRes;
          });
        });
      })
    );
    return;
  }

  if (!reqUrl.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(reqUrl);
  const path = url.pathname.toLowerCase();
  
  if (path.startsWith('/api/')) {
    return;
  }

  // Network-First for HTML navigation, index, and compiled JS/CSS assets to ensure users NEVER get stuck on stale bundles
  if (event.request.mode === 'navigate' || path === '/' || path === '/index.html' || path.startsWith('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('/index.html') || caches.match('/'));
        })
    );
    return;
  }

  if (
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.endsWith('.webp') ||
    path.endsWith('.svg') ||
    path.startsWith('/uploads/')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
