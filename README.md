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

The initial JavaScript modules are included in the TypeScript project without
rewriting them. New TypeScript modules must comply with the strict settings in
`tsconfig.json`.
