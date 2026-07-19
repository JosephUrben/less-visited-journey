const V5 = {
  ctx: null,
  trip: null,
  state: null,
  live: null,
  group: null,
  activeView: "home",
  enhanceToken: 0
};

const tripId = window.LESS_VISITED_BOOTSTRAP?.tripId || new URLSearchParams(location.search).get("trip") || "default";
const LIVE_KEY = `less-visited-live-sync:${tripId}`;
const GROUP_KEY = `less-visited-group-costs:${tripId}`;
const AFFILIATE_KEY = `less-visited-affiliates:${tripId}`;
const APPROVAL_KEY = `less-visited-approval:${tripId}`;
const CHANGE_KEY = `less-visited-change-requests:${tripId}`;
const DOC_DB = "less-visited-documents-v1";
const DOC_STORE = "documents";

initProductV5().catch((error) => console.error("Less Visited product controller failed", error));

async function initProductV5() {
  V5.ctx = await waitForAppContext();
  V5.trip = V5.ctx.trip;
  V5.state = V5.ctx.state;
  V5.live = readJson(LIVE_KEY, { syncedAt: null, weather: {}, openingHours: {} });
  V5.group = normaliseGroup(readJson(GROUP_KEY, null));
  installProductLink();
  installMoreMenu();
  installChangeDialog();
  V5.activeView = currentView();
  enhanceView(V5.activeView);

  window.addEventListener("lessvisited:viewchange", (event) => {
    V5.activeView = event.detail?.target || currentView();
    requestEnhance(V5.activeView);
  });
  window.addEventListener("lessvisited:viewrendered", (event) => requestEnhance(event.detail?.target || currentView()));

  document.addEventListener("click", (event) => {
    const rerenderTrigger = event.target.closest?.("[data-filter],[data-save],[data-remove],[data-substitute],[data-complete],[data-budget-panel],[data-go]");
    if (rerenderTrigger) setTimeout(() => requestEnhance(currentView()), 0);
  }, true);
  document.addEventListener("change", (event) => {
    if (event.target.matches?.("[data-check]")) setTimeout(() => requestEnhance(currentView()), 0);
  }, true);
}

function waitForAppContext() {
  if (window.LESS_VISITED_APP_CONTEXT) return Promise.resolve(window.LESS_VISITED_APP_CONTEXT);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("The main journey app did not initialise.")), 12000);
    window.addEventListener("lessvisited:ready", (event) => {
      clearTimeout(timeout);
      resolve(event.detail?.context || window.LESS_VISITED_APP_CONTEXT);
    }, { once: true });
  });
}

function requestEnhance(target) {
  const token = ++V5.enhanceToken;
  requestAnimationFrame(() => {
    if (token !== V5.enhanceToken) return;
    enhanceView(target);
  });
}

function enhanceView(target) {
  if (!V5.trip) return;
  if (target === "home") enhanceHome();
  if (target === "journey") enhanceJourney();
  if (target === "explore") enhanceExplore();
  if (target === "map") enhanceMap();
  if (target === "saved") enhanceSaved();
  if (target === "budget") enhanceBudget();
  if (target === "trip") enhanceTrip();
}

function currentView() {
  return document.querySelector(".view.is-active")?.dataset.view || location.hash.slice(1) || "home";
}

function enhanceHome() {
  const home = document.querySelector("#view-home");
  const hero = home?.querySelector(".trip-hero");
  if (!home || !hero) return;
  home.querySelectorAll(".journey-status-card,.live-travel-card").forEach((node) => node.remove());

  const approval = readJson(APPROVAL_KEY, null);
  const status = approval?.status || V5.trip.journeyStatus || "reviewed";
  const statusCard = document.createElement("section");
  statusCard.className = "panel journey-status-card";
  statusCard.innerHTML = `
    <div class="status-card__top"><div><p class="section-label">Journey status</p><h2>${escapeV5(statusLabel(status))}</h2></div><span class="review-badge review-badge--${escapeAttrV5(status)}">${escapeV5(statusLabel(status))}</span></div>
    <div class="status-meta-grid"><div><span>Prepared for</span><strong>${escapeV5(V5.trip.travellerName || "Traveller")}</strong></div><div><span>Version</span><strong>${escapeV5(V5.trip.journeyVersion || 1)}</strong></div><div><span>Last reviewed</span><strong>${escapeV5(formatDateV5(V5.trip.lastReviewedAt))}</strong></div><div><span>Review</span><strong>${escapeV5(V5.trip.reviewedBy || "Less Visited")}</strong></div></div>
    <p class="status-card__note">${escapeV5(V5.trip.verificationNote || "Recommendations are reviewed before publication; operating details still need a final check near travel.")}</p>
    <div class="panel-actions"><button class="button button--green" type="button" data-v5-approve>${status === "approved" ? "Journey approved" : "Approve journey"}</button><button class="button button--yellow" type="button" data-v5-change>Request changes</button></div>`;
  hero.insertAdjacentElement("afterend", statusCard);
  statusCard.querySelector("[data-v5-approve]")?.addEventListener("click", () => {
    localStorage.setItem(APPROVAL_KEY, JSON.stringify({ status: "approved", updatedAt: new Date().toISOString() }));
    enhanceHome();
  });
  statusCard.querySelector("[data-v5-change]")?.addEventListener("click", () => openChangeDialog());

  const liveCard = document.createElement("section");
  liveCard.className = "panel live-travel-card";
  liveCard.innerHTML = liveHomeHtml();
  statusCard.insertAdjacentElement("afterend", liveCard);
  liveCard.querySelector("[data-sync-weather]")?.addEventListener("click", syncWeatherOnly);
  liveCard.querySelector("[data-sync-hours]")?.addEventListener("click", syncOpeningHoursOnly);
}

