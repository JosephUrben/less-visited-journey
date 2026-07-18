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
  const defaults = { saved: {}, completed: {}, notes: {}, checks: {}, tripNotes: "", substitutions: {}, budget: { expenses: [], customCategories: [], categoryRules: {}, ledgerGroup: "date", filter: "all", trailPeriod: "daily", theme: "light", lastExportAt: null } };
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
  renderBudget();
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

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: "food", name: "Food & drink", icon: "🍲", words: ["food", "meal", "lunch", "dinner", "breakfast", "brunch", "coffee", "tea", "chai", "beer", "wine", "restaurant", "cafe", "snack", "market", "bakery"] },
  { id: "transport", name: "Transport", icon: "🚌", words: ["bus", "train", "metro", "taxi", "uber", "flight", "ferry", "transport", "ticket", "fuel", "petrol", "toll"] },
  { id: "accommodation", name: "Accommodation", icon: "🛏️", words: ["hotel", "hostel", "lodge", "guesthouse", "airbnb", "apartment", "room", "camp", "stay", "accommodation", "retreat"] },
  { id: "activities", name: "Activities", icon: "🎟️", words: ["tour", "museum", "entry", "activity", "excursion", "hike", "guide", "class", "show", "ticket"] },
  { id: "shopping", name: "Shopping", icon: "🛍️", words: ["shop", "shopping", "souvenir", "clothes", "gift", "market"] },
  { id: "health", name: "Health", icon: "🩹", words: ["pharmacy", "medicine", "doctor", "hospital", "health", "sunscreen"] },
  { id: "essentials", name: "Essentials & fees", icon: "📱", words: ["sim", "data", "wifi", "insurance", "fee", "charge", "laundry", "atm", "visa"] },
  { id: "other", name: "Other", icon: "💸", words: [] }
];

function budgetState() {
  state.budget ||= {};
  state.budget.expenses ||= [];
  state.budget.customCategories ||= [];
  state.budget.categoryRules ||= {};
  state.budget.ledgerGroup ||= "date";
  state.budget.filter ||= "all";
  state.budget.trailPeriod ||= "daily";
  state.budget.theme ||= "light";
  return state.budget;
}

