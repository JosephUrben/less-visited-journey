const STORAGE_KEY = "less-visited-companion-state-v2";
const TRIP_OVERRIDE_KEY = "less-visited-trip-override-v2";

const state = loadState();
let trip;
let deferredInstallPrompt = null;

const views = [...document.querySelectorAll(".view")];
const navItems = [...document.querySelectorAll(".nav-item")];
const installButton = document.querySelector("#install-button");
const networkStatus = document.querySelector("#network-status");
const offlinePill = document.querySelector("#offline-pill");

init().catch((error) => {
  console.error(error);
  document.querySelector("#main").innerHTML = `<section class="panel"><h2>Journey could not be loaded</h2><p>${escapeHtml(error.message)}</p></section>`;
});

async function init() {
  trip = await loadTrip();
  validateTrip(trip);
  document.title = `${trip.tripTitle || "My Journey"} — Less Visited`;

  const warning = document.querySelector("#demo-warning");
  if (trip.demo) {
    warning.hidden = false;
    warning.textContent = "Demonstration journey — live details must be checked before customer use.";
  }

  renderAll();
  bindNavigation();
  bindInstallExperience();
  bindNetworkStatus();
  registerServiceWorker();
  activateInitialView();
}

async function loadTrip() {
  const localOverride = localStorage.getItem(TRIP_OVERRIDE_KEY);
  if (localOverride) {
    try { return JSON.parse(localOverride); }
    catch { localStorage.removeItem(TRIP_OVERRIDE_KEY); }
  }

  const tripId = new URLSearchParams(location.search).get("trip");
  if (tripId && !/^[A-Za-z0-9_-]+$/.test(tripId)) throw new Error("This journey link is not valid.");
  const path = tripId ? `./data/journeys/${tripId}.json` : "./data/trip.json";
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Journey data was not found (${response.status}).`);
  return response.json();
}

function loadState() {
  const defaults = { saved: {}, completed: {}, notes: {}, checks: {}, tripNotes: "", substitutions: {} };
  try { return { ...defaults, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
  catch { return defaults; }
}

function persistState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function renderAll() {
  renderHome();
  renderJourney();
  renderExplore();
  renderMap();
  renderSaved();
  renderTrip();
}

function renderHome() {
  const container = document.querySelector("#view-home");
  const stage = getTripStage();
  const day = getRelevantDay(stage);
  const next = getNextActivity(day);
  const totalTasks = (trip.preparationChecklist || []).length;
  const completedTasks = (trip.preparationChecklist || []).filter((item) => state.checks[item.id]).length;
  const tripDays = differenceInDays(trip.startDate, trip.endDate) + 1;

  const stageCopy = {
    before: {
      label: "Before your journey",
      title: countdownLabel(),
      summary: `Get ready for ${trip.destination}. Your approved journey is available here whenever you need it.`,
      action: "Review preparation",
      target: "trip"
    },
    during: {
      label: "Today on your journey",
      title: day?.location || trip.destination,
      summary: day?.summary || "Your day is organised around realistic routes with room to explore.",
      action: "Open today’s plan",
      target: "journey"
    },
    after: {
      label: "Your journey, remembered",
      title: `Welcome back, ${trip.travellerName || "traveller"}`,
      summary: "Your saved places and notes remain on this device. Revisit the route or start thinking about what comes next.",
      action: "View saved memories",
      target: "saved"
    }
  }[stage];

  container.innerHTML = `
    <section class="trip-hero">
      <div class="trip-hero__content">
        <span class="stage-badge"><svg><use href="#icon-compass"/></svg>${stageCopy.label}</span>
        <h1 id="home-heading">${escapeHtml(stageCopy.title)}</h1>
        <p class="trip-hero__summary">${escapeHtml(stageCopy.summary)}</p>
        <div class="hero-meta">
          <span>${escapeHtml(formatDateRange(trip.startDate, trip.endDate))}</span>
          <span>${tripDays} days</span>
          <span>${escapeHtml(trip.subtitle || trip.destination)}</span>
        </div>
        <button class="button button--yellow hero-action" type="button" data-go="${stageCopy.target}">${stageCopy.action}<svg><use href="#icon-chevron"/></svg></button>
      </div>
    </section>

    <div class="section-heading"><div><p class="section-label">At a glance</p><h2>Your journey</h2><p>${escapeHtml(trip.intro || "Thoughtful travel beyond the standard checklist.")}</p></div></div>
    <div class="dashboard-grid">
      ${stage === "before" ? `
        <article class="dashboard-card dashboard-card--yellow">
          <div class="dashboard-card__icon"><svg><use href="#icon-check"/></svg></div>
          <h3>Preparation</h3><p>${completedTasks} of ${totalTasks} tasks complete</p>
          <div class="progress"><span style="width:${percentage(completedTasks, totalTasks)}%"></span></div>
          <button class="card-link button-link" data-go="trip">Open checklist <svg><use href="#icon-chevron"/></svg></button>
        </article>` : `
        <article class="dashboard-card dashboard-card--yellow">
          <div class="dashboard-card__icon"><svg><use href="#icon-heart"/></svg></div>
          <h3>${stage === "after" ? "Your memories" : "Saved for later"}</h3><p>${Object.keys(state.saved).length} places saved on this device</p>
          <button class="card-link button-link" data-go="saved">Open saved <svg><use href="#icon-chevron"/></svg></button>
        </article>`}

      <article class="dashboard-card dashboard-card--green">
        <div class="dashboard-card__icon"><svg><use href="#icon-clock"/></svg></div>
        <h3>${stage === "before" ? "First day" : stage === "during" ? "Next up" : "Journey complete"}</h3>
        <p>${escapeHtml(stage === "after" ? `${trip.days.length} days of places, routes and notes` : next?.title || day?.theme || "Your itinerary")}</p>
        <p class="dashboard-card__meta">${escapeHtml(stage === "after" ? trip.destination : next ? `${next.time} · ${next.duration || "Flexible"}` : formatDate(day?.date))}</p>
        <button class="card-link button-link" data-go="journey">View journey <svg><use href="#icon-chevron"/></svg></button>
      </article>

      <article class="dashboard-card">
        <div class="dashboard-card__icon"><svg><use href="#icon-map"/></svg></div>
        <h3>Route overview</h3><p>${escapeHtml(trip.map?.summary || "See the logic connecting each stop.")}</p>
        <button class="card-link button-link" data-go="map">Open map <svg><use href="#icon-chevron"/></svg></button>
      </article>
    </div>

    <div class="section-heading"><div><p class="section-label">Less Visited approach</p><h2>Why this route works</h2></div></div>
    <section class="panel"><p>${escapeHtml(trip.routeOverview || "This journey groups places by area, balances fixed plans with flexible choices and keeps alternatives ready for weather or energy changes.")}</p></section>`;

  bindGoButtons(container);
}

function renderJourney() {
  const container = document.querySelector("#view-journey");
  const relevantDay = getRelevantDay(getTripStage());
  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Day by day</p><h2 id="journey-heading">Your complete journey</h2><p>Fixed bookings, thoughtful suggestions and flexible alternatives.</p></div></div>
    ${(trip.days || []).map((day, index) => `
      <details class="day-card" ${day.id === relevantDay?.id || index === 0 ? "open" : ""}>
        <summary class="day-card__header">
          <div><p>Day ${index + 1} · ${escapeHtml(formatDate(day.date, { weekday: "short", day: "numeric", month: "short" }))}</p><h3>${escapeHtml(day.location)} — ${escapeHtml(day.theme)}</h3></div>
          <svg><use href="#icon-chevron"/></svg>
        </summary>
        <div class="route-note"><svg><use href="#icon-route"/></svg><div><strong>Route logic</strong><br>${escapeHtml(day.routeLogic || day.summary || "Activities are grouped to keep travel realistic.")}</div></div>
        <div class="timeline">
          ${(day.activities || []).map((activity) => activityTimeline(activity)).join("")}
        </div>
      </details>`).join("")}`;

  bindActivityActions(container);
}

