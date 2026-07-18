const CACHE_VERSION = "less-visited-v5-chile-review";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./flow.html",
  "./styles.css",
  "./enhancements.css",
  "./bootstrap.js",
  "./journey-data-patch.js",
  "./app.js",
  "./enhancements.js",
  "./manifest.webmanifest",
  "./data/trip.json",
  "./data/journeys/chile-seen-differently.json",
  "./data/journeys/JRN-0001.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./404.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if (/\/data\/(?:journeys\/[^/]+|trip)\.json$/.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});

async function networkFirst(request, fallbackPath) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || (fallbackPath ? await caches.match(fallbackPath) : Response.error());
  }
}
