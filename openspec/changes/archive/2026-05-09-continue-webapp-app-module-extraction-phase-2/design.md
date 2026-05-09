## Context

The previous App extraction changes established focused WebApp module boundaries and already moved several tooltip, inventory, skill-board, battle presentation, rest-area, layout, frontend state, and utility pieces out of `webapp/App.tsx`. The file remains large, and the remaining code mixes pure display helpers, deterministic client-side adapters, event orchestration, and high-risk combat runtime.

The next plan must be risk-ordered. The safest work is still pure state/view extraction where outputs can be compared by build, smoke test, and visual WebApp checks. The riskiest work is the playable combat runtime: monster AI, damage application, skill event generation/consumption, projectile lifecycle, target selection, and GameApp state flow. That runtime should not be moved as part of this change.

## Goals / Non-Goals

**Goals:**

- Reduce `webapp/App.tsx` through a sequence of behavior-preserving extraction batches.
- Move deterministic frontend loot/drop helpers into `webapp/state/` before touching pickup orchestration.
- Move skill-board support preview hooks into `webapp/components/skill-board/`.
- Move remaining render-only battle presentation helpers into `webapp/components/battle/` only when they do not own runtime decisions.
- Move small display/type/formatting helpers into focused modules only when doing so removes App coupling.
- Verify each batch independently with build, smoke tests, `run.bat`, and actual playable WebApp screenshots.

**Non-Goals:**

- No backend/API/server runtime integration.
- No save schema, storage key, gameplay balance, CSS redesign, copy, or dependency changes.
- No movement of GameApp state flow into a global store or broad hook.
- No extraction of monster AI, boss runtime, player damage, skill event generation, projectile target selection, damage-zone timing, runtime event consumption, pickup completion, or map-run progression.
- No skill-editor route, port `8765`, `dist-skill-editor`, or skill-editor view as acceptance evidence.

## Decisions

1. Start with frontend loot/drop state helpers.

   The functions around map-stage selection, drop rolls, drop kind selection, gem/equipment/map-entry drop creation, and frontend inventory item creation are deterministic client-side adapters. They can move to `webapp/state/frontendDropState.ts` while leaving `spawnFrontendDrops`, `applyFrontendPickup`, `finishDropPickup`, boss portals, and pickup animation/orchestration in `App.tsx`.

   Alternative considered: move the whole drop/pickup flow. Rejected because pickup completion mutates App state, inventory, portals, player proximity, map progression, and save behavior.

2. Split support preview hooks after loot/drop.

   `useLinkedGemIds`, `useSupportPreview`, `useSupportLines`, and `useActiveTargetLines` are board presentation hooks over supplied state and item maps. They belong under `webapp/components/skill-board/` and should keep support modifier calculation and mounted skill recalculation ownership unchanged.

   Alternative considered: move all skill-board placement and support modifier calculation together. Rejected because placement, tooltip hover, drag/drop, and runtime skill recalculation cross multiple App-owned state surfaces.

3. Continue battle render presentation only in narrow pieces.

   Render sorting and animation context helpers already moved into `battleRenderState.ts`. The next battle work should only move JSX presentation wrappers or visual-only style helpers that consume existing projection callbacks and runtime visual state.

   Alternative considered: extract the full playable battle scene composition. Rejected because the current scene still crosses camera, battle loop, drops, minimap, rest-area, runtime debug, VFX, portal, and pause state.

4. Keep smoke tests aligned to extracted ownership.

   Some smoke checks are source-text invariants. When a protected function moves from `App.tsx` to a focused module, the test should follow the owning file or a deliberate combined source, without weakening runtime ownership checks.

   Alternative considered: delete brittle source-text checks. Rejected because these checks currently guard important regressions such as disabled tooling, canvas rendering defaults, and runtime boundary leaks.

5. Commit after each batch.

   Each extraction group should be small enough to review and verify independently. A batch can contain a new module plus import rewiring and necessary test source-boundary updates, but should not mix unrelated extraction targets.

## Risks / Trade-offs

- Moving a helper with hidden App coupling -> Keep signatures explicit, pass dependencies as arguments, and stop if the helper needs App refs, setters, storage writes, or runtime queues.
- Accidentally changing loot probabilities or item payloads -> Preserve formulas, salts, stage gating, item shape, rarity/source text, map-entry behavior, and inventory id generation exactly.
- Support preview hook extraction creates circular imports -> Put only shape-preserving types in shared modules when needed and avoid importing from `App.tsx`.
- Smoke tests become too broad -> Update checks to follow extracted source ownership while preserving specific invariants.
- Visual regressions from render helper movement -> Verify in the actual playable WebApp through `run.bat` and store screenshots under `artifacts/screenshots/`.
