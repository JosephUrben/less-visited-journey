const enhancementState = {
  trip: null,
  tripId: window.LESS_VISITED_BOOTSTRAP?.tripId || new URLSearchParams(location.search).get("trip") || "default",
  observer: null
};

initEnhancements().catch((error) => console.error("Less Visited enhancements failed", error));

async function initEnhancements() {
  enhancementState.trip = await fetchJourney();
  await waitFor(() => document.querySelector("#view-home .trip-hero"));
  installProductLink();
  installMoreMenu();
  installChangeDialog();
  applyEnhancements();
  enhancementState.observer = new MutationObserver(debounce(applyEnhancements, 80));
  enhancementState.observer.observe(document.querySelector("#main"), { childList: true, subtree: true });
  window.addEventListener("hashchange", updateMoreButton);
}

async function fetchJourney() {
  const tripId = enhancementState.tripId;
  const path = tripId === "default" ? "./data/trip.json" : `./data/journeys/${encodeURIComponent(tripId)}.json`;
  const response = await fetch(`${path}?fresh=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Enhancement journey data could not be loaded (${response.status}).`);
  return response.json();
}

function applyEnhancements() {
  enhanceHome();
  enhanceJourney();
  enhanceExplore();
  enhanceTrip();
  updateMoreButton();
}

function enhanceHome() {
  const home = document.querySelector("#view-home");
  const hero = home?.querySelector(".trip-hero");
  if (!hero || home.querySelector(".journey-status-card")) return;

  const trip = enhancementState.trip;
  const approval = getApproval();
  const status = approval?.status || trip.journeyStatus || "reviewed";
  const card = document.createElement("section");
  card.className = "panel journey-status-card";
  card.innerHTML = `
    <div class="status-card__top">
      <div>
        <p class="section-label">Journey status</p>
        <h2>${escapeHtml(statusLabel(status))}</h2>
      </div>
      <span class="review-badge review-badge--${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span>
    </div>
    <div class="status-meta-grid">
      <div><span>Prepared for</span><strong>${escapeHtml(trip.travellerName || "Traveller")}</strong></div>
      <div><span>Version</span><strong>${escapeHtml(String(trip.journeyVersion || 1))}</strong></div>
      <div><span>Last reviewed</span><strong>${escapeHtml(formatReviewedDate(trip.lastReviewedAt))}</strong></div>
      <div><span>Review</span><strong>${escapeHtml(trip.reviewedBy || "Less Visited")}</strong></div>
    </div>
    <p class="status-card__note">${escapeHtml(trip.verificationNote || "Recommendations are reviewed before publication; live operating details still need a final check near the travel date.")}</p>
    <div class="panel-actions">
      <button class="button button--green" type="button" data-approve-journey>${approval?.status === "approved" ? "Journey approved" : "Approve journey"}</button>
      <button class="button button--yellow" type="button" data-request-change>Request changes</button>
      <button class="button" type="button" data-check-update>Check for updates</button>
    </div>
    <p class="update-result" role="status" aria-live="polite"></p>`;

  hero.insertAdjacentElement("afterend", card);
  card.querySelector("[data-approve-journey]").addEventListener("click", approveJourney);
  card.querySelector("[data-request-change]").addEventListener("click", () => openChangeDialog());
  card.querySelector("[data-check-update]").addEventListener("click", checkForUpdates);
}

function enhanceJourney() {
  const items = [...document.querySelectorAll("#view-journey .timeline-item")];
  const activities = (enhancementState.trip.days || []).flatMap((day) =>
    (day.activities || []).map((activity) => ({ ...activity, dayId: day.id, dayDate: day.date }))
  );

  items.forEach((item, index) => {
    if (item.dataset.enhanced === "true") return;
    const activity = activities[index];
    if (!activity) return;
    item.dataset.enhanced = "true";

    const content = item.querySelector(".timeline-item__content");
    const actions = item.querySelector(".activity-actions");
    if (!content || !actions) return;

    if (activity.whySelected) {
      const why = document.createElement("div");
      why.className = "why-selected";
      why.innerHTML = `<strong>Why Less Visited chose this</strong><p>${escapeHtml(activity.whySelected)}</p>`;
      actions.insertAdjacentElement("beforebegin", why);
    }

    if (activity.verificationStatus || activity.verification) {
      const details = document.createElement("details");
      details.className = "verification-box";
      details.innerHTML = `
        <summary><span>✓ Checked by Less Visited</span><span>${escapeHtml(verificationLabel(activity.verificationStatus))}</span></summary>
        <div class="verification-box__body">
          <dl>
            <div><dt>Status</dt><dd>${escapeHtml(verificationLabel(activity.verificationStatus))}</dd></div>
            <div><dt>Checked</dt><dd>${escapeHtml(formatReviewedDate(activity.verifiedAt || enhancementState.trip.lastReviewedAt))}</dd></div>
            ${activity.verificationSource ? `<div><dt>Source</dt><dd>${escapeHtml(activity.verificationSource)}</dd></div>` : ""}
            ${activity.recheck ? `<div><dt>Recheck</dt><dd>${escapeHtml(activity.recheck)}</dd></div>` : ""}
          </dl>
          ${activity.verificationUrl ? `<a class="card-link" href="${escapeAttribute(activity.verificationUrl)}" target="_blank" rel="noopener noreferrer">Open official source ↗</a>` : ""}
        </div>`;
      actions.insertAdjacentElement("beforebegin", details);
    }

    const changeButton = document.createElement("button");
    changeButton.className = "icon-button";
    changeButton.type = "button";
    changeButton.innerHTML = "✎ Suggest a change";
    changeButton.addEventListener("click", () => openChangeDialog(activity));
    actions.append(changeButton);
  });
}

