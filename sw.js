// ============================================================
//  CB@Techno — Service Worker Corrigé & Amélioré
//  sw.js
//  Compatible Firebase + Synchronisation temps réel
// ============================================================

const CACHE_NAME    = 'cbtechno-v3';   // ← Incrémentez à chaque déploiement majeur
const CACHE_STATIC  = 'cbtechno-static-v3';
const CACHE_IMAGES  = 'cbtechno-images-v3';

// Fichiers du shell applicatif (toujours en cache)
const SHELL_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/firebase-sync.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Domaines à NE JAMAIS mettre en cache (temps réel Firebase)
const NEVER_CACHE = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'firebaseio.com',
  'googleapis.com/google.firestore',
  'securetoken.googleapis.com',
  'identitytoolkit.googleapis.com'
];

// Domaines à mettre en cache (CDN statiques)
const CACHE_CDN = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'www.gstatic.com/firebasejs'   // SDK Firebase lui-même (statique)
];

// ─── INSTALLATION ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installation CB@Techno v3');
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        return Promise.allSettled(
          SHELL_URLS.map(url =>
            cache.add(url).catch(err =>
              console.warn(`[SW] Impossible de cacher ${url}:`, err)
            )
          )
        );
      })
      .then(() => {
        console.log('[SW] Shell applicatif mis en cache');
        self.skipWaiting(); // Active immédiatement sans attendre
      })
  );
});

// ─── ACTIVATION ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation — nettoyage anciens caches');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const toDelete = cacheNames.filter(name =>
          name.startsWith('cbtechno-') &&
          name !== CACHE_STATIC &&
          name !== CACHE_IMAGES
        );
        return Promise.all(toDelete.map(name => {
          console.log('[SW] Suppression ancien cache:', name);
          return caches.delete(name);
        }));
      })
      .then(() => self.clients.claim()) // Prend le contrôle de tous les onglets
      .then(() => {
        // Notifie tous les onglets ouverts que le SW est à jour et leur demande de recharger
        return self.clients.matchAll({ type: 'window' });
      })
      .then((clients) => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
          // Forcer le rechargement pour les mises à jour immédiates
          if (client.visibilityState === 'visible') {
            client.reload();
          }
        });
      })
  );
});

// ─── INTERCEPTION DES REQUÊTES ───────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (NEVER_CACHE.some(domain => url.hostname.includes(domain))) {
    event.respondWith(fetch(request));
    return;
  }

  if (CACHE_CDN.some(domain => url.hostname.includes(domain))) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  if (url.hostname.includes('firebasestorage.googleapis.com')) {
    event.respondWith(cacheFirstWithExpiry(request, CACHE_IMAGES, 7 * 24 * 60 * 60));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  event.respondWith(networkFirstWithFallback(request));
});

// ─── STRATÉGIES DE CACHE ─────────────────────────────────────

async function cacheFirst(request, cacheName) {
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
    return new Response('Ressource indisponible hors ligne', { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.headers.get('accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/index.html');
      return offlinePage || new Response(
        offlineHTML(),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
    return new Response('Hors ligne', { status: 503 });
  }
}

async function cacheFirstWithExpiry(request, cacheName, maxAgeSeconds) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const cachedDate = cached.headers.get('sw-cached-at');
    if (cachedDate) {
      const age = (Date.now() - parseInt(cachedDate)) / 1000;
      if (age < maxAgeSeconds) return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const cachedResponse = new Response(await response.blob(), {
        status:     response.status,
        statusText: response.statusText,
        headers
      });
      cache.put(request, cachedResponse);
      return response;
    }
    return cached || response;
  } catch {
    return cached || new Response('Image indisponible', { status: 503 });
  }
}

// ─── HELPERS ─────────────────────────────────────────────────

function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|ico)$/i.test(url.pathname);
}

function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CB@Techno — Hors ligne</title>
  <style>
    body { font-family: 'Poppins', sans-serif; background: #020c1b; color: #f8f9fa;
           display: flex; flex-direction: column; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1   { color: #64ffda; margin-bottom: 1rem; }
    p    { opacity: 0.8; line-height: 1.6; max-width: 400px; }
    a    { color: #64ffda; margin-top: 2rem; display: inline-block;
           border: 2px solid #64ffda; padding: 1rem 2rem; border-radius: 30px;
           text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="icon">📡</div>
  <h1>Vous êtes hors ligne</h1>
  <p>Vérifiez votre connexion Internet pour accéder à CB@Techno et voir les dernières publications en temps réel.</p>
  <a href="/" onclick="location.reload()">Réessayer</a>
</body>
</html>`;
}

// ─── NOTIFICATIONS PUSH ──────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'CB@Techno', body: event.data.text() };
  }

  const options = {
    body:    payload.body    || 'Nouvelle mise à jour disponible !',
    icon:    payload.icon    || '/icon-192.png',
    badge:                      '/icon-192.png',
    image:   payload.image,
    vibrate: [100, 50, 100],
    tag:     payload.tag     || 'cbtechno-update',
    renotify: false,
    data: {
      url:           payload.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'open',    title: '👀 Voir',    icon: '/icon-192.png' },
      { action: 'dismiss', title: '✕ Fermer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      payload.title || 'CB@Techno — Nouvelle publication !',
      options
    )
  );
});

// ─── CLIC SUR UNE NOTIFICATION ───────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(c => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.navigate(urlToOpen);
        } else {
          self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// ─── MESSAGES DEPUIS LA PAGE ──────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'INVALIDATE_IMAGE') {
    caches.open(CACHE_IMAGES).then(cache => cache.delete(event.data.url));
  }
});

console.log('[SW] CB@Techno Service Worker v3 chargé ✅');

self.addEventListener('controllerchange', () => {
  window.location.reload();
});