function budgetConfig() {
  const planningTotal = (trip.budget || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const saved = budgetState().config || {};
  return {
    mode: saved.mode || "pot",
    amount: Number(saved.amount || planningTotal || 0),
    homeCurrency: saved.homeCurrency || trip.currency || "GBP",
    localCurrency: saved.localCurrency || trip.currency || "GBP",
    rate: Number(saved.rate || 1),
    rateUpdatedAt: saved.rateUpdatedAt || null,
    startDate: saved.startDate || trip.startDate,
    tripDays: Number(saved.tripDays || differenceInDays(trip.startDate, trip.endDate) + 1),
    ...saved
  };
}

function expenseCategories() { return [...DEFAULT_EXPENSE_CATEGORIES, ...budgetState().customCategories]; }

function renderBudget(activePanel = "add") {
  const container = document.querySelector("#view-budget");
  const cfg = budgetConfig();
  const expenses = budgetState().expenses;
  const paid = expenses.reduce((sum, expense) => sum + Number(expense.homeAmount || 0), 0);
  const attributed = attributedTotal(new Date());
  const days = Math.max(1, Math.min(cfg.tripDays, differenceInDays(cfg.startDate, todayInTripTimezone()) + 1));
  const allowance = budgetAllowance(cfg, days);
  const remaining = cfg.mode === "tracking" ? null : allowance - attributed;
  const status = remaining === null ? "neutral" : remaining >= 0 ? "good" : attributed <= allowance * 1.15 ? "watch" : "over";
  const recent = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Trip spending</p><h2 id="budget-heading">Budget</h2><p>A quick, honest view of what the journey is costing—without turning travel into admin.</p></div><button class="icon-button" id="budget-theme" type="button">${budgetState().theme === "dark" ? "☀️ Light" : "🌙 Dark"}</button></div>
    <section class="budget-hero budget-status--${status}">
      <div><span class="stage-badge">${budgetModeLabel(cfg.mode)}</span><h3>${remaining === null ? formatBudgetMoney(paid, cfg.homeCurrency) : formatBudgetMoney(Math.abs(remaining), cfg.homeCurrency)}</h3><p>${remaining === null ? "accounted for so far" : remaining >= 0 ? "available at this point in the trip" : "over the current pace"}</p></div>
      <div class="budget-hero__stats"><div><strong>${formatBudgetMoney(paid, cfg.homeCurrency)}</strong><span>Paid</span></div><div><strong>${formatBudgetMoney(attributed, cfg.homeCurrency)}</strong><span>Trip value</span></div><div><strong>${formatBudgetMoney(attributed / days, cfg.homeCurrency)}</strong><span>Avg / day</span></div></div>
    </section>
    <nav class="budget-tabs" aria-label="Budget sections">
      ${[["add","Add"],["ledger","Ledger"],["trail","Trail"],["settings","Settings"]].map(([id,label]) => `<button type="button" class="filter-chip ${activePanel === id ? "is-active" : ""}" data-budget-panel="${id}">${label}</button>`).join("")}
    </nav>
    <div id="budget-panel">${budgetPanelHtml(activePanel, cfg, recent)}</div>`;

  container.querySelectorAll("[data-budget-panel]").forEach((button) => button.addEventListener("click", () => renderBudget(button.dataset.budgetPanel)));
  container.querySelector("#budget-theme").addEventListener("click", toggleBudgetTheme);
  bindBudgetPanel(container, activePanel);
  applyBudgetTheme();
}

function budgetPanelHtml(panel, cfg, recent) {
  if (panel === "ledger") return ledgerHtml(cfg);
  if (panel === "trail") return trailHtml(cfg);
  if (panel === "settings") return budgetSettingsHtml(cfg);
  return `<section class="panel budget-add-card">
      <p class="section-label">Write it how you’d say it</p><h3>What did you spend?</h3>
      <form id="expense-form"><label class="sr-only" for="expense-entry">Expense</label><input id="expense-entry" class="budget-entry" placeholder="e.g. hotel Valparaíso 120000 3 nights" autocomplete="off" required><button class="button button--yellow" type="submit">Sort it</button></form>
      <p class="input-hint">Amount, place and duration can all go in one line. You can correct everything before saving.</p>
      <div id="expense-confirm"></div>
    </section>
    <section class="panel"><div class="panel-title-row"><h3>Recent</h3>${budgetState().expenses.length > 5 ? `<button class="button-link card-link" data-open-ledger>See all →</button>` : ""}</div>${recent.length ? recent.map((expense) => expenseRowHtml(expense, cfg)).join("") : `<div class="empty-state">Nothing spent yet. Your first entry will appear here.</div>`}</section>`;
}

function parseExpense(text, cfg) {
  const durationMatch = text.match(/(\d+)\s*(nights?|days?)/i);
  const duration = durationMatch ? Number(durationMatch[1]) : 1;
  const isNight = Boolean(durationMatch && /night/i.test(durationMatch[2]));
  const withoutDuration = durationMatch ? text.replace(durationMatch[0], " ") : text;
  const numbers = [...withoutDuration.matchAll(/\b(\d+(?:[.,]\d+)?)(k)?\b/gi)];
  const chosen = numbers.sort((a, b) => numberToken(b) - numberToken(a))[0];
  const localAmount = chosen ? numberToken(chosen) : 0;
  let description = chosen ? withoutDuration.replace(chosen[0], " ") : withoutDuration;
  description = description.replace(/\s+/g, " ").trim() || "Travel expense";
  const words = description.toLowerCase().split(/\s+/).map((word) => word.replace(/[^a-z]/g, "")).filter(Boolean);
  const learned = words.find((word) => budgetState().categoryRules[word]);
  let categoryId = learned ? budgetState().categoryRules[learned] : "other";
  if (!learned) {
    let best = 0;
    expenseCategories().forEach((category) => { const score = (category.words || []).reduce((sum, keyword) => sum + (description.toLowerCase().includes(keyword) ? keyword.length : 0), 0); if (score > best) { best = score; categoryId = category.id; } });
  }
  const knownPlaces = [...new Set([...(trip.days || []).map((day) => day.location), ...(trip.places || []).map((place) => place.location)].filter(Boolean))];
  const location = knownPlaces.find((place) => description.toLowerCase().includes(place.toLowerCase())) || trip.destination;
  return { description, localAmount, homeAmount: cfg.rate ? localAmount / cfg.rate : localAmount, duration, isNight, categoryId, location, country: trip.destination, date: todayInTripTimezone() };
}

function numberToken(match) { return Number(String(match[1]).replace(",", ".")) * (match[2] ? 1000 : 1); }

function confirmExpenseHtml(parsed, cfg) {
  return `<div class="expense-confirm-card"><p class="section-label">Ready to account for</p><div class="confirm-amount">${formatBudgetMoney(parsed.localAmount, cfg.localCurrency)} <small>≈ ${formatBudgetMoney(parsed.homeAmount, cfg.homeCurrency)}</small></div>
    <div class="form-grid"><label>Description<input id="confirm-description" value="${escapeHtml(parsed.description)}"></label><label>Date<input id="confirm-date" type="date" value="${parsed.date}"></label><label>Category<select id="confirm-category">${expenseCategories().map((category) => `<option value="${category.id}" ${category.id === parsed.categoryId ? "selected" : ""}>${category.icon} ${escapeHtml(category.name)}</option>`).join("")}</select></label><label>Location<input id="confirm-location" value="${escapeHtml(parsed.location)}"></label><label>Amount (${escapeHtml(cfg.localCurrency)})<input id="confirm-amount-local" type="number" min="0" step="0.01" value="${parsed.localAmount}"></label><label>${parsed.isNight ? "Nights" : "Days"}<input id="confirm-duration" type="number" min="1" value="${parsed.duration}"></label></div>
    <p class="input-hint">${parsed.duration > 1 ? `Paid now; spread across ${parsed.duration} ${parsed.isNight ? "nights" : "days"} in the budget view.` : "The ledger records payment; the trail records the value received."}</p><div class="panel-actions"><button id="save-expense" class="button button--green" type="button">Add to ledger</button><button id="cancel-expense" class="button" type="button">Not right?</button></div></div>`;
}

function bindBudgetPanel(container, panel) {
  if (panel === "add") {
    let parsed;
    container.querySelector("#expense-form")?.addEventListener("submit", (event) => { event.preventDefault(); const cfg = budgetConfig(); parsed = parseExpense(container.querySelector("#expense-entry").value, cfg); if (!parsed.localAmount) return alert("Add an amount so the expense can be sorted."); container.querySelector("#expense-confirm").innerHTML = confirmExpenseHtml(parsed, cfg); container.querySelector("#save-expense").addEventListener("click", () => saveExpenseFromConfirm(parsed)); container.querySelector("#cancel-expense").addEventListener("click", () => { container.querySelector("#expense-confirm").innerHTML = ""; container.querySelector("#expense-entry").focus(); }); });
    container.querySelector("[data-open-ledger]")?.addEventListener("click", () => renderBudget("ledger"));
  }
  container.querySelectorAll("[data-edit-expense]").forEach((button) => button.addEventListener("click", () => editExpense(button.dataset.editExpense)));
  container.querySelector("#ledger-search")?.addEventListener("input", () => renderBudget("ledger"));
  container.querySelectorAll("[data-ledger-filter]").forEach((button) => button.addEventListener("click", () => { budgetState().filter = button.dataset.ledgerFilter; persistState(); renderBudget("ledger"); }));
  container.querySelectorAll("[data-ledger-group]").forEach((button) => button.addEventListener("click", () => { budgetState().ledgerGroup = button.dataset.ledgerGroup; persistState(); renderBudget("ledger"); }));
  container.querySelectorAll("[data-trail-period]").forEach((button) => button.addEventListener("click", () => { budgetState().trailPeriod = button.dataset.trailPeriod; persistState(); renderBudget("trail"); }));
  container.querySelector("#budget-settings-form")?.addEventListener("submit", saveBudgetSettings);
  container.querySelector("#fetch-rate")?.addEventListener("click", fetchBudgetRate);
  container.querySelector("#add-category")?.addEventListener("click", addBudgetCategory);
  container.querySelector("#export-budget")?.addEventListener("click", exportBudgetCsv);
  container.querySelector("#import-budget")?.addEventListener("change", importBudgetCsv);
  container.querySelector("#clear-expenses")?.addEventListener("click", clearExpenses);
}

function saveExpenseFromConfirm(parsed) {
  const cfg = budgetConfig();
  const categoryId = document.querySelector("#confirm-category").value;
  const description = document.querySelector("#confirm-description").value.trim() || parsed.description;
  const localAmount = Number(document.querySelector("#confirm-amount-local").value);
  const expense = { ...parsed, id: crypto.randomUUID?.() || `expense-${Date.now()}`, createdAt: new Date().toISOString(), description, date: document.querySelector("#confirm-date").value, categoryId, location: document.querySelector("#confirm-location").value.trim() || trip.destination, localAmount, homeAmount: cfg.rate ? localAmount / cfg.rate : localAmount, rate: cfg.rate, localCurrency: cfg.localCurrency, homeCurrency: cfg.homeCurrency, duration: Math.max(1, Number(document.querySelector("#confirm-duration").value || 1)) };
  description.toLowerCase().split(/\s+/).map((word) => word.replace(/[^a-z]/g, "")).filter((word) => word.length > 3).forEach((word) => { budgetState().categoryRules[word] = categoryId; });
  budgetState().expenses.push(expense); persistState(); renderBudget("add"); renderTrip();
}

function expenseRowHtml(expense, cfg) { const category = expenseCategories().find((item) => item.id === expense.categoryId) || DEFAULT_EXPENSE_CATEGORIES.at(-1); return `<button class="expense-row" type="button" data-edit-expense="${escapeHtml(expense.id)}"><span class="expense-row__icon">${category.icon}</span><span><strong>${escapeHtml(expense.description)}</strong><small>${escapeHtml(expense.location)} · ${formatDate(expense.date, { day: "numeric", month: "short" })}${expense.duration > 1 ? ` · ${expense.duration} ${expense.isNight ? "nights" : "days"}` : ""}</small></span><span><strong>${formatBudgetMoney(expense.homeAmount, cfg.homeCurrency)}</strong><small>${expense.localCurrency !== cfg.homeCurrency ? formatBudgetMoney(expense.localAmount, expense.localCurrency) : category.name}</small></span></button>`; }

function editExpense(id) {
  const expense = budgetState().expenses.find((item) => item.id === id); if (!expense) return;
  const nextDescription = prompt("Description", expense.description); if (nextDescription === null) return;
  const nextAmount = prompt(`Amount paid (${expense.localCurrency})`, expense.localAmount); if (nextAmount === null) return;
  if (nextDescription.trim() === "") return alert("Description cannot be empty.");
  const amount = Number(nextAmount); if (!Number.isFinite(amount) || amount < 0) return alert("Enter a valid amount.");
  Object.assign(expense, { description: nextDescription.trim(), localAmount: amount, homeAmount: expense.rate ? amount / expense.rate : amount });
  if (confirm("Save these changes? Choose Cancel to delete the expense instead.")) { persistState(); renderBudget("ledger"); renderTrip(); }
  else if (confirm("Delete this expense permanently?")) { budgetState().expenses = budgetState().expenses.filter((item) => item.id !== id); persistState(); renderBudget("ledger"); renderTrip(); }
}

function ledgerHtml(cfg) {
  const query = (document.querySelector("#ledger-search")?.value || "").toLowerCase();
  const filter = budgetState().filter;
  const expenses = [...budgetState().expenses].filter((expense) => (filter === "all" || expense.categoryId === filter) && (!query || `${expense.description} ${expense.location} ${expense.country}`.toLowerCase().includes(query))).sort((a, b) => b.date.localeCompare(a.date));
  const grouped = Object.groupBy ? Object.groupBy(expenses, (expense) => budgetState().ledgerGroup === "country" ? expense.country : expense.date) : expenses.reduce((groups, expense) => { const key = budgetState().ledgerGroup === "country" ? expense.country : expense.date; (groups[key] ||= []).push(expense); return groups; }, {});
  return `<section class="panel"><input id="ledger-search" class="budget-entry" placeholder="Search expenses…" value="${escapeHtml(query)}"><div class="filter-bar budget-filter-bar"><button class="filter-chip ${filter === "all" ? "is-active" : ""}" data-ledger-filter="all">All</button>${expenseCategories().map((category) => `<button class="filter-chip ${filter === category.id ? "is-active" : ""}" data-ledger-filter="${category.id}">${category.icon} ${escapeHtml(category.name)}</button>`).join("")}</div><div class="budget-tabs"><button class="filter-chip ${budgetState().ledgerGroup === "date" ? "is-active" : ""}" data-ledger-group="date">By date</button><button class="filter-chip ${budgetState().ledgerGroup === "country" ? "is-active" : ""}" data-ledger-group="country">By country</button></div></section>
    <section class="panel">${expenses.length ? Object.entries(grouped).map(([key, items]) => `<div class="ledger-group"><div class="panel-title-row"><h3>${budgetState().ledgerGroup === "date" ? formatDate(key, { weekday: "short", day: "numeric", month: "short" }) : escapeHtml(key)}</h3><strong>${formatBudgetMoney(items.reduce((sum, item) => sum + item.homeAmount, 0), cfg.homeCurrency)}</strong></div>${items.map((expense) => expenseRowHtml(expense, cfg)).join("")}</div>`).join("") : `<div class="empty-state">No expenses match this view.</div>`}</section>${budgetState().expenses.length >= 10 && !recentlyExported() ? `<section class="panel export-nudge"><strong>Worth backing up.</strong><p>Export your spending trail. This browser holds the only copy.</p><button id="export-budget" class="button button--yellow">Back up now</button></section>` : ""}`;
}

function trailHtml(cfg) {
  const expenses = budgetState().expenses;
  const period = budgetState().trailPeriod;
  const buckets = expenseBuckets(expenses, period);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const byCountry = aggregateExpenses(expenses, (expense) => expense.country || trip.destination);
  const byCategory = aggregateExpenses(expenses, (expense) => expenseCategories().find((item) => item.id === expense.categoryId)?.name || "Other");
  const byLocation = aggregateExpenses(expenses, (expense) => expense.location || trip.destination);
  return `<div class="budget-tabs">${["daily","weekly","monthly"].map((id) => `<button class="filter-chip ${period === id ? "is-active" : ""}" data-trail-period="${id}">${capitalise(id)}</button>`).join("")}</div><section class="panel"><h3>${capitalise(period)} spend</h3><div class="spend-chart">${buckets.length ? buckets.map((bucket) => `<div class="spend-bar"><span style="height:${Math.max(4, Math.round(bucket.total / max * 100))}%" title="${formatBudgetMoney(bucket.total, cfg.homeCurrency)}"></span><small>${escapeHtml(bucket.label)}</small></div>`).join("") : `<div class="empty-state">Add expenses to see your spending trail.</div>`}</div></section><div class="trip-grid"><section class="panel"><h3>By country</h3>${breakdownHtml(byCountry, cfg)}</section><section class="panel"><h3>By category</h3>${breakdownHtml(byCategory, cfg)}</section><section class="panel"><h3>By location</h3>${breakdownHtml(byLocation, cfg)}</section><section class="panel"><h3>Journey total</h3><div class="metric-big">${formatBudgetMoney(expenses.reduce((sum, expense) => sum + expense.homeAmount, 0), cfg.homeCurrency)}</div><p>${expenses.length} ${expenses.length === 1 ? "expense" : "expenses"} accounted for.</p></section></div>`;
}

function expenseBuckets(expenses, period) {
  const totals = {};
  expenses.forEach((expense) => eachExpenseDay(expense).forEach(({ date, amount }) => { const d = new Date(`${date}T12:00:00`); const key = period === "monthly" ? date.slice(0, 7) : period === "weekly" ? weekStart(date) : date; totals[key] = (totals[key] || 0) + amount; }));
  return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([key, total]) => ({ total, label: period === "monthly" ? new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(`${key}-01T12:00:00`)) : period === "weekly" ? `W/C ${formatDate(key, { day: "numeric", month: "short" })}` : new Intl.DateTimeFormat("en-GB", { weekday: "narrow", day: "numeric" }).format(new Date(`${key}T12:00:00`)) }));
}

function aggregateExpenses(expenses, getKey) { const result = {}; expenses.forEach((expense) => { const key = getKey(expense); result[key] ||= { total: 0, count: 0 }; result[key].total += expense.homeAmount; result[key].count += 1; }); return result; }
function breakdownHtml(data, cfg) { const entries = Object.entries(data).sort((a, b) => b[1].total - a[1].total); const total = entries.reduce((sum, [, value]) => sum + value.total, 0); return entries.length ? entries.map(([label, value]) => `<div class="breakdown-row"><div><strong>${escapeHtml(label)}</strong><small>${value.count} entries · ${percentage(value.total, total)}%</small></div><strong>${formatBudgetMoney(value.total, cfg.homeCurrency)}</strong><span style="width:${percentage(value.total, total)}%"></span></div>`).join("") : `<p>No spending recorded yet.</p>`; }

function budgetSettingsHtml(cfg) { return `<section class="panel"><h3>Budget setup</h3><form id="budget-settings-form" class="form-grid"><label>Budget mode<select id="budget-mode"><option value="weekly" ${cfg.mode === "weekly" ? "selected" : ""}>Weekly</option><option value="monthly" ${cfg.mode === "monthly" ? "selected" : ""}>Monthly</option><option value="pot" ${cfg.mode === "pot" ? "selected" : ""}>Total trip pot</option><option value="tracking" ${cfg.mode === "tracking" ? "selected" : ""}>No budget—record only</option></select></label><label>Budget amount (${escapeHtml(cfg.homeCurrency)})<input id="budget-amount" type="number" min="0" step="0.01" value="${cfg.amount}"></label><label>Home currency<input id="budget-home-currency" maxlength="3" value="${escapeHtml(cfg.homeCurrency)}"></label><label>Local currency<input id="budget-local-currency" maxlength="3" value="${escapeHtml(cfg.localCurrency)}"></label><label>Rate: 1 home = local<input id="budget-rate" type="number" min="0.000001" step="any" value="${cfg.rate}"></label><label>Trip start<input id="budget-start" type="date" value="${cfg.startDate}"></label><label>Trip length (days)<input id="budget-days" type="number" min="1" value="${cfg.tripDays}"></label><div class="panel-actions"><button class="button button--green" type="submit">Save setup</button><button id="fetch-rate" class="button" type="button">Get live rate</button></div></form><p id="rate-note">${cfg.rateUpdatedAt ? `Rate updated ${formatDate(cfg.rateUpdatedAt.slice(0, 10))}. Each expense keeps the rate used when it was logged.` : "Set the rate manually or fetch a current ECB-backed market rate when online."}</p></section><section class="panel"><h3>Custom categories</h3><div class="form-grid"><label>Emoji<input id="category-icon" maxlength="4" placeholder="🧭"></label><label>Name<input id="category-name" placeholder="Guides"></label></div><button id="add-category" class="button button--yellow" type="button">Add category</button>${budgetState().customCategories.length ? `<p>${budgetState().customCategories.map((category) => `${category.icon} ${escapeHtml(category.name)}`).join(" · ")}</p>` : ""}</section><section class="panel"><h3>Backup and restore</h3><p>Budget data stays on this device and remains available offline.</p><div class="panel-actions"><button id="export-budget" class="button button--primary" type="button">Export CSV</button><label class="button" for="import-budget">Import CSV</label><input id="import-budget" type="file" accept=".csv,text/csv" hidden><button id="clear-expenses" class="button button--danger" type="button">Clear expenses</button></div></section>`; }

function saveBudgetSettings(event) { event.preventDefault(); const previous = budgetConfig(); const next = { mode: document.querySelector("#budget-mode").value, amount: Number(document.querySelector("#budget-amount").value || 0), homeCurrency: document.querySelector("#budget-home-currency").value.trim().toUpperCase(), localCurrency: document.querySelector("#budget-local-currency").value.trim().toUpperCase(), rate: Number(document.querySelector("#budget-rate").value || 1), startDate: document.querySelector("#budget-start").value, tripDays: Number(document.querySelector("#budget-days").value || 1), rateUpdatedAt: previous.rateUpdatedAt }; if (!/^[A-Z]{3}$/.test(next.homeCurrency) || !/^[A-Z]{3}$/.test(next.localCurrency) || next.rate <= 0) return alert("Check both three-letter currency codes and the exchange rate."); budgetState().config = next; persistState(); renderBudget("settings"); renderTrip(); }
async function fetchBudgetRate() { if (!navigator.onLine) return alert("You’re offline. Enter the rate manually and carry on."); const home = document.querySelector("#budget-home-currency").value.trim().toUpperCase(); const local = document.querySelector("#budget-local-currency").value.trim().toUpperCase(); const button = document.querySelector("#fetch-rate"); button.disabled = true; button.textContent = "Fetching…"; try { const response = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(home)}&to=${encodeURIComponent(local)}`); if (!response.ok) throw new Error("Rate unavailable"); const data = await response.json(); const rate = data.rates?.[local]; if (!rate) throw new Error("Rate unavailable"); document.querySelector("#budget-rate").value = rate; budgetState().config = { ...budgetConfig(), rate, homeCurrency: home, localCurrency: local, rateUpdatedAt: new Date().toISOString() }; persistState(); document.querySelector("#rate-note").textContent = `Live rate loaded: 1 ${home} = ${rate} ${local}. Save setup to keep it.`; } catch { alert("The live rate could not be fetched. Enter it manually and carry on."); } finally { button.disabled = false; button.textContent = "Get live rate"; } }
function addBudgetCategory() { const name = document.querySelector("#category-name").value.trim(); if (!name) return alert("Give the category a name."); budgetState().customCategories.push({ id: `custom-${slugify(name)}-${Date.now()}`, name, icon: document.querySelector("#category-icon").value.trim() || "⭐", words: [] }); persistState(); renderBudget("settings"); }

