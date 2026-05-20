const CACHE_NAME = 'prumo-hub-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install: cache only the bare minimum
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up all old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: NEVER cache JS, CSS, or Vite assets — always network-first
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Never cache JS, CSS, source files, or Vite internals
  const neverCache = ['/src/', '/node_modules/.vite', '/@vite', '/@react-refresh', '.jsx', '.tsx', '.js', '.css', '.ts'];
  if (neverCache.some((p) => url.pathname.includes(p))) return;

  // API/functions: network only
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/functions')) return;

  // For HTML: network-first
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // For everything else: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
