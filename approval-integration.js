const approvalIntegration = {
  tripId: window.LESS_VISITED_BOOTSTRAP?.tripId || new URLSearchParams(location.search).get("trip") || "default",
  reviewerMode: ["1", "true", "review"].includes(new URLSearchParams(location.search).get("review")) || new URLSearchParams(location.search).get("mode") === "review",
  trip: null,
  busy: false
};

const REVIEW_WEBHOOK_KEY = "less-visited-review-webhook";
const REVIEWER_NAME_KEY = "less-visited-reviewer-name";

initApprovalIntegration().catch((error) => console.error("Less Visited approval integration failed", error));

async function initApprovalIntegration() {
  approvalIntegration.trip = await fetchApprovalJourney();
  if (approvalIntegration.reviewerMode) {
    document.body.classList.add("reviewer-mode");
    document.title = `Review ${approvalIntegration.trip?.journeyId || "journey"} — Less Visited`;
  }

  installApprovalEventInterceptors();
  applyApprovalMode();

  const observer = new MutationObserver(() => applyApprovalMode());
  observer.observe(document.body, { childList: true, subtree: true });
}

async function fetchApprovalJourney() {
  const path = approvalIntegration.tripId === "default"
    ? "./data/trip.json"
    : `./data/journeys/${encodeURIComponent(approvalIntegration.tripId)}.json`;
  const response = await fetch(`${path}?review=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Journey could not be loaded for approval (${response.status}).`);
  return response.json();
}

function installApprovalEventInterceptors() {
  document.addEventListener("click", async (event) => {
    const approveButton = event.target.closest("[data-approve-journey]");
    if (approveButton) {
      if (!approvalIntegration.reviewerMode) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      await submitReviewDecision("Approve as-is", "Approved in the Less Visited reviewer companion.", approveButton);
      return;
    }

    const connectButton = event.target.closest("[data-connect-review-endpoint]");
    if (connectButton) {
      event.preventDefault();
      configureReviewConnection();
      applyApprovalMode();
      return;
    }

    const clarificationButton = event.target.closest("[data-review-clarification]");
    if (clarificationButton) {
      event.preventDefault();
      const notes = prompt("What clarification do you need from the customer?");
      if (notes?.trim()) await submitReviewDecision("Customer clarification", notes.trim(), clarificationButton);
      return;
    }

    const rejectButton = event.target.closest("[data-review-reject]");
    if (rejectButton) {
      event.preventDefault();
      const notes = prompt("Why is this draft being rejected?");
      if (notes?.trim()) await submitReviewDecision("Reject", notes.trim(), rejectButton);
    }
  }, true);

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("#change-request-form");
    if (!form || !approvalIntegration.reviewerMode) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const data = Object.fromEntries(new FormData(form));
    const notes = [
      `Section: ${data.section || "Whole journey"}`,
      `Reason: ${data.reason || "Reviewer change"}`,
      "",
      data.details || "",
      "",
      `Must stay: ${data.keep || "No additional requirement"}`
    ].join("\n");

    const button = form.querySelector("button[type=submit]");
    const sent = await submitReviewDecision("Regenerate", notes, button);
    if (sent) {
      form.querySelector(".change-result").textContent = "Change request sent to Make. The journey remains in human review.";
      setTimeout(() => form.closest("dialog")?.close(), 900);
    }
  }, true);
}

function applyApprovalMode() {
  const card = document.querySelector(".journey-status-card");
  if (!card) return;

  const approveButton = card.querySelector("[data-approve-journey]");
  const changeButton = card.querySelector("[data-request-change]");

  if (!approvalIntegration.reviewerMode) {
    approveButton?.setAttribute("hidden", "");
    if (changeButton) changeButton.textContent = "Request an itinerary change";
    card.querySelector(".reviewer-panel")?.remove();
    return;
  }

  approveButton?.removeAttribute("hidden");
  if (approveButton && !approveButton.dataset.reviewLabelApplied) {
    approveButton.textContent = "Approve and send to customer";
    approveButton.dataset.reviewLabelApplied = "true";
  }
  if (changeButton) changeButton.textContent = "Request regeneration";

  if (card.querySelector(".reviewer-panel")) return;

  const connected = Boolean(localStorage.getItem(REVIEW_WEBHOOK_KEY));
  const reviewerName = localStorage.getItem(REVIEWER_NAME_KEY) || "Reviewer";
  const panel = document.createElement("section");
  panel.className = "reviewer-panel";
  panel.innerHTML = `
    <div>
      <p class="section-label">Internal reviewer mode</p>
      <strong>${escapeReviewHtml(reviewerName)}</strong>
      <p>This decision will be sent to Make. Customers do not see these controls.</p>
    </div>
    <div class="reviewer-panel__actions">
      <button class="button button--small" type="button" data-connect-review-endpoint>${connected ? "Make connected on this device" : "Connect Make approval"}</button>
      <button class="button button--small" type="button" data-review-clarification>Ask customer</button>
      <button class="button button--small reviewer-danger" type="button" data-review-reject>Reject</button>
    </div>
    <p class="reviewer-submit-status" role="status" aria-live="polite"></p>`;
  card.querySelector(".status-card__top")?.insertAdjacentElement("afterend", panel);
}

