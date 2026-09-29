/**
 * FitPulse service worker.
 *
 * Strategy
 *   navigations   → network-first, fall back to the cached shell (works offline)
 *   same-origin GET → stale-while-revalidate (instant offline, updates in background)
 *   everything else (cross-origin, non-GET) → straight to the network
 *
 * The app talks to this file with two messages:
 *   { type: 'SKIP_WAITING' }  → activate a waiting worker immediately
 *   { type: 'GET_VERSION' }   → answer with the current cache version
 */

/**
 * Bump on every deploy that changes the shell. A byte-identical sw.js is not
 * reinstalled by the browser, and the shell is served stale-while-revalidate,
 * so without this bump users would keep the previous CSS/JS for a full reload
 * cycle after a deploy.
 */
const VERSION = 'v4';
const CACHE = `fitpulse-${VERSION}`;

/** The app shell. Keep this list in sync with the file tree. */
const SHELL = [
  './',
  'index.html',
  'assets/manifest.webmanifest',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-192.png',
  'assets/icons/maskable-512.png',
  'styles/tokens.css',
  'styles/base.css',
  'styles/components.css',
  'styles/views.css',
  'styles/animations.css',
  'js/app.js',
  'js/core/ambient.js',
  'js/core/anim.js',
  'js/core/dom.js',
  'js/core/format.js',
  'js/core/i18n.js',
  'js/core/nutrition.js',
  'js/core/router.js',
  'js/core/session.js',
  'js/core/store.js',
  'js/core/theme.js',
  'js/core/ui.js',
  'js/calc/body.js',
  'js/calc/index.js',
  'js/calc/macros.js',
  'js/calc/strength.js',
  'js/data/exercises.js',
  'js/data/foods.js',
  'js/data/templates.js',
  'js/ui/bits.js',
  'js/ui/charts.js',
  'js/ui/exercise.js',
  'js/ui/forms.js',
  'js/ui/muscle.js',
  'js/ui/nav.js',
  'js/ui/timer.js',
  'js/views/calculators.js',
  'js/views/dashboard.js',
  'js/views/history.js',
  'js/views/library.js',
  'js/views/nutrition.js',
  'js/views/onboarding.js',
  'js/views/progress.js',
  'js/views/program.js',
  'js/views/settings.js',
  'js/views/workout.js',
];

/* ------------------------------------------------------------------ *
 * Install / activate
 * ------------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // addAll is all-or-nothing; a single 404 would leave us with no cache at all
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            const res = await fetch(new Request(url, { cache: 'reload' }));
            if (res.ok) await cache.put(url, res);
          } catch (err) {
            console.warn('[sw] precache miss', url, err);
          }
        })
      );
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('fitpulse-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

/* ------------------------------------------------------------------ *
 * Messages
 * ------------------------------------------------------------------ */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') event.source?.postMessage({ type: 'VERSION', version: VERSION });
});

/* ------------------------------------------------------------------ *
 * Fetch
 * ------------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hash routing means every in-app navigation is the same document
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put('./', res.clone());
    return res;
  } catch (err) {
    // offline: any cached document is the right answer, the hash restores the view
    return (await cache.match('./')) ?? (await cache.match('index.html')) ?? Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached ?? (await network) ?? Response.error();
}
