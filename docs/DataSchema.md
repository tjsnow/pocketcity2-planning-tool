# Data Schema

## Versioning policy

All persisted JSON documents include an integer `schemaVersion`. Version increments are backward-compatible when possible; otherwise a migration transforms an older document into the current in-memory form. Reject future versions with a clear export-preserving error rather than guessing.

Dates use ISO 8601 UTC strings. Coordinates are zero-based integer grid cells. IDs are stable lowercase strings, typically `kebab-case`.

## Plan document

```json
{
  "schemaVersion": 1,
  "id": "plan-uuid",
  "name": "Downtown draft",
  "createdAt": "2026-07-22T00:00:00Z",
  "updatedAt": "2026-07-22T00:00:00Z",
  "catalogVersion": "1.0.0",
  "grid": { "width": 64, "height": 64, "cellSize": 1 },
  "terrain": [],
  "placements": [],
  "notes": []
}
```

| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | Unique plan identifier; not a display name. |
| `name` | string | User-editable, trimmed, bounded length. |
| `grid` | object | Positive integer `width` and `height`; `cellSize` is a logical unit. |
| `terrain` | `TerrainCell[]` | Sparse overrides only; absent cells use the plan default. |
| `placements` | `Placement[]` | Items placed on the grid. |
| `notes` | `PlanNote[]` | Optional user annotations. |

### Placement

```json
{
  "id": "placement-uuid",
  "catalogItemId": "building-example",
  "x": 12,
  "y": 8,
  "rotation": 0,
  "layer": "structures",
  "label": "Main plaza"
}
```

`x` and `y` identify the placement anchor cell. `rotation` is constrained by the catalog item’s allowed rotations. A placement may not overlap another placement on the same collision layer unless an explicit future rule permits it.

The placement domain model validates catalog references, quarter-turn rotation values, and same-layer footprint collisions before a placement can be added. Grid-boundary validation remains the responsibility of a future plan document because this isolated model does not own plan dimensions.

### Road segment

```json
{ "x": 4, "y": 9, "direction": "horizontal", "roadType": "road" }
```

Road segments connect the centers of adjacent grid blocks horizontally or vertically. Their coordinate and direction form a canonical identity; duplicate identities are rejected. `roadType` is a caller-supplied string until a verified road catalog exists.

Plans persist road segments in a top-level `roads` array. Road validation keeps segments within the plan grid and prevents building overlap; roads may cross any terrain type.

The editor supports exactly three square grid sizes: 40x40, 64x64 (default), and 72x72. Coordinates use a lower-left origin: `(0,0)` is the bottom-left cell, and rendered/editable content is clipped to the selected grid bounds.

### Radius definition

```json
{ "radius": 5, "metric": "euclidean" }
```

Radius geometry requires an explicit metric: `euclidean` for circular distance or `manhattan` for orthogonal grid distance. Effects that use a radius must record their chosen metric rather than relying on an implicit game assumption.

### Terrain cell and note

```json
{ "x": 4, "y": 9, "terrainId": "water" }
```

### District

```json
{ "id": "district-1", "name": "Downtown", "x": 4, "y": 4, "width": 12, "height": 10, "color": "#4e94d9" }
```

Districts are optional rectangular planning labels persisted in a plan's `districts` array. They are editor annotations only; no simulation or zoning behavior is inferred until Pocket City data is verified.

Planning notes are persisted in the existing `notes` array as `{ "id", "x", "y", "text" }`. Notes are bounded to a grid cell and limited to 500 characters. `measureGridSegment(start, end)` provides both Manhattan and Euclidean distances without choosing a game-specific metric.

Optimization reports are transient read-only results. `analyzePlan` returns issue records with `code`, `severity`, `subjectId`, and `message`; they are not persisted and never mutate the plan. Utility access is considered valid for an adjacent road, or for a one-cell gap only when the intervening cell contains another building.

The local draft uses storage key `pocket-city-planner.draft.v1`, is JSON encoded, and is limited to 2 MB. Corrupt drafts are discarded safely; portable plan downloads remain the durable user-controlled copy.

Portable plan import accepts JSON object documents up to 10 MB. `SaveManager.parsePlan` parses defensively and leaves schema/version validation to `PlanEditor.fromDocument`.

