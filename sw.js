const CACHE_NAME = 'civilpro-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './script.js',
  'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4' // Cache CSS Tailwind agar offline tetap rapi
];

// Install Event: Menyimpan aset ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Membuka Cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error('Service Worker: Gagal cache', error);
      })
  );
  self.skipWaiting(); // Aktifkan SW baru segera
});

// Fetch Event: Mengambil data dari cache dulu (Offline First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Jika ada di cache, kembalikan
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak ada, ambil dari network
        return fetch(event.request).then((networkResponse) => {
          // Cek response valid
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clone response karena stream hanya bisa dibaca sekali
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        });
      })
      .catch((error) => {
        console.log('Service Worker: Fetch failed; offline?', error);
        // Opsional: Return halaman offline custom jika diinginkan
      })
  );
});

// Activate Event: Membersihkan cache lama
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
