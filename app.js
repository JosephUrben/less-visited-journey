const STORAGE_KEY = "less-visited-pwa-state-v1";
const TRIP_OVERRIDE_KEY = "less-visited-pwa-trip-override-v1";

const state = loadState();
let trip;
let deferredInstallPrompt = null;

const views = [...document.querySelectorAll(".view")];
const navItems = [...document.querySelectorAll(".nav-item")];
const installButton = document.querySelector("#install-button");
const networkStatus = document.querySelector("#network-status");

init().catch((error) => {
  console.error(error);
  document.querySelector("#main").innerHTML = `
    <section class="panel">
      <h2>Trip could not be loaded</h2>
      <p>Check that <code>data/trip.json</code> exists and contains valid JSON.</p>
    </section>`;
});

async function init() {
  trip = await loadTrip();
  document.querySelector("#app-title").textContent = trip.tripTitle || "Journey";
  document.title = `${trip.tripTitle || "Journey"} — Less Visited`;

  const warning = document.querySelector("#demo-warning");
  if (trip.demo) {
    warning.hidden = false;
    warning.textContent = "Demonstration itinerary: verify all travel information before customer use.";
  }

  renderAll();
  bindNavigation();
  bindInstallExperience();
  bindNetworkStatus();
  registerServiceWorker();
}

