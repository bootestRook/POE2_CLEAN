## Context

`webapp/App.tsx` is still 18k+ lines after the previous extraction passes. The remaining dense areas include battle projectile views, hit VFX views, player buff overlays, skill guide/debug overlays, and visual helper functions near the end of the file. Some adjacent modules already exist under `webapp/components/battle/`, so the next pass can continue the same client-only extraction pattern without inventing a new architecture.

The important constraint is that these views are close to the playable runtime. The extraction must move rendering and pure display calculations only. `GameApp` remains the owner of runtime state, event consumption, enemy state, projectile lifecycle, damage, targeting, hit timing, loot, save orchestration, and map-run progression.

## Goals / Non-Goals

**Goals:**

- Move remaining projectile body and hit VFX presentation into focused battle component modules.
- Move player buff overlay rendering into a focused battle component module.
- Move skill guide/debug overlay rendering into focused battle component modules.
- Move shared visual helpers only when they are pure, deterministic, and needed by extracted views.
- Keep each extraction small enough to test and commit independently.

**Non-Goals:**

- Do not move `GameApp`, the main battle loop, enemy creation/movement/AI, skill event consumption, damage calculation, target selection, projectile lifecycle, hit timing, drop generation, save data, or storage flows.
- Do not change CSS, class names, DOM order, text, runtime event payloads, persisted state shape, package dependencies, route behavior, or asset content.
- Do not use `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, or `dist-skill-editor` as verification surfaces.
- Do not add backend calls or server-generated gameplay behavior.

## Decisions

1. Extract visual helper modules before view modules.

   Rationale: projectile and hit components depend on repeated display-only helpers such as VFX kind lookup, sprite sheet lookup, scale normalization, opacity, travel style, and damage text formatting. Extracting those helpers first reduces import churn in later components.

   Alternative considered: move each component with duplicated local helper copies. Rejected because duplicate helpers would increase drift risk and make smoke failures harder to diagnose.

2. Keep runtime data ownership in `App.tsx` and pass existing values through props.

   Rationale: the goal is safer editing, not runtime redesign. Extracted components should receive the same `FireBolt`, `HitVfx`, `PlayerBuff`, `PlayerRuntimeState`, guide package, debug options, and projection callbacks that App already uses.

   Alternative considered: introduce hooks that own projectile or guide state. Rejected because that crosses into runtime ownership and makes behavior changes likely.

3. Split implementation into independently verified groups.

   Rationale: previous work caught missed imports and broken enemy population. This pass should keep every group small enough for `npm run build`, `npm test`, focused TypeScript checks, playable WebApp verification, and one commit before continuing.

   Alternative considered: move all remaining battle presentation in one commit. Rejected because the diff would be too broad to review safely.

4. Treat guide/debug overlays as presentation only.

   Rationale: guide layers may calculate screen geometry from supplied runtime/package values for rendering, but they must not select targets, choose hit timing, consume skill events, or alter damage-zone origins.

   Alternative considered: move guide helper calculations together with runtime targeting helpers. Rejected because that would blur the boundary between visual overlays and gameplay behavior.

## Risks / Trade-offs

- Missing import or type drift in extracted components -> Mitigation: run focused `tsc --noEmit` or build after each group and keep the prop surface shape-preserving.
- Visual regression in projectile or hit VFX layering -> Mitigation: preserve rendering order and class names exactly, then verify in the actual playable WebApp screenshot.
- Accidental gameplay movement while extracting nearby code -> Mitigation: stop if a helper reads/writes runtime state, mutates enemies/player/projectiles, consumes events, or changes hit/damage/drop behavior.
- Existing App.tsx coupling may force a component to accept many props -> Mitigation: accept verbose props for this pass; reduce prop shape only in a later explicitly scoped change.