function eachExpenseDay(expense) { const count = Math.max(1, Number(expense.duration || 1)); const amount = Number(expense.homeAmount || 0) / count; return Array.from({ length: count }, (_, index) => ({ date: addDays(expense.date, index), amount })); }
function attributedTotal(until) { const maxDate = until.toISOString().slice(0, 10); return budgetState().expenses.reduce((sum, expense) => sum + eachExpenseDay(expense).filter((day) => day.date <= maxDate).reduce((subtotal, day) => subtotal + day.amount, 0), 0); }
function budgetAllowance(cfg, elapsedDays) { if (cfg.mode === "weekly") return cfg.amount * elapsedDays / 7; if (cfg.mode === "monthly") return cfg.amount * elapsedDays / 30.4375; if (cfg.mode === "pot") return cfg.amount * Math.min(1, elapsedDays / Math.max(1, cfg.tripDays)); return Infinity; }
function budgetModeLabel(mode) { return ({ weekly: "Weekly pace", monthly: "Monthly pace", pot: "Total trip pot", tracking: "Record only" })[mode] || "Trip budget"; }
function formatBudgetMoney(value, currency) { try { return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0)); } catch { return `${currency} ${Math.round(Number(value || 0)).toLocaleString("en-GB")}`; } }
function addDays(date, count) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + count); return value.toISOString().slice(0, 10); }
function weekStart(date) { const value = new Date(`${date}T12:00:00Z`); const offset = (value.getUTCDay() + 6) % 7; value.setUTCDate(value.getUTCDate() - offset); return value.toISOString().slice(0, 10); }

