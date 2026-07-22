const CACHE_NAME = 'radio-pwa-v3';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/api.js',
  './js/player.js',
  './js/ui.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Don't cache API proxy requests — let them go to network
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Network-first for HTML/JS — always try network, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with fresh response
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      })
      .catch(() => {
        // Offline — serve from cache
        return caches.match(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge old caches
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      // Take control of all clients immediately
      await clients.claim();
    })()
  );
});