function liveHomeHtml() {
  const locations = V5.trip.liveData?.weatherLocations || [];
  const weather = locations.map((location) => {
    const item = V5.live.weather?.[location.id];
    if (!item) return `<div class="weather-place"><strong>${escapeV5(location.name)}</strong><span>Not synced</span><small>Use Sync weather while online.</small></div>`;
    return `<div class="weather-place"><strong>${escapeV5(location.name)}</strong><span class="weather-temp">${Math.round(item.current.temperature_2m)}°</span><span>${escapeV5(weatherLabel(item.current.weather_code))} · feels ${Math.round(item.current.apparent_temperature)}°</span><small>${escapeV5(weatherForecastLine(item))}</small></div>`;
  }).join("");
  return `
    <div class="panel-title-row"><div><p class="section-label">Live data on demand</p><h3>Weather and opening hours</h3></div><span class="sync-state ${navigator.onLine ? "is-online" : "is-offline"}">${navigator.onLine ? "Online" : "Offline copy"}</span></div>
    <div class="weather-grid">${weather}</div>
    <p class="live-sync-note">Last successful sync: <strong>${escapeV5(V5.live.syncedAt ? formatDateTimeV5(V5.live.syncedAt) : "not yet synced")}</strong>. Nothing contacts an external service until you press a sync button.</p>
    <div class="panel-actions"><button class="button button--primary" type="button" data-sync-weather ${navigator.onLine ? "" : "disabled"}>Sync weather</button><button class="button" type="button" data-sync-hours ${navigator.onLine ? "" : "disabled"}>Sync opening hours</button></div>
    <p class="input-hint">Opening-hours coverage depends on OpenStreetMap. Reviewed journey hours remain available when a venue cannot be matched.</p>`;
}

async function syncWeatherOnly(event) {
  const button = event.currentTarget;
  setBusy(button, true, "Syncing weather…");
  try {
    const entries = await Promise.all((V5.trip.liveData?.weatherLocations || []).map(async (location) => {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.search = new URLSearchParams({
        latitude: String(location.latitude), longitude: String(location.longitude), timezone: location.timezone || "auto",
        current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max", forecast_days: "16"
      }).toString();
      const response = await fetchWithTimeout(url, {}, 8000);
      if (!response.ok) throw new Error(`Weather service returned ${response.status}.`);
      return [location.id, await response.json()];
    }));
    V5.live.weather = Object.fromEntries(entries);
    V5.live.syncedAt = new Date().toISOString();
    persistLive();
    enhanceHome();
  } catch (error) {
    alert(`Weather could not be updated. The saved offline copy is unchanged. ${error.message}`);
  } finally {
    setBusy(button, false, "Sync weather");
  }
}

async function syncOpeningHoursOnly(event) {
  const button = event.currentTarget;
  setBusy(button, true, "Checking hours…");
  try {
    const places = (V5.trip.places || []).filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
    const union = places.map((place) => `nwr(around:100,${place.latitude},${place.longitude})["opening_hours"];`).join("\n");
    const query = `[out:json][timeout:18];(${union});out center tags;`;
    const response = await fetchWithTimeout(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, { cache: "no-store" }, 12000);
    if (!response.ok) throw new Error(`Opening-hours service returned ${response.status}.`);
    const payload = await response.json();
    const candidates = (payload.elements || []).map((element) => ({
      lat: element.lat ?? element.center?.lat, lon: element.lon ?? element.center?.lon,
      name: element.tags?.name || "", hours: element.tags?.opening_hours,
      sourceUrl: element.tags?.["opening_hours:url"] || element.tags?.website || null
    })).filter((item) => item.hours && Number.isFinite(item.lat) && Number.isFinite(item.lon));
    const result = {};
    for (const place of places) {
      const best = candidates.map((candidate) => ({ ...candidate, distance: distanceKm(place.latitude, place.longitude, candidate.lat, candidate.lon), score: nameScore(place.name, candidate.name) }))
        .filter((candidate) => candidate.distance <= 0.16)
        .sort((a, b) => b.score - a.score || a.distance - b.distance)[0];
      result[place.id] = best ? { hours: best.hours, source: "OpenStreetMap", sourceUrl: best.sourceUrl, matchedName: best.name } : { hours: place.openingHours || "Check official source", source: "Reviewed journey fallback" };
    }
    V5.live.openingHours = result;
    V5.live.syncedAt = new Date().toISOString();
    persistLive();
    enhanceHome();
  } catch (error) {
    alert(`Opening hours could not be updated. Reviewed and previously synced hours remain available. ${error.message}`);
  } finally {
    setBusy(button, false, "Sync opening hours");
  }
}

function persistLive() { localStorage.setItem(LIVE_KEY, JSON.stringify(V5.live)); }

function enhanceJourney() {
  const cards = [...document.querySelectorAll("#view-journey .day-card")];
  cards.forEach((card, dayIndex) => {
    const day = V5.trip.days?.[dayIndex];
    if (!day) return;
    const heading = card.querySelector(".day-card__header > div");
    if (heading && !heading.querySelector(".day-weather-chip")) {
      const chip = document.createElement("span");
      chip.className = "day-weather-chip";
      chip.textContent = weatherForDate(day.date, day.location) || "Forecast available near travel";
      heading.append(chip);
    }
    [...card.querySelectorAll(".timeline-item")].forEach((item, activityIndex) => {
      const activity = day.activities?.[activityIndex];
      if (!activity || item.dataset.v5Enhanced === "true") return;
      item.dataset.v5Enhanced = "true";
      const content = item.querySelector(".timeline-item__content");
      const actions = item.querySelector(".activity-actions");
      const facts = item.querySelector(".activity-facts");
      const place = placeById(activity.placeId);
      if (facts) {
        const live = liveHoursFor(activity.placeId, activity.openingHours || place?.openingHours);
        facts.insertAdjacentHTML("beforeend", `<span class="hours-chip hours-chip--${live.status}">Hours: ${escapeV5(live.label)}</span>`);
      }
      if (activity.whySelected && content && actions) actions.insertAdjacentHTML("beforebegin", `<div class="why-selected"><strong>Why Less Visited chose this</strong><p>${escapeV5(activity.whySelected)}</p></div>`);
      if ((activity.verificationStatus || activity.verification) && actions) actions.insertAdjacentHTML("beforebegin", verificationHtml(activity));
      if (actions) {
        const button = document.createElement("button");
        button.className = "icon-button";
        button.type = "button";
        button.textContent = "✎ Suggest a change";
        button.addEventListener("click", () => openChangeDialog(activity));
        actions.append(button);
      }
    });
  });
}

