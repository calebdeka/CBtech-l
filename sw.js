const CACHE_NAME = 'cbtech-v1';
const ASSETS = [
  '/CBtech-l/',
  '/CBtech-l/index.html',
  '/CBtech-l/manifest.json',
  '/CBtech-l/sw.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => {
      return c.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => {
      return r || fetch(e.request);
    })
  );
});
