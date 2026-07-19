const V4 = {
  trip: null,
  tripId: window.LESS_VISITED_BOOTSTRAP?.tripId || new URLSearchParams(location.search).get("trip") || "default",
  live: null,
  group: null,
  applying: false,
  observer: null
};

const LIVE_KEY = () => `less-visited-live-sync:${V4.tripId}`;
const GROUP_KEY = () => `less-visited-group-costs:${V4.tripId}`;
const AFFILIATE_KEY = () => `less-visited-affiliates:${V4.tripId}`;
const DOC_DB = "less-visited-documents-v1";
const DOC_STORE = "documents";

initProductV4().catch((error) => console.error("Less Visited v4 failed", error));

async function initProductV4() {
  V4.trip = await fetchTripV4();
  V4.live = readJson(LIVE_KEY(), { syncedAt: null, weather: {}, openingHours: {} });
  V4.group = normaliseGroup(readJson(GROUP_KEY(), null));
  await waitForV4(() => document.querySelector("#view-home .trip-hero"));
  applyV4();
  V4.observer = new MutationObserver(debounceV4(applyV4, 90));
  V4.observer.observe(document.querySelector("#main"), { childList: true, subtree: true });
  window.addEventListener("online", () => maybeSyncLive(true));
  if (navigator.onLine && syncIsStale()) maybeSyncLive(false);
}

async function fetchTripV4() {
  const path = V4.tripId === "default" ? "./data/trip.json" : `./data/journeys/${encodeURIComponent(V4.tripId)}.json`;
  const response = await fetch(`${path}?v4=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load journey data (${response.status}).`);
  return response.json();
}

function applyV4() {
  if (V4.applying) return;
  V4.applying = true;
  try {
    renamePreparationActions();
    decorateLiveHome();
    decorateJourneyLiveData();
    decorateExploreImagesAndTours();
    decorateSavedImages();
    renderAllPlacesMap();
    decorateBudgetGroupTab();
    compactTripChecklists();
    renderPracticalEssentials();
  } finally {
    V4.applying = false;
  }
}

function renamePreparationActions() {
  document.querySelectorAll("#view-home button, #view-home .card-link").forEach((element) => {
    const text = element.textContent.trim().toLowerCase();
    if (text.includes("review preparation")) replaceTextNode(element, "Get prepared");
    if (text.includes("open checklist")) replaceTextNode(element, "Get prepared");
  });
}

function decorateLiveHome() {
  const home = document.querySelector("#view-home");
  if (!home || home.querySelector(".live-travel-card")) return;
  const anchor = home.querySelector(".journey-status-card") || home.querySelector(".trip-hero");
  if (!anchor) return;
  const card = document.createElement("section");
  card.className = "panel live-travel-card";
  card.innerHTML = liveHomeHtml();
  anchor.insertAdjacentElement("afterend", card);
  card.querySelector("[data-live-sync]")?.addEventListener("click", () => maybeSyncLive(true));
}

function liveHomeHtml() {
  const locations = V4.trip.liveData?.weatherLocations || [];
  const last = V4.live.syncedAt ? formatDateTimeV4(V4.live.syncedAt) : "Not synced yet";
  const weather = locations.map((location) => {
    const item = V4.live.weather?.[location.id];
    if (!item) return `<div class="weather-place"><strong>${escapeV4(location.name)}</strong><span>Sync while online</span></div>`;
    return `<div class="weather-place"><strong>${escapeV4(location.name)}</strong><span class="weather-temp">${Math.round(item.current.temperature_2m)}°</span><span>${escapeV4(weatherLabel(item.current.weather_code))} · feels ${Math.round(item.current.apparent_temperature)}°</span><small>${escapeV4(weatherForecastLine(item))}</small></div>`;
  }).join("");
  return `
    <div class="panel-title-row">
      <div><p class="section-label">Live travel data</p><h3>Weather and opening hours</h3></div>
      <span class="sync-state ${navigator.onLine ? "is-online" : "is-offline"}">${navigator.onLine ? "Online" : "Offline copy"}</span>
    </div>
    <div class="weather-grid">${weather}</div>
    <p class="live-sync-note">Last sync: <strong>${escapeV4(last)}</strong>. Live data is saved on this device and remains visible offline.</p>
    <div class="panel-actions"><button class="button button--primary" type="button" data-live-sync>${navigator.onLine ? "Sync live data" : "Use last sync"}</button></div>`;
}

async function maybeSyncLive(force) {
  if (!navigator.onLine) {
    refreshLivePanels("You are offline. Showing the last successful sync.");
    return;
  }
  if (!force && !syncIsStale()) return;
  setSyncButtons(true, "Syncing…");
  try {
    const weather = await syncWeather();
    let openingHours = V4.live.openingHours || {};
    try {
      openingHours = await syncOpeningHours();
    } catch (error) {
      console.warn("Opening-hours sync unavailable; keeping cached/editorial hours", error);
    }
    V4.live = { syncedAt: new Date().toISOString(), weather, openingHours };
    localStorage.setItem(LIVE_KEY(), JSON.stringify(V4.live));
    refreshLivePanels("Live weather and opening hours updated.");
  } catch (error) {
    console.error(error);
    refreshLivePanels("Live sync could not complete. The previous offline copy has been kept.");
  } finally {
    setSyncButtons(false, "Sync live data");
  }
}

