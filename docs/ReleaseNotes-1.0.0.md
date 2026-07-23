# Pocket City 2 Planner 1.0.0

Pocket City 2 Planner 1.0.0 is a static, local-first planning workspace for designing grids, terrain, roads, and building layouts.

## Included

- 40×40, 64×64, and 72×72 grid sizes with lower-left coordinates.
- Building, terrain, and typed road catalogs.
- Popup catalog search, filtering, icons, and drag/drop placement.
- Road intersections, full-cell road rendering, and bulldozer deletion.
- Utility-access diagnostics and red grid warnings.
- Layers, minimap, hover tooltips, keyboard shortcuts, undo/redo, and persistence.
- JSON import/export and local drafts.
- Automated core regression tests and static-hosting compatibility.

## Data and licensing

Catalog facts are provenance-labeled and community-reported unless marked verified. The icon skin uses project-generated isometric atlases and colorful UI controls; no unlicensed game artwork is bundled.

## Verification

Run `npm run release-check` for automated validation. Complete the browser gates in `docs/ReleaseChecklist.md` before publishing a hosted build.
