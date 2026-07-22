# Changelog

All notable user-visible and developer-relevant changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions will follow Semantic Versioning once releases begin.

## [Unreleased]

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

### Changed

- Nothing yet.

### Fixed

- Nothing yet.

### Removed

- Nothing yet.

## [0.0.0] — 2026-07-22

### Added

- Documentation-only project initialization. No application code or runtime behavior has been introduced.
