## Context

The playable WebApp map run is already client-only. A run starts from the selected map progression stage, creates a runtime map instance with `createRuntimeMapInstanceForStage()`, resets battle runtime state through `resetBattleRuntimeForChallenge()`, places the player at the finalized spawn, and runs movement, combat, drops, and pickup in frontend state.

The formal battle view already has the data needed for a minimap:

```text
runtime battle map
  gridWidth / gridHeight
  walkableGrid / blockerGrid / editorTiles
  meta.grid_size / world dimensions
  player position
  drops and pickup targets
```

The feature should live in the playable battle path, not in the map editor or skill editor. It must remain a frontend-only presentation/navigation feature and must not create backend coupling or change combat results.

## Goals / Non-Goals

**Goals:**
- Add a compact minimap to formal playable WebApp battle runs.
- Track explored cells for the current map run and reset exploration on every new run.
- Reveal map cells around the player as the player moves.
- Hide unexplored cells entirely on both compact and enlarged maps.
- Toggle a centered, semi-transparent enlarged overlay with `M`.
- Keep gameplay active while the enlarged overlay is open.
- Preserve movement, combat, click-to-pickup, and movement-to-pickup behavior while the overlay is visible.
- Verify the feature in the actual playable WebApp battle view with screenshots under `artifacts/screenshots/`.

**Non-Goals:**
- No backend APIs, server runtime, server persistence, or server-generated gameplay behavior.
- No save schema change or persistent map exploration between runs.
- No map editor minimap changes.
- No skill editor usage or verification.
- No fog-of-war changes to the main battlefield rendering.
- No changes to monster AI, combat, loot rules, map generation, map authoring schema, or skill runtime behavior.

## Decisions

### Track exploration as run-scoped frontend state

Store explored cells as a run-scoped set keyed by grid coordinate, for example `x,y`. The set resets from `resetBattleRuntimeForChallenge()` or the same map-run startup path that clears combat visuals, enemies, drops, and timers.

Alternative considered: persist exploration in save data. Rejected because the requested behavior is to reset exploration every run and persisting it would add save-schema risk without solving the current need.

### Reveal cells from the player position during runtime updates

Update exploration from the player's current grid cell during startup and movement/runtime ticks. The reveal footprint should be centered on the player and use a fixed radius in grid cells. A circular or near-circular footprint is preferable because the project is top-down and circular gameplay guides should remain screen-space circles.

Alternative considered: reveal only the exact occupied cell. Rejected because it would make navigation too noisy and visually unhelpful.

### Render maps from runtime map data, not from editor state

The minimap should consume the finalized runtime battle map after template selection and rotation. It should not read unrotated map authoring data once a run has started. For editor-runtime maps, render from `editorTiles`; for baked maps or any fallback runtime map, render from `walkableGrid` and `blockerGrid`.

Alternative considered: reuse the map editor minimap component. Rejected because it is tied to authoring controls, editor visible bounds, spawn editing, and disabled verification surfaces.

### Keep the enlarged overlay pointer-transparent

The `M` overlay should be centered, semi-transparent, and non-blocking. Its root should not capture pointer events so click-to-pickup and other battlefield interactions can pass through. Keyboard input should continue to flow through the existing `keydown`/`keyup` path, with `M` only toggling overlay scale.

Alternative considered: modal map overlay. Rejected because the user explicitly wants movement and pickup to continue while the map is shown.

### Keep compact and enlarged views as one minimap state

Use one display mode, such as `compact` / `expanded`, rather than separate components with separate exploration logic. The two views should share the same explored-cell data and rendering rules; only size, placement, opacity, and styling change.

Alternative considered: independent compact and full-map canvases. Rejected because duplicate rendering paths increase the chance that unexplored cells or transformed maps diverge.

## Risks / Trade-offs

- Exploration update every frame could add avoidable work -> Only add cells when the player enters a new grid cell or when the map/run changes.
- Large maps could make DOM cell rendering heavy -> Prefer a canvas or tightly bounded rendering strategy; if DOM cells are used, render only explored cells and keep the minimap dimensions fixed.
- The overlay might accidentally block pickup clicks -> Set the overlay surface to pointer-transparent and verify click/move pickup remains usable while it is open.
- Map rotation could mismatch minimap coordinates -> Consume only the finalized runtime battle map and test against the existing map instance path.
- Existing UI could overlap on small screens -> Use fixed responsive dimensions and z-index below modal overlays but above the battle canvas; verify with browser screenshots.
- A global `M` shortcut could fire in non-playable UI -> Gate the toggle to active playable battle state and avoid changing map selection, save selection, inventory text inputs, or skill editor behavior.

## Migration Plan

1. Add minimap exploration helpers and run-scoped state in the playable WebApp battle path.
2. Reset and seed exploration at map-run start.
3. Add compact minimap and expanded overlay rendering that consume the same explored-cell state.
4. Add `M` keyboard toggle gated to playable battle.
5. Add focused tests for reset behavior, hidden unexplored cells, input pass-through intent, and client-only boundaries.
6. Run the actual playable WebApp battle view, toggle the overlay, move while it is open, and save screenshots under `artifacts/screenshots/`.

Rollback is straightforward: remove the minimap state, rendering component, styles, and tests. Because exploration is not persisted and no gameplay state owns it, rollback does not require save migration.

## Open Questions

None. The requested behavior is explicit: exploration resets every run, and the enlarged map is a centered transparent overlay that keeps movement and pickup usable.