function enhanceExplore() {
  const explore = document.querySelector("#view-explore");
  if (!explore) return;
  explore.querySelectorAll(".place-card").forEach((card) => {
    const place = placeByName(card.querySelector(".place-card__title")?.textContent.trim());
    if (!place) return;
    const visual = card.querySelector(".place-card__visual");
    const heading = card.querySelector(".place-card__initials");
    if (visual && visual.dataset.v5Image !== place.id) {
      visual.dataset.v5Image = place.id;
      visual.style.backgroundImage = `linear-gradient(0deg,rgba(6,38,45,.5),rgba(6,38,45,.04)),url("${escapeCssUrl(placeImage(place))}")`;
    }
    if (heading) heading.textContent = place.name;
    if (!card.querySelector("[data-v5-hours]")) {
      const live = liveHoursFor(place.id, place.openingHours);
      card.querySelector(".place-card__topline")?.insertAdjacentHTML("beforeend", `<span data-v5-hours class="hours-chip hours-chip--${live.status}">${escapeV5(live.label)}</span>`);
    }
  });
  if (!explore.querySelector(".guided-tours-section")) renderGuidedTours(explore);
}

function renderGuidedTours(explore) {
  const affiliate = readJson(AFFILIATE_KEY, {});
  const section = document.createElement("section");
  section.className = "guided-tours-section";
  section.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Book with a local guide</p><h2>Guided trips</h2><p>Optional tours where local expertise adds more than another self-guided stop.</p></div></div>
    <div class="tour-grid">${(V5.trip.guidedTours || []).map((tour) => `<article class="tour-card"><span>${escapeV5(tour.provider)}</span><h3>${escapeV5(tour.title)}</h3><p>${escapeV5(tour.summary)}</p><a class="button button--yellow" href="${escapeAttrV5(affiliate[tour.provider] || tour.url)}" target="_blank" rel="sponsored noopener noreferrer">View ${escapeV5(tour.provider)} tours</a></article>`).join("")}</div>
    <details class="affiliate-settings"><summary>Affiliate disclosure and link settings</summary><div><p>Less Visited may earn a commission after approved tracking links are added, at no extra cost to the traveller.</p><form id="tour-affiliate-form">${(V5.trip.guidedTours || []).map((tour) => `<label>${escapeV5(tour.provider)} tracking link<input name="${escapeAttrV5(tour.provider)}" type="url" value="${escapeAttrV5(affiliate[tour.provider] || "")}" placeholder="Paste approved affiliate link"></label>`).join("")}<button class="button" type="submit">Save tracking links</button></form></div></details>`;
  explore.append(section);
  section.querySelector("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    localStorage.setItem(AFFILIATE_KEY, JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
    section.remove();
    renderGuidedTours(explore);
  });
}

function enhanceSaved() {
  const saved = document.querySelector("#view-saved");
  saved?.querySelectorAll("#saved-grid .panel,#alternative-grid .panel").forEach((card) => {
    if (card.querySelector(".saved-place-card__image")) return;
    const place = placeByName(card.querySelector("h3")?.textContent.trim());
    if (!place) return;
    card.classList.add("saved-place-card");
    const image = document.createElement("div");
    image.className = "saved-place-card__image";
    image.style.backgroundImage = `linear-gradient(0deg,rgba(6,38,45,.55),rgba(6,38,45,.04)),url("${escapeCssUrl(placeImage(place))}")`;
    image.innerHTML = `<strong>${escapeV5(place.name)}</strong>`;
    card.prepend(image);
  });
}

function enhanceMap() {
  const map = document.querySelector("#view-map .map-preview");
  const places = (V5.trip.places || []).filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
  if (!map || !places.length) return;
  const signature = JSON.stringify([places.map((place) => place.id), Object.keys(V5.state.saved || {}).sort()]);
  if (map.dataset.v5Map === signature) return;
  map.dataset.v5Map = signature;
  const saved = new Set(Object.keys(V5.state.saved || {}));
  const selected = new Set((V5.trip.days || []).flatMap((day) => (day.activities || []).map((activity) => activity.placeId)).filter(Boolean));
  const route = (V5.trip.days || []).flatMap((day) => (day.activities || []).map((activity) => placeById(activity.placeId))).filter((place, index, list) => place && list.findIndex((item) => item.id === place.id) === index);
  const bounds = placeBounds(places);
  const points = Object.fromEntries(places.map((place) => [place.id, projectPlace(place, bounds)]));
  const line = route.map((place) => points[place.id]).filter(Boolean).map((point) => `${point.x},${point.y}`).join(" ");
  map.innerHTML = `<svg class="journey-pin-map" viewBox="0 0 900 500" role="img" aria-label="All Explore places and the journey route"><rect width="900" height="500" rx="24" fill="#dff1f5"/><path d="M0 410 C170 330 260 430 420 350 S700 310 900 210 L900 500 L0 500 Z" fill="#acd8e2"/><polyline points="${line}" fill="none" stroke="#087f9c" stroke-width="5" stroke-dasharray="9 8" opacity=".75"/><text x="80" y="70" class="map-city-label">Santiago</text><text x="680" y="440" class="map-city-label">Valparaíso</text>${places.map((place) => { const point = points[place.id]; const kind = saved.has(place.id) ? "saved" : selected.has(place.id) ? "selected" : "extra"; return `<g class="journey-map-pin journey-map-pin--${kind}" data-map-place="${escapeAttrV5(place.id)}" tabindex="0" role="link" aria-label="${escapeAttrV5(place.name)}"><circle cx="${point.x}" cy="${point.y}" r="13"/><circle cx="${point.x}" cy="${point.y}" r="5" class="pin-centre"/><title>${escapeV5(place.name)}</title></g>`; }).join("")}</svg><div class="map-legend"><span><i class="legend-selected"></i>In journey</span><span><i class="legend-extra"></i>Explore extra</span><span><i class="legend-saved"></i>Saved</span></div>`;
  map.querySelectorAll("[data-map-place]").forEach((pin) => {
    const open = () => window.open(V5.ctx.buildMapUrl(placeById(pin.dataset.mapPlace)), "_blank", "noopener,noreferrer");
    pin.addEventListener("click", open);
    pin.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") open(); });
  });
}

function enhanceBudget() {
  const budget = document.querySelector("#view-budget");
  const tabs = budget?.querySelector(".budget-tabs");
  if (!budget || !tabs || tabs.querySelector("[data-v5-group]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter-chip";
  button.dataset.v5Group = "true";
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
  budget.querySelectorAll(".budget-tabs .filter-chip").forEach((tab) => tab.classList.toggle("is-active", Boolean(tab.dataset.v5Group)));
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
  V5.group = normaliseGroup(readJson(GROUP_KEY, V5.group));
  const active = travellerById(V5.group.activeTravellerId) || V5.group.travellers[0];
  const balances = calculateBalances();
  const currency = V5.trip.currency || "CLP";
  panel.innerHTML = `
    <section class="panel group-identity-card"><div class="panel-title-row"><div><p class="section-label">Split costs</p><h3>${escapeV5(V5.group.name)}</h3></div><button class="button button--small" type="button" data-new-group>New group</button></div><p class="group-login-note">Using this device as <strong>${escapeV5(active.avatar)} ${escapeV5(active.name)}</strong>. This prototype identity is local, not a secure account.</p><div class="traveller-strip">${V5.group.travellers.map((traveller) => `<button type="button" class="traveller-avatar ${traveller.id === active.id ? "is-active" : ""}" data-travel-as="${escapeAttrV5(traveller.id)}"><span>${escapeV5(traveller.avatar)}</span><strong>${escapeV5(traveller.name)}</strong><small>${traveller.id === active.id ? "You are here" : "Travel as"}</small></button>`).join("")}</div><form id="traveller-form" class="traveller-form"><input name="name" required placeholder="Traveller name"><select name="avatar" aria-label="Avatar"><option>🧭</option><option>🌎</option><option>🦙</option><option>🌊</option><option>🎒</option><option>📷</option><option>🍷</option><option>⛰️</option></select><button class="button button--yellow" type="submit">Add traveller</button></form></section>
    <section class="panel"><p class="section-label">New group expense</p><h3>Who paid and who shares it?</h3><form id="group-expense-form" class="group-expense-form"><label>Description<input name="description" required placeholder="Dinner at La Concepción"></label><label>Amount<input name="amount" type="number" min="0" step="0.01" required placeholder="45000"></label><label>Currency<select name="currency"><option value="${escapeAttrV5(currency)}">${escapeV5(currency)}</option></select><small>Convert other currencies before adding them.</small></label><label>Paid by<select name="paidBy">${V5.group.travellers.map((traveller) => `<option value="${escapeAttrV5(traveller.id)}" ${traveller.id === active.id ? "selected" : ""}>${escapeV5(traveller.avatar)} ${escapeV5(traveller.name)}</option>`).join("")}</select></label><label>Cost type<select name="splitType"><option value="equal">Split equally</option><option value="personal">Assign to one person</option></select></label><label class="personal-beneficiary" hidden>Cost belongs to<select name="beneficiary">${V5.group.travellers.map((traveller) => `<option value="${escapeAttrV5(traveller.id)}">${escapeV5(traveller.avatar)} ${escapeV5(traveller.name)}</option>`).join("")}</select></label><fieldset class="split-people"><legend>People sharing this cost</legend>${V5.group.travellers.map((traveller) => `<label><input type="checkbox" name="participants" value="${escapeAttrV5(traveller.id)}" checked> ${escapeV5(traveller.avatar)} ${escapeV5(traveller.name)}</label>`).join("")}</fieldset><button class="button button--yellow" type="submit">Add shared cost</button></form></section>
    <section class="panel"><div class="panel-title-row"><h3>Group balances</h3><strong>${formatGroupMoney(V5.group.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), currency)}</strong></div><div class="balance-grid">${V5.group.travellers.map((traveller) => { const value = balances[traveller.id] || 0; return `<div class="balance-person"><span>${escapeV5(traveller.avatar)}</span><div><strong>${escapeV5(traveller.name)}</strong><small>${value >= 0 ? "gets back" : "owes"}</small></div><b class="${value >= 0 ? "positive" : "negative"}">${formatGroupMoney(Math.abs(value), currency)}</b></div>`; }).join("")}</div><div class="settlement-list"><h4>Suggested settlements</h4>${settlementSuggestions(balances).length ? settlementSuggestions(balances).map((item) => `<p>${escapeV5(item.from.avatar)} ${escapeV5(item.from.name)} pays ${escapeV5(item.to.avatar)} ${escapeV5(item.to.name)} <strong>${formatGroupMoney(item.amount, currency)}</strong></p>`).join("") : "<p>Everyone is settled.</p>"}</div></section>
    <section class="panel"><div class="panel-title-row"><h3>Shared-cost ledger</h3><button class="button button--small" type="button" data-export-group>Export</button></div>${V5.group.expenses.length ? [...V5.group.expenses].reverse().map(groupExpenseRow).join("") : `<div class="empty-state">No group costs yet.</div>`}</section>`;
  bindGroupBudget(panel);
}

function bindGroupBudget(panel) {
  panel.querySelectorAll("[data-travel-as]").forEach((button) => button.addEventListener("click", () => { V5.group.activeTravellerId = button.dataset.travelAs; persistGroup(); renderGroupBudget(panel); }));
  panel.querySelector("#traveller-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    V5.group.travellers.push({ id: `traveller-${Date.now()}`, name: String(data.name).trim(), avatar: data.avatar || "🧭" });
    persistGroup(); renderGroupBudget(panel);
  });
  const form = panel.querySelector("#group-expense-form");
  form?.elements.splitType.addEventListener("change", () => { const personal = form.elements.splitType.value === "personal"; panel.querySelector(".personal-beneficiary").hidden = !personal; panel.querySelector(".split-people").hidden = personal; });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const splitType = String(data.get("splitType"));
    let participants = splitType === "personal" ? [String(data.get("beneficiary"))] : data.getAll("participants").map(String);
    if (!participants.length) participants = [String(data.get("paidBy"))];
    V5.group.expenses.push({ id: `group-expense-${Date.now()}`, createdAt: new Date().toISOString(), description: String(data.get("description") || "Group expense"), amount: Number(data.get("amount") || 0), currency: V5.trip.currency || "CLP", paidBy: String(data.get("paidBy")), participants, splitType, createdBy: V5.group.activeTravellerId });
    persistGroup(); renderGroupBudget(panel);
  });
  panel.querySelectorAll("[data-delete-group-expense]").forEach((button) => button.addEventListener("click", () => { V5.group.expenses = V5.group.expenses.filter((expense) => expense.id !== button.dataset.deleteGroupExpense); persistGroup(); renderGroupBudget(panel); }));
  panel.querySelector("[data-new-group]")?.addEventListener("click", () => { const name = prompt("Name the new travel group", "New trip group"); if (!name) return; V5.group = normaliseGroup({ name, travellers: [{ id: `traveller-${Date.now()}`, name: "You", avatar: "🧭" }], expenses: [] }); persistGroup(); renderGroupBudget(panel); });
  panel.querySelector("[data-export-group]")?.addEventListener("click", exportGroupData);
}

function enhanceTrip() {
  const tripView = document.querySelector("#view-trip");
  if (!tripView) return;
  compactTripChecklists(tripView);
  renderPracticalEssentials(tripView);
  if (!tripView.querySelector(".prototype-next-step")) {
    const dataPanel = [...tripView.querySelectorAll(".panel")].find((panel) => panel.textContent.includes("Your data and offline access"));
    if (dataPanel) dataPanel.insertAdjacentHTML("beforebegin", `<section class="panel prototype-next-step"><p class="section-label">Customer journey</p><h3>See how this companion is created</h3><p>Request, preview, review, approve and receive a journey.</p><div class="panel-actions"><a class="button button--primary" href="./flow.html">Open product-flow prototype</a><button class="button button--yellow" type="button" data-v5-change>Request an itinerary change</button></div></section>`);
    tripView.querySelector(".prototype-next-step [data-v5-change]")?.addEventListener("click", () => openChangeDialog());
  }
}

function compactTripChecklists(tripView) {
  [...tripView.querySelectorAll(".trip-grid > .panel")].forEach((panel) => {
    const heading = panel.querySelector(":scope > h3");
    if (!heading || panel.dataset.compactChecklist || !/Preparation checklist|Packing essentials/i.test(heading.textContent)) return;
    panel.dataset.compactChecklist = "true";
    const label = heading.textContent.trim();
    const count = panel.querySelectorAll("input[type=checkbox]").length;
    const completed = panel.querySelectorAll("input[type=checkbox]:checked").length;
    const details = document.createElement("details");
    details.className = "compact-checklist";
    details.innerHTML = `<summary><span><strong>${escapeV5(label)}</strong><small>${completed} of ${count} complete</small></span><span>Open</span></summary><div class="compact-checklist__body"></div>`;
    const body = details.querySelector(".compact-checklist__body");
    [...panel.children].filter((child) => child !== heading).forEach((child) => body.append(child));
    panel.replaceChildren(details);
  });
}

function renderPracticalEssentials(tripView) {
  if (tripView.querySelector(".travel-essentials")) return;
  const practicalHeading = [...tripView.querySelectorAll(".section-heading")].find((heading) => heading.textContent.includes("Practical information"));
  if (!practicalHeading) return;
  practicalHeading.hidden = true;
  let next = practicalHeading.nextElementSibling;
  while (next && next.classList.contains("panel")) { next.hidden = true; next = next.nextElementSibling; }
  const details = V5.trip.practicalDetails || {};
  const affiliate = readJson(AFFILIATE_KEY, {});
  const wiseUrl = affiliate.Wise || details.wisePartnerUrl || "https://wise.com/gb/affiliate-program/";
  const section = document.createElement("section");
  section.className = "travel-essentials";
  section.innerHTML = `<div class="section-heading"><div><p class="section-label">Before and during travel</p><h2>Travel essentials</h2><p>Explicit information to verify and save offline.</p></div></div><div class="essentials-grid"><article class="panel essential-card"><span class="essential-icon">🛂</span><h3>Visa and entry</h3><strong>${escapeV5(details.visa?.status || "Check entry requirements")}</strong><p>${escapeV5(details.visa?.detail || "Rules depend on passport type.")}</p><a class="card-link" href="${escapeAttrV5(details.visa?.sourceUrl || details.travelAdviceUrl || "#")}" target="_blank" rel="noopener noreferrer">Check official rules ↗</a></article><article class="panel essential-card"><span class="essential-icon">💱</span><h3>Currency</h3><strong>${escapeV5(details.currency?.code || V5.trip.currency)} · ${escapeV5(details.currency?.name || "")}</strong><p>${escapeV5(details.currency?.detail || "Carry more than one payment method.")}</p></article><article class="panel essential-card emergency-card"><span class="essential-icon">🆘</span><h3>Emergency numbers</h3>${(details.emergency || []).map((item) => `<a href="tel:${escapeAttrV5(item.number)}"><span>${escapeV5(item.label)}</span><strong>${escapeV5(item.number)}</strong></a>`).join("")}<a class="card-link" href="${escapeAttrV5(details.travelAdviceUrl || "#")}" target="_blank" rel="noopener noreferrer">Official travel advice ↗</a></article><article class="panel essential-card cash-card"><span class="essential-icon">💳</span><h3>Cash and travel money</h3><p>Carry a small CLP reserve and keep a second payment method separate.</p><a class="button button--yellow" href="${escapeAttrV5(wiseUrl)}" target="_blank" rel="sponsored noopener noreferrer">Open Wise</a><details><summary>Set Wise affiliate link</summary><form id="wise-affiliate-form"><input name="Wise" type="url" value="${escapeAttrV5(affiliate.Wise || "")}" placeholder="Paste approved tracking link"><button class="button button--small" type="submit">Save</button></form></details><small>Less Visited may earn a commission from an approved tracking link.</small></article><article class="panel essential-card insurance-card"><span class="essential-icon">📄</span><h3>Travel insurance</h3><p>Add the policy PDF to this device for offline access.</p><label class="button button--primary" for="insurance-pdf">Add insurance PDF</label><input id="insurance-pdf" type="file" accept="application/pdf,.pdf" hidden><div id="insurance-document"></div></article></div>`;
  practicalHeading.insertAdjacentElement("afterend", section);
  section.querySelector("#wise-affiliate-form")?.addEventListener("submit", (event) => { event.preventDefault(); const values = readJson(AFFILIATE_KEY, {}); values.Wise = String(new FormData(event.currentTarget).get("Wise") || ""); localStorage.setItem(AFFILIATE_KEY, JSON.stringify(values)); });
  section.querySelector("#insurance-pdf")?.addEventListener("change", async (event) => { const file = event.currentTarget.files?.[0]; if (!file) return; if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return alert("Please choose a PDF file."); await putInsuranceDocument(file); await renderInsuranceDocument(section); });
  renderInsuranceDocument(section).catch(console.error);
}