function activityTimeline(activity) {
  const type = activity.type || categoryToType(activity.category);
  const savedId = activity.placeId || activity.id;
  const alternative = activity.alternative;
  return `
    <article class="timeline-item">
      <div class="timeline-item__time">${escapeHtml(activity.time || "Flexible")}</div>
      <div class="timeline-item__content">
        <span class="type-badge type-${escapeHtml(type)}">${escapeHtml(typeLabel(type))}</span>
        <h4>${state.completed[activity.id] ? "✓ " : ""}${escapeHtml(activity.title)}</h4>
        <p>${escapeHtml(activity.description || "")}</p>
        <div class="activity-facts">
          ${activity.travelTime ? `<span>↳ ${escapeHtml(activity.travelTime)}</span>` : ""}
          ${activity.duration ? `<span>${escapeHtml(activity.duration)}</span>` : ""}
          ${activity.cost ? `<span>${escapeHtml(activity.cost)}</span>` : ""}
        </div>
        ${activity.practicalNote ? `<p class="place-card__note"><strong>Practical:</strong> ${escapeHtml(activity.practicalNote)}</p>` : ""}
        ${alternative ? `<div class="alternative-box"><strong>Alternative</strong><p>${escapeHtml(alternative)}</p></div>` : ""}
        <div class="activity-actions">
          <button class="icon-button save-action ${state.saved[savedId] ? "is-active" : ""}" type="button" data-save="${escapeHtml(savedId)}"><svg><use href="#icon-heart"/></svg>${state.saved[savedId] ? "Saved" : "Save"}</button>
          <button class="icon-button complete-action ${state.completed[activity.id] ? "is-active" : ""}" type="button" data-complete="${escapeHtml(activity.id)}"><svg><use href="#icon-check"/></svg>${state.completed[activity.id] ? "Done" : "Mark done"}</button>
          <a class="icon-button" href="${escapeHtml(buildMapUrl(activity))}" target="_blank" rel="noopener noreferrer"><svg><use href="#icon-pin"/></svg>Map</a>
        </div>
      </div>
    </article>`;
}

