const CACHE = 'schaetzfragen-COMMIT_HASH';

// Pfade relativ zum SW-Scope (funktioniert unter /schaetzfragen-quiz/ wie lokal unter /)
const SCOPE = self.registration.scope;
const url = (p) => new URL(p, SCOPE).href;

const APP_SHELL = [
  '',
  'index.html',
  'manifest.json',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'questions/index.json',
];

// cache: 'reload' umgeht den HTTP-Cache (GitHub Pages: max-age=600), damit der neue
// Cache nicht mit der alten index.html befüllt wird.
const fresh = (u) => new Request(u, { cache: 'reload' });

// Install: App-Shell + ALLE Fragen-Sets aus index.json cachen (keine handgepflegte Liste mehr,
// die beim Hinzufügen neuer Sets vergessen wird). Aktiviert NICHT automatisch — wartet auf
// Zustimmung über das Update-Banner.
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_SHELL.map(p => fresh(url(p))));
    // Fragen-Sets einzeln — ein fehlendes Set darf die Installation nicht blockieren
    try {
      const res = await fetch(fresh(url('questions/index.json')));
      const files = await res.json();
      await Promise.allSettled(files.map(async f => {
        const r = await fetch(fresh(url('questions/' + f)));
        if (r.ok) await cache.put(url('questions/' + f), r);
      }));
    } catch (err) { /* offline während Install: Sets werden beim ersten Laden gecacht */ }
  })());
});

// Seite meldet: Nutzer hat das Update-Banner bestätigt → jetzt übernehmen
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

// Activate: alte Caches entfernen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first für Fragen (neue Sets sofort sichtbar), cache-first für den Rest
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const reqUrl = new URL(e.request.url);
  if (reqUrl.origin !== self.location.origin) return; // z.B. Google Fonts: Browser regelt das

  if (reqUrl.pathname.includes('/questions/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Nur erfolgreiche Antworten cachen — sonst überschreibt ein 404/500 die gute Kopie
          if (res.ok) {
            const clone = res.clone();
            e.waitUntil(caches.open(CACHE).then(cache => cache.put(e.request, clone)));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || Response.error()))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => cached || fetch(e.request))
  );
});
