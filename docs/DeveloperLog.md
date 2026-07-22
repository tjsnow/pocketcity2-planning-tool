# Developer Log

This log preserves concise architectural decisions, discoveries, and follow-up work. Add entries when a decision would otherwise need to be rediscovered. It complements `Changelog.md`: the changelog records what changed; this log records why.

## Entry template

```markdown
## YYYY-MM-DD — Short decision title

**Context:** What prompted the decision?

**Decision:** What was chosen?

**Consequences:** Benefits, trade-offs, and follow-up work.
```

## 2026-07-22 — Documentation-first initialization

**Context:** Pocket City Planner is beginning as a long-term project and needs durable boundaries before implementation.

**Decision:** Create the initial project documentation before any application source, build setup, or dependency selection.

**Consequences:** The first implementation task should validate these documents by creating the smallest static TypeScript/Canvas foundation. Do not treat the proposed folders as already implemented.

## 2026-07-22 — Browser-native architecture

**Context:** The planner must run client-side from static hosting without a backend and should minimize long-term maintenance overhead.

**Decision:** Use HTML5, CSS3, TypeScript, Canvas 2D, ES modules, and JSON data. Avoid React and other frameworks unless a documented need outweighs native browser APIs.

**Consequences:** DOM UI and Canvas rendering remain separate; no server-side data model or authentication layer is planned.

## 2026-07-22 — JSON as the portable plan format

**Context:** Users need control over long-lived plans without relying on hosted storage.

**Decision:** Make versioned JSON import/export a core persistence capability. Browser storage is a local convenience layer only.

**Consequences:** Schema validation and migrations are foundational work, and imports must fail without destroying the user’s original file.