function renderExplore(activeFilter = "all") {
  const container = document.querySelector("#view-explore");
  const filters = ["all", "nearby", "food", "viewpoints", "culture", "rainy-day", "free", "evening", "accessible", "quick-stop"];
  const places = activeFilter === "all" ? activePlaces() : activePlaces().filter((place) => (place.tags || []).includes(activeFilter));
  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Approved for this trip</p><h2 id="explore-heading">Explore</h2><p>Scheduled stops and extra places chosen to fit your route.</p></div></div>
    <div class="filter-bar" role="group" aria-label="Filter places">
      ${filters.map((filter) => `<button class="filter-chip ${filter === activeFilter ? "is-active" : ""}" type="button" data-filter="${filter}">${filterLabel(filter)}</button>`).join("")}
    </div>
    <p class="explore-summary">Showing ${places.length} approved ${places.length === 1 ? "place" : "places"}.</p>
    <div id="place-grid" class="place-grid"></div>`;

  const grid = container.querySelector("#place-grid");
  if (!places.length) grid.innerHTML = `<div class="empty-state">No approved places match this filter.</div>`;
  places.forEach((place) => grid.append(createPlaceCard(place)));
  container.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => renderExplore(button.dataset.filter)));
}

function createPlaceCard(place) {
  const fragment = document.querySelector("#place-template").content.cloneNode(true);
  const saveButton = fragment.querySelector(".save-button");
  fragment.querySelector(".place-card__initials").textContent = initials(place.name);
  fragment.querySelector(".place-card__status").textContent = place.scheduled ? "IN JOURNEY" : "EXTRA";
  fragment.querySelector(".category-chip").textContent = place.category || "place";
  fragment.querySelector(".place-card__location").textContent = place.neighbourhood || place.destination || "";
  fragment.querySelector(".place-card__title").textContent = place.name;
  fragment.querySelector(".place-card__description").textContent = place.description || "";
  fragment.querySelector(".place-card__note").textContent = place.practicalNote || "Check current information before visiting.";
  saveButton.innerHTML = `<svg><use href="#icon-heart"/></svg>${state.saved[place.id] ? "Saved" : "Save"}`;
  saveButton.classList.toggle("is-active", Boolean(state.saved[place.id]));
  fragment.querySelector(".map-button").href = buildMapUrl(place);
  saveButton.addEventListener("click", () => toggleSaved(place.id));
  return fragment;
}

function renderMap() {
  const container = document.querySelector("#view-map");
  const stops = trip.map?.stops || trip.days.map((day, index) => ({ name: day.location, note: day.theme, mapUrl: buildMapUrl(day.activities[0] || { address: day.location }) }));
  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">The route at a glance</p><h2 id="map-heading">Map</h2><p>Curation and route logic first; Google Maps handles live navigation.</p></div></div>
    <section class="map-card">
      <div class="map-preview" role="img" aria-label="Stylised overview of the journey route"><div class="map-route"></div><span class="map-pin map-pin--1"><span>1</span></span><span class="map-pin map-pin--2"><span>2</span></span><span class="map-pin map-pin--3"><span>3</span></span></div>
      <div class="map-card__body">
        <h3>${escapeHtml(trip.map?.title || `${trip.destination} journey map`)}</h3>
        <p>${escapeHtml(trip.map?.summary || "Your main stops, accommodation and optional places in one route overview.")}</p>
        <div class="panel-actions">
          ${trip.map?.myMapsUrl ? `<a class="button button--primary" href="${escapeHtml(trip.map.myMapsUrl)}" target="_blank" rel="noopener noreferrer"><svg><use href="#icon-external"/></svg>Open full journey map</a>` : ""}
          ${trip.map?.routeUrl ? `<a class="button" href="${escapeHtml(trip.map.routeUrl)}" target="_blank" rel="noopener noreferrer">Open route</a>` : ""}
        </div>
        <div class="stop-list">
          ${stops.map((stop, index) => `<a class="stop" href="${escapeHtml(stop.mapUrl || buildMapUrl(stop))}" target="_blank" rel="noopener noreferrer"><span class="stop__number">${index + 1}</span><span><strong>${escapeHtml(stop.name)}</strong><span>${escapeHtml(stop.note || "Journey stop")}</span></span><svg><use href="#icon-external"/></svg></a>`).join("")}
        </div>
      </div>
    </section>
    <section class="panel"><h3>What this map adds</h3><p>Less Visited explains why places belong together, which stops are fixed, and what to substitute. External maps remain the source for live directions and downloaded map areas.</p></section>`;
}