function syncIsStale() {
  if (!V4.live.syncedAt) return true;
  return Date.now() - new Date(V4.live.syncedAt).getTime() > 6 * 60 * 60 * 1000;
}

async function syncWeather() {
  const entries = await Promise.all((V4.trip.liveData?.weatherLocations || []).map(async (location) => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      timezone: location.timezone || "auto",
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
      forecast_days: "16"
    }).toString();
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Weather sync failed for ${location.name}`);
    return [location.id, await response.json()];
  }));
  return Object.fromEntries(entries);
}

async function syncOpeningHours() {
  const places = (V4.trip.places || []).filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
  if (!places.length) return {};
  const union = places.map((place) => `nwr(around:120,${place.latitude},${place.longitude})["opening_hours"];`).join("\n");
  const query = `[out:json][timeout:28];(${union});out center tags;`;
  const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Opening-hours sync failed (${response.status})`);
  const payload = await response.json();
  const result = {};
  for (const place of places) {
    const candidates = (payload.elements || []).map((element) => ({
      element,
      lat: element.lat ?? element.center?.lat,
      lon: element.lon ?? element.center?.lon,
      name: element.tags?.name || "",
      hours: element.tags?.opening_hours,
      checked: element.tags?.["check_date:opening_hours"] || null,
      source: element.tags?.["opening_hours:url"] || element.tags?.website || null
    })).filter((item) => item.hours && Number.isFinite(item.lat) && Number.isFinite(item.lon));
    const ranked = candidates.map((candidate) => ({
      ...candidate,
      score: nameScore(place.name, candidate.name) * 100 - distanceKm(place.latitude, place.longitude, candidate.lat, candidate.lon) * 12
    })).sort((a, b) => b.score - a.score);
    const best = ranked[0];
    result[place.id] = best && distanceKm(place.latitude, place.longitude, best.lat, best.lon) <= 0.18
      ? { hours: best.hours, source: "OpenStreetMap", sourceUrl: best.source, checkedAt: best.checked, matchedName: best.name }
      : { hours: place.openingHours || "Check official source", source: "Journey editorial fallback", sourceUrl: place.verificationUrl || null, checkedAt: null };
  }
  return result;
}

function refreshLivePanels(message) {
  document.querySelector(".live-travel-card")?.remove();
  document.querySelectorAll("[data-v4-hours]").forEach((node) => node.remove());
  decorateLiveHome();
  decorateJourneyLiveData();
  decorateExploreImagesAndTours();
  if (message) {
    const note = document.querySelector(".live-sync-note");
    if (note) note.innerHTML = `${escapeV4(message)} Last sync: <strong>${escapeV4(V4.live.syncedAt ? formatDateTimeV4(V4.live.syncedAt) : "not available")}</strong>.`;
  }
}

function setSyncButtons(disabled, text) {
  document.querySelectorAll("[data-live-sync]").forEach((button) => {
    button.disabled = disabled;
    button.textContent = text;
  });
}

function decorateJourneyLiveData() {
  const cards = [...document.querySelectorAll("#view-journey .day-card")];
  const days = V4.trip.days || [];
  cards.forEach((card, dayIndex) => {
    const day = days[dayIndex];
    if (!day) return;
    const header = card.querySelector(".day-card__header > div");
    if (header && !header.querySelector(".day-weather-chip")) {
      const forecast = weatherForDate(day.date, day.location);
      const chip = document.createElement("span");
      chip.className = "day-weather-chip";
      chip.textContent = forecast || "Forecast appears within 16 days";
      header.append(chip);
    }
    [...card.querySelectorAll(".timeline-item")].forEach((item, activityIndex) => {
      if (item.querySelector("[data-v4-hours]")) return;
      const activity = day.activities?.[activityIndex];
      if (!activity) return;
      const place = placeById(activity.placeId);
      const live = liveHoursFor(activity.placeId, activity.openingHours || place?.openingHours);
      const facts = item.querySelector(".activity-facts");
      if (!facts) return;
      const hours = document.createElement("span");
      hours.dataset.v4Hours = "true";
      hours.className = `hours-chip hours-chip--${live.status}`;
      hours.textContent = `Hours: ${live.label}`;
      hours.title = `${live.hours}. Last sync: ${V4.live.syncedAt ? formatDateTimeV4(V4.live.syncedAt) : "editorial data"}`;
      facts.append(hours);
    });
  });
}

function decorateExploreImagesAndTours() {
  const explore = document.querySelector("#view-explore");
  if (!explore) return;
  [...explore.querySelectorAll(".place-card")].forEach((card) => {
    const title = card.querySelector(".place-card__title")?.textContent.trim();
    const place = placeByName(title);
    if (!place) return;
    const visual = card.querySelector(".place-card__visual");
    const heading = card.querySelector(".place-card__initials");
    if (visual) {
      visual.style.backgroundImage = imageBackground(place);
      visual.dataset.placeId = place.id;
    }
    if (heading) heading.textContent = place.name;
    if (!card.querySelector("[data-v4-hours]")) {
      const live = liveHoursFor(place.id, place.openingHours);
      const chip = document.createElement("span");
      chip.dataset.v4Hours = "true";
      chip.className = `hours-chip hours-chip--${live.status}`;
      chip.textContent = live.label;
      card.querySelector(".place-card__topline")?.append(chip);
    }
  });
  if (!explore.querySelector(".guided-tours-section")) renderGuidedTours(explore);
}

