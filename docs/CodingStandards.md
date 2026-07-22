# Coding Standards

## Core rules

- Write TypeScript in strict mode. Avoid `any`; use `unknown` at trust boundaries and narrow it.
- Use native ES modules and explicit imports. Prefer named exports.
- Keep files focused: one primary responsibility per module.
- Use immutable domain updates. Do not mutate exported plan objects in place.
- Treat JSON, browser storage, URL parameters, and file contents as untrusted input.
- Do not add a framework or dependency without documenting the problem it solves and why browser APIs are insufficient.

## Naming

- Files and folders: `kebab-case`.
- Types, classes, enums: `PascalCase`.
- Values, functions, properties: `camelCase`.
- Boolean names: begin with `is`, `has`, `can`, or `should`.
- Constants: `UPPER_SNAKE_CASE` only for true module-level constants; otherwise use `camelCase`.
- Commands use verbs: `placeItem`, `exportPlan`, `validatePlan`.

## TypeScript practices

- Prefer discriminated unions for tools, commands, import outcomes, and validation results.
- Define interfaces at module boundaries; avoid broad “utility” object shapes.
- Keep DOM and Canvas types at the outer layer. Domain types must be platform-neutral.
- Make units explicit in names where ambiguity exists: `cellX`, `pixelWidth`, `rotationDegrees`.
- Validate data before casting. A type assertion is not validation.

## HTML, CSS, and Canvas

- Use semantic HTML for controls and structure; Canvas is not the only interaction path.
- Ensure all controls are keyboard reachable, visibly focused, and labeled.
- Use CSS custom properties for shared colors, spacing, and typography.
- Keep layout CSS separate from component/feature styles where practical.
- Draw Canvas from state. Never make pixel output the source of truth.
- Account for `devicePixelRatio`, resize events, and pointer coordinate conversion.

## Data and persistence

- Include `schemaVersion` on every persisted document and catalog.
- Preserve unknown optional fields when feasible during migrations; never silently discard user data.
- Catalog claims require `source` and `confidence` metadata when values are game-specific.
- Prefer stable IDs over display names for references.

## Testing and checks

- Unit-test domain rules, geometry, coordinate transforms, command inverses, validation, and migrations.
- Test UI behavior through accessible DOM interactions where browser tooling is available.
- Add regression tests for every fixed defect that is practical to reproduce.
- Before merging: type-check, run tests, run formatting/lint checks, and manually verify the affected canvas interaction.

## Change discipline

- Keep commits small and single-purpose.
- Update `Changelog.md` for user-visible changes and `DeveloperLog.md` for architectural decisions or notable discoveries.
- Do not mix refactoring with behavior changes unless the refactor is required for the feature and is clearly described.
- Do not commit credentials, private save data, copyrighted game assets without permission, generated build artifacts, or machine-specific files.
