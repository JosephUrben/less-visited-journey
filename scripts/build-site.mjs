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

const originalRenderAll = `function renderAll() {\n  renderHome();\n  renderJourney();\n  renderExplore();\n  renderMap();\n  renderSaved();\n  renderBudget();\n  renderTrip();\n}`;
const lazyRenderAll = `const renderedViews = new Set();\nconst viewRenderers = { home: renderHome, journey: renderJourney, explore: renderExplore, map: renderMap, saved: renderSaved, budget: renderBudget, trip: renderTrip };\n\nfunction renderView(target, force = false) {\n  const renderer = viewRenderers[target];\n  if (!renderer || (!force && renderedViews.has(target))) return;\n  renderer();\n  renderedViews.add(target);\n  window.dispatchEvent(new CustomEvent("lessvisited:viewrendered", { detail: { target } }));\n}\n\nfunction renderAll() {\n  const active = document.querySelector(".view.is-active")?.dataset.view || "home";\n  renderedViews.clear();\n  renderView("home", true);\n  if (active !== "home") renderView(active, true);\n}`;
if (!app.includes(originalRenderAll)) throw new Error("Could not locate renderAll for lazy rendering.");
app = app.replace(originalRenderAll, lazyRenderAll);

const originalShowView = `function showView(target, updateHash = false) {\n  views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === target));\n  navItems.forEach((item) => { const active = item.dataset.target === target; item.classList.toggle("is-active", active); if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current"); });\n  if (updateHash) history.replaceState(null, "", \`${location.pathname}${location.search}#${target}\`);\n  window.scrollTo({ top: 0, behavior: "smooth" });\n  document.querySelector(\`#view-${target}\`)?.focus({ preventScroll: true });\n}`;
const lazyShowView = `function showView(target, updateHash = false) {\n  renderView(target);\n  views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === target));\n  navItems.forEach((item) => { const active = item.dataset.target === target; item.classList.toggle("is-active", active); if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current"); });\n  if (updateHash) history.replaceState(null, "", \`${location.pathname}${location.search}#${target}\`);\n  window.scrollTo({ top: 0, behavior: "auto" });\n  document.querySelector(\`#view-${target}\`)?.focus({ preventScroll: true });\n  window.dispatchEvent(new CustomEvent("lessvisited:viewchange", { detail: { target } }));\n}`;
if (!app.includes(originalShowView)) throw new Error("Could not locate showView for lazy navigation.");
app = app.replace(originalShowView, lazyShowView);

const initTail = `  registerServiceWorker();\n  activateInitialView();\n}`;
const contextTail = `  registerServiceWorker();\n  activateInitialView();\n  window.LESS_VISITED_APP_CONTEXT = { trip, state, renderView, showView, persistState, activePlaces, buildMapUrl };\n  window.dispatchEvent(new CustomEvent("lessvisited:ready", { detail: { context: window.LESS_VISITED_APP_CONTEXT } }));\n}`;
if (!app.includes(initTail)) throw new Error("Could not expose the shared application context.");
app = app.replace(initTail, contextTail);
app = app.replace('action: "Review preparation"', 'action: "Get prepared"').replace('>Open checklist <', '>Get prepared <');
await writeFile(appPath, app);

const assetVersion = process.env.GITHUB_SHA?.slice(0, 12) || "local-v5";
for (const pageName of ["index.html", "flow.html"]) {
  const pagePath = path.join(DIST, pageName);
  let page = await readFile(pagePath, "utf8");
  page = page.replaceAll("?v=build", `?v=${assetVersion}`);
  await writeFile(pagePath, page);
}

const cacheVersion = `less-visited-${assetVersion}`;
const versioned = (asset) => `${asset}?v=${assetVersion}`;
const serviceWorker = `const CACHE_VERSION = ${JSON.stringify(cacheVersion)};
const APP_ASSETS = ${JSON.stringify([
  "./",
  "./index.html",
  "./flow.html",
  versioned("./styles.css"),
  versioned("./product-v5.css"),
  versioned("./bootstrap.js"),
  versioned("./journey-data-patch.js"),
  versioned("./journey-v4-patch.js"),
  versioned("./app.js"),
  versioned("./product-v5.js"),
  "./manifest.webmanifest",
  "./data/trip.json",
  "./data/journeys/chile-seen-differently.json",
  "./data/journeys/JRN-0001.json",
  "./assets/place-art/lastarria.svg",
  "./assets/place-art/santiago-hills.svg",
  "./assets/place-art/memory.svg",
  "./assets/place-art/valparaiso.svg",
  "./assets/place-art/coast.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./404.html"
], null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

async function networkFirst(request, fallback) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request, { cache: "no-store" });
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
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  })));
});
`;
await writeFile(path.join(DIST, "sw.js"), serviceWorker);

console.log(`Built GitHub Pages site in ${path.relative(ROOT, DIST)} with lazy views and cache ${cacheVersion}.`);