function enhanceExplore() {
  const cards = [...document.querySelectorAll("#view-explore .place-card")];
  const visiblePlaces = getVisibleExplorePlaces();

  cards.forEach((card, index) => {
    if (card.dataset.enhanced === "true") return;
    const title = card.querySelector(".place-card__title")?.textContent?.trim();
    const place = visiblePlaces.find((candidate) => candidate.name === title) || visiblePlaces[index];
    if (!place) return;
    card.dataset.enhanced = "true";
    const content = card.querySelector(".place-card__content");
    const actions = card.querySelector(".place-card__actions");
    if (!content || !actions) return;

    if (place.whySelected) {
      const why = document.createElement("p");
      why.className = "place-card__why";
      why.innerHTML = `<strong>Why selected:</strong> ${escapeHtml(place.whySelected)}`;
      actions.insertAdjacentElement("beforebegin", why);
    }

    const checked = document.createElement("span");
    checked.className = "verified-chip";
    checked.textContent = place.verificationStatus === "recheck" ? "Recheck before visit" : "Reviewed";
    card.querySelector(".place-card__topline")?.append(checked);
  });
}

function enhanceTrip() {
  const tripView = document.querySelector("#view-trip");
  if (!tripView || tripView.querySelector(".prototype-next-step")) return;
  const dataPanel = [...tripView.querySelectorAll(".panel")].find((panel) =>
    panel.textContent.includes("Your data and offline access")
  );
  if (!dataPanel) return;

  const panel = document.createElement("section");
  panel.className = "panel prototype-next-step";
  panel.innerHTML = `
    <p class="section-label">Customer journey</p>
    <h3>See how this companion is created</h3>
    <p>Walk through the request, intake, preview, approval and delivery stages that sit before this final travel companion.</p>
    <div class="panel-actions">
      <a class="button button--primary" href="./flow.html">Open product-flow prototype</a>
      <button class="button button--yellow" type="button" data-request-change>Request an itinerary change</button>
    </div>`;
  dataPanel.insertAdjacentElement("beforebegin", panel);
  panel.querySelector("[data-request-change]").addEventListener("click", () => openChangeDialog());
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
  dialog.innerHTML = `
    <div class="dialog-heading">
      <div><p class="section-label">More</p><h2>Journey tools</h2></div>
      <button class="icon-button" type="button" data-close-more aria-label="Close">×</button>
    </div>
    <div class="more-menu__grid">
      <button type="button" data-open-view="saved"><strong>♡ Saved</strong><span>Your shortlist, notes and substitutions</span></button>
      <button type="button" data-open-view="trip"><strong>▣ Trip details</strong><span>Bookings, checklists, practical information and data</span></button>
      <a href="./flow.html"><strong>→ Product flow</strong><span>Request, preview, approve and receive a journey</span></a>
    </div>`;
  document.body.append(dialog);
  button.addEventListener("click", () => dialog.showModal());
  dialog.querySelector("[data-close-more]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelectorAll("[data-open-view]").forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.dataset.openView;
      document.querySelector(`.nav-item[data-target="${target}"]`)?.click();
      dialog.close();
    });
  });
}

function updateMoreButton() {
  const button = document.querySelector(".nav-more");
  if (!button) return;
  const target = location.hash.replace("#", "");
  button.classList.toggle("is-active", target === "saved" || target === "trip");
}