function renderGuidedTours(explore) {
  const section = document.createElement("section");
  section.className = "guided-tours-section";
  const affiliate = readJson(AFFILIATE_KEY(), {});
  section.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Book with a local guide</p><h2>Guided trips</h2><p>Optional tours that add expertise where a guide is more useful than another self-guided stop.</p></div></div>
    <div class="tour-grid">
      ${(V4.trip.guidedTours || []).map((tour) => {
        const url = affiliate[tour.provider] || tour.url;
        return `<article class="tour-card"><span>${escapeV4(tour.provider)}</span><h3>${escapeV4(tour.title)}</h3><p>${escapeV4(tour.summary)}</p><a class="button button--yellow" href="${escapeAttrV4(url)}" target="_blank" rel="sponsored noopener noreferrer">View ${escapeV4(tour.provider)} tours</a></article>`;
      }).join("")}
    </div>
    <details class="affiliate-settings"><summary>Affiliate disclosure and link settings</summary><div><p>These are external booking partners. Less Visited may earn a commission after approved tracking links are added, at no extra cost to the traveller.</p><form id="tour-affiliate-form">${(V4.trip.guidedTours || []).map((tour) => `<label>${escapeV4(tour.provider)} tracking link<input name="${escapeAttrV4(tour.provider)}" type="url" value="${escapeAttrV4(affiliate[tour.provider] || "")}" placeholder="Paste approved affiliate link"></label>`).join("")}<button class="button" type="submit">Save tracking links on this device</button></form></div></details>`;
  explore.append(section);
  section.querySelector("#tour-affiliate-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    localStorage.setItem(AFFILIATE_KEY(), JSON.stringify(values));
    section.remove();
    renderGuidedTours(explore);
  });
}

function decorateSavedImages() {
  const saved = document.querySelector("#view-saved");
  if (!saved) return;
  saved.querySelectorAll("#saved-grid .panel, #alternative-grid .panel").forEach((card) => {
    if (card.classList.contains("saved-place-card")) return;
    const title = card.querySelector("h3")?.textContent.trim();
    const place = placeByName(title);
    if (!place) return;
    card.classList.add("saved-place-card");
    const image = document.createElement("div");
    image.className = "saved-place-card__image";
    image.style.backgroundImage = imageBackground(place);
    image.innerHTML = `<strong>${escapeV4(place.name)}</strong>`;
    card.prepend(image);
    const live = liveHoursFor(place.id, place.openingHours);
    const chip = document.createElement("span");
    chip.dataset.v4Hours = "true";
    chip.className = `hours-chip hours-chip--${live.status}`;
    chip.textContent = live.label;
    card.querySelector(".category-chip")?.insertAdjacentElement("afterend", chip);
  });
}

function renderAllPlacesMap() {
  const map = document.querySelector("#view-map .map-preview");
  if (!map || map.dataset.v4Map === mapStateSignature()) return;
  const places = (V4.trip.places || []).filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
  if (!places.length) return;
  const saved = savedPlaceIds();
  const selected = new Set((V4.trip.days || []).flatMap((day) => (day.activities || []).map((activity) => activity.placeId)).filter(Boolean));
  const routePlaces = (V4.trip.days || []).flatMap((day) => (day.activities || []).map((activity) => placeById(activity.placeId))).filter((place, index, list) => place && list.findIndex((item) => item.id === place.id) === index);
  const bounds = placeBounds(places);
  const projected = Object.fromEntries(places.map((place) => [place.id, projectPlace(place, bounds)]));
  const line = routePlaces.map((place) => projected[place.id]).filter(Boolean).map((point) => `${point.x},${point.y}`).join(" ");
  map.dataset.v4Map = mapStateSignature();
  map.setAttribute("aria-label", "Journey map showing every Explore place; green pins are saved, teal pins are itinerary places and yellow pins are additional Explore places.");
  map.innerHTML = `
    <svg class="journey-pin-map" viewBox="0 0 900 500" role="img">
      <defs><linearGradient id="mapSea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dff1f5"/><stop offset="1" stop-color="#cce7dc"/></linearGradient></defs>
      <rect width="900" height="500" rx="24" fill="url(#mapSea)"/>
      <path d="M0 410 C170 330 260 430 420 350 S700 310 900 210 L900 500 L0 500 Z" fill="#acd8e2" opacity=".72"/>
      <polyline points="${line}" fill="none" stroke="#087f9c" stroke-width="5" stroke-dasharray="9 8" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>
      <text x="90" y="75" class="map-city-label">Santiago</text><text x="690" y="425" class="map-city-label">Valparaíso</text>
      ${places.map((place) => {
        const point = projected[place.id];
        const kind = saved.has(place.id) ? "saved" : selected.has(place.id) ? "selected" : "extra";
        return `<g class="journey-map-pin journey-map-pin--${kind}" data-map-place="${escapeAttrV4(place.id)}" tabindex="0" role="link" aria-label="${escapeAttrV4(place.name)}"><circle cx="${point.x}" cy="${point.y}" r="13"/><circle cx="${point.x}" cy="${point.y}" r="5" class="pin-centre"/><title>${escapeV4(place.name)}</title></g>`;
      }).join("")}
    </svg>
    <div class="map-legend"><span><i class="legend-selected"></i>In journey</span><span><i class="legend-extra"></i>Explore extra</span><span><i class="legend-saved"></i>Saved</span></div>`;
  map.querySelectorAll("[data-map-place]").forEach((pin) => {
    const open = () => {
      const place = placeById(pin.dataset.mapPlace);
      window.open(mapUrlFor(place), "_blank", "noopener,noreferrer");
    };
    pin.addEventListener("click", open);
    pin.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") open(); });
  });
}

function decorateBudgetGroupTab() {
  const budget = document.querySelector("#view-budget");
  const tabs = budget?.querySelector(".budget-tabs");
  if (!budget || !tabs || tabs.querySelector("[data-group-budget]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter-chip";
  button.dataset.groupBudget = "true";
  button.textContent = "Group";
  tabs.append(button);
  button.addEventListener("click", () => openGroupBudget(budget));
  tabs.querySelectorAll("[data-budget-panel]").forEach((tab) => tab.addEventListener("click", () => {
    budget.querySelector("#group-budget-panel")?.remove();
    const original = budget.querySelector("#budget-panel");
    if (original) original.hidden = false;
  }, { capture: true }));
}

function openGroupBudget(budget) {
  budget.querySelectorAll(".budget-tabs .filter-chip").forEach((tab) => tab.classList.toggle("is-active", Boolean(tab.dataset.groupBudget)));
  const original = budget.querySelector("#budget-panel");
  if (original) original.hidden = true;
  let panel = budget.querySelector("#group-budget-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "group-budget-panel";
    budget.querySelector(".budget-tabs")?.insertAdjacentElement("afterend", panel);
  }
  renderGroupBudget(panel);
}

function renderGroupBudget(panel) {
  V4.group = normaliseGroup(readJson(GROUP_KEY(), V4.group));
  const active = travellerById(V4.group.activeTravellerId) || V4.group.travellers[0];
  const balances = calculateBalances();
  panel.innerHTML = `
    <section class="panel group-identity-card">
      <div class="panel-title-row"><div><p class="section-label">Split costs</p><h3>${escapeV4(V4.group.name)}</h3></div><button class="button button--small" type="button" data-new-group>New group</button></div>
      <p class="group-login-note">You are using this device as <strong>${escapeV4(active.avatar)} ${escapeV4(active.name)}</strong>. This is a local prototype identity, not a secure online account.</p>
      <div class="traveller-strip">${V4.group.travellers.map((traveller) => `<button type="button" class="traveller-avatar ${traveller.id === active.id ? "is-active" : ""}" data-travel-as="${escapeAttrV4(traveller.id)}"><span>${escapeV4(traveller.avatar)}</span><strong>${escapeV4(traveller.name)}</strong><small>${traveller.id === active.id ? "You are here" : "Travel as"}</small></button>`).join("")}</div>
      <form class="traveller-form" id="traveller-form"><input name="name" required placeholder="Traveller name"><select name="avatar" aria-label="Avatar"><option>🧭</option><option>🌎</option><option>🦙</option><option>🌊</option><option>🎒</option><option>📷</option><option>🍷</option><option>⛰️</option></select><button class="button button--yellow" type="submit">Add traveller</button></form>
    </section>
    <section class="panel">
      <p class="section-label">New group expense</p><h3>Who paid and who shares it?</h3>
      <form id="group-expense-form" class="group-expense-form">
        <label>Description<input name="description" required placeholder="Dinner at La Concepción"></label>
        <label>Amount<input name="amount" type="number" min="0" step="0.01" required placeholder="45000"></label>
        <label>Currency<select name="currency"><option>${escapeV4(V4.trip.currency || "CLP")}</option><option>GBP</option><option>USD</option><option>EUR</option></select></label>
        <label>Paid by<select name="paidBy">${V4.group.travellers.map((traveller) => `<option value="${escapeAttrV4(traveller.id)}" ${traveller.id === active.id ? "selected" : ""}>${escapeV4(traveller.avatar)} ${escapeV4(traveller.name)}</option>`).join("")}</select></label>
        <label>Cost type<select name="splitType"><option value="equal">Split equally</option><option value="personal">Assign to one person</option></select></label>
        <label class="personal-beneficiary" hidden>Cost belongs to<select name="beneficiary">${V4.group.travellers.map((traveller) => `<option value="${escapeAttrV4(traveller.id)}">${escapeV4(traveller.avatar)} ${escapeV4(traveller.name)}</option>`).join("")}</select></label>
        <fieldset class="split-people"><legend>People sharing this cost</legend>${V4.group.travellers.map((traveller) => `<label><input type="checkbox" name="participants" value="${escapeAttrV4(traveller.id)}" checked> ${escapeV4(traveller.avatar)} ${escapeV4(traveller.name)}</label>`).join("")}</fieldset>
        <button class="button button--yellow" type="submit">Add shared cost</button>
      </form>
    </section>
    <section class="panel"><div class="panel-title-row"><h3>Group balances</h3><strong>${formatGroupMoney(V4.group.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), V4.group.expenses[0]?.currency || V4.trip.currency)}</strong></div>
      <div class="balance-grid">${V4.group.travellers.map((traveller) => { const value = balances[traveller.id] || 0; return `<div class="balance-person"><span>${escapeV4(traveller.avatar)}</span><div><strong>${escapeV4(traveller.name)}</strong><small>${value >= 0 ? "gets back" : "owes"}</small></div><b class="${value >= 0 ? "positive" : "negative"}">${formatGroupMoney(Math.abs(value), V4.group.expenses[0]?.currency || V4.trip.currency)}</b></div>`; }).join("")}</div>
      <div class="settlement-list"><h4>Suggested settlements</h4>${settlementSuggestions(balances).length ? settlementSuggestions(balances).map((item) => `<p>${escapeV4(item.from.avatar)} ${escapeV4(item.from.name)} pays ${escapeV4(item.to.avatar)} ${escapeV4(item.to.name)} <strong>${formatGroupMoney(item.amount, V4.group.expenses[0]?.currency || V4.trip.currency)}</strong></p>`).join("") : "<p>Everyone is settled.</p>"}</div>
    </section>
    <section class="panel"><div class="panel-title-row"><h3>Shared-cost ledger</h3><button class="button button--small" type="button" data-export-group>Export</button></div>${V4.group.expenses.length ? [...V4.group.expenses].reverse().map(groupExpenseRow).join("") : `<div class="empty-state">No group costs yet. Add a shared or personal cost above.</div>`}</section>`;
  bindGroupBudget(panel);
}

function bindGroupBudget(panel) {
  panel.querySelectorAll("[data-travel-as]").forEach((button) => button.addEventListener("click", () => {
    V4.group.activeTravellerId = button.dataset.travelAs;
    persistGroup();
    renderGroupBudget(panel);
  }));
  panel.querySelector("#traveller-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    V4.group.travellers.push({ id: `traveller-${Date.now()}`, name: data.name.trim(), avatar: data.avatar || "🧭" });
    persistGroup();
    renderGroupBudget(panel);
  });
  const expenseForm = panel.querySelector("#group-expense-form");
  expenseForm?.elements.splitType.addEventListener("change", () => {
    const personal = expenseForm.elements.splitType.value === "personal";
    panel.querySelector(".personal-beneficiary").hidden = !personal;
    panel.querySelector(".split-people").hidden = personal;
  });
  expenseForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const splitType = data.get("splitType");
    let participants = splitType === "personal" ? [String(data.get("beneficiary"))] : data.getAll("participants").map(String);
    if (!participants.length) participants = [String(data.get("paidBy"))];
    V4.group.expenses.push({
      id: `group-expense-${Date.now()}`,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      description: String(data.get("description") || "Group expense"),
      amount: Number(data.get("amount") || 0),
      currency: String(data.get("currency") || V4.trip.currency || "CLP"),
      paidBy: String(data.get("paidBy")),
      participants,
      splitType,
      createdBy: V4.group.activeTravellerId
    });
    persistGroup();
    renderGroupBudget(panel);
  });
  panel.querySelectorAll("[data-delete-group-expense]").forEach((button) => button.addEventListener("click", () => {
    V4.group.expenses = V4.group.expenses.filter((expense) => expense.id !== button.dataset.deleteGroupExpense);
    persistGroup();
    renderGroupBudget(panel);
  }));
  panel.querySelector("[data-new-group]")?.addEventListener("click", () => {
    const name = prompt("Name the new travel group", "New trip group");
    if (!name) return;
    V4.group = normaliseGroup({ name, travellers: [{ id: `traveller-${Date.now()}`, name: "You", avatar: "🧭" }], expenses: [] });
    persistGroup();
    renderGroupBudget(panel);
  });
  panel.querySelector("[data-export-group]")?.addEventListener("click", exportGroupData);
}

function groupExpenseRow(expense) {
  const payer = travellerById(expense.paidBy);
  const participants = expense.participants.map((id) => travellerById(id)).filter(Boolean);
  return `<div class="group-expense-row"><span class="group-expense-avatar">${escapeV4(payer?.avatar || "💸")}</span><div><strong>${escapeV4(expense.description)}</strong><small>${escapeV4(payer?.name || "Traveller")} paid · ${expense.splitType === "personal" ? `for ${escapeV4(participants[0]?.name || "one traveller")}` : `split between ${participants.length}`}</small></div><b>${formatGroupMoney(expense.amount, expense.currency)}</b><button class="icon-button" type="button" data-delete-group-expense="${escapeAttrV4(expense.id)}">Delete</button></div>`;
}

function normaliseGroup(group) {
  const fallback = { name: `${V4.trip?.destination || "Trip"} group`, travellers: [{ id: "traveller-me", name: "You", avatar: "🧭" }], expenses: [] };
  const value = group && Array.isArray(group.travellers) && group.travellers.length ? group : fallback;
  return { name: value.name || fallback.name, travellers: value.travellers, activeTravellerId: value.activeTravellerId || value.travellers[0].id, expenses: Array.isArray(value.expenses) ? value.expenses : [] };
}

function persistGroup() { localStorage.setItem(GROUP_KEY(), JSON.stringify(V4.group)); }

function calculateBalances() {
  const balances = Object.fromEntries(V4.group.travellers.map((traveller) => [traveller.id, 0]));
  for (const expense of V4.group.expenses) {
    const amount = Number(expense.amount || 0);
    balances[expense.paidBy] = (balances[expense.paidBy] || 0) + amount;
    const participants = expense.participants?.length ? expense.participants : [expense.paidBy];
    const share = amount / participants.length;
    participants.forEach((id) => { balances[id] = (balances[id] || 0) - share; });
  }
  return balances;
}

function settlementSuggestions(balances) {
  const creditors = Object.entries(balances).filter(([, amount]) => amount > 0.01).map(([id, amount]) => ({ id, amount }));
  const debtors = Object.entries(balances).filter(([, amount]) => amount < -0.01).map(([id, amount]) => ({ id, amount: -amount }));
  const settlements = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].amount, debtors[di].amount);
    settlements.push({ from: travellerById(debtors[di].id), to: travellerById(creditors[ci].id), amount });
    creditors[ci].amount -= amount;
    debtors[di].amount -= amount;
    if (creditors[ci].amount < 0.01) ci += 1;
    if (debtors[di].amount < 0.01) di += 1;
  }
  return settlements;
}

function exportGroupData() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), journeyId: V4.trip.journeyId, group: V4.group }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugV4(V4.group.name)}-group-costs.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function compactTripChecklists() {
  const panels = [...document.querySelectorAll("#view-trip .trip-grid > .panel")];
  panels.forEach((panel) => {
    const heading = panel.querySelector(":scope > h3");
    if (!heading || panel.dataset.compactChecklist) return;
    if (!/Preparation checklist|Packing essentials/i.test(heading.textContent)) return;
    panel.dataset.compactChecklist = "true";
    const label = heading.textContent.trim();
    const count = panel.querySelectorAll("input[type=checkbox]").length;
    const completed = panel.querySelectorAll("input[type=checkbox]:checked").length;
    const details = document.createElement("details");
    details.className = "compact-checklist";
    details.innerHTML = `<summary><span><strong>${escapeV4(label)}</strong><small>${completed} of ${count} complete</small></span><span>Open</span></summary><div class="compact-checklist__body"></div>`;
    const body = details.querySelector(".compact-checklist__body");
    [...panel.children].filter((child) => child !== heading).forEach((child) => body.append(child));
    panel.innerHTML = "";
    panel.append(details);
  });
}

function renderPracticalEssentials() {
  const tripView = document.querySelector("#view-trip");
  if (!tripView || tripView.querySelector(".travel-essentials")) return;
  const practicalHeading = [...tripView.querySelectorAll(".section-heading")].find((heading) => heading.textContent.includes("Practical information"));
  if (!practicalHeading) return;
  practicalHeading.hidden = true;
  let next = practicalHeading.nextElementSibling;
  while (next && next.classList.contains("panel") && !next.classList.contains("panel--emergency")) {
    next.hidden = true;
    next = next.nextElementSibling;
  }
  const essentials = document.createElement("section");
  essentials.className = "travel-essentials";
  essentials.innerHTML = practicalEssentialsHtml();
  practicalHeading.insertAdjacentElement("afterend", essentials);
  bindPracticalEssentials(essentials);
  renderInsuranceDocument(essentials);
}

function practicalEssentialsHtml() {
  const details = V4.trip.practicalDetails || {};
  const affiliate = readJson(AFFILIATE_KEY(), {});
  const wiseUrl = affiliate.Wise || details.wisePartnerUrl || "https://wise.com/gb/affiliate-program/";
  return `
    <div class="section-heading"><div><p class="section-label">Before and during travel</p><h2>Travel essentials</h2><p>Explicit information to verify, save offline and use in an emergency.</p></div></div>
    <div class="essentials-grid">
      <article class="panel essential-card"><span class="essential-icon">🛂</span><h3>Visa and entry</h3><strong>${escapeV4(details.visa?.status || "Check entry requirements")}</strong><p>${escapeV4(details.visa?.detail || "Rules depend on nationality and passport type.")}</p><a class="card-link" href="${escapeAttrV4(details.visa?.sourceUrl || details.travelAdviceUrl || "#")}" target="_blank" rel="noopener noreferrer">Check official entry rules ↗</a></article>
      <article class="panel essential-card"><span class="essential-icon">💱</span><h3>Currency</h3><strong>${escapeV4(details.currency?.code || V4.trip.currency || "Local currency")} · ${escapeV4(details.currency?.name || "")}</strong><p>${escapeV4(details.currency?.detail || "Carry more than one payment method.")}</p></article>
      <article class="panel essential-card emergency-card"><span class="essential-icon">🆘</span><h3>Emergency numbers</h3>${(details.emergency || []).map((item) => `<a href="tel:${escapeAttrV4(item.number)}"><span>${escapeV4(item.label)}</span><strong>${escapeV4(item.number)}</strong></a>`).join("")}<a class="card-link" href="${escapeAttrV4(details.travelAdviceUrl || "#")}" target="_blank" rel="noopener noreferrer">Open official travel advice ↗</a></article>
      <article class="panel essential-card cash-card"><span class="essential-icon">💳</span><h3>Cash and travel money</h3><p>Carry a small CLP reserve and keep a second payment method separate. Use official ATMs and check fees before accepting a conversion.</p><a class="button button--yellow" href="${escapeAttrV4(wiseUrl)}" target="_blank" rel="sponsored noopener noreferrer">Open Wise</a><details><summary>Set Wise affiliate link</summary><form id="wise-affiliate-form"><input name="Wise" type="url" value="${escapeAttrV4(affiliate.Wise || "")}" placeholder="Paste approved Wise tracking link"><button class="button button--small" type="submit">Save</button></form></details><small>Affiliate disclosure: Less Visited may earn a commission from an approved tracking link.</small></article>
      <article class="panel essential-card insurance-card"><span class="essential-icon">📄</span><h3>Travel insurance</h3><p>Add the policy PDF to this device for offline access. Do not use a public journey JSON for sensitive policy details.</p><label class="button button--primary" for="insurance-pdf">Add insurance PDF</label><input id="insurance-pdf" type="file" accept="application/pdf,.pdf" hidden><div id="insurance-document"></div></article>
    </div>`;
}

function bindPracticalEssentials(section) {
  section.querySelector("#wise-affiliate-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const affiliate = readJson(AFFILIATE_KEY(), {});
    affiliate.Wise = String(new FormData(event.currentTarget).get("Wise") || "");
    localStorage.setItem(AFFILIATE_KEY(), JSON.stringify(affiliate));
    section.remove();
    renderPracticalEssentials();
  });
  section.querySelector("#insurance-pdf")?.addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return alert("Please choose a PDF file.");
    await putInsuranceDocument(file);
    await renderInsuranceDocument(section);
  });
}

async function renderInsuranceDocument(section) {
  const container = section.querySelector("#insurance-document");
  if (!container) return;
  const record = await getInsuranceDocument();
  if (!record) {
    container.innerHTML = `<p class="document-empty">No insurance PDF stored on this device.</p>`;
    return;
  }
  container.innerHTML = `<div class="document-row"><span>📎</span><div><strong>${escapeV4(record.name)}</strong><small>${formatBytes(record.size)} · saved ${escapeV4(formatDateTimeV4(record.updatedAt))}</small></div><button class="button button--small" type="button" data-open-insurance>Open</button><button class="icon-button" type="button" data-delete-insurance>Delete</button></div>`;
  container.querySelector("[data-open-insurance]")?.addEventListener("click", () => {
    const url = URL.createObjectURL(record.blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
  container.querySelector("[data-delete-insurance]")?.addEventListener("click", async () => {
    await deleteInsuranceDocument();
    await renderInsuranceDocument(section);
  });
}

function openDocumentDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DOC_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DOC_STORE)) request.result.createObjectStore(DOC_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putInsuranceDocument(file) {
  const db = await openDocumentDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DOC_STORE, "readwrite");
    transaction.objectStore(DOC_STORE).put({ id: `insurance:${V4.tripId}`, name: file.name, type: file.type, size: file.size, updatedAt: new Date().toISOString(), blob: file });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getInsuranceDocument() {
  const db = await openDocumentDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DOC_STORE, "readonly").objectStore(DOC_STORE).get(`insurance:${V4.tripId}`);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteInsuranceDocument() {
  const db = await openDocumentDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DOC_STORE, "readwrite");
    transaction.objectStore(DOC_STORE).delete(`insurance:${V4.tripId}`);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function liveHoursFor(placeId, fallback) {
  const synced = V4.live.openingHours?.[placeId];
  const hours = synced?.hours || fallback || "Check official source";
  const status = openingStatus(hours);
  return { hours, status: status.state, label: status.label, source: synced?.source || "Journey data" };
}

function openingStatus(hours, date = new Date()) {
  if (!hours || /check/i.test(hours)) return { state: "unknown", label: "Check hours" };
  if (hours.trim() === "24/7") return { state: "open", label: "Open 24 hours" };
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const day = dayNames[date.getDay()];
  const minutes = date.getHours() * 60 + date.getMinutes();
  const sections = hours.split(";").map((part) => part.trim());
  let matched = false;
  for (const section of sections) {
    const [daysToken, ...timeParts] = section.split(/\s+/);
    if (!daysToken || !timeParts.length) continue;
    const applies = daysToken.split(",").some((token) => dayTokenIncludes(token, day, dayNames));
    if (!applies) continue;
    matched = true;
    const timeText = timeParts.join(" ");
    if (/off|closed/i.test(timeText)) return { state: "closed", label: "Closed now" };
    for (const interval of timeText.split(",")) {
      const match = interval.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
      if (!match) continue;
      const start = Number(match[1]) * 60 + Number(match[2]);
      const end = Number(match[3]) * 60 + Number(match[4]);
      if (minutes >= start && minutes < end) return { state: "open", label: `Open now · until ${match[3]}:${match[4]}` };
    }
  }
  return matched ? { state: "closed", label: "Closed now" } : { state: "unknown", label: "Hours synced" };
}

function dayTokenIncludes(token, day, dayNames) {
  if (token === day) return true;
  const range = token.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)$/);
  if (!range) return false;
  const start = dayNames.indexOf(range[1]);
  const end = dayNames.indexOf(range[2]);
  const current = dayNames.indexOf(day);
  return start <= end ? current >= start && current <= end : current >= start || current <= end;
}

function weatherForDate(date, locationText) {
  const id = /valpara/i.test(locationText) ? "valparaiso" : "santiago";
  const data = V4.live.weather?.[id];
  if (!data?.daily?.time) return null;
  const index = data.daily.time.indexOf(date);
  if (index < 0) return null;
  return `${weatherLabel(data.daily.weather_code[index])} · ${Math.round(data.daily.temperature_2m_min[index])}–${Math.round(data.daily.temperature_2m_max[index])}° · rain ${data.daily.precipitation_probability_max[index] ?? 0}%`;
}

function weatherForecastLine(item) {
  if (!item.daily?.time?.length) return "Current conditions";
  return `Today ${Math.round(item.daily.temperature_2m_min[0])}–${Math.round(item.daily.temperature_2m_max[0])}° · rain ${item.daily.precipitation_probability_max[0] ?? 0}%`;
}

function weatherLabel(code) {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  return "Mixed conditions";
}

function savedPlaceIds() {
  const keys = [
    `less-visited-companion-state-v3:${V4.tripId}`,
    `less-visited-companion-state-v2:${V4.tripId}`,
    "less-visited-companion-state-v2"
  ];
  for (const key of keys) {
    const value = readJson(key, null);
    if (value?.saved) return new Set(Object.keys(value.saved).filter((id) => value.saved[id]));
  }
  return new Set();
}

function mapStateSignature() { return [...savedPlaceIds()].sort().join("|") + `:${(V4.trip.places || []).length}`; }
function placeBounds(places) { const lats = places.map((place) => place.latitude); const lons = places.map((place) => place.longitude); return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLon: Math.min(...lons), maxLon: Math.max(...lons) }; }
function projectPlace(place, bounds) { const x = 70 + ((place.longitude - bounds.minLon) / Math.max(0.001, bounds.maxLon - bounds.minLon)) * 760; const y = 65 + ((bounds.maxLat - place.latitude) / Math.max(0.001, bounds.maxLat - bounds.minLat)) * 360; return { x: Math.round(x), y: Math.round(y) }; }
function imageBackground(place) { const fallback = "linear-gradient(135deg, rgba(8,127,156,.76), rgba(23,107,91,.84))"; return place.imageUrl ? `linear-gradient(180deg, rgba(5,42,50,.08), rgba(5,42,50,.72)), url("${place.imageUrl.replace(/"/g, "%22")}")` : fallback; }
function mapUrlFor(place) { if (!place) return "https://www.google.com/maps"; if (Number.isFinite(place.latitude) && Number.isFinite(place.longitude)) return `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`; return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address || place.name)}`; }
function placeById(id) { return (V4.trip.places || []).find((place) => place.id === id); }
function placeByName(name) { return (V4.trip.places || []).find((place) => place.name === name); }
function travellerById(id) { return V4.group.travellers.find((traveller) => traveller.id === id); }
function nameScore(a, b) { const left = normaliseName(a); const right = normaliseName(b); if (!left || !right) return 0; if (left === right) return 1; const words = left.split(" ").filter((word) => word.length > 2); return words.filter((word) => right.includes(word)).length / Math.max(1, words.length); }
function normaliseName(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
function distanceKm(lat1, lon1, lat2, lon2) { const radius = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
function formatGroupMoney(value, currency) { try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "CLP", maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(Number(value || 0)); } catch { return `${Number(value || 0).toFixed(2)} ${currency || ""}`; } }
function formatDateTimeV4(value) { const date = new Date(value); if (Number.isNaN(date.getTime())) return String(value || ""); return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date); }
function formatBytes(bytes) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function replaceTextNode(element, replacement) { for (const node of element.childNodes) { if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) { node.textContent = replacement; return; } } element.textContent = replacement; }
function slugV4(value) { return String(value || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function escapeV4(value) { return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]); }
function escapeAttrV4(value) { return escapeV4(value); }
function debounceV4(fn, delay) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; }
function waitForV4(test, timeout = 10000) { return new Promise((resolve, reject) => { const start = Date.now(); const tick = () => { const value = test(); if (value) return resolve(value); if (Date.now() - start > timeout) return reject(new Error("Timed out waiting for the companion.")); requestAnimationFrame(tick); }; tick(); }); }
