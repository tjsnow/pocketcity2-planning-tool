# Release Candidate Checklist

## Automated gates

- [x] `npm test` passes.
- [x] `npm run check` passes.
- [x] `git diff --check` is clean.
- [x] Catalog JSON files parse successfully.
- [x] Application uses relative static-hosting paths.

## Manual browser gates

- [ ] Serve the repository from a static HTTP server.
- [ ] Verify the app loads without console errors in a current Chromium, Firefox, and Safari browser.
- [ ] Create, edit, save, reload, export, and import a plan.
- [ ] Test 40×40, 64×64, and 72×72 grids and lower-left coordinates.
- [ ] Test all terrain and road types, intersections, bulldozer deletion, and building collision rules.
- [ ] Verify utility warnings, red canvas markers, layers, minimap, hover tooltips, popup focus, and keyboard shortcuts.
- [ ] Test at high-DPI and narrow-panel layouts.

## Known release constraints

- Catalog values are community-reported unless marked otherwise.
- Icon skin currently uses project-generated fallback glyphs; licensed game artwork is not bundled.
- Browser storage drafts are convenience recovery; exported JSON remains the durable backup.
