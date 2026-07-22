# Developer Log

This log preserves concise architectural decisions, discoveries, and follow-up work. Add entries when a decision would otherwise need to be rediscovered. It complements `Changelog.md`: the changelog records what changed; this log records why.

## Entry template

```markdown
## YYYY-MM-DD — Short decision title

**Context:** What prompted the decision?

**Decision:** What was chosen?

**Consequences:** Benefits, trade-offs, and follow-up work.
```

## 2026-07-22 — Documentation-first initialization

**Context:** Pocket City Planner is beginning as a long-term project and needs durable boundaries before implementation.

**Decision:** Create the initial project documentation before any application source, build setup, or dependency selection.

**Consequences:** The first implementation task should validate these documents by creating the smallest static TypeScript/Canvas foundation. Do not treat the proposed folders as already implemented.

## 2026-07-22 — Browser-native architecture

**Context:** The planner must run client-side from static hosting without a backend and should minimize long-term maintenance overhead.

**Decision:** Use HTML5, CSS3, TypeScript, Canvas 2D, ES modules, and JSON data. Avoid React and other frameworks unless a documented need outweighs native browser APIs.

**Consequences:** DOM UI and Canvas rendering remain separate; no server-side data model or authentication layer is planned.

## 2026-07-22 — JSON as the portable plan format

**Context:** Users need control over long-lived plans without relying on hosted storage.

**Decision:** Make versioned JSON import/export a core persistence capability. Browser storage is a local convenience layer only.

**Consequences:** Schema validation and migrations are foundational work, and imports must fail without destroying the user’s original file.

## 2026-07-22 — Initial static project shell

**Context:** The project needs an implementation-ready layout without beginning feature work.

**Decision:** Add the requested top-level static asset directories, a minimal HTML entry point, one global stylesheet placeholder, and independent ES module placeholders for application composition, rendering, camera, grid, terrain, buildings, UI, and persistence.

**Consequences:** The modules establish ownership boundaries only; they intentionally contain no behavior, state, data loading, or UI implementation.

## 2026-07-22 — Desktop application shell

**Context:** The initial project structure needs a stable visual workspace before city-planning features are introduced.

**Decision:** Build the editor shell with nested CSS Grid layouts: a ribbon, toolbox, canvas panel, inspector, and status bar. Keep controls inert and limit JavaScript to accessible pointer/keyboard resizing of layout panels.

**Consequences:** Future modules can populate their assigned areas without changing the workspace layout. The canvas is present as a rendering surface but has no city data, drawing, or interaction behavior.

## 2026-07-22 — Isolated Canvas rendering engine

**Context:** The desktop shell needs a reliable rendering foundation before plan data or editing features are introduced.

**Decision:** Implement a standalone `Camera` class for world/screen coordinate conversion and a standalone `Renderer` class for Canvas context ownership, high-DPI resize handling, demand-driven drawing, and viewport pan/zoom input. The renderer currently draws only an empty background.

**Consequences:** Rendering remains independent from DOM UI modules. Future plan layers can use the camera transforms and add draw methods without taking ownership of UI state.

## 2026-07-22 — Foundation tooling

**Context:** Milestone 01 requires a repeatable, framework-free project foundation without rewriting the existing working browser modules.

**Decision:** Add npm metadata, a strict TypeScript configuration that includes the existing JavaScript modules without enabling disruptive JavaScript checking, repository ignore/editor conventions, and local static-server instructions.

**Consequences:** `npm run check` provides a stable validation entry point. Future TypeScript files are subject to strict compiler settings, while a deliberate migration path remains available for the existing JavaScript modules.

## 2026-07-22 — Camera-aware grid subsystem

**Context:** Milestone 03 needs a grid without coupling grid geometry to DOM UI or city-planning data.

**Decision:** Add a standalone `Grid` class that calculates visible world-space lines through the camera and draws neutral minor and major lines in the Canvas renderer.

**Consequences:** The grid follows pan, zoom, and resize automatically while remaining independent from terrain, buildings, and placements. Future plan dimensions can constrain or configure this generic grid without rewriting the renderer.

## 2026-07-22 — Neutral terrain data model

**Context:** Milestone 04 requires terrain handling, but no verified Pocket City terrain catalog is available yet.

**Decision:** Implement terrain as an immutable sparse map with caller-supplied terrain IDs, integer grid coordinates, and conversion to/from the documented `TerrainCell[]` JSON shape.

