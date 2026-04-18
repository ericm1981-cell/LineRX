// Line Rx Service Worker v3.3
// Caches the app shell for full offline use on iOS Safari and Chrome

const CACHE = 'linerx-v3.3';
const ASSETS = [
  './',
  './index.html',
];

// Install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell, network-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always serve app shell from cache
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        // Try network in background to update cache, return cache immediately
        const fetchPromise = fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Network-first for fonts (graceful degradation to system fonts offline)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Default: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
