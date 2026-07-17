/* ============================================================
   SERVICE WORKER
   ------------------------------------------------------------
   Objetivo: que la app se pueda "instalar" (PWA) y que el shell
   (HTML/CSS/JS/íconos) cargue rápido y funcione offline.

   IMPORTANTE: esto NO da funcionamiento offline al checklist en
   sí. Leer preguntas y guardar respuestas sigue necesitando
   conexión, porque depende de Firestore en tiempo real. Este
   Service Worker deliberadamente NO intercepta llamadas a
   Firebase (Firestore/Auth) — esas siempre van directo a la red.

   Si cambian archivos de la app, subí también el número de
   versión de CACHE_NAME de abajo, así los usuarios reciben la
   versión nueva en vez de quedarse con el shell viejo cacheado.
   ============================================================ */

const CACHE_NAME = 'checklist-app-v14';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/firebase-config.js',
  './js/data.js',
  './js/auth.js',
  './js/checklist.js',
  './js/dashboard.js',
  './js/admin.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Nunca interceptar Firestore / Auth / cualquier llamada que no
  // sea GET: esas siempre van directo a la red, sin caché.
  if (event.request.method !== 'GET') return;
  if (url.includes('firestore.googleapis.com')) return;
  if (url.includes('identitytoolkit.googleapis.com')) return;
  if (url.includes('googleapis.com') && url.includes('securetoken')) return;

  // Para la navegación (abrir/recargar la app): red primero, y si no
  // hay conexión, se sirve el index.html cacheado (app shell).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Para el resto (JS, CSS, íconos, fuentes, librerías CDN):
  // caché primero (carga instantánea), y de paso se actualiza
  // el caché en segundo plano con lo último de la red.
  event.respondWith(
    caches.match(event.request).then((cacheada) => {
      const redFetch = fetch(event.request).then((respuestaRed) => {
        if (respuestaRed && respuestaRed.status === 200) {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        }
        return respuestaRed;
      }).catch(() => cacheada);

      return cacheada || redFetch;
    })
  );
});
