## Why

The playable WebApp already supports client-only map runs, movement, drops, and map-instance variants, but the player has no in-run spatial memory or way to understand explored territory. A minimap and transparent map overlay make formal map runs easier to navigate without changing combat, loot, monster AI, or map generation.

## What Changes

- Add a client-only playable minimap system for the formal WebApp battle view.
- Track explored map cells for the current map run only; exploration resets whenever a new run starts.
- Reveal cells around the player during movement and render only explored cells on the minimap.
- Keep unexplored areas hidden on both the compact minimap and enlarged overlay map.
- Show a compact minimap during playable battle.
- Let the player press `M` to toggle an enlarged, semi-transparent map overlay centered on the screen.
- Keep gameplay active while the overlay is open: movement, combat, click-to-pickup, and movement-to-pickup remain usable.
- Keep the implementation fully frontend/client-only with no backend APIs, no server runtime, and no skill editor verification surface.

## Capabilities

### New Capabilities
- `playable-minimap`: Defines client-only explored-area tracking, compact minimap rendering, and the `M` toggled transparent overlay map for formal playable WebApp battle runs.

### Modified Capabilities
- None.

## Impact

- Expected affected files are focused under `webapp/` for battle runtime state, keyboard handling, minimap rendering, and styles.
- Focused tests are expected under `tests/` to prove current-run exploration reset, `M` toggle integration, client-only boundaries, and that the skill editor is not used.
- Frontend verification is required in the actual playable WebApp battle view with screenshots stored under `artifacts/screenshots/`.
- No backend APIs, server gameplay services, map editor behavior, skill runtime behavior, monster combat behavior, loot rules, save schema, or map authoring schema are expected to change.
