const CACHE_NAME = 'alister-ult-v3'; // Versi cache dinaikkan
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './script.js',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'
];

// Install: Cache file penting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Menginstall Cache Alister Ultimate...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error('[SW] Gagal Cache:', error);
      })
  );
  // PENTING: Paksa browser mengaktifkan SW baru segera
  self.skipWaiting();
});

// Fetch: Ambil dari dulu (Offline First), lalu network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Cek response valid
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        });
      })
  );
});

// Activate: Hapus cache lama
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});