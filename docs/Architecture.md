# Architecture

## Overview

Pocket City Planner is a static single-page web application built from native browser capabilities. TypeScript is compiled into ES modules; an HTML entry point loads the application; CSS provides responsive presentation; Canvas 2D renders the editable map. No runtime framework or backend is required.

```text
HTML shell + CSS
       │
       ├── UI feature modules ───────┐
       └── application coordinator   │
                                     ▼
Canvas input → editor commands → plan store → renderer
                         │              │
                         ▼              ▼
                    undo history    JSON persistence
                                      catalog JSON
```

## Layers and dependency direction

| Layer | Responsibility | May depend on |
| --- | --- | --- |
| `domain` | Types, invariants, immutable plan operations | Nothing outside `domain` |
| `application` | Commands, selection, tool state, undo/redo, use cases | `domain` |
| `rendering` | Canvas viewport and drawing of plan state | `domain`, read-only application state |
| `ui` | DOM controls, panels, dialogs, keyboard shortcuts | `application`, `domain` types |
| `infrastructure` | Local storage, file import/export, catalog loading | `domain` |
| `bootstrap` | Composition root and lifecycle wiring | All layers |

Dependencies must point inward. Domain code must not read the DOM, call Canvas, or access browser storage. Rendering never mutates a plan directly; it emits or invokes application commands.

## Feature modules

Each feature owns its UI, state adapter, commands, tests, and public interface. Initial boundaries are `plan-editor`, `catalog`, `selection`, `viewport`, `persistence`, and `history`. Cross-feature behavior belongs in a small coordinator only when it cannot be owned by one feature.

A module exposes a narrow interface through its `index.ts`; consumers must not import its internal files. Shared utilities are permitted only when they are genuinely generic and have no feature ownership.

## State model

The canonical in-memory state is a `PlanDocument` plus transient editor state. `PlanDocument` is serializable and contains only user-owned planning data. Transient state includes the active tool, hover cell, selected IDs, viewport transform, open panels, and undo/redo history; it is not required in an exported plan.

State changes occur through named commands such as `placeItem`, `removePlacement`, `movePlacement`, or `setCellTerrain`. Commands validate input, produce a next document, and describe enough information for inverse history actions. This makes UI, keyboard, and pointer interactions share the same behavior.

## Rendering and interaction

Canvas is responsible for the grid, map layers, placement symbols, selection, and interaction feedback. DOM is responsible for accessible controls, text-heavy panels, forms, tooltips, and dialogs. Use device-pixel-ratio-aware canvas sizing and a world-to-screen transform for pan/zoom. Rendering should be demand-driven: redraw after state or viewport changes, not continuously unless an animation exists.

Pointer coordinates are converted through one tested viewport utility. Hit-testing uses domain geometry and catalog footprints rather than pixel-specific logic.

## Persistence and data loading

Catalog JSON ships as static files and is fetched relative to the deployed application path. User plans can be cached in `localStorage` or IndexedDB behind a persistence interface; exported JSON is the portable, user-controlled format. Imports must validate schema version and data shape before replacing active state.

Catalog loading and plan migration are separate responsibilities. A plan records which catalog version it was created with, but must preserve enough display data or use clear missing-item placeholders when catalog entries later change.

## Error handling and observability

Expected errors (invalid import, unavailable storage, unsupported browser feature) are shown in plain language with a recovery action. Internal errors are isolated at feature boundaries and surfaced to the UI without silently discarding a plan. Do not add telemetry by default; local developer diagnostics may be enabled only in development builds.

## Compatibility and performance

Target current evergreen Chromium, Firefox, and Safari browsers, including Android Chrome. Use progressive enhancement for File APIs and storage. Define plan-size performance budgets before feature growth; avoid per-frame allocations, redraw only affected layers when practical, and keep catalog loading lazy for large datasets.
