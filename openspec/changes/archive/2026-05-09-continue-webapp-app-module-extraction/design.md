## Context

The completed App extraction pass already established the module-boundary rule and moved several tooltip, inventory, battle, rest-area, layout, and utility pieces out of `webapp/App.tsx`. The file remains large and still contains low-risk render-only panels mixed with App-owned state and gameplay orchestration.

Current exploration identified four safer next targets:

- Battle map background and map debug overlay presentation around `BakedMapBackground`, `EditorRuntimeMapBackground`, `MapDebugOverlay`, and `MapDebugMarker`.
- Procedural spawn debug presentation around `ProceduralSpawnDebugPanel`.
- Character panel presentation around `CharacterInfoPanel`.
- Skill-board presentation around `BoardCell`, board preview display helpers, `GemGhost`, support preview display, and board-only class helpers.

The project is client-only. This change must not add backend coupling, server runtime behavior, new dependencies, CSS redesign, save schema changes, gameplay runtime changes, or skill-editor verification.

## Goals / Non-Goals

**Goals:**

- Continue reducing `webapp/App.tsx` through small, reviewable, behavior-preserving extraction groups.
- Prefer leaf UI and pure display helpers before extracting stateful orchestration.
- Keep App-owned state, refs, callbacks, gameplay runtime, storage, and save ownership in `App.tsx`.
- Introduce focused modules only where an extracted boundary has a clear owner.
- Preserve text, class names, DOM structure, rendering order, prop behavior, runtime calls, and storage keys.
- Verify visible changes in the actual playable WebApp through the project `run.bat` flow.

**Non-Goals:**

- No skill runtime generation or event consumption extraction.
- No monster AI, damage, projectile lifecycle, target selection, hit timing, map progression, pickup rule, or combat behavior changes.
- No skill-editor acceptance, `/skill-editor` navigation, `?skill_editor=1`, port `8765`, or `dist-skill-editor` verification.
- No UI redesign, copy edit, CSS class rename, route restructure, package dependency, or build-tool change.
- No movement of broad App state into a new global store or large hook.

## Decisions

1. Extract map/debug presentation first.

   These components are mostly leaf renderers over supplied map/debug data. They can move to `webapp/components/battle/` without owning gameplay simulation or changing the playable map flow.

   Alternative considered: extract the whole battle scene container first. Rejected because the battle scene currently crosses camera, runtime events, enemies, drops, minimap, VFX, pause UI, and rest-area state.

2. Treat procedural spawn debug as display-only.

   `ProceduralSpawnDebugPanel` should move as a small presentational component that receives the existing debug summary and slices/displays the same values. It must not own spawn planning or regenerate monster packs.

   Alternative considered: move procedural spawn plan creation with the panel. Rejected because spawn generation is gameplay/runtime behavior and belongs in a separate runtime-focused change if moved.

3. Extract character panel only after its data surface is clear.

   The character panel can become `webapp/components/character/CharacterInfoPanel.tsx`, but it should initially receive the same `state` and `player` values or a narrow view model produced by unchanged helpers. App state ownership should remain in `App.tsx`.

   Alternative considered: move character stat recalculation with the panel. Rejected because stat recalculation affects gameplay-facing data and save/runtime state.

4. Split skill-board presentation separately from inventory and runtime.

   Board cell rendering and support preview display are related to inventory items but have distinct Sudoku board rules and hover/placement presentation. A focused `webapp/components/skill-board/` boundary is clearer than expanding `components/inventory/`.

   Alternative considered: extract all board placement and drag/drop rules with the visual cells. Rejected because placement legality, floating item state, and tooltip ownership are cross-cutting and should stay App-owned until separately scoped.

5. Use thin shared types only when imports require them.

   If extracted modules need `Gem`, `Cell`, `SupportPreview`, or related view shapes, introduce type-only files that preserve the current fields. Runtime helpers should remain pure and deterministic when moved.

   Alternative considered: import types from `App.tsx`. Rejected because that would create a backwards dependency on the monolith and weaken the extraction boundary.

## Risks / Trade-offs

- Type extraction accidentally changes shapes -> Mitigation: move exact type definitions first, keep field names and optionality unchanged, and run focused TypeScript/build checks.
- Circular imports between `App.tsx` and extracted modules -> Mitigation: keep extracted modules leaf-oriented and place shared shapes/helpers in one-directional type/utility modules.
- Visual regression from moved JSX -> Mitigation: preserve class names, DOM order, text, and render callbacks, then verify in the playable WebApp screenshot.
- Skill-board extraction grows too large -> Mitigation: split board cells, board display helpers, and placement hooks into separate tasks and stop before moving ownership.
- Existing in-progress runtime OpenSpec work overlaps with skill behavior -> Mitigation: do not move skill event generation, consumption, projectile behavior, damage, targeting, or VFX scheduling in this change.