function renderSaved() {
  const container = document.querySelector("#view-saved");
  const saved = activePlaces().filter((place) => state.saved[place.id]);
  const alternatives = activePlaces().filter((place) => place.alternativeFor);
  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Your shortlist</p><h2 id="saved-heading">Saved</h2><p>Keep possible stops and substitutions together on this device.</p></div></div>
    <div class="place-grid" id="saved-grid"></div>
    <div class="section-heading"><div><h2>Possible substitutions</h2><p>Approved alternatives when weather, energy or timing changes.</p></div></div>
    <div class="place-grid" id="alternative-grid"></div>`;

  const savedGrid = container.querySelector("#saved-grid");
  if (!saved.length) savedGrid.innerHTML = `<div class="empty-state"><strong>No saved places yet.</strong><br>Use Save in Journey or Explore to build your shortlist.</div>`;
  saved.forEach((place) => savedGrid.append(createSavedCard(place)));

  const alternativeGrid = container.querySelector("#alternative-grid");
  if (!alternatives.length) alternativeGrid.innerHTML = `<div class="empty-state">No substitutions are attached to this journey yet.</div>`;
  alternatives.forEach((place) => alternativeGrid.append(createAlternativeCard(place)));
}

function createSavedCard(place) {
  const wrapper = document.createElement("article");
  wrapper.className = "panel";
  wrapper.innerHTML = `<span class="category-chip">${escapeHtml(place.category)}</span><h3>${escapeHtml(place.name)}</h3><p>${escapeHtml(place.description || "")}</p><label class="notes-field"><strong>Personal note</strong><textarea class="notes-area" rows="3" data-note="${escapeHtml(place.id)}" placeholder="Why save this place?">${escapeHtml(state.notes[place.id] || "")}</textarea></label><div class="panel-actions"><button class="icon-button is-active" type="button" data-remove="${escapeHtml(place.id)}"><svg><use href="#icon-heart"/></svg>Remove</button><a class="icon-button" href="${escapeHtml(buildMapUrl(place))}" target="_blank" rel="noopener noreferrer"><svg><use href="#icon-pin"/></svg>Map</a></div>`;
  wrapper.querySelector("[data-remove]").addEventListener("click", () => toggleSaved(place.id));
  wrapper.querySelector("[data-note]").addEventListener("input", (event) => { state.notes[place.id] = event.currentTarget.value; persistState(); });
  return wrapper;
}

function createAlternativeCard(place) {
  const wrapper = document.createElement("article");
  wrapper.className = "panel";
  const chosen = state.substitutions[place.alternativeFor] === place.id;
  wrapper.innerHTML = `<span class="category-chip">${escapeHtml(place.category)}</span><h3>${escapeHtml(place.name)}</h3><p>${escapeHtml(place.description || "")}</p><p><strong>Best when:</strong> ${escapeHtml(place.bestFor || "You need a flexible alternative.")}</p><div class="panel-actions"><button class="button ${chosen ? "button--green" : "button--yellow"}" type="button" data-substitute="${escapeHtml(place.id)}" data-for="${escapeHtml(place.alternativeFor)}">${chosen ? "Selected alternative" : "Use instead"}</button><button class="icon-button ${state.saved[place.id] ? "is-active" : ""}" type="button" data-save="${escapeHtml(place.id)}"><svg><use href="#icon-heart"/></svg>${state.saved[place.id] ? "Saved" : "Save"}</button></div>`;
  wrapper.querySelector("[data-substitute]").addEventListener("click", (event) => { const target = event.currentTarget.dataset.for; state.substitutions[target] = chosen ? undefined : place.id; if (!state.substitutions[target]) delete state.substitutions[target]; persistState(); renderAll(); showView("saved"); });
  wrapper.querySelector("[data-save]").addEventListener("click", () => toggleSaved(place.id));
  return wrapper;
}

function renderTrip() {
  const container = document.querySelector("#view-trip");
  const budget = trip.budget || [];
  const budgetTotal = budget.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Practical companion</p><h2 id="trip-heading">Trip</h2><p>Bookings, preparation, budget, notes and essential information.</p></div></div>
    <div class="trip-grid">
      <section class="panel"><h3>Accommodation</h3>${keyList(trip.accommodation || { Area: "Add accommodation details to this journey." })}</section>
      <section class="panel"><h3>Key bookings</h3>${(trip.bookings || []).length ? keyList(Object.fromEntries(trip.bookings.map((item) => [item.label, `${item.reference || "Saved"}${item.note ? ` · ${item.note}` : ""}`]))) : "<p>No booking references have been added.</p>"}</section>
      <section class="panel"><h3>Preparation checklist</h3>${checklistHtml(trip.preparationChecklist || [], "prep")}</section>
      <section class="panel"><h3>Packing essentials</h3>${checklistHtml(trip.packingChecklist || [], "pack")}</section>
      <section class="panel"><h3>Simple budget</h3>${budget.length ? `${budget.map((item) => `<div class="budget-row"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(formatMoney(item.amount))}</strong></div>`).join("")}<div class="budget-row budget-total"><span>Planning total</span><span>${escapeHtml(formatMoney(budgetTotal))}</span></div><p>Planning figures only; update them as your bookings change.</p>` : "<p>No planning budget has been added.</p>"}</section>
      <section class="panel"><h3>Personal notes</h3><textarea id="trip-notes" class="notes-area" placeholder="Add reminders, ideas or useful details…">${escapeHtml(state.tripNotes || "")}</textarea><p>Stored only in this browser on this device.</p></section>
    </div>
    <div class="section-heading"><div><h2>Practical information</h2></div></div>
    ${(trip.practicalInfo || []).map((section) => `<section class="panel"><h3>${escapeHtml(section.title)}</h3><ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`).join("")}
    <section class="panel panel--emergency"><h3>Emergency information</h3><ul>${(trip.emergencyInfo || ["Use verified official emergency information for this destination."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
    <section class="panel"><h3>Your data and offline access</h3><p>Your journey, saved places, checklists and notes are stored locally. Your journey is available offline after opening it online once. Map links and external websites require a connection.</p><div class="panel-actions"><button id="export-data" class="button button--primary" type="button"><svg><use href="#icon-download"/></svg>Export my data</button><label class="button" for="import-trip">Preview journey JSON</label><input id="import-trip" type="file" accept="application/json,.json" hidden><button id="restore-default" class="button" type="button">Restore published journey</button><button id="clear-data" class="button button--danger" type="button">Clear personal data</button></div></section>`;

  container.querySelectorAll("[data-check]").forEach((input) => input.addEventListener("change", () => { state.checks[input.dataset.check] = input.checked; if (!input.checked) delete state.checks[input.dataset.check]; persistState(); renderHome(); input.closest(".check-item")?.classList.toggle("is-complete", input.checked); }));
  container.querySelector("#trip-notes").addEventListener("input", (event) => { state.tripNotes = event.currentTarget.value; persistState(); });
  container.querySelector("#export-data").addEventListener("click", exportPersonalData);
  container.querySelector("#clear-data").addEventListener("click", clearPersonalData);
  container.querySelector("#restore-default").addEventListener("click", restorePublishedTrip);
  container.querySelector("#import-trip").addEventListener("change", importTripJson);
}