async function loadTrip() {
  const localOverride = localStorage.getItem(TRIP_OVERRIDE_KEY);
  if (localOverride) {
    try { return JSON.parse(localOverride); } catch { localStorage.removeItem(TRIP_OVERRIDE_KEY); }
  }
  const response = await fetch("./data/trip.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Trip request failed: ${response.status}`);
  return response.json();
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { saved: {}, completed: {}, notes: {} };
  } catch {
    return { saved: {}, completed: {}, notes: {} };
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function allActivities() {
  return trip.days.flatMap((day) => day.activities.map((activity) => ({ ...activity, day })));
}

function renderAll() {
  renderToday();
  renderJourney();
  renderPlaces();
  renderSaved();
  renderInfo();
}

function renderToday() {
  const container = document.querySelector("#view-today");
  const day = getCurrentTripDay();
  const index = trip.days.findIndex((candidate) => candidate.id === day.id);
  const completedCount = day.activities.filter((item) => state.completed[item.id]).length;

  container.innerHTML = `
    <div class="hero">
      <p class="hero__kicker">${escapeHtml(formatDate(day.date, { weekday: "long", day: "numeric", month: "long" }))}</p>
      <h2 id="today-heading">${escapeHtml(day.location)}</h2>
      <p class="hero__intro">${escapeHtml(day.summary || day.theme)}</p>
      <div class="hero__facts">
        <span class="hero__fact">Day ${index + 1} of ${trip.days.length}</span>
        <span class="hero__fact">${completedCount}/${day.activities.length} completed</span>
        <span class="hero__fact">${escapeHtml(trip.travellerName || "Your journey")}</span>
      </div>
    </div>
    <div class="section-heading">
      <div><h2>Today’s plan</h2><p>${escapeHtml(day.theme)}</p></div>
    </div>
    <div id="today-activities" class="activity-grid"></div>`;

  const list = container.querySelector("#today-activities");
  day.activities.forEach((activity) => list.append(createActivityCard(activity)));
}

function getCurrentTripDay() {
  const todayIso = new Intl.DateTimeFormat("en-CA", {
    timeZone: trip.timezone || "UTC",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());

  return trip.days.find((day) => day.date === todayIso)
    || trip.days.find((day) => !isPastDate(day.date))
    || trip.days[trip.days.length - 1];
}

function isPastDate(dateString) {
  return new Date(`${dateString}T23:59:59`) < new Date();
}

function createActivityCard(activity) {
  const fragment = document.querySelector("#activity-template").content.cloneNode(true);
  const card = fragment.querySelector(".activity-card");
  const saveButton = fragment.querySelector(".save-button");
  const completeButton = fragment.querySelector(".complete-button");
  const noteField = fragment.querySelector("textarea");
  const mapButton = fragment.querySelector(".map-button");

  card.dataset.activityId = activity.id;
  card.classList.toggle("is-complete", Boolean(state.completed[activity.id]));
  fragment.querySelector(".activity-card__time").textContent = activity.time;
  fragment.querySelector(".category-chip").textContent = activity.category;
  fragment.querySelector(".activity-card__title").textContent = activity.title;
  fragment.querySelector(".activity-card__description").textContent = activity.description;
  fragment.querySelector(".activity-meta").innerHTML = metaRows(activity);

  setToggleButton(saveButton, Boolean(state.saved[activity.id]), "♥ Saved", "♡ Save");
  setToggleButton(completeButton, Boolean(state.completed[activity.id]), "✓ Completed", "✓ Done");
  noteField.value = state.notes[activity.id] || "";
  mapButton.href = buildMapUrl(activity);

  saveButton.addEventListener("click", () => {
    state.saved[activity.id] = !state.saved[activity.id];
    if (!state.saved[activity.id]) delete state.saved[activity.id];
    persistState();
    renderAll();
  });

  completeButton.addEventListener("click", () => {
    state.completed[activity.id] = !state.completed[activity.id];
    if (!state.completed[activity.id]) delete state.completed[activity.id];
    persistState();
    renderAll();
  });

  noteField.addEventListener("input", (event) => {
    const value = event.currentTarget.value;
    if (value.trim()) state.notes[activity.id] = value;
    else delete state.notes[activity.id];
    persistState();
  });

  return fragment;
}

function setToggleButton(button, active, activeLabel, inactiveLabel) {
  button.classList.toggle("is-active", active);
  button.textContent = active ? activeLabel : inactiveLabel;
  button.setAttribute("aria-pressed", String(active));
}

function metaRows(activity) {
  const pairs = [
    ["Duration", activity.duration],
    ["Cost", activity.cost],
    ["Location", activity.address],
    ["Status", activity.verification]
  ].filter(([, value]) => value);

  return pairs.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("");
}

function renderJourney() {
  const container = document.querySelector("#view-journey");
  container.innerHTML = `
    <div class="section-heading">
      <div><h2 id="journey-heading">Your full journey</h2><p>${escapeHtml(trip.subtitle || "Day-by-day itinerary")}</p></div>
    </div>
    ${trip.days.map((day, index) => `
      <article class="day-card">
        <header class="day-card__header">
          <p>Day ${index + 1} · ${escapeHtml(formatDate(day.date, { weekday: "short", day: "numeric", month: "short" }))}</p>
          <h3>${escapeHtml(day.location)} — ${escapeHtml(day.theme)}</h3>
        </header>
        <div class="day-card__body">
          ${day.activities.map((activity) => `
            <div class="timeline-item">
              <div class="timeline-item__time">${escapeHtml(activity.time)}</div>
              <div>
                <h4>${state.completed[activity.id] ? "✓ " : ""}${escapeHtml(activity.title)}</h4>
                <p>${escapeHtml(activity.description)}</p>
              </div>
            </div>`).join("")}
        </div>
      </article>`).join("")}`;
}

function renderPlaces() {
  const container = document.querySelector("#view-places");
  const activities = allActivities();
  const categories = [...new Set(activities.map((item) => item.category))].sort();
  const locations = [...new Set(activities.map((item) => item.day.location))];

  container.innerHTML = `
    <div class="section-heading">
      <div><h2 id="places-heading">Places</h2><p>Browse the locations included in this journey.</p></div>
    </div>
    <div class="toolbar">
      <select id="category-filter" aria-label="Filter places by category">
        <option value="all">All categories</option>
        ${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(capitalise(category))}</option>`).join("")}
      </select>
      <select id="location-filter" aria-label="Filter places by location">
        <option value="all">All locations</option>
        ${locations.map((location) => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`).join("")}
      </select>
    </div>
    <div id="place-grid" class="place-grid"></div>`;

  const categoryFilter = container.querySelector("#category-filter");
  const locationFilter = container.querySelector("#location-filter");
  const grid = container.querySelector("#place-grid");

  const draw = () => {
    const filtered = activities.filter((item) =>
      (categoryFilter.value === "all" || item.category === categoryFilter.value)
      && (locationFilter.value === "all" || item.day.location === locationFilter.value)
    );

    grid.innerHTML = filtered.map((item) => `
      <article class="place-card">
        <span class="category-chip">${escapeHtml(item.category)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.address || item.day.location)}</p>
        <div class="place-card__actions">
          <button class="icon-button place-save" type="button" data-id="${escapeHtml(item.id)}">${state.saved[item.id] ? "♥ Saved" : "♡ Save"}</button>
          <a class="icon-button" href="${buildMapUrl(item)}" target="_blank" rel="noopener noreferrer">↗ Map</a>
        </div>
      </article>`).join("");

    grid.querySelectorAll(".place-save").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        state.saved[id] = !state.saved[id];
        if (!state.saved[id]) delete state.saved[id];
        persistState();
        renderAll();
      });
    });
  };

  categoryFilter.addEventListener("change", draw);
  locationFilter.addEventListener("change", draw);
  draw();
}

