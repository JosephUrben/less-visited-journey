# Less Visited — My Journey companion

A mobile-first, installable and offline-friendly customer companion for approved Less Visited journeys.

## MVP proposition

The public website helps a traveller choose or request a journey. This companion helps them use the final, reviewed journey. Its defining value is curation, context, route logic and practical alternatives—not generic travel utilities.

## Companion screens

- **Home:** before/during/after trip state, countdown or current plan, preparation and next actions.
- **Journey:** complete itinerary, route logic, travel times, activity types and alternatives.
- **Explore:** approved scheduled and unscheduled places with trip-relevant filters.
- **Map:** branded route overview with external Google Maps or My Maps links.
- **Saved:** local shortlist, personal notes and approved substitutions.
- **Budget:** natural-language expense entry, currencies, cost spreading, ledger, trail views and local CSV backup.
- **Trip:** accommodation, bookings, checklists, budget summary, practical and emergency information, notes and data controls.

## Budget tool

The Budget tab is an offline-first trip ledger inspired by the interaction principles demonstrated in the Second Breakfast case study, rebuilt independently in the Less Visited visual system. It includes:

- natural-language expense entry with a review step;
- local and home currencies, manually entered or optionally fetched exchange rates, with the rate locked to each expense;
- multi-night and multi-day cost spreading while the ledger preserves the original payment date;
- weekly, monthly, total-pot and record-only modes;
- daily, weekly and monthly trail charts;
- country, category and location breakdowns;
- a searchable/filterable ledger grouped by date or country;
- edit/delete, custom categories and learned category corrections;
- CSV export/import, backup reminders and local-only offline storage;
- light and dark modes.

The Trip dashboard shows current spend, remaining budget and shortcuts into the full Budget tab.

## Journey URLs

The default journey loads from `data/trip.json`.

Customer or reusable journeys can be stored in `data/journeys/` and opened with:

```text
https://josephurben.github.io/less-visited-journey/?trip=JRN-0001
```

The parameter accepts letters, numbers, hyphens and underscores only.

## Deliberate MVP limits

- No accounts, passwords or cross-device sync.
- No live AI, weather, opening hours or transport APIs.
- No payments or affiliate checkout inside the companion.
- No secure document, passport, medical or payment storage.
- No collaborative planning or photo storage.

Saved places, progress, checklists, substitutions and notes remain in the current browser. They can be exported from the Trip screen.

## Preview locally

Run a local server from the repository root:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`. A service worker will not work when `index.html` is opened directly as a file.

## Publish

GitHub Pages must use **GitHub Actions** as its source. Every push to `main` runs `.github/workflows/pages.yml`. Increase `CACHE_VERSION` in `sw.js` whenever core cached files change.

See `TRIP-SCHEMA.md` before publishing or automating a new journey JSON file.
