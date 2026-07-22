# Changelog

All notable user-visible and developer-relevant changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions will follow Semantic Versioning once releases begin.

## [Unreleased]

- Added an immutable rectangular district model and persisted districts through plan documents, snapshots, and grid resize validation.
- Added a framework-free planning tools module for bounded notes and reusable grid distance measurements.
- Restricted plans to 40x40, 64x64, and 72x72 square grids, with a lower-left `(0,0)` origin and strict render clipping.
- Corrected vertical middle-mouse panning so the grid follows the drag direction.
- Corrected terrain and building visual anchors for the lower-left coordinate system.
- Prevented road placement from overlapping building footprints.
- Prevented building placement, movement, and rotation from overlapping road cells.
- Corrected road collision checks to cover both cells occupied by each segment.
- Added a dedicated road eraser tool for click and drag removal.
- Enabled single-click road add and orientation-independent erasing.
- Roads can now be built across all terrain types, including water.
- Added read-only optimization diagnostics for road access, isolated roads, unknown catalog items, and geometry overlaps.
- Exposed optimization warnings in the inspector and added the one-cell utility connection rule.
- Added red canvas warning markers and utility warnings for buildings on plans with no roads.
- Hardened local draft persistence with corruption recovery, storage error handling, and a size limit.
- Hardened JSON import/export with explicit serialization, object validation, and a 10 MB file limit.
- Added persistent visibility controls for grid, terrain, roads, buildings, and optimization warnings.
- Added an independent minimap showing terrain, roads, buildings, and the current viewport.
- Road segments now fill their occupied grid cells visually.
- Coalesced minimap updates and avoided redundant Canvas buffer resizing.
- Added compact building category icons, a popup search/filter module, draggable building cards, and always-visible road quick tools.
- Kept the building module open after selection so the active building remains visible while placing.
- Added an explicit close button to the building popup.
- Added hover tooltips for buildings on the planning grid.
- Added keyboard focus management and Escape-to-close behavior for the building module.
- Positioned the building module as a floating popup across the toolbox/grid divider.
- Added Grass, Water, and Erase terrain tools to the unified catalog under a Terrain category.
- Expanded the sourced building starter catalog and added a dedicated Roads category with typed road tools.
- Added Street, High Density, Dirt, Pedestrian, Boardwalk, Light Rail, Train Rail, High Rail, and Subway road styles with distinct menu and Canvas visuals.
- Replaced the road eraser with a general Bulldozer tool for deleting buildings and roads while preserving terrain.
- Expanded the Terrain catalog with Planted Tree, Water, Sand, Soil, Grass, Canal, Wild Tree, Mountains, and Palm Tree, each with distinct visual styling.
- Added keyboard shortcuts for selection, roads, bulldozer, layers, movement, rotation, and escape-to-select.
- Added versioned source catalogs for road types and terrain types alongside the building catalog.
- Added a shared IconCatalog skin boundary with local fallback icons in the building menu and Canvas.
- Added automated core regression tests and an `npm test` command.
- Added user workflow and keyboard shortcut documentation.
- Added release candidate checklist and combined automated release check.
- Updated the product title to Pocket City 2 Planner and added the current version label.
- Added a namespaced, validated Plugin API registry for future static extensions.
- Category icons now toggle the building popup open and closed.

- Replaced demo building entries with a provenance-labeled starter catalog covering recreation, service, and transport buildings.
- Added catalog confidence/source display to building cards and the inspector.
- Extended building validation for optional provenance metadata.

### Added

- Initial architectural documentation for Pocket City Planner.
- Project vision, roadmap, coding standards, data schema, and intended folder structure.
- Initial static project shell with placeholder module boundaries and asset directories.
- Desktop application shell with a dark CSS Grid workspace, inert toolbar/tool panels, canvas surface, inspector, status bar, and resizable panel dividers.
- Canvas rendering engine with high-DPI sizing, an empty background, viewport pan/zoom navigation, resize handling, and camera coordinate conversion.
- Foundation tooling for strict TypeScript configuration, native-module validation, repository hygiene, and local static development guidance.
- Grid subsystem with camera-aware minor and major grid lines rendered on the planning canvas.
- Terrain subsystem with immutable sparse terrain storage and JSON-compatible terrain-cell conversion.
- Building database subsystem with validated immutable records and an empty versioned static building catalog.
- Building browser with local catalog loading, text/category filters, and an accessible empty or unavailable-catalog state.
- Placement subsystem with immutable placement storage, catalog-reference validation, rotation-aware footprints, and collision prevention.
- Inspector subsystem with a dedicated read-only property panel for selected catalog buildings.
- Roads subsystem with immutable, canonical grid-aligned road segments.
- Overlay subsystem with ordered, visibility-aware Canvas overlay registration.
- Radius subsystem with reusable Euclidean and Manhattan grid geometry.
- Heatmap subsystem with immutable sparse scalar fields and value-range reporting.
- Functional MVP editor loop: demo-only buildings can be selected, placed on the Canvas, selected, inspected, and deleted.
- Local draft persistence and JSON plan download/import through the ribbon controls.
- Placement undo/redo history with ribbon controls and standard keyboard shortcuts.
- Terrain painting with grass, water, erase tools, rendering, persistence, history support, and water placement blocking.
- Road drawing with horizontal/vertical tools, rendering, persistence, history, toggle removal, and water blocking.
- Selected-building rotation with collision, water, boundary validation, history, persistence, rendering, and inspector control.
- Selected-building one-cell movement with Inspector controls, collision/water/boundary validation, history, and persistence.
- Keyboard deletion for selected placements, safely ignored while editing form controls.
- Editable plan names and validated 8–256 cell grid resizing with persistence and history support.
- Functional zoom toolbar controls and live Canvas grid-coordinate/zoom feedback.
- Live plan statistics in the Inspector for buildings, occupied cells, roads, terrain, and grid area.
- Arrow-key movement for selected buildings with the same safety validation as Inspector movement controls.
- `R` rotation and `Escape` tool cancellation shortcuts.
- Click-drag terrain brush painting with continuous cell coverage and single-stroke undo.
- Click-drag road brush drawing with continuous segments and single-stroke undo.
- Road rendering now recognizes connected endpoints and displays rounded three- and four-way junctions.
- Road brush no longer requires a direction choice; drag movement infers straight segments and turns automatically.
- Road paths now render through block centers rather than along grid edges.

### Changed

- Nothing yet.

### Fixed

- Nothing yet.

### Removed

- Nothing yet.

## [0.0.0] — 2026-07-22

### Added

- Documentation-only project initialization. No application code or runtime behavior has been introduced.
