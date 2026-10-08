/*
 * service-worker.js — offline caching for the installable PWA
 * ----------------------------------------------------------
 * Caches the app shell so the app loads and your own sheet works without a
 * connection. Bump CACHE_VERSION whenever the cached files change so clients
 * pick up the new version.
 *
 * Firebase SDK + live data are loaded from the network at runtime; Firebase's
 * own offline persistence handles party sync when reconnecting.
 */

const CACHE_VERSION = "dragonbane-v92";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./data-magic.js",
  "./data-solo.js",
  "./data-pregens.js",
  "./data-monsters.js",
  "./data-npcs.js",
  "./firebase-config.js",
  "./manifest.json",
  "./icon.svg",
  "./icon-maskable.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  // App logic — ES modules (split of the former app.js). Order doesn't matter for caching.
  // Self-hosted fonts (OFL) for the illuminated-manuscript theme.
  "./fonts/eb-garamond.woff2",
  "./fonts/eb-garamond-italic.woff2",
  "./fonts/im-fell-english.woff2",
  "./fonts/im-fell-english-italic.woff2",
  "./fonts/im-fell-english-sc.woff2",
  "./src/icons.js",
  "./src/graphics.js",
  "./src/library.js",
  "./src/table.js",
  "./src/main.js",
  "./src/router.js",
  "./src/action.js",
  "./src/onboard.js",
  "./src/screens.js",
  "./src/solo.js",
  "./src/gm.js",
  "./src/combat.js",
  "./src/sheet.js",
  "./src/roller.js",
  "./src/spell-automation.js",
  "./src/wizard.js",
  "./src/sync.js",
  "./src/store.js",
  "./src/settings.js",
  "./src/derived.js",
  "./src/rules.js",
  "./src/ui.js",
  "./src/core.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle same-origin GET requests; let Firebase/CDN traffic pass through.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  // Network-first for same-origin: always fetch fresh when online (so updates
  // are picked up immediately), updating the cache, and fall back to the cache
  // when offline. This keeps the app installable/offline without serving stale code.
  event.respondWith(
    fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request))
  );
});
