# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Less Visited — My Journey": a mobile-first, offline-capable PWA companion for reviewed travel itineraries, deployed to GitHub Pages. Plain HTML/CSS/vanilla JS with no package.json, no dependencies, no bundler and no test suite. The only tooling is two Node (22) scripts.

## Non-negotiable rules

1. Never commit an unapproved itinerary draft to this public repository. Only human-approved journeys are published here.
2. Publish only approved, non-sensitive JSON to the public repo.
3. Public random trip IDs are obscurity, not authentication. Never rely on them to protect data.
4. Never put API keys (OpenAI, GitHub, Google, Make webhooks) in JavaScript or any committed file.
5. Never put customer emails, private responses, passport details, medical history, full addresses, tokens or payment details in GitHub.
6. The approval dashboard must sit behind authentication before it handles a real customer.
7. Every itinerary item must reference a Publish_Ready record ID from the master database. Unreferenced venues fail validation.
8. Work on branches with small, verifiable commits. Run tests before merging.

## Commands

```bash
python -m http.server 8080          # preview source at http://localhost:8080 (service worker needs http, not file://)
node scripts/validate-journeys.mjs  # validate data/trip.json and data/journeys/*.json
node scripts/build-site.mjs         # build the deployable site into dist/
node --check <file>.js              # syntax check (CI runs this on each loaded source file)
```

To preview what actually ships, build and serve `dist/` (`cd dist && python -m http.server 8080`). CI (`.github/workflows/pages.yml`) runs syntax checks, journey validation and the build on every PR/push, and deploys `dist/` on pushes to `main`. It also fails if `dist/index.html` references any legacy script (see below).

## Architecture

### Source is not what ships — `build-site.mjs` patches it

`scripts/build-site.mjs` copies the repo (excluding `make/`, `schemas/`, `scripts/`, `.github/`) to `dist/`, then does **exact string replacements** on `dist/app.js`:
- scopes `STORAGE_KEY`/`TRIP_OVERRIDE_KEY` per `?trip=` id (v2 → v3 keys),
- replaces `renderAll()` with lazy per-view rendering (`renderView`) that dispatches `lessvisited:viewrendered`,
- replaces `showView()` to render lazily and dispatch `lessvisited:viewchange`,
- exposes `window.LESS_VISITED_APP_CONTEXT` and dispatches `lessvisited:ready` at the end of `init()`.

It throws if any target string is not found, so **editing `renderAll`, `showView`, the storage-key header or the end of `init()` in `app.js` will break the build** unless the matching strings in `build-site.mjs` are updated too. It also rewrites `?v=build` cache-busters in `index.html`/`flow.html` to the commit SHA and **regenerates `sw.js` entirely** (the root `sw.js` is only used for unbuilt local preview; its `CACHE_VERSION` must be bumped manually there). New core assets that must work offline go in the `APP_ASSETS` list inside `build-site.mjs`.

### Script load order (`index.html`)

1. `bootstrap.js` — resolves the trip id (`?trip=`, else last-used from localStorage), monkey-patches `Storage.prototype` to scope legacy keys per trip, sets `window.LESS_VISITED_BOOTSTRAP`.
2. `journey-data-patch.js`, `journey-v4-patch.js` — runtime data patches that enrich the demo JRN-0001 / Chile journey (extra fields, coordinates, opening hours, place art).
3. `app.js` (module) — core app: loads trip JSON, validates, renders the seven views (home, journey, explore, map, saved, budget, trip) into the `<section data-view>` shells, handles hash navigation, install prompt and SW registration.
4. `product-v5.js` (module) — product layer that waits for `lessvisited:ready`, then "enhances" views after each render/view change (more menu, change requests, approval, group costs, live data, documents in IndexedDB). Uses its own per-trip localStorage keys.

Communication between `app.js` and `product-v5.js` is only via the shared context object and the `lessvisited:*` window events — which exist only in the built `dist/app.js`. Previewing the unbuilt source therefore lacks lazy rendering and the product-v5 layer may time out waiting for context; test v5 features against a `dist/` build.

**Legacy files** not loaded by `index.html` and kept only for history: `product-v4.*`, `enhancements.*`, `approval-integration.*`, `navigation-recovery.js`, `group-currency-guard.js`. Don't add them back to `index.html` (CI rejects it).

Other pages: `flow.html` (clickable product-flow demo), `starter.html` (post-payment "being prepared" page, self-contained styles), `404.html`.

### Journey data

- Default journey: `data/trip.json`; others: `data/journeys/<ID>.json`, loaded via `?trip=<ID>` (`[A-Za-z0-9_-]+` only).
- `TRIP-SCHEMA.md` documents the format (schemaVersion 2). `scripts/validate-journeys.mjs` is the enforced check: required fields, ISO dates/times, activity types (`fixed|suggested|optional|food|task`), and a blocklist of sensitive keys (passport, DOB, medical, payment) — the repo and site are public.
- `schemas/*.schema.json` are JSON Schemas for the external AI generation pipeline, not used by the validator.

### External automation (docs only, not code)

`make/` and `tally/` describe the Tally → Stripe → Make → OpenAI → GitHub (`data/journeys/`) → Gmail pipeline that publishes customer journeys into this repo. Customer-facing trip ids should be random/unguessable (e.g. `LV-…`), not sequential `JRN-…` ids. `AI-TRIP-PROMPT.md` and `make/OPENAI-*.md` are the generation prompts.

## Constraints

Deliberate MVP limits (from README): no accounts, sync, live AI, payments or sensitive document storage; all user state (saved places, notes, budget ledger, checklists) stays in the browser's localStorage/IndexedDB, scoped per trip id.