function exportBudgetCsv() { const headers = ["id","date","description","category","location","country","localAmount","localCurrency","homeAmount","homeCurrency","rate","duration","isNight"]; const rows = budgetState().expenses.map((expense) => headers.map((header) => csvCell(header === "category" ? expenseCategories().find((category) => category.id === expense.categoryId)?.name : expense[header])).join(",")); const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${slugify(trip.tripTitle)}-budget.csv`; link.click(); URL.revokeObjectURL(url); budgetState().lastExportAt = new Date().toISOString(); persistState(); }
function csvCell(value) { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function importBudgetCsv(event) { const file = event.currentTarget.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const rows = parseCsv(String(reader.result)); const [headers, ...data] = rows; const imported = data.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]]))).map((item) => ({ id: item.id || `expense-${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), date: item.date, description: item.description, categoryId: expenseCategories().find((category) => category.name === item.category)?.id || "other", location: item.location, country: item.country, localAmount: Number(item.localAmount), localCurrency: item.localCurrency, homeAmount: Number(item.homeAmount), homeCurrency: item.homeCurrency, rate: Number(item.rate || 1), duration: Number(item.duration || 1), isNight: item.isNight === "true" })); budgetState().expenses.push(...imported); persistState(); renderBudget("ledger"); renderTrip(); } catch { alert("That CSV could not be imported. Use a file exported by this budget tool."); } }; reader.readAsText(file); }
function parseCsv(text) { const rows = []; let row = [], cell = "", quoted = false; for (let i = 0; i < text.length; i++) { const char = text[i]; if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; } else if (char === '"') quoted = !quoted; else if (char === "," && !quoted) { row.push(cell); cell = ""; } else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += char; } if (cell || row.length) { row.push(cell); rows.push(row); } return rows; }
function recentlyExported() { return budgetState().lastExportAt && Date.now() - new Date(budgetState().lastExportAt).getTime() < 7 * 86400000; }
function clearExpenses() { if (!confirm("Clear every budget expense from this device? This cannot be undone unless you exported a CSV.")) return; budgetState().expenses = []; persistState(); renderBudget("settings"); renderTrip(); }
function toggleBudgetTheme() { budgetState().theme = budgetState().theme === "dark" ? "light" : "dark"; persistState(); applyBudgetTheme(); renderBudget("add"); }
function applyBudgetTheme() { document.documentElement.dataset.theme = budgetState().theme; }