function renderSaved() {
  const container = document.querySelector("#view-saved");
  const saved = allActivities().filter((item) => state.saved[item.id]);
  container.innerHTML = `
    <div class="section-heading">
      <div><h2 id="saved-heading">Saved places</h2><p>Your personal shortlist is stored on this device.</p></div>
    </div>
    <div id="saved-list" class="activity-grid"></div>`;

  const list = container.querySelector("#saved-list");
  if (!saved.length) {
    list.innerHTML = `<div class="empty-state"><strong>No saved places yet.</strong><br />Use the Save button on an itinerary item.</div>`;
    return;
  }
  saved.forEach((activity) => list.append(createActivityCard(activity)));
}

function renderInfo() {
  const container = document.querySelector("#view-info");
  container.innerHTML = `
    <div class="section-heading">
      <div><h2 id="info-heading">Trip information</h2><p>Essential guidance and app controls.</p></div>
    </div>
    <section class="panel">
      <h3>${escapeHtml(trip.tripTitle)}</h3>
      <p>${escapeHtml(trip.intro || "")}</p>
      <p><strong>Dates:</strong> ${escapeHtml(formatDate(trip.startDate))}–${escapeHtml(formatDate(trip.endDate))}</p>
    </section>
    ${(trip.practicalInfo || []).map((section) => `
      <section class="panel">
        <h3>${escapeHtml(section.title)}</h3>
        <ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>`).join("")}
    <section class="panel">
      <h3>Manage this device</h3>
      <p>Export your saved places, completion status and notes before changing device or clearing browser data.</p>
      <div class="activity-actions">
        <button id="export-data" class="button" type="button">Export my trip data</button>
        <label class="button" for="import-trip">Preview a trip JSON</label>
        <input id="import-trip" type="file" accept="application/json,.json" hidden />
        <button id="restore-default" class="button" type="button">Restore published trip</button>
        <button id="clear-data" class="button" type="button">Clear personal data</button>
      </div>
    </section>`;

  container.querySelector("#export-data").addEventListener("click", exportPersonalData);
  container.querySelector("#clear-data").addEventListener("click", clearPersonalData);
  container.querySelector("#restore-default").addEventListener("click", restorePublishedTrip);
  container.querySelector("#import-trip").addEventListener("change", importTripJson);
}

function exportPersonalData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    tripTitle: trip.tripTitle,
    personalState: state
  };
  downloadJson(`${slugify(trip.tripTitle)}-personal-data.json`, payload);
}

function importTripJson(event) {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const candidate = JSON.parse(String(reader.result));
      validateTrip(candidate);
      localStorage.setItem(TRIP_OVERRIDE_KEY, JSON.stringify(candidate));
      location.reload();
    } catch (error) {
      alert(`This file is not a valid Less Visited trip JSON. ${error.message}`);
    }
  };
  reader.readAsText(file);
}

function validateTrip(candidate) {
  if (!candidate || typeof candidate !== "object") throw new Error("Missing trip object.");
  if (!Array.isArray(candidate.days) || candidate.days.length === 0) throw new Error("The trip needs at least one day.");
  for (const day of candidate.days) {
    if (!day.id || !day.date || !Array.isArray(day.activities)) throw new Error("Every day needs an id, date and activities array.");
    for (const activity of day.activities) {
      if (!activity.id || !activity.title || !activity.time) throw new Error("Every activity needs an id, title and time.");
    }
  }
}

function restorePublishedTrip() {
  if (!localStorage.getItem(TRIP_OVERRIDE_KEY)) {
    alert("The published trip is already in use.");
    return;
  }
  if (confirm("Restore the trip published with this app? Personal notes and saved places will remain.")) {
    localStorage.removeItem(TRIP_OVERRIDE_KEY);
    location.reload();
  }
}

function clearPersonalData() {
  if (!confirm("Clear saved places, completed activities and personal notes on this device?")) return;
  state.saved = {};
  state.completed = {};
  state.notes = {};
  persistState();
  renderAll();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function bindNavigation() {
  navItems.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === target));
      navItems.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.querySelector(`#view-${target}`)?.focus({ preventScroll: true });
    });
  });
}

function bindInstallExperience() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => { installButton.hidden = true; });
}

function bindNetworkStatus() {
  const update = () => {
    const offline = !navigator.onLine;
    networkStatus.classList.toggle("is-visible", offline);
    networkStatus.textContent = offline
      ? "Offline mode: itinerary and personal changes remain available; external maps may not load."
      : "";
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => console.error("Service worker registration failed", error));
  });
}

function buildMapUrl(activity) {
  if (Number.isFinite(activity.latitude) && Number.isFinite(activity.longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.address || activity.title)}`;
}

function formatDate(dateString, options = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", options).format(new Date(`${dateString}T12:00:00`));
}

function capitalise(value) { return value ? value[0].toUpperCase() + value.slice(1) : ""; }
function slugify(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
