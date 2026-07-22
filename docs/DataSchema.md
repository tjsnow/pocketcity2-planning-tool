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

Road segments are unit-length horizontal or vertical edges. Their coordinate and direction form a canonical identity; duplicate identities are rejected. `roadType` is a caller-supplied string until a verified road catalog exists.

### Radius definition

```json
{ "radius": 5, "metric": "euclidean" }
```

Radius geometry requires an explicit metric: `euclidean` for circular distance or `manhattan` for orthogonal grid distance. Effects that use a radius must record their chosen metric rather than relying on an implicit game assumption.

### Terrain cell and note

```json
{ "x": 4, "y": 9, "terrainId": "water" }
```

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

The static building source catalog is stored at `data/buildings.json`. It uses a versioned wrapper with a `buildings` array. Every building record follows `schemas/building.schema.json` and contains `id`, `name`, `category`, `size`, `levels`, `effects`, `radius`, and `unlock` fields. The initial catalog is deliberately empty until data can be sourced and assigned appropriate provenance.

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
