self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', () => {
  self.clients.claim();
});
const CACHE_NAME = 'pg-pos-cache-v4';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json', '/script.js', '/styles.css'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => Promise.resolve())
  );
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(req).then((network) => {
        try {
          const copy = network.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        } catch (e) {}
        return network;
      }).catch(() => caches.match(req))
    );
    return;
  }
  if (url.pathname.endsWith('/script.js') || url.pathname.endsWith('/sw.js')) {
    event.respondWith(
      fetch(req).then((network) => {
        try {
          const copy = network.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        } catch (e) {}
        return network;
      }).catch(() => caches.match(req))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((network) => {
        try {
          const copy = network.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        } catch (e) {}
        return network;
      }).catch(() => cached || Promise.reject());
      return cached || fetchPromise;
    })
  );
});