function checklistHtml(items, prefix) {
  if (!items.length) return "<p>No checklist items have been added.</p>";
  return `<div class="check-list">${items.map((item, index) => { const id = item.id || `${prefix}-${index + 1}`; const done = Boolean(state.checks[id]); return `<label class="check-item ${done ? "is-complete" : ""}"><input type="checkbox" data-check="${escapeHtml(id)}" ${done ? "checked" : ""}><span>${escapeHtml(item.label || item)}</span></label>`; }).join("")}</div>`;
}

function keyList(object) { return `<dl class="key-list">${Object.entries(object).map(([key, value]) => `<div><dt>${escapeHtml(capitalise(key))}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`; }

function bindActivityActions(container) {
  container.querySelectorAll("[data-save]").forEach((button) => button.addEventListener("click", () => toggleSaved(button.dataset.save)));
  container.querySelectorAll("[data-complete]").forEach((button) => button.addEventListener("click", () => { const id = button.dataset.complete; state.completed[id] = !state.completed[id]; if (!state.completed[id]) delete state.completed[id]; persistState(); renderAll(); showView("journey"); }));
}

function toggleSaved(id) {
  state.saved[id] = !state.saved[id];
  if (!state.saved[id]) delete state.saved[id];
  persistState();
  const active = document.querySelector(".view.is-active")?.dataset.view || "home";
  renderAll();
  showView(active);
}

function activePlaces() { return (trip.places || []).filter((place) => place.active !== false); }

function getTripStage() {
  const now = todayInTripTimezone();
  if (now < trip.startDate) return "before";
  if (now > trip.endDate) return "after";
  return "during";
}

function getRelevantDay(stage) {
  if (stage === "before") return trip.days[0];
  if (stage === "after") return trip.days[trip.days.length - 1];
  const today = todayInTripTimezone();
  return trip.days.find((day) => day.date === today) || trip.days.find((day) => day.date > today) || trip.days[trip.days.length - 1];
}

function getNextActivity(day) {
  if (!day?.activities?.length) return null;
  if (getTripStage() !== "during") return day.activities[0];
  const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: trip.timezone || "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  return day.activities.find((item) => (item.time || "00:00") >= currentTime && !state.completed[item.id]) || day.activities.find((item) => !state.completed[item.id]) || day.activities[day.activities.length - 1];
}

function countdownLabel() {
  const days = differenceInDays(todayInTripTimezone(), trip.startDate);
  if (days <= 0) return "Your journey starts today";
  if (days === 1) return "1 day to go";
  return `${days} days to go`;
}

function todayInTripTimezone() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: trip.timezone || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function differenceInDays(start, end) { return Math.round((new Date(`${end}T12:00:00Z`) - new Date(`${start}T12:00:00Z`)) / 86400000); }
function percentage(value, total) { return total ? Math.round((value / total) * 100) : 0; }

function bindNavigation() {
  navItems.forEach((button) => button.addEventListener("click", () => showView(button.dataset.target, true)));
  window.addEventListener("hashchange", () => { const target = location.hash.replace("#", ""); if (views.some((view) => view.dataset.view === target)) showView(target); });
}

function bindGoButtons(scope) { scope.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.go, true))); }

function showView(target, updateHash = false) {
  views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === target));
  navItems.forEach((item) => { const active = item.dataset.target === target; item.classList.toggle("is-active", active); if (active) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current"); });
  if (updateHash) history.replaceState(null, "", `${location.pathname}${location.search}#${target}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.querySelector(`#view-${target}`)?.focus({ preventScroll: true });
}

