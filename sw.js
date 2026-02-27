// LockScreenFX Service Worker
// Cache-first for app shell, network-first for exchange rate API

const CACHE_NAME = 'lockscreenfx-v1';
const APP_SHELL = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,500&display=swap'
];

// Install — cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate — remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for app shell, network-first for exchange rate API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network-first for exchange rate API
  if(url.hostname === 'open.er-api.com'){
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response('{"error":"offline"}', {
          headers: {'Content-Type': 'application/json'}
        }))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          // Cache successful GET responses
          if(event.request.method === 'GET' && response.status === 200){
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
      )
  );
});