Layer visibility is persisted as a `layers` object with `grid`, `terrain`, `roads`, `buildings`, `warnings`, and `effects` booleans. It changes presentation only and does not remove plan data. The selected effect type is workspace state; it is not part of the plan document.

The minimap is a transient read-only view of the current scene and camera; it is not persisted as plan data.

The minimap coalesces scene and camera updates into one animation-frame render and only resizes its backing buffer when dimensions change.

Building discovery is a presentation concern: category buttons open a temporary searchable module, and catalog cards may be dragged to a grid cell. Dragging delegates to the same validated editor command as clicking.

Nature records are first-class catalog items under the `nature` category. Records with a `terrainId` activate terrain painting instead of creating a building placement. Zone records are area tools: the user drags a rectangle and the editor creates one-cell zone records in available cells.

`IconCatalog` provides the visual skin boundary. Current entries are local fallback glyphs with `project-generated` metadata; licensed bitmap/SVG assets can replace them without changing catalog or renderer contracts.

Road menu items use a `roadType` and `roadIcon` presentation value. The renderer maps each type to a distinct surface/line style; these are visual planning conventions until verified game-specific road rules are added.

The Nature category includes Planted Tree, Water, Sand, Soil, Grass, Canal, Wild Tree, Mountain, and Palm Tree. Terrain remains a caller-owned string ID with no hard-coded simulation behavior.

Versioned source catalogs are stored in `data/buildings.json`, `data/roads.json`, and `data/terrain.json`. Each catalog carries `schemaVersion`; records retain confidence metadata so source uncertainty remains visible.

`PluginRegistry` provides explicit namespaced registration for future catalog items and tools. Registrations are validated, immutable, and isolated; plugins do not receive direct mutation access to editor state.

Core regression tests live in `tests/` and run with Node's built-in test runner; browser-only rendering remains covered by manual QA.

Keyboard shortcuts are UI-only: `V` select, `P` road brush, `B` bulldozer, `G` grid visibility, `W` warning visibility, `R` rotate selected placement, arrow keys move the selection, and `Escape` returns to Select.

```json
{ "id": "note-uuid", "x": 10, "y": 10, "text": "Leave room for expansion" }
```

## Catalog document

```json
{
  "schemaVersion": 1,
  "catalogVersion": "1.0.0",
  "items": [
    {
      "id": "building-example",
      "name": "Example Building",
      "category": "building",
      "footprint": { "width": 2, "height": 3 },
      "allowedRotations": [0, 90, 180, 270],
      "collisionLayer": "structures",
      "tags": ["example"],
      "source": { "kind": "manual", "reference": "Pending verification" },
      "confidence": "unverified"
    }
  ]
}
```

Catalog item IDs are immutable once published. Names, descriptions, and presentation metadata may change. Supported `confidence` values are `verified`, `community-reported`, `estimated`, and `unverified`.

## Building source catalog

The static source catalog is stored at `data/buildings.json` with schema version 2 and contains the complete planning catalog, including the provisional Biomass Facility entry. Every record contains `id`, `name`, `category`, `size`, `levels`, `effects`, `radius`, and `unlock` fields. Road records additionally expose `roadType`; Nature records expose `terrainId`; and items with unusual placement behavior may expose a human-readable `placementRule`, `placementType`, or `footprint`. Service level definitions and effect modes are maintained in `js/ServiceEffects.js` because the public reference does not provide complete numerical radii. A placement may persist `level` and an optional user-entered `coverageRadius` planning assumption. The catalog is assembled from community references and is not an official game data dump. Records carry `confidence` and a `source` object with `kind`, `reference`, and optional `accessedAt` fields.

The source-record `size` is normalized to the catalog item’s planning footprint when a plan-facing catalog adapter is introduced. This keeps raw source data separate from future UI and placement representations.

## Validation rules

- Required fields must be present with the expected primitive type.
- Grid dimensions and coordinates must be finite integers within configured bounds.
- Placement IDs must be unique; catalog references must exist or become explicit missing-item placeholders.
- Footprints after rotation must fit the grid and satisfy layer collision rules.
- Text is length-limited and rendered as text, never injected as HTML.
- Imported files have a size limit and are parsed defensively before use.

## Migration contract

Migrations are pure functions from one explicit version to the next. Keep each historical migration and test it with representative fixtures. After migration, validate again. An import that cannot be migrated must remain downloadable so user data is never trapped.
