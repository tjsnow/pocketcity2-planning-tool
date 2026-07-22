# Folder Structure

The structure below is the intended layout once application work starts. Documentation creation does not imply that all folders should be created now.

```text
/
├── docs/                 # Product and engineering documentation
├── public/               # Files copied unchanged to static hosting
│   └── data/             # Versioned catalog JSON and sample plans
├── src/
│   ├── bootstrap/        # Composition root and application startup
│   ├── domain/           # Pure plan types, rules, geometry, validation
│   ├── application/      # Commands, editor state, use cases, history
│   ├── features/         # Independently maintainable product features
│   │   ├── catalog/
│   │   ├── plan-editor/
│   │   ├── persistence/
│   │   ├── selection/
│   │   └── viewport/
│   ├── rendering/        # Canvas renderer, layers, drawing primitives
│   ├── ui/               # Shared DOM controls and accessible dialogs
│   ├── infrastructure/   # Browser storage, files, fetch adapters
│   ├── styles/           # Global tokens, base styles, layout styles
│   └── test/             # Shared test helpers and fixtures
├── tests/                # Cross-module or end-to-end tests, if needed
├── index.html            # Static application entry point
├── package.json          # Tooling scripts and development dependencies
├── tsconfig.json         # Strict TypeScript configuration
└── README.md             # Setup, local development, and project overview
```

## Ownership rules

- A feature’s implementation stays within its feature folder unless it is truly shared.
- `domain` never imports from `features`, `ui`, `rendering`, or `infrastructure`.
- `rendering` receives a read model and callbacks; it does not own application state.
- `public/data` is source-controlled content, not an ad hoc cache.
- Build output (for example `dist/`) is generated and excluded from version control unless deployment needs dictate otherwise.

## Feature template

```text
src/features/example-feature/
├── index.ts              # Public feature API
├── example-feature.ts    # Feature orchestration
├── example-feature.css   # Feature-specific presentation
├── example-feature.test.ts
└── internal/             # Non-public helpers
```

Avoid a generic `utils/` dumping ground. Place helpers with the owning feature; promote them only after a second consumer proves they are shared.
