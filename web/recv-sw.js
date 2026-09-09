var CACHE_NAME = 'cimbar-recv-v2026-08-21T2336';
var PRECACHE_URLS = [
  './recv.html',
  './i18n.js',
  './recv.2026-08-21T2336.js',
  './recv-worker.2026-08-21T2336.js',
  './cimbar_js.2026-08-21T2336.js',
  './cimbar_js.2026-08-21T2336.wasm',
  './zstd.2026-08-21T2336.js',
  './pwa-recv.2026-08-21T2336.json',
  './favicon.ico',
  './icon-192x192.png',
  './icon-512x512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function (err) {
        console.warn('[Recv-SW] Precache partial note:', err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.map(function (name) {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cachedResponse) {
      if (cachedResponse) {
        // Background revalidation for navigation/HTML requests
        if (e.request.mode === 'navigate' || e.request.url.endsWith('.html')) {
          fetch(e.request).then(function (networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(function (cache) {
                cache.put(e.request, networkResponse);
              });
            }
          }).catch(function () {});
        }
        return cachedResponse;
      }
      return fetch(e.request).then(function (networkResponse) {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
