const SHELL_CACHE = 'cellar-shell-v39';
const FONT_CACHE  = 'cellar-fonts-v1';

// App shell — everything needed to render the page offline
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './wine.jpg',
  './css/base.css?v=2.0.10',
  './css/cards.css?v=2.0.10',
  './css/modal.css?v=2.0.10',
  './css/style.css?v=2.0.10',
  './js/app.js?v=2.0.10',
  './js/state.js',
  './js/ui.js',
  './js/db.js',
  './js/auth.js',
  './js/ai.js',
  './js/firebase.js',
  './js/analytics.js',
];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete stale caches ────────────────────────────────────────────
self.addEventListener('activate', e => {
  const keep = [SHELL_CACHE, FONT_CACHE]; // anything not listed here is deleted on activate
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Never intercept Firebase/Google API calls — always network
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebase.com') ||
    url.hostname.includes('firebaseapp.com')
  ) return;

  // Firebase SDK & Google Fonts CSS/WOFF — cache on first fetch, serve cached thereafter
  if (
    (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    e.respondWith(networkFirstThenCache(request, FONT_CACHE));
    return;
  }

  // App shell — network-first for HTML so updates are always picked up immediately.
  // Static assets (icon, manifest, modules) stay cache-first.
  if (url.origin === self.location.origin) {
    const isHtml = request.mode === 'navigate' ||
                   url.pathname === '/' ||
                   url.pathname.endsWith('.html');
    e.respondWith(
      isHtml
        ? networkFirstThenCache(request, SHELL_CACHE)
        : cacheFirstThenNetwork(request, SHELL_CACHE)
    );
    return;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function cacheFirstThenNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return a minimal fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstThenCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
