# Developer Log

This log preserves concise architectural decisions, discoveries, and follow-up work. Add entries when a decision would otherwise need to be rediscovered. It complements `Changelog.md`: the changelog records what changed; this log records why.

## Entry template

## 2026-07-22 — District foundation

Districts are represented as immutable rectangular annotations with IDs, names, bounds, and optional colors. They are included in scene and save data, undo/redo snapshots, and resize validation. No zoning or simulation meaning is assigned yet.

## 2026-07-22 — Planning tools foundation

Notes and grid measurements are modeled independently of UI. Notes are bounded, length-limited annotations persisted with plans; measurements return both common grid distance metrics so later tools can choose explicitly.

## 2026-07-22 — Fixed grid bounds and origin

Grid dimensions are now a deliberate product constraint: 40, 64, or 72 cells per side. The camera uses a lower-left origin while the renderer clips all scene layers to the selected square grid.

## 2026-07-22 — Camera pan direction correction

Because the renderer uses a lower-left world origin, vertical screen dragging must increase the camera's world Y position. The pan transform now keeps horizontal and vertical drag behavior intuitive.

## 2026-07-22 — Lower-left cell drawing alignment

Canvas rectangles are screen-space top-left anchored, while planner cells use lower-left world coordinates. Terrain and building rectangles now use the footprint's upper world edge so visuals align with pointer-selected cells.

## 2026-07-22 — Road/building collision rule

Road creation now checks the rotated footprint of every existing building before adding a segment. Building placement, movement, and rotation also reject existing road cells. The same rule is applied to click toggles and continuous road strokes, while removing an existing segment remains available for cleanup.

Road segments occupy their anchor and endpoint cells. Collision checks now use both cells, fixing directional gaps when painting into a building from the side or below.

## 2026-07-22 — Road eraser

Road removal is now an explicit tool rather than an undocumented toggle behavior. The eraser supports the same continuous stroke path and history grouping as the road brush.

Single-click road actions now share the same semantics as strokes: brush clicks add/toggle one segment, while eraser clicks remove any segment occupying the selected cell, including vertical segments.

Roads are transport infrastructure and are no longer blocked by terrain painting. Building placement remains blocked by water, but road strokes can cross all terrain types.

## 2026-07-22 — Optimization diagnostics

Optimization is intentionally advisory and read-only. It analyzes the current geometry for road access, isolated segments, unknown catalog references, and overlaps without asserting game-specific service or traffic rules.

Utility access now requires a road directly adjacent to a building, or a one-cell gap occupied by another building. Empty gaps produce a visible `no-utility-access` error in the inspector.

Occupancy is precomputed before diagnostics, so chained utility access works consistently regardless of the order buildings were placed.

## 2026-07-22 — Persistence hardening

SaveManager now isolates browser storage behind an injectable adapter, recovers from malformed drafts, reports quota/storage failures, and limits drafts to 2 MB. JSON downloads remain the portable persistence boundary.

## 2026-07-22 — Import/export boundary

Portable JSON files now pass through explicit parse/serialize helpers. Parsing rejects malformed, non-object, or oversized input before plan-schema validation runs.

## 2026-07-22 — Layer visibility

Layer state is independent from plan geometry. Visibility toggles are persisted for a consistent workspace while hidden layers remain editable and present in saved plans.

## 2026-07-22 — Minimap

The minimap is a separate lightweight Canvas view. It consumes the scene read model and camera only, so it cannot mutate plan state or couple minimap drawing into the main renderer.

Roads remain represented as connected segments, but their surface now fills each occupied cell so the road footprint is visually unambiguous.

## 2026-07-22 — Minimap performance

Minimap scene/camera updates are coalesced into a single animation frame, and its Canvas backing dimensions are preserved unless the CSS dimensions actually change.

## 2026-07-22 — Compact building workflow

Building discovery now opens on demand from category icons, keeping the toolbox compact. Drag-and-drop placement reuses `PlanEditor.placeAt`, preserving collision, terrain, and utility diagnostics.

The module remains open after selecting a building so the selected card and category context stay visible during repeated placement.

The popup now has an explicit close control that hides the browser without clearing the selected building.

Building hover information is a transient UI concern: pointer movement resolves the existing placement model and displays a tooltip without changing selection or plan state.

The building module now focuses search on open, returns focus to its category opener on close, and supports Escape dismissal. Draggable cards remain regular keyboard-activatable buttons for non-pointer placement selection.

