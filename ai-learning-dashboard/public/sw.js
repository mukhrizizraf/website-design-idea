const CACHE = 'ai-skill-shelf-books-v1';
const ASSETS = ['shelf.html', 'shelf.css?v=20261112-books', 'pop.css?v=20261112-cards', 'skills.js?v=202611111429', 'motion.js?v=20261112-books', 'toys.js?v=20261112-books', 'shelf.js?v=20261112-books', 'app.js?v=20261112-books', 'favicon.svg', 'manifest.webmanifest', 'app-icon-192.png', 'app-icon-512.png'];
const assetUrls = ASSETS.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assetUrls)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ai-skill-shelf-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Cache only this app's public files; API traffic is never intercepted.
  if (event.request.mode === 'navigate' && url.pathname.endsWith('/shelf.html')) {
    event.respondWith(fetch(event.request).then(async response => {
      if (response.ok) { const cache = await caches.open(CACHE); await cache.put(new URL('shelf.html', self.registration.scope).href, response.clone()); }
      return response;
    }).catch(() => caches.match(new URL('shelf.html', self.registration.scope).href)));
  } else if (assetUrls.includes(url.href)) {
    // Revalidate public assets so a later deploy cannot leave stale data behind.
    event.respondWith(fetch(event.request).then(async response => {
      if (response.ok) { const cache = await caches.open(CACHE); await cache.put(event.request, response.clone()); }
      return response;
    }).catch(() => caches.match(event.request)));
  }
});