function installChangeDialog() {
  if (document.querySelector("#change-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "change-dialog";
  dialog.className = "change-dialog";
  dialog.innerHTML = `
    <form method="dialog" id="change-request-form">
      <div class="dialog-heading">
        <div><p class="section-label">Journey revision</p><h2>Request a change</h2></div>
        <button class="icon-button" type="button" data-close-change aria-label="Close">×</button>
      </div>
      <input type="hidden" name="activityId">
      <label>Journey section
        <input name="section" placeholder="Whole journey, Day 2, accommodation…">
      </label>
      <label>Reason
        <select name="reason">
          <option>Pace or energy</option>
          <option>Budget</option>
          <option>Food or dietary needs</option>
          <option>Mobility or accessibility</option>
          <option>Interests</option>
          <option>Booking or timing conflict</option>
          <option>Other</option>
        </select>
      </label>
      <label>What should change?
        <textarea name="details" rows="5" required placeholder="Tell Less Visited what is not quite right and what would work better."></textarea>
      </label>
      <label>What must stay?
        <input name="keep" placeholder="Optional: places, dates or priorities to preserve">
      </label>
      <p class="input-hint">Prototype behaviour: the request is saved on this device and opened as a ready-to-send email. A production version would submit this to the operations database.</p>
      <div class="panel-actions">
        <button class="button button--yellow" type="submit">Prepare request</button>
        <button class="button" type="button" data-close-change>Cancel</button>
      </div>
      <p class="change-result" role="status" aria-live="polite"></p>
    </form>`;
  document.body.append(dialog);
  dialog.querySelectorAll("[data-close-change]").forEach((button) => button.addEventListener("click", () => dialog.close()));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelector("form").addEventListener("submit", submitChangeRequest);
}

function openChangeDialog(activity = null) {
  const dialog = document.querySelector("#change-dialog");
  const form = dialog?.querySelector("form");
  if (!dialog || !form) return;
  form.reset();
  form.elements.activityId.value = activity?.id || "";
  form.elements.section.value = activity ? `${activity.dayDate || ""} — ${activity.title}` : "Whole journey";
  dialog.showModal();
  form.elements.details.focus();
}

function submitChangeRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const request = {
    requestId: `CR-${Date.now()}`,
    createdAt: new Date().toISOString(),
    journeyId: enhancementState.trip.journeyId,
    journeyVersion: enhancementState.trip.journeyVersion || 1,
    ...data,
    status: "drafted"
  };
  const key = `less-visited-change-requests:${enhancementState.tripId}`;
  const requests = JSON.parse(localStorage.getItem(key) || "[]");
  requests.push(request);
  localStorage.setItem(key, JSON.stringify(requests));
  localStorage.setItem(`less-visited-approval:${enhancementState.tripId}`, JSON.stringify({ status: "changes_requested", updatedAt: request.createdAt }));
  form.querySelector(".change-result").textContent = "Saved. Your email app will open with the request prepared.";
  const subject = `Journey change request — ${enhancementState.trip.journeyId}`;
  const body = [
    `Journey: ${enhancementState.trip.tripTitle}`,
    `Journey ID: ${enhancementState.trip.journeyId}`,
    `Version: ${enhancementState.trip.journeyVersion || 1}`,
    `Section: ${request.section}`,
    `Reason: ${request.reason}`,
    "",
    "Requested change:",
    request.details,
    "",
    "Please keep:",
    request.keep || "No additional requirement"
  ].join("\n");
  setTimeout(() => {
    location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.querySelector(".journey-status-card")?.remove();
    enhanceHome();
  }, 250);
}

function approveJourney() {
  const approval = { status: "approved", updatedAt: new Date().toISOString() };
  localStorage.setItem(`less-visited-approval:${enhancementState.tripId}`, JSON.stringify(approval));
  document.querySelector(".journey-status-card")?.remove();
  enhanceHome();
}

async function checkForUpdates(event) {
  const button = event.currentTarget;
  const result = button.closest(".journey-status-card")?.querySelector(".update-result");
  button.disabled = true;
  button.textContent = "Checking…";
  try {
    const fresh = await fetchJourney();
    const currentVersion = Number(enhancementState.trip.journeyVersion || 1);
    const freshVersion = Number(fresh.journeyVersion || 1);
    if (freshVersion > currentVersion) {
      result.textContent = `Version ${freshVersion} is available. Reloading the updated journey…`;
      setTimeout(() => location.reload(), 500);
    } else {
      result.textContent = `You have the latest published version (${freshVersion}). Checked ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
    }
  } catch {
    result.textContent = "The update check could not reach the published journey. Your offline copy is still available.";
  } finally {
    button.disabled = false;
    button.textContent = "Check for updates";
  }
}

function getApproval() {
  try {
    return JSON.parse(localStorage.getItem(`less-visited-approval:${enhancementState.tripId}`) || "null");
  } catch {
    return null;
  }
}

function getVisibleExplorePlaces() {
  const active = (enhancementState.trip.places || []).filter((place) => place.active !== false);
  const activeChip = document.querySelector("#view-explore .filter-chip.is-active")?.dataset.filter || "all";
  return activeChip === "all" ? active : active.filter((place) => (place.tags || []).includes(activeChip));
}

function statusLabel(status) {
  return ({
    draft: "Draft in review",
    reviewed: "Reviewed journey",
    awaiting_approval: "Awaiting your approval",
    approved: "Approved",
    changes_requested: "Changes requested"
  })[status] || "Reviewed journey";
}

function verificationLabel(status) {
  return ({
    confirmed: "Confirmed from official source",
    reviewed: "Editorially reviewed",
    recheck: "Recheck near travel date",
    weather: "Weather dependent",
    booking: "Booking required"
  })[status] || "Reviewed";
}

function formatReviewedDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function waitFor(test, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const result = test();
      if (result) return resolve(result);
      if (Date.now() - started > timeout) return reject(new Error("Timed out waiting for the companion interface."));
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
