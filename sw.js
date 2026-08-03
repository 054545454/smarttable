// SmartTable Service Worker — PWA offline support (cache-first for static, network-first for HTML)
const CACHE_NAME = 'smarttable-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css?v=20260804',
  '/js/config.js?v=20260804',
  '/js/i18n.js?v=20260804',
  '/js/supabase.js?v=20260804',
  '/js/auth.js?v=20260804',
  '/js/utils.js?v=20260804',
  '/js/app.js?v=20260804',
  '/js/screens/customer.js?v=20260804',
  '/js/screens/waiter.js?v=20260804',
  '/js/screens/manager.js?v=20260804',
  '/js/screens/admin.js?v=20260804',
  '/js/screens/superadmin.js?v=20260804',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Don't cache API calls
  if (e.request.url.includes('/functions/') || e.request.url.includes('api.qrserver.com')) {
    return;
  }
  // Network-first for HTML, cache-first for assets with version params
  if (e.request.destination === 'document' || e.request.url.endsWith('/') || e.request.url.includes('index.html')) {
    e.respondWith(
      fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok && e.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  }
});
