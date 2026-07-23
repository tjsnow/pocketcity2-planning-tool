# Changelog

All notable user-visible and developer-relevant changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions will follow Semantic Versioning once releases begin.

## [Unreleased]

## [2.3.0] - 2026-07-22

- Water Treatment Plant and Power Plant now use an 80-block planning coverage radius.
- Solar Power Plant now uses a 100-block planning coverage radius.
- Zones can now replace Grass, Soil, and Sand while continuing to preserve water, trees, mountains, canals, buildings, and roads.

## [2.2.0] - 2026-07-22

- Nature now exposes separate Paint, Area - Square, and Area - Circle buttons. Circular drag previews and fills use the initial cell as the center and skip occupied buildings and roads.
- Zone fills now preserve existing Nature terrain as well as buildings and roads, placing zones only on empty cells.
- Missing utility warnings now render as separate compact red badges inside each building: sewer at top-center, electricity at bottom-left, and water at bottom-right. A building can display all three at once.
- Saved plan downloads now default to `PC2Planner_YYYYMMDDHHMM.json` using the local save timestamp.
- Build categories now remember their last selected item and automatically reactivate it when reopened. Zones and Nature open in Area mode by default; all other categories open in Paint mode.
- Added Bulldozer as its own full-width Build Item Browser category above a two-column category grid with visible icons and names.
- Removed the Quick Tools section. Paint and Area modes now live inside the Build Item Browser and work with every catalog item; Bulldozer is always the first item in its results.
- Paint places one item on click and multiple items while dragging. Area fills a selected rectangle with the chosen building, road, zone, Nature item, terrain eraser, or Bulldozer action.
- Renamed Building Browser to Build Item Browser. Selected zone and Nature area items now remain active across repeated drag operations until another tool is selected or the browser is closed.
- Area-selection tools now auto-pan the canvas while dragging near an edge, allowing selections to extend beyond the initially visible portion of the grid.
- Nature catalog items now use the same drag-to-fill area workflow as zones. Nature fills skip occupied building and road cells instead of replacing them.
- Fixed placement ID allocation after deletions so restored plans can continue placing all buildings, including the Large Power Plant.
- The Build Item Browser is now constrained to the visible viewport, with a dedicated scrolling results area when the catalog is taller than the available space.
- Exposed road-chain endpoints in orthogonally adjacent squares now render an automatic connecting link, including between different road types. Internal segment joints are excluded so parallel roads do not connect repeatedly along their lengths.
- Configured area-of-effect buildings with an unknown radius now use a 60-block planning default. Explicit estimates and user-entered radius overrides continue to take priority.
- Water Tower and Large Water Tower no longer report missing electricity or sewage; they only need road access to supply their water network.
- Placing a building or road over an existing building now replaces the intersecting building. The removal and new placement are recorded as one undoable action.
- Placing a road over another road with the same position and direction now replaces its type. Perpendicular roads can coexist at intersections, allowing mixed road types to cross and closed loops to connect correctly.

## [2.0.0] - 2026-07-22

- Service coverage now requires the supplying station or utility source itself to be road-connected. A source that is isolated from the road network no longer satisfies AOE requirements for nearby buildings.
- Utility diagnostics now require both road access and estimated electricity, water, and sewage coverage. Each missing service produces its own error, so a hospital can show separate power and water errors while sewage is satisfied.
- Added drag-to-move for selected placements. Click a placed item to open its Inspector, then drag it to a new cell; movement uses the existing footprint, terrain, road, boundary, and collision validation and is grouped into one undo step.
- Fixed Area of Effect rendering for all configured service types. Local services and planner utility estimates now draw coverage cells without requiring manual radius input, and diagnostics warn when placements fall outside estimated electricity, water, or sewage coverage.
- Updated Bulldozer to work as a continuous paint brush: dragging removes buildings and road segments across the path while terrain remains protected, with one undo step per drag.
- Corrected the remaining service and landmark footprint records that were still 1×1: Hospital, Fire Department, Police Station, Landfill, Waste Incinerator, Public Works, Parliament Building, Home Improvement Center, Carbon Capture Plant, Recycling Center, and Monolith are now 2×2.
- Added a level-aware service effects layer. The Settings panel now selects Health, Fire, Police, Public Works, Home Improvement, Pollution, Traffic, Water, Power, or Sewage views; local coverage renders only when a planning radius is supplied, while network and citywide effects are identified without inventing tile radii.
- Corrected catalog footprints from the supplied dimensions list, added the provisional Biomass Facility entry, and changed Zone items to variable-area fill tools that skip occupied cells.
- Replaced the partial building catalog with the complete 161-item catalog across Zone, Road, Nature, Water and sewage, Power, Service, Transportation, Recreation, Education, Resource, Financial, Landmark, Unique, and Mega Project categories. Added special placement-rule metadata and 5×5 Mega Project footprints.
- Moved Area Terrain into the Quick Tools group alongside Road Brush, Area Delete, and Bulldozer.
- Added a confirmed Clear command beside Generate. Clearing removes plan content as one undoable action while preserving grid size, plan name, and settings.
- Added an original road icon atlas at `images/original-road-icon-atlas.png` covering Street, High Density, Dirt, Pedestrian, Boardwalk, Light Rail, Train Rail, High Rail, and Subway. The atlas is prepared for later catalog and Canvas sprite integration.
- Wired the road atlas into Canvas road cells and road catalog cards, with a fallback to the existing vector-style road rendering while the sprite loads.
- Wired the city and terrain atlases into newly placed buildings, terrain cells, and catalog cards. Existing glyphs and color fills remain available as fallbacks for unmapped items or while assets load.
- Restored clickable Select, Pan, and Grid toolbox controls. Pan now supports left-button canvas dragging, while Grid toggles the grid layer; V/H/G keyboard shortcuts remain available.
- Removed Grid from the primary toolbox navigation; grid visibility remains available in Layers and via the `G` shortcut.
- Added an Area delete quick tool that previews a red rectangular selection and provides explicit Delete and Cancel actions. It removes buildings and road segments in the area while preserving terrain.
- Expanded the catalog with additional residential, commercial, industrial, utility, service, recreation, and transport buildings plus ten zone tools. Added the original catalog icon atlas at `images/original-catalog-icon-atlas.png` and wired it into catalog cards and Canvas placements.
- Added the dedicated original zone icon atlas at `images/original-zone-icon-atlas.png` with distinct visual markers for each zone type.
- Renamed the Layers section to Settings, added a persisted keyboard-shortcut visibility option, and added icons to Road Brush and Area Delete.
- Added a Generate command that creates a randomized, undoable city layout with a winding river, varied terrain, connected road corridors, and non-overlapping buildings.
- Added an Area Terrain tool that previews a dragged rectangle, offers all terrain choices, fills the selected cells, preserves buildings for ground-to-ground changes, and removes buildings only when applying Water or Mountains.

## [1.0.0] - 2026-07-22

- Released the static Pocket City 2 Planner workspace with grid editing, catalogs, roads, terrain, diagnostics, persistence, minimap, layers, accessibility, testing, and documentation.

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
- Added an original isometric city icon atlas at `images/original-city-icon-atlas.png` for the next icon-skin integration pass.
- Added an original terrain icon atlas at `images/original-terrain-icon-atlas.png`.
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