The module is fixed-positioned beside its category opener so it visually spans beyond the toolbox instead of blending into the scrolling pane.

Terrain uses virtual catalog entries so the same discovery/search UI can host terrain tools without polluting the building source database.

Road types use the same virtual-menu approach and pass their `roadType` into the editor, leaving room for verified road-specific rules and footprints later.

Each road type now has a stable visual mapping shared by the building menu icon, main Canvas, and minimap. Styling is intentionally presentation-only.

The bulldozer is a destructive edit command limited to building placements and road segments. Terrain remains protected and requires its dedicated terrain tools.

Terrain catalog entries remain virtual UI tools backed by generic terrain IDs. Renderer and minimap color maps provide visual distinction without asserting game mechanics for those terrain types.

Keyboard shortcuts are handled at the application boundary and ignored while typing in editable controls, preventing accidental plan edits during search or naming.

Road and terrain source data now have their own versioned JSON boundaries. UI virtual entries remain intentionally lightweight adapters over these contracts until catalog loading is unified.

The first icon skin uses project-generated glyphs rather than copied game artwork. This keeps the renderer ready for licensed assets while avoiding unclear redistribution rights.

Core tests use Node's built-in runner to avoid introducing a framework. They cover editor collisions, bulldozer behavior, utility diagnostics, persistence parsing, layers, and plugin registration.

## 2026-07-22 — Documentation pass

Added user-facing workflow and shortcut references. Documentation describes current behavior without presenting community-sourced catalog values as official game rules.

## 2026-07-22 — Release candidate readiness

Added a release checklist separating automated gates from browser/manual gates. The combined `release-check` script keeps the final validation repeatable without adding a build framework.

The brand lockup now uses the product name Pocket City 2 Planner and displays the package version beneath it.

## 2026-07-22 — Version 1.0.0 release

Promoted project metadata and the UI brand to 1.0.0. Automated release gates pass; browser-specific checklist items remain explicit manual verification requirements.

## 2026-07-22 — Plugin API foundation

The initial plugin API is deliberately narrow: namespaced catalog items and tools can be registered and enumerated, while core plan mutation remains behind editor commands and callbacks.

Category buttons behave as toggles: the active opener closes its popup when clicked again, while another category switches the popup context.

Optimization issues are now rendered as red markers at affected building footprints, including when the plan has no roads at all. Road erasing remains an independent edit operation.

## 2026-07-22 — Sourced catalog foundation

Replaced the two fixture records with community-reported Pocket City 2 catalog entries. Records carry source URLs and a `community-reported` confidence value so planning data is not mistaken for official or fully verified game data. Browser cards and the inspector expose that provenance. This is a maintainable starter slice; additional categories and exact effect/radius values can be added as they are verified.

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

## 2026-07-22 — Reversible placement history

**Context:** Players need a low-risk way to revise plans without manually deleting and rebuilding placements.

**Decision:** Store immutable placement snapshots before placement and deletion commands, exposing undo/redo through the existing ribbon and standard keyboard shortcuts.

**Consequences:** History is transient editor state and is intentionally not persisted in exported plans. Restored plan state is autosaved as the current draft.

## 2026-07-22 — Editable terrain layer

**Context:** The map needed spatial constraints and visual planning context beneath buildings.

**Decision:** Connect the existing sparse terrain model to a small generic terrain palette, render terrain below the grid/buildings, persist it in plans, and prevent building placement on water cells.

**Consequences:** Terrain edits share the same history and autosave behavior as placements. The terrain identifiers remain generic planning data, not assertions about Pocket City game mechanics.

## 2026-07-22 — Editable road layer

**Context:** The planner needs a visible transport-layout layer without assuming game-specific road mechanics.

**Decision:** Connect the immutable road network to horizontal/vertical tools that toggle a road segment per cell, render segments between terrain and buildings, and persist them with plan history.

**Consequences:** Roads can be drafted, removed, undone, and exported. Intersections, path routing, and verified road types remain future work.

## 2026-07-22 — Rotatable placements

**Context:** Multi-cell buildings need a way to fit alternate layouts without recreating placements.

**Decision:** Add quarter-turn rotation for selected placements, validated against bounds, water, and existing placement collisions through the immutable placement store.

**Consequences:** Rotation is undoable and persisted. Movement and richer placement transforms remain future editor work.

## 2026-07-22 — One-cell placement movement

