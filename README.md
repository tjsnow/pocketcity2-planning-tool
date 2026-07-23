# Pocket City Planner

A static, local-first planning companion for *Pocket City 2*. The project uses
native HTML, CSS, Canvas 2D, and ES modules—no runtime framework or backend.

## Local development

Serve the repository root with any static file server, then open `index.html`.
For example, with Python installed:

```powershell
py -m http.server 8000
```

Open `http://localhost:8000` in a current browser.

## Validation

Install the development dependencies and run the repository check:

```powershell
npm install
npm run check
```

Run the automated core tests with:

```powershell
npm test
```

See [docs/UserGuide.md](docs/UserGuide.md) and [docs/KeyboardShortcuts.md](docs/KeyboardShortcuts.md) for application usage.

Release readiness is tracked in [docs/ReleaseChecklist.md](docs/ReleaseChecklist.md). Run `npm run release-check` for the automated gates.

The initial JavaScript modules are included in the TypeScript project without
rewriting them. New TypeScript modules must comply with the strict settings in
`tsconfig.json`.

## Copyright

Copyright © 2026 Pocket City Planner contributors. All rights reserved unless
otherwise stated in a file or asset-specific notice.

This is an independent, community-created planning tool and is not affiliated
with or endorsed by the creators or publishers of *Pocket City 2*. The *Pocket
City 2* name, trademarks, terminology, and game content belong to their
respective owners. Project-created source code and original visual assets remain
the property of their respective contributors; protected game artwork is not
included.