function renderTrip() {
  const container = document.querySelector("#view-trip");
  const budget = trip.budget || [];
  const budgetTotal = budget.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cfg = budgetConfig();
  const actualSpend = budgetState().expenses.reduce((sum, expense) => sum + Number(expense.homeAmount || 0), 0);
  const dashboardDays = Math.max(1, Math.min(cfg.tripDays, differenceInDays(cfg.startDate, todayInTripTimezone()) + 1));
  const budgetRemaining = cfg.mode === "tracking" ? null : budgetAllowance(cfg, dashboardDays) - attributedTotal(new Date());
  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Practical companion</p><h2 id="trip-heading">Trip</h2><p>Bookings, preparation, budget, notes and essential information.</p></div></div>
    <div class="trip-grid">
      <section class="panel"><h3>Accommodation</h3>${keyList(trip.accommodation || { Area: "Add accommodation details to this journey." })}</section>
      <section class="panel"><h3>Key bookings</h3>${(trip.bookings || []).length ? keyList(Object.fromEntries(trip.bookings.map((item) => [item.label, `${item.reference || "Saved"}${item.note ? ` · ${item.note}` : ""}`]))) : "<p>No booking references have been added.</p>"}</section>
      <section class="panel"><h3>Preparation checklist</h3>${checklistHtml(trip.preparationChecklist || [], "prep")}</section>
      <section class="panel"><h3>Packing essentials</h3>${checklistHtml(trip.packingChecklist || [], "pack")}</section>
      <section class="panel trip-budget-card"><div class="panel-title-row"><h3>Trip budget</h3><span class="category-chip">${escapeHtml(budgetModeLabel(cfg.mode))}</span></div><div class="budget-dashboard-total"><strong>${escapeHtml(formatBudgetMoney(actualSpend, cfg.homeCurrency))}</strong><span>spent across ${budgetState().expenses.length} ${budgetState().expenses.length === 1 ? "entry" : "entries"}</span></div>${budgetRemaining === null ? `<p>Recording only—no spending limit is applied.</p>` : `<div class="budget-row budget-total"><span>Remaining from budget</span><span>${escapeHtml(formatBudgetMoney(budgetRemaining, cfg.homeCurrency))}</span></div>`}${budget.length ? `<details><summary>View original planning figures (${escapeHtml(formatMoney(budgetTotal))})</summary>${budget.map((item) => `<div class="budget-row"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(formatMoney(item.amount))}</strong></div>`).join("")}</details>` : ""}<div class="panel-actions"><button class="button button--yellow" type="button" data-go="budget">Add expense</button><button class="button" type="button" data-go="budget">Open full budget</button></div></section>
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
  bindGoButtons(container);
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

function clearPersonalData() { if (!confirm("Clear saved places, checklist progress, substitutions, notes and budget data from this device?")) return; Object.assign(state, { saved: {}, completed: {}, notes: {}, checks: {}, tripNotes: "", substitutions: {}, budget: { expenses: [], customCategories: [], categoryRules: {}, ledgerGroup: "date", filter: "all", trailPeriod: "daily", theme: "light", lastExportAt: null } }); persistState(); renderAll(); showView("trip"); }

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