**Context:** Selected structures need precise layout adjustment without delete-and-replace work.

**Decision:** Add directional Inspector controls that move the selected placement one grid cell through the same collision, terrain, and boundary rules as placement.

**Consequences:** Movement is safe, reversible, and persisted. Drag movement and multi-selection remain future enhancements.

## 2026-07-22 — Context-safe deletion shortcut

**Context:** A selected placement should be removable without repeatedly reaching for the Inspector.

**Decision:** Support Delete and Backspace for selected placements, while ignoring key presses originating from editable controls.

**Consequences:** Fast canvas editing is available without breaking expected text-entry behavior in future form controls.

## 2026-07-22 — Editable plan metadata

**Context:** Fixed unnamed plans make saved layouts difficult to manage and constrain experimentation.

**Decision:** Add editable plan names and bounded grid resizing, rejecting shrinks that would discard placements, terrain, or roads.

**Consequences:** Metadata persists in drafts and exported JSON. Grid resizing participates in editor history; name changes remain lightweight document metadata.

## 2026-07-22 — Viewport feedback controls

**Context:** The shell displayed zoom and coordinate UI without connecting it to the Canvas viewport.

**Decision:** Expose renderer callbacks for pointer/viewport state and connect the toolbar zoom controls plus status displays.

**Consequences:** Navigation now has visible, accurate feedback without moving camera math or pointer conversion into UI modules.

## 2026-07-22 — Derived plan statistics

**Context:** Users need quick feedback about the scale and composition of a draft.

**Decision:** Add a pure statistics calculator and show its values in the Inspector when no placement is selected.

**Consequences:** Statistics update from the same plan state used for rendering and persistence; no game-specific effect assumptions are included.

## 2026-07-22 — Keyboard placement movement

**Context:** Inspector movement controls work, but precise editing should not require leaving the Canvas.

**Decision:** Route Arrow keys to the existing validated movement command whenever a placement is selected, while preserving form-control behavior.

**Consequences:** Keyboard movement shares collision, terrain, history, and persistence behavior with the Inspector controls.

## 2026-07-22 — Tool cancellation and rotation shortcuts

**Context:** Editing modes and selected placements should be quickly controlled from the keyboard.

**Decision:** Map `Escape` to Select mode and `R` to the existing validated placement rotation command.

**Consequences:** Keyboard users can leave terrain/road/building tools or rotate a selected placement without moving focus to the side panels.

## 2026-07-22 — Continuous terrain brush strokes

**Context:** Painting one terrain cell per click made larger terrain areas unnecessarily slow to create.

**Decision:** Add Canvas pointer drag callbacks and a terrain stroke transaction that paints each traversed cell while recording one history entry for the complete gesture.

**Consequences:** Terrain editing is faster while preserving atomic undo behavior. Building and road clicks remain single-cell interactions.

## 2026-07-22 — Continuous road brush strokes

**Context:** Drawing roads one segment at a time limited practical layout work.

**Decision:** Reuse Canvas drag callbacks with an add-only road stroke command, preserving click-to-toggle behavior for single segments and grouping drag edits into one history entry.

**Consequences:** Road paths can be drawn quickly while accidental pointer revisits do not erase previously painted segments.

## 2026-07-22 — Connected road junction rendering

**Context:** Independently drawn horizontal and vertical road segments needed to read as a coherent network when they meet.

**Decision:** Derive endpoint connectivity during rendering and draw rounded junction nodes for three- and four-way connections while preserving each segment’s painted direction.

**Consequences:** Straight roads remain straight; perpendicular connections read as turns and connected multi-branch nodes read as intersections without changing persisted road data.

## 2026-07-22 — Direction-inferred road brush

**Context:** Requiring users to switch between horizontal and vertical road tools interrupted natural path drawing.

**Decision:** Replace the two direction buttons with one road brush. The editor infers each segment’s orientation from pointer movement and records turns as connected perpendicular segments.

**Consequences:** Users can draw a road path continuously and turn naturally. Persisted segments retain explicit directions for deterministic rendering and editing.

## 2026-07-22 — Centered road geometry

**Context:** The first connected-road renderer placed paths on grid edges, which did not match the intended single-block road presentation.

**Decision:** Render each road segment between the centers of its connected blocks and place junction markers at center-based endpoints.

**Consequences:** Roads visually occupy the middle of each block while retaining automatic turns and intersections. Longer road types can later use richer footprints without changing the current single-segment contract.