function configureReviewConnection() {
  const currentEndpoint = localStorage.getItem(REVIEW_WEBHOOK_KEY) || "";
  const endpoint = prompt("Paste the Make custom webhook URL used by the Less Visited scenario:", currentEndpoint);
  if (endpoint === null) return;

  const cleanEndpoint = endpoint.trim();
  if (!cleanEndpoint) {
    localStorage.removeItem(REVIEW_WEBHOOK_KEY);
    localStorage.removeItem(REVIEWER_NAME_KEY);
    setReviewerStatus("Make approval connection removed.", "neutral");
    return;
  }

  if (!isValidWebhookUrl(cleanEndpoint)) {
    setReviewerStatus("That does not look like a valid HTTPS webhook URL.", "error");
    return;
  }

  const reviewerName = prompt("Reviewer name shown in this browser:", localStorage.getItem(REVIEWER_NAME_KEY) || "Joseph") || "Reviewer";
  localStorage.setItem(REVIEW_WEBHOOK_KEY, cleanEndpoint);
  localStorage.setItem(REVIEWER_NAME_KEY, reviewerName.trim() || "Reviewer");
  setReviewerStatus("Make approval connection saved on this device only.", "success");
}

async function submitReviewDecision(decision, reviewerNotes, button) {
  if (approvalIntegration.busy) return false;

  let endpoint = localStorage.getItem(REVIEW_WEBHOOK_KEY);
  if (!endpoint) {
    configureReviewConnection();
    endpoint = localStorage.getItem(REVIEW_WEBHOOK_KEY);
  }
  if (!endpoint) return false;

  approvalIntegration.busy = true;
  const originalText = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = "Sending…";
  }
  setReviewerStatus(`Sending ${decision.toLowerCase()} decision to Make…`, "neutral");

  const payload = {
    event_type: "REVIEW_DECISION",
    source: "less-visited-github-reviewer",
    journey_id: approvalIntegration.trip?.journeyId,
    public_trip_id: approvalIntegration.tripId,
    review_decision: decision,
    reviewer_notes: reviewerNotes || "",
    reviewer_name: localStorage.getItem(REVIEWER_NAME_KEY) || "Reviewer",
    journey_version: approvalIntegration.trip?.journeyVersion || 1,
    submitted_at: new Date().toISOString()
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Make returned HTTP ${response.status}`);

    const approvalStatus = decision.startsWith("Approve") ? "approved" : decision === "Reject" ? "rejected" : "changes_requested";
    localStorage.setItem(`less-visited-approval:${approvalIntegration.tripId}`, JSON.stringify({
      status: approvalStatus,
      decision,
      updatedAt: payload.submitted_at,
      submittedToMake: true
    }));

    setReviewerStatus(decision.startsWith("Approve")
      ? "Approval sent. Make can now publish the final journey and email the customer."
      : `${decision} sent to Make.`, "success");

    if (button) button.textContent = decision.startsWith("Approve") ? "Approval sent" : "Sent";
    return true;
  } catch (error) {
    console.error("Approval submission failed", error);
    setReviewerStatus(`Could not reach Make: ${error.message}`, "error");
    if (button) button.textContent = originalText || "Try again";
    return false;
  } finally {
    approvalIntegration.busy = false;
    if (button) button.disabled = false;
  }
}

function setReviewerStatus(message, kind = "neutral") {
  const element = document.querySelector(".reviewer-submit-status");
  if (!element) return;
  element.textContent = message;
  element.dataset.kind = kind;
}

function isValidWebhookUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function escapeReviewHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}
