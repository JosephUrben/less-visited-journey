import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const EXCLUDED = new Set([".git", ".github", "dist", "make", "schemas", "scripts"]);

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const entry of await readdir(ROOT, { withFileTypes: true })) {
  if (EXCLUDED.has(entry.name)) continue;
  await cp(path.join(ROOT, entry.name), path.join(DIST, entry.name), { recursive: true });
}

const appPath = path.join(DIST, "app.js");
let app = await readFile(appPath, "utf8");
const storageHeader = `const STORAGE_KEY = "less-visited-companion-state-v2";\nconst TRIP_OVERRIDE_KEY = "less-visited-trip-override-v2";`;
const scopedStorageHeader = `const JOURNEY_STORAGE_SCOPE = (() => {\n  const requested = new URLSearchParams(location.search).get("trip");\n  return requested && /^[A-Za-z0-9_-]+$/.test(requested) ? requested : "default";\n})();\nconst STORAGE_KEY = \`less-visited-companion-state-v3:\${JOURNEY_STORAGE_SCOPE}\`;\nconst TRIP_OVERRIDE_KEY = \`less-visited-trip-override-v3:\${JOURNEY_STORAGE_SCOPE}\`;`;
if (!app.includes(storageHeader)) throw new Error("Could not locate the app storage header to scope journey data.");
app = app.replace(storageHeader, scopedStorageHeader);
await writeFile(appPath, app);

const cacheVersion = `less-visited-${process.env.GITHUB_SHA?.slice(0, 12) || "local-mvp"}`;
const serviceWorker = `const CACHE_VERSION = ${JSON.stringify(cacheVersion)};
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
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

async function networkFirst(request, fallback) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallback) return caches.match(fallback);
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if (/\\/data\\/journeys\\/[A-Za-z0-9_-]+\\.json$/.test(url.pathname) || url.pathname.endsWith("/data/trip.json")) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_VERSION);
        await cache.put(request, response.clone());
      }
      return response;
    }))
  );
});
`;
await writeFile(path.join(DIST, "sw.js"), serviceWorker);

console.log(`Built GitHub Pages site in ${path.relative(ROOT, DIST)} with cache ${cacheVersion}.`);
