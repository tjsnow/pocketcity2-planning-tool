# Pocket City Planner — Project Vision

## Purpose

Pocket City Planner is a browser-based planning companion for the Android game *Pocket City 2*. It will help players explore city layouts, organize plans, estimate space use, and preserve planning ideas before they build in-game.

The product is deliberately a planning tool, not a game client, automation tool, save-file editor, or online service. It must remain useful from a static web host with no account, server, or network dependency.

## Product principles

- **Player-first clarity:** Make city-planning decisions easier to understand and revise.
- **Offline by default:** All planning data stays on the player’s device unless they explicitly export it.
- **Fast visual feedback:** Canvas interactions should feel immediate on typical desktop and Android browsers.
- **Progressive capability:** A usable basic grid and palette come before advanced analysis, import/export, or optimization.
- **Trustworthy assumptions:** Clearly distinguish confirmed game data from estimates and user-entered values.
- **Longevity:** Favor stable browser standards and portable JSON over dependencies or hosted infrastructure.

## Target users

1. New players who want to sketch a district before committing resources in game.
2. Experienced players who want repeatable layouts, records of successful cities, and quick comparisons.
3. Community contributors who can curate building, zone, and terrain data as versioned JSON.

## Initial product scope

The first usable release should enable a player to create a local plan, choose a grid size, paint or place catalog items, select/edit/remove placements, navigate a canvas, and save or load a plan as JSON.

Later releases may add map layers, terrain constraints, calculation panels, templates, undo/redo, accessibility refinements, and optional import of user-provided data where technically and legally appropriate.

## Non-goals

- Game modification, automation, cheats, or interactions with Pocket City 2 services.
- User accounts, cloud sync, multiplayer, or server-managed content.
- Collecting analytics or personally identifiable information.
- Requiring a JavaScript framework for ordinary UI or rendering work.

## Success measures

- A plan can be created, edited, exported, re-opened, and understood without a network connection.
- Core interactions remain responsive for the documented supported plan size.
- Every data value shown as game knowledge carries a source/status field in the catalog data.
- A feature can be added or changed within a bounded module without unrelated UI, rendering, or persistence changes.

## Constraints and assumptions

The project uses HTML5, CSS3, TypeScript, the Canvas 2D API, and JSON. It is client-side only and deployable to static hosting. Browser storage is a convenience cache, not the sole copy of a user’s work; JSON export remains a first-class safeguard.

Pocket City 2 content and terminology belong to their respective owners. The planner should avoid redistributing protected game assets unless their use is clearly permitted; its UI should prefer original icons, simple shapes, and text labels.
