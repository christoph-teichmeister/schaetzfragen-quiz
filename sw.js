const CACHE = 'schaetzfragen-v2';

const PRECACHE = [
  '/schaetzfragen-quiz/',
  '/schaetzfragen-quiz/index.html',
  '/schaetzfragen-quiz/manifest.json',
  '/schaetzfragen-quiz/icons/icon-192.png',
  '/schaetzfragen-quiz/icons/icon-512.png',
  '/schaetzfragen-quiz/questions/index.json',
  '/schaetzfragen-quiz/questions/athen-griechenland.json',
  '/schaetzfragen-quiz/questions/sifnos.json',
  '/schaetzfragen-quiz/questions/griechenland-fakten.json',
  '/schaetzfragen-quiz/questions/griechischer-alkohol.json',
  '/schaetzfragen-quiz/questions/katzen.json',
  '/schaetzfragen-quiz/questions/weltrekorde.json'
];

// Install: cache everything
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for precached, network-first for new question sets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // For question JSON files: network-first so new sets appear immediately
  if (url.pathname.includes('/questions/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  
  // Everything else: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
