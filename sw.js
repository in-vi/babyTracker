// In your sw.js

const CACHE_NAME = 'weighttrack-cache-v1'; // CHANGE THIS VERSION WHEN YOU UPDATE SW OR CRITICAL ASSETS
const ASSETS_TO_CACHE = [
    // DO NOT include '/' or './index.html' here if you want it to update immediately
    // OR use a network-first strategy for them.
    './manifest.json',
    './icon-192x192.png',
    // Add other static assets like specific CSS, JS libraries if they don't change often
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching App Shell:', ASSETS_TO_CACHE);
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tell the active service worker to take control of the page immediately.
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // For HTML navigation requests, always go to network first.
  // This ensures you get the latest index.html.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Optional: Fallback to a cached offline page if network fails
          // return caches.match('/offline.html');
          // For development, you might prefer it to just fail if network is down
          // or return a previously cached index.html as a last resort if you decide to cache it.
          console.warn('[SW] Network fetch for navigation failed. No offline fallback configured for dev.');
        })
    );
    return;
  }

  // For other requests (CSS, JS, images), use Cache-First or Stale-While-Revalidate strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          // Optionally cache new static assets dynamically if they are not in ASSETS_TO_CACHE
          // Be careful what you cache here.
          if (networkResponse && networkResponse.status === 200 && ASSETS_TO_CACHE.includes(event.request.url)) {
             const responseToCache = networkResponse.clone();
             caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
      })
  );
});