function activateInitialView() { const target = location.hash.replace("#", ""); showView(views.some((view) => view.dataset.view === target) ? target : "home"); }

function bindInstallExperience() {
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredInstallPrompt = event; installButton.hidden = false; });
  installButton.addEventListener("click", async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; installButton.hidden = true; });
  window.addEventListener("appinstalled", () => { installButton.hidden = true; });
}

function bindNetworkStatus() {
  const update = () => {
    const offline = !navigator.onLine;
    networkStatus.classList.toggle("is-visible", offline);
    networkStatus.textContent = offline ? "Your journey is available offline. Map links and external websites require a connection." : "";
    offlinePill.hidden = offline;
  };
  window.addEventListener("online", update); window.addEventListener("offline", update); update();
}

function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch((error) => console.error("Service worker registration failed", error))); }

function exportPersonalData() {
  const payload = { exportedAt: new Date().toISOString(), journeyId: trip.journeyId, tripTitle: trip.tripTitle, personalState: state };
  downloadJson(`${slugify(trip.tripTitle)}-personal-data.json`, payload);
}

function importTripJson(event) {
  const file = event.currentTarget.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { const candidate = JSON.parse(String(reader.result)); validateTrip(candidate); localStorage.setItem(TRIP_OVERRIDE_KEY, JSON.stringify(candidate)); location.reload(); } catch (error) { alert(`This is not a valid Less Visited journey. ${error.message}`); } };
  reader.readAsText(file);
}

