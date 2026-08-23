// SmartTable Service Worker — PWA offline support
const CACHE_NAME = 'smarttable-v20260823';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css?v=20260820',
  '/js/config.js?v=20260820',
  '/js/i18n.js?v=20260820',
  '/js/supabase.js?v=20260820',
  '/js/auth.js?v=20260820',
  '/js/utils.js?v=20260820',
  '/js/kiosk.js?v=20260820',
  '/js/screens/landing.js?v=20260820',
  '/js/screens/register.js?v=20260820',
  '/js/screens/customer.js?v=20260820',
  '/js/screens/waiter.js?v=20260820',
  '/js/screens/manager.js?v=20260820',
  '/js/screens/admin.js?v=20260820',
  '/js/screens/superadmin.js?v=20260820',
  '/js/app.js?v=20260820',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
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
  if (e.request.url.includes('/functions/') || e.request.url.includes('api.qrserver.com')) {
    return;
  }
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
