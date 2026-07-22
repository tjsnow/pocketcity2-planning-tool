# Roadmap

This roadmap describes delivery order, not fixed dates. A phase is complete when its exit criteria are met and its decisions are captured in `DeveloperLog.md`.

## Phase 0 — Foundation

- Establish repository conventions, TypeScript build, static deployment configuration, and documentation.
- Define the plan JSON schema, catalog JSON schema, and version/migration policy.
- Add basic automated checks for types, formatting, and schema validation.

**Exit criteria:** A static placeholder can load a validated sample catalog and a sample plan without framework or backend dependencies.

## Phase 1 — Minimum viable editor

- Canvas grid, pan, zoom, coordinate display, and responsive layout.
- Create a new plan; select a catalog item; place, select, move, and remove placements.
- Local draft persistence and JSON export/import.
- Keyboard-accessible equivalents for core editing controls.

**Exit criteria:** A player can make and retain a small layout entirely offline, then exchange it as a JSON file.

## Phase 2 — Practical planning tools

- Multi-cell footprints, rotation rules, map layers, terrain/road annotations, and visual validation.
- Undo/redo, duplicate, marquee selection where justified, and plan metadata.
- Searchable/filterable catalog with clearly labeled data confidence.

**Exit criteria:** The editor can comfortably model a realistic district and indicate common placement conflicts.

## Phase 3 — Analysis and templates

- Configurable summaries (area, counts, categories, coverage assumptions).
- Saved templates and repeatable layout snippets.
- Optional import/export compatibility upgrades and migration UI.

**Exit criteria:** Users can compare plans and reuse a district without manually rebuilding it.

## Phase 4 — Quality and community data

- Performance profiling against published plan-size budgets.
- Accessibility audit, mobile interaction refinement, localization readiness.
- Curated catalog workflow, changelog discipline, and data provenance review.

**Exit criteria:** The application is dependable for long-lived personal plans and data updates do not invalidate prior exports.

## Deferred unless a clear need emerges

- Framework adoption.
- Service worker/offline caching beyond normal browser caching.
- IndexedDB migration from simpler storage.
- Cloud sync, accounts, sharing links, or collaboration.

## Prioritization rule

Prioritize work that improves an offline player’s ability to create, revise, understand, or safely preserve a plan. Defer cosmetic complexity and speculative integrations until a real planning workflow demonstrates their value.