function restorePublishedTrip() { if (!localStorage.getItem(TRIP_OVERRIDE_KEY)) return alert("The published journey is already in use."); if (confirm("Restore the journey published at this link? Personal notes and saved places will remain.")) { localStorage.removeItem(TRIP_OVERRIDE_KEY); location.reload(); } }

function clearPersonalData() { if (!confirm("Clear saved places, checklist progress, substitutions and personal notes from this device?")) return; Object.assign(state, { saved: {}, completed: {}, notes: {}, checks: {}, tripNotes: "", substitutions: {} }); persistState(); renderAll(); showView("trip"); }

function downloadJson(filename, data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }

function validateTrip(candidate) {
  if (!candidate || typeof candidate !== "object") throw new Error("Missing journey object.");
  if (!candidate.startDate || !candidate.endDate) throw new Error("Journey dates are required.");
  if (!Array.isArray(candidate.days) || !candidate.days.length) throw new Error("At least one itinerary day is required.");
  for (const day of candidate.days) { if (!day.id || !day.date || !Array.isArray(day.activities)) throw new Error("Every day needs an id, date and activities."); for (const activity of day.activities) if (!activity.id || !activity.title) throw new Error("Every activity needs an id and title."); }
}

function buildMapUrl(item) {
  if (item?.mapUrl) return item.mapUrl;
  if (Number.isFinite(item?.latitude) && Number.isFinite(item?.longitude)) return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item?.address || item?.name || item?.title || trip.destination)}`;
}

function formatDate(dateString, options = { day: "numeric", month: "short", year: "numeric" }) { if (!dateString) return ""; return new Intl.DateTimeFormat("en-GB", options).format(new Date(`${dateString}T12:00:00`)); }
function formatDateRange(start, end) { return `${formatDate(start, { day: "numeric", month: "short" })}–${formatDate(end, { day: "numeric", month: "short", year: "numeric" })}`; }
function formatMoney(value) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: trip.currency || "GBP", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function categoryToType(category) { return category === "food" ? "food" : category === "practical" || category === "transport" ? "task" : "suggested"; }
function typeLabel(type) { return ({ fixed: "Fixed booking", suggested: "Suggested", optional: "Optional", food: "Food", task: "Practical task" })[type] || capitalise(type); }
function filterLabel(value) { return ({ all: "All", nearby: "Nearby", food: "Food", viewpoints: "Viewpoints", culture: "Culture", "rainy-day": "Rainy day", free: "Free", evening: "Evening", accessible: "Accessible", "quick-stop": "Quick stop" })[value] || capitalise(value); }
function initials(value) { return String(value || "LV").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function capitalise(value) { return value ? value[0].toUpperCase() + value.slice(1).replaceAll("-", " ") : ""; }
function slugify(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
