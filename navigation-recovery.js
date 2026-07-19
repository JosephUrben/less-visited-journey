(() => {
  const VALID_VIEWS = new Set(["home", "journey", "explore", "map", "saved", "budget", "trip"]);
  const VERSION = "2026-07-19-nav-hotfix-1";

  const style = document.createElement("style");
  style.dataset.navigationRecovery = VERSION;
  style.textContent = `
    .bottom-nav { z-index: 2147483000 !important; pointer-events: auto !important; touch-action: manipulation; }
    .bottom-nav button, .bottom-nav svg, .bottom-nav span { pointer-events: auto !important; }
    dialog:not([open]) { display: none !important; pointer-events: none !important; }
  `;
  document.head.append(style);

  function showView(target, updateHash = true) {
    if (!VALID_VIEWS.has(target)) return false;
    const destination = document.querySelector(`.view[data-view="${target}"]`);
    if (!destination) return false;

    document.querySelectorAll(".view[data-view]").forEach((view) => {
      view.classList.toggle("is-active", view === destination);
    });

    document.querySelectorAll(".nav-item[data-target]").forEach((item) => {
      const active = item.dataset.target === target;
      item.classList.toggle("is-active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });

    const more = document.querySelector(".nav-more");
    more?.classList.toggle("is-active", target === "saved" || target === "trip");

    if (updateHash) history.replaceState(null, "", `${location.pathname}${location.search}#${target}`);
    document.querySelectorAll("dialog[open]").forEach((dialog) => {
      try { dialog.close(); } catch { dialog.removeAttribute("open"); }
    });
    window.scrollTo({ top: 0, behavior: "auto" });
    destination.focus({ preventScroll: true });
    return true;
  }

  function handleNavigation(event) {
    const button = event.target.closest?.(".nav-item[data-target]");
    if (!button) return;
    const target = button.dataset.target;
    if (!VALID_VIEWS.has(target)) return;
    event.preventDefault();
    showView(target, true);
  }

  document.addEventListener("click", handleNavigation, true);
  window.addEventListener("hashchange", () => {
    const target = location.hash.slice(1);
    if (VALID_VIEWS.has(target)) showView(target, false);
  });

  window.addEventListener("pageshow", () => {
    document.querySelectorAll("dialog[open]").forEach((dialog) => {
      try { dialog.close(); } catch { dialog.removeAttribute("open"); }
    });
    const target = location.hash.slice(1);
    if (VALID_VIEWS.has(target)) showView(target, false);
  });

  window.LESS_VISITED_NAVIGATION_RECOVERY = { version: VERSION, showView };
})();