**Consequences:** Terrain data is safe to integrate into a future plan document without hard-coding unverified game data. Rendering and editing behavior remain deferred to their dedicated milestones.

## 2026-07-22 — Validated building source catalog

**Context:** Milestone 06 requires a building database, while verified Pocket City building records have not yet been added to the repository.

**Decision:** Use the supplied building schema as the source-record contract, add a validated read-only `BuildingDatabase`, and ship an intentionally empty versioned JSON catalog.

**Consequences:** Future catalog data can be loaded and validated without coupling it to the browser UI or placement rules. No unverified building names, dimensions, effects, or unlock conditions are presented to users.

## 2026-07-22 — Read-only building browser

**Context:** Milestone 07 needs a way to inspect the static building catalog before building selection and placement are introduced.

**Decision:** Add a small catalog-loading adapter and a DOM-only building browser with text/category filters. Building records are rendered as text nodes and never treated as HTML.

**Consequences:** The empty starter catalog produces a clear empty state. When verified data is added, users can browse it immediately without granting the browser placement or editing responsibilities.

## 2026-07-22 — Placement domain model

**Context:** Milestone 08 needs placement rules before a UI editor can safely create plan state.

**Decision:** Add an immutable `PlacementStore` that validates building references, grid-integer anchors, quarter-turn rotations, and collision-free same-layer footprints.

**Consequences:** Canvas and UI interactions can call one trusted placement boundary later. Grid-boundary checks remain separate until a plan document owns finite grid dimensions.

## 2026-07-22 — Read-only catalog inspector

**Context:** Milestone 09 needs an inspector that can show information without prematurely implementing placement editing.

**Decision:** Add a dedicated inspector view and allow the building browser to select one catalog card at a time. The inspector renders only validated building metadata as text.

**Consequences:** The right panel now has a concrete, accessible ownership boundary. Editing controls and placement-specific inspection remain deferred until their respective workflows exist.

## 2026-07-22 — Grid-aligned road network

**Context:** Milestone 10 needs a road representation without assuming unverified road catalog data or editor behavior.

**Decision:** Add an immutable road network of canonical unit horizontal/vertical segments with caller-supplied road types.

**Consequences:** Roads can later be rendered, edited, and persisted through a stable identity model. Route drawing and terrain interaction remain separate concerns.

## 2026-07-22 — Composable Canvas overlays

**Context:** Milestone 11 needs visual aids that do not become permanent renderer or UI dependencies.

**Decision:** Add an ordered overlay registry with validated draw callbacks and visibility state, exposed by the renderer.

**Consequences:** Future radius, heatmap, selection, and diagnostic visuals can register independently and redraw on demand without modifying the core grid/background render pass.

## 2026-07-22 — Explicit radius geometry

**Context:** Milestone 12 needs proximity calculations without assuming which distance model Pocket City effects use.

**Decision:** Add pure radius geometry with explicit Euclidean and Manhattan metrics, containment checks, and affected-cell enumeration.

**Consequences:** Effect, overlay, and analysis features can share consistent geometry while catalog data records the intended metric for each effect.

## 2026-07-22 — Sparse analytical heatmaps

**Context:** Milestone 13 needs a way to represent computed planning values without declaring any game-specific scoring rules.

**Decision:** Add an immutable sparse heatmap with finite scalar values, zero-value elision, JSON-compatible cell conversion, and range reporting.

**Consequences:** Future effects and statistics can produce reusable numerical fields, while visual color mapping remains an independent overlay concern.

## 2026-07-22 — Functional editor loop

**Context:** The project had subsystem foundations but no practical player workflow.

**Decision:** Add a finite plan controller and connect the catalog, Canvas, renderer, placement store, inspector, and status bar. Include two explicitly labeled demo-only structures solely to exercise the workflow.

**Consequences:** Users can now select, place, inspect, select, and delete sample structures. Real Pocket City catalog data, persistence, undo/redo, and terrain editing remain separate future work.

## 2026-07-22 — Local draft persistence and portable plans

**Context:** A usable planner must retain work across refreshes and let users control a portable copy without a backend.

**Decision:** Serialize the MVP plan state as schema version 1 JSON, autosave it to localStorage, and support JSON download/import through the existing ribbon controls.

**Consequences:** The app remains static-host-compatible and account-free. Imports validate the supported document shape and catalog references through the plan editor before replacing the active draft.