function installProductLink() {
  const actions = document.querySelector(".header-actions");
  if (!actions || actions.querySelector(".product-flow-link")) return;
  const link = document.createElement("a");
  link.className = "product-flow-link";
  link.href = "./flow.html";
  link.textContent = "How it works";
  actions.prepend(link);
}

function installMoreMenu() {
  const button = document.querySelector(".nav-more");
  if (!button || document.querySelector("#more-menu")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "more-menu";
  dialog.className = "more-menu";
  dialog.innerHTML = `<div class="dialog-heading"><div><p class="section-label">More</p><h2>Journey tools</h2></div><button class="icon-button" type="button" data-close-more>×</button></div><div class="more-menu__grid"><button type="button" data-open-view="saved"><strong>♡ Saved</strong><span>Your shortlist, notes and substitutions</span></button><button type="button" data-open-view="trip"><strong>▣ Trip details</strong><span>Bookings, checklists and practical information</span></button><a href="./flow.html"><strong>→ Product flow</strong><span>How the journey is created</span></a></div>`;
  document.body.append(dialog);
  button.addEventListener("click", () => dialog.showModal());
  dialog.querySelector("[data-close-more]")?.addEventListener("click", () => dialog.close());
  dialog.querySelectorAll("[data-open-view]").forEach((item) => item.addEventListener("click", () => { V5.ctx.showView(item.dataset.openView, true); dialog.close(); }));
}

function installChangeDialog() {
  if (document.querySelector("#change-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "change-dialog";
  dialog.className = "change-dialog";
  dialog.innerHTML = `<form id="change-request-form"><div class="dialog-heading"><div><p class="section-label">Journey revision</p><h2>Request a change</h2></div><button class="icon-button" type="button" data-close-change>×</button></div><input type="hidden" name="activityId"><label>Journey section<input name="section" placeholder="Whole journey, Day 2, accommodation…"></label><label>Reason<select name="reason"><option>Pace or energy</option><option>Budget</option><option>Food or dietary needs</option><option>Mobility or accessibility</option><option>Interests</option><option>Booking or timing conflict</option><option>Other</option></select></label><label>What should change?<textarea name="details" rows="5" required></textarea></label><label>What must stay?<input name="keep" placeholder="Optional"></label><div class="panel-actions"><button class="button button--yellow" type="submit">Prepare request</button><button class="button" type="button" data-close-change>Cancel</button></div><p class="change-result"></p></form>`;
  document.body.append(dialog);
  dialog.querySelectorAll("[data-close-change]").forEach((button) => button.addEventListener("click", () => dialog.close()));
  dialog.querySelector("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const request = { requestId: `CR-${Date.now()}`, createdAt: new Date().toISOString(), journeyId: V5.trip.journeyId, journeyVersion: V5.trip.journeyVersion || 1, ...data, status: "drafted" };
    const requests = readJson(CHANGE_KEY, []); requests.push(request); localStorage.setItem(CHANGE_KEY, JSON.stringify(requests)); localStorage.setItem(APPROVAL_KEY, JSON.stringify({ status: "changes_requested", updatedAt: request.createdAt }));
    event.currentTarget.querySelector(".change-result").textContent = "Saved on this device. Your email app will open with the request prepared.";
    const body = `Journey: ${V5.trip.tripTitle}\nSection: ${request.section}\nReason: ${request.reason}\n\nRequested change:\n${request.details}\n\nPlease keep:\n${request.keep || "No additional requirement"}`;
    setTimeout(() => { location.href = `mailto:?subject=${encodeURIComponent(`Journey change request — ${V5.trip.journeyId}`)}&body=${encodeURIComponent(body)}`; }, 200);
  });
}

function openChangeDialog(activity = null) {
  const dialog = document.querySelector("#change-dialog");
  const form = dialog?.querySelector("form");
  if (!dialog || !form) return;
  form.reset(); form.elements.activityId.value = activity?.id || ""; form.elements.section.value = activity ? activity.title : "Whole journey"; dialog.showModal(); form.elements.details.focus();
}

function verificationHtml(activity) {
  return `<details class="verification-box"><summary><span>✓ Checked by Less Visited</span><span>${escapeV5(verificationLabel(activity.verificationStatus))}</span></summary><div class="verification-box__body"><dl><div><dt>Status</dt><dd>${escapeV5(verificationLabel(activity.verificationStatus))}</dd></div><div><dt>Checked</dt><dd>${escapeV5(formatDateV5(activity.verifiedAt || V5.trip.lastReviewedAt))}</dd></div>${activity.verificationSource ? `<div><dt>Source</dt><dd>${escapeV5(activity.verificationSource)}</dd></div>` : ""}${activity.recheck ? `<div><dt>Recheck</dt><dd>${escapeV5(activity.recheck)}</dd></div>` : ""}</dl>${activity.verificationUrl ? `<a class="card-link" href="${escapeAttrV5(activity.verificationUrl)}" target="_blank" rel="noopener noreferrer">Open official source ↗</a>` : ""}</div></details>`;
}

function placeById(id) { return (V5.trip.places || []).find((place) => place.id === id); }
function placeByName(name) { return (V5.trip.places || []).find((place) => place.name === name); }
function placeImage(place) { return place.imageUrl || (String(place.neighbourhood || place.destination).toLowerCase().includes("valpara") ? "./assets/place-art/valparaiso.svg" : "./assets/place-art/lastarria.svg"); }
function liveHoursFor(placeId, fallback) { const synced = V5.live.openingHours?.[placeId]; const hours = synced?.hours || fallback || "Check official source"; const status = openingStatus(hours); return { hours, status: status.state, label: status.label }; }

function openingStatus(hours) {
  if (!hours || /check/i.test(hours)) return { state: "unknown", label: "Check hours" };
  if (hours.trim() === "24/7") return { state: "open", label: "Open 24 hours" };
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: V5.trip.timezone || "UTC", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const day = ({ Sun: "Su", Mon: "Mo", Tue: "Tu", Wed: "We", Thu: "Th", Fri: "Fr", Sat: "Sa" })[parts.find((part) => part.type === "weekday")?.value] || "Mo";
  const minutes = Number(parts.find((part) => part.type === "hour")?.value || 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value || 0);
  let matched = false;
  for (const section of hours.split(";").map((item) => item.trim())) {
    const [daysToken, ...timeParts] = section.split(/\s+/);
    if (!daysToken || !timeParts.length || !daysToken.split(",").some((token) => dayTokenIncludes(token, day))) continue;
    matched = true;
    const timeText = timeParts.join(" ");
    if (/off|closed/i.test(timeText)) return { state: "closed", label: "Closed now" };
    for (const interval of timeText.split(",")) {
      const match = interval.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
      if (!match) continue;
      const start = Number(match[1]) * 60 + Number(match[2]); const end = Number(match[3]) * 60 + Number(match[4]);
      if (minutes >= start && minutes < end) return { state: "open", label: `Open now · until ${match[3]}:${match[4]}` };
    }
  }
  return matched ? { state: "closed", label: "Closed now" } : { state: "unknown", label: "Hours available" };
}

function dayTokenIncludes(token, day) {
  const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  if (token.includes("-")) { const [start, end] = token.split("-"); const si = days.indexOf(start); const ei = days.indexOf(end); const di = days.indexOf(day); return si <= ei ? di >= si && di <= ei : di >= si || di <= ei; }
  return token === day;
}

function weatherForDate(date, locationName) {
  const id = String(locationName).toLowerCase().includes("valpara") ? "valparaiso" : "santiago";
  const item = V5.live.weather?.[id];
  const index = item?.daily?.time?.indexOf(date) ?? -1;
  if (index < 0) return null;
  return `${weatherLabel(item.daily.weather_code[index])} · ${Math.round(item.daily.temperature_2m_min[index])}–${Math.round(item.daily.temperature_2m_max[index])}° · rain ${item.daily.precipitation_probability_max[index]}%`;
}

function weatherForecastLine(item) { const max = item.daily?.temperature_2m_max?.[0]; const min = item.daily?.temperature_2m_min?.[0]; const rain = item.daily?.precipitation_probability_max?.[0]; return Number.isFinite(max) ? `Today ${Math.round(min)}–${Math.round(max)}° · rain ${rain ?? 0}%` : "Forecast saved"; }
function weatherLabel(code) { return ({ 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy", 45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 80: "Rain showers", 81: "Rain showers", 82: "Heavy showers", 95: "Thunderstorms" })[code] || "Mixed weather"; }

function normaliseGroup(group) { const fallback = { name: `${V5.trip?.destination || "Trip"} group`, travellers: [{ id: "traveller-me", name: "You", avatar: "🧭" }], expenses: [] }; const value = group && Array.isArray(group.travellers) && group.travellers.length ? group : fallback; return { name: value.name || fallback.name, travellers: value.travellers, activeTravellerId: value.activeTravellerId || value.travellers[0].id, expenses: Array.isArray(value.expenses) ? value.expenses : [] }; }
function persistGroup() { localStorage.setItem(GROUP_KEY, JSON.stringify(V5.group)); }
function travellerById(id) { return V5.group.travellers.find((traveller) => traveller.id === id); }
function calculateBalances() { const balances = Object.fromEntries(V5.group.travellers.map((traveller) => [traveller.id, 0])); for (const expense of V5.group.expenses) { const amount = Number(expense.amount || 0); balances[expense.paidBy] = (balances[expense.paidBy] || 0) + amount; const participants = expense.participants?.length ? expense.participants : [expense.paidBy]; const share = amount / participants.length; participants.forEach((id) => { balances[id] = (balances[id] || 0) - share; }); } return balances; }
function settlementSuggestions(balances) { const creditors = Object.entries(balances).filter(([, amount]) => amount > .01).map(([id, amount]) => ({ id, amount })); const debtors = Object.entries(balances).filter(([, amount]) => amount < -.01).map(([id, amount]) => ({ id, amount: -amount })); const result = []; let ci = 0; let di = 0; while (ci < creditors.length && di < debtors.length) { const amount = Math.min(creditors[ci].amount, debtors[di].amount); result.push({ from: travellerById(debtors[di].id), to: travellerById(creditors[ci].id), amount }); creditors[ci].amount -= amount; debtors[di].amount -= amount; if (creditors[ci].amount < .01) ci++; if (debtors[di].amount < .01) di++; } return result; }
function groupExpenseRow(expense) { const payer = travellerById(expense.paidBy); const participants = expense.participants.map((id) => travellerById(id)).filter(Boolean); return `<div class="group-expense-row"><span class="group-expense-avatar">${escapeV5(payer?.avatar || "💸")}</span><div><strong>${escapeV5(expense.description)}</strong><small>${escapeV5(payer?.name || "Traveller")} paid · ${expense.splitType === "personal" ? `for ${escapeV5(participants[0]?.name || "one traveller")}` : `split between ${participants.length}`}</small></div><b>${formatGroupMoney(expense.amount, expense.currency)}</b><button class="icon-button" type="button" data-delete-group-expense="${escapeAttrV5(expense.id)}">Delete</button></div>`; }
function exportGroupData() { downloadJsonV5(`${slugV5(V5.group.name)}-group-costs.json`, { exportedAt: new Date().toISOString(), journeyId: V5.trip.journeyId, group: V5.group }); }
function formatGroupMoney(amount, currency) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "CLP", maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(Number(amount || 0)); }

async function renderInsuranceDocument(section) { const container = section.querySelector("#insurance-document"); if (!container) return; const record = await getInsuranceDocument(); if (!record) { container.innerHTML = `<p class="document-empty">No insurance PDF stored on this device.</p>`; return; } container.innerHTML = `<div class="document-row"><span>📎</span><div><strong>${escapeV5(record.name)}</strong><small>${formatBytes(record.size)} · saved ${escapeV5(formatDateTimeV5(record.updatedAt))}</small></div><button class="button button--small" type="button" data-open-insurance>Open</button><button class="icon-button" type="button" data-delete-insurance>Delete</button></div>`; container.querySelector("[data-open-insurance]")?.addEventListener("click", () => { const url = URL.createObjectURL(record.blob); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60000); }); container.querySelector("[data-delete-insurance]")?.addEventListener("click", async () => { await deleteInsuranceDocument(); await renderInsuranceDocument(section); }); }
function openDocumentDb() { return new Promise((resolve, reject) => { const request = indexedDB.open(DOC_DB, 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(DOC_STORE)) request.result.createObjectStore(DOC_STORE, { keyPath: "id" }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function putInsuranceDocument(file) { const db = await openDocumentDb(); return new Promise((resolve, reject) => { const transaction = db.transaction(DOC_STORE, "readwrite"); transaction.objectStore(DOC_STORE).put({ id: `insurance:${tripId}`, name: file.name, type: file.type, size: file.size, updatedAt: new Date().toISOString(), blob: file }); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); }); }
async function getInsuranceDocument() { const db = await openDocumentDb(); return new Promise((resolve, reject) => { const request = db.transaction(DOC_STORE, "readonly").objectStore(DOC_STORE).get(`insurance:${tripId}`); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); }); }
async function deleteInsuranceDocument() { const db = await openDocumentDb(); return new Promise((resolve, reject) => { const transaction = db.transaction(DOC_STORE, "readwrite"); transaction.objectStore(DOC_STORE).delete(`insurance:${tripId}`); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); }); }

function placeBounds(places) { const lats = places.map((place) => place.latitude); const lons = places.map((place) => place.longitude); return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLon: Math.min(...lons), maxLon: Math.max(...lons) }; }
function projectPlace(place, bounds) { const x = 55 + ((place.longitude - bounds.minLon) / Math.max(.0001, bounds.maxLon - bounds.minLon)) * 790; const y = 445 - ((place.latitude - bounds.minLat) / Math.max(.0001, bounds.maxLat - bounds.minLat)) * 390; return { x: Math.round(x), y: Math.round(y) }; }
function distanceKm(lat1, lon1, lat2, lon2) { const r = 6371; const p1 = lat1 * Math.PI / 180; const p2 = lat2 * Math.PI / 180; const dp = (lat2 - lat1) * Math.PI / 180; const dl = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2; return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
function nameScore(a, b) { const one = normaliseName(a); const two = normaliseName(b); if (!one || !two) return 0; if (one === two) return 10; const words = one.split(" "); return words.filter((word) => word.length > 3 && two.includes(word)).length; }
function normaliseName(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function fetchWithTimeout(url, options = {}, timeout = 8000) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout); return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer)); }
function setBusy(button, busy, text) { if (!button) return; button.disabled = busy; button.textContent = text; }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function downloadJsonV5(filename, data) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
function formatBytes(bytes) { if (!Number.isFinite(bytes)) return ""; if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; }
function formatDateV5(value) { if (!value) return "Not recorded"; return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`)); }
function formatDateTimeV5(value) { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function statusLabel(status) { return ({ draft: "Draft in review", reviewed: "Reviewed journey", awaiting_approval: "Awaiting your approval", approved: "Approved", changes_requested: "Changes requested" })[status] || "Reviewed journey"; }
function verificationLabel(status) { return ({ confirmed: "Confirmed from official source", reviewed: "Editorially reviewed", recheck: "Recheck near travel date", weather: "Weather dependent", booking: "Booking required" })[status] || "Reviewed"; }
function slugV5(value) { return String(value || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function escapeCssUrl(value) { return String(value || "").replace(/["'()\\]/g, ""); }
function escapeAttrV5(value) { return escapeV5(value); }
function escapeV5(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
