## Context

The archived `continue-webapp-app-module-extraction` change established a main `webapp-app-module-extraction` spec and moved many leaf UI modules out of `webapp/App.tsx`. The file still contains several separable clusters that are not the core playable battle loop: tooltip normalization and equipment tooltip helpers, inventory/equipment display helpers, battle guide/debug overlays, and sprite-backed projectile/hit VFX presentation helpers.

This project is client-only. The next pass must continue the same behavior-preserving approach and must not use backend APIs, disabled skill-editor verification surfaces, or new gameplay simulation paths. Current unrelated worktree edits exist in `webapp/App.tsx`, `webapp/frontendGemDropData.ts`, and `webapp/smoke-test.mjs`; implementation must inspect and work with them rather than reverting them.

## Goals / Non-Goals

**Goals:**

- Reduce `webapp/App.tsx` edit blast radius by extracting another small set of low-risk display and pure helper clusters.
- Preserve existing rendered markup, class names, text, DOM order, storage keys, state ownership, runtime event consumption, and gameplay behavior.
- Keep extracted modules one-directional: component and helper modules may receive props/callbacks, import shared types/helpers, and render supplied data, but they must not import from `App.tsx`.
- Make validation stricter for touched areas by running build, smoke, focused TypeScript checks, and actual playable WebApp screenshots after frontend-affecting work.

**Non-Goals:**

- No movement of the `GameApp` battle loop, runtime refs, save orchestration, damage application, target selection, monster movement, projectile hit timing, skill event generation/consumption, or loot generation.
- No CSS redesign, copy changes, dependency changes, route changes, asset changes, save schema changes, balance changes, or backend coupling.
- No attempt to make full `npx tsc --noEmit` clean unless that is separately scoped; this pass should clear new/touched-module type issues and preserve existing known debt.
- No skill-editor route, `?skill_editor=1`, `view=skill_editor`, port `8765`, or `dist-skill-editor` verification.

## Decisions

1. Extract tooltip view-model helpers before higher-coupling runtime helpers.

   Tooltip normalization, support/equipment label formatting, and display-only helper functions can move into `webapp/components/tooltips/` or `webapp/utils/tooltip*` once their input types are shared. These helpers must not own hover state or inventory state.

   Alternative considered: move all tooltip state and hover behavior into a hook. Rejected for this pass because hover state crosses inventory, board, equipment, and stash surfaces.

2. Extract inventory/equipment presentation helpers as props-first modules.

   Additional cell and panel presentation can move under `webapp/components/inventory/` only when App-owned slot arrays, drag state, save state, and callbacks remain in `App.tsx`. Shared type modules may be introduced for `Gem`, tooltip view data, floating item view state, and equipment display props if needed.

   Alternative considered: extract an inventory state hook. Rejected because it would combine storage, drag/drop, equipment recalculation, tooltip, and stash ownership.

3. Extract battle guide/debug overlays as render-only modules.

   `FrontendSkillGuideLayer`, damage-zone guide views, projectile alignment debug views, and related display-only helpers may move to `webapp/components/battle/` if all trajectory, target, range, and origin calculations remain supplied by existing App/runtime helpers or are passed through unchanged. If moving a helper would require recalculating gameplay decisions inside the component, stop or split the task.

   Alternative considered: move guide calculations into a new battle helper module. Rejected unless the helper is pure display geometry and does not decide gameplay hit timing, target selection, damage, or projectile behavior.

4. Continue VFX extraction only at the presentation boundary.

   Sprite sheet selection, frame indexing, and DOM/canvas fallback rendering helpers may move when they render supplied runtime state. Projectile lifecycle, collision, hit scheduling, follow-up suppression, target anchoring, and damage/floating text generation stay in `App.tsx`.

   Alternative considered: move projectile runtime functions with VFX views. Rejected because it risks duplicating or relocating gameplay behavior.

5. Commit and verify by extraction group.

   Each group should build and pass `npm test` before being committed. Browser verification may be batched for related frontend display groups, but final acceptance must run through `run.bat` and save screenshots under `artifacts/screenshots/`.

## Risks / Trade-offs

- [Risk] Existing dirty WebApp files may overlap target regions -> Mitigation: inspect diffs before editing and preserve user changes.
- [Risk] Type extraction can create circular imports -> Mitigation: move only thin type definitions into `webapp/types/` and avoid runtime imports from type modules.
- [Risk] Display helper extraction accidentally changes text or class names -> Mitigation: move code first with minimal prop surfaces and compare rendered screenshot output.
- [Risk] Guide/VFX extraction drifts into gameplay calculations -> Mitigation: explicitly leave target selection, trajectory timing, damage, hit timing, and event consumption in `App.tsx`.
- [Risk] Full TypeScript remains noisy -> Mitigation: run focused TypeScript filters for touched modules and document any pre-existing full-check errors separately.

## Migration Plan

1. Start by inspecting `git status --short` and relevant dirty diffs.
2. Extract one group at a time: tooltip helpers, inventory/equipment presentation helpers, battle guide/debug overlays, then remaining safe VFX presentation helpers.
3. After each group, run `npm run build`, `npm test`, and focused TypeScript checks for the moved modules.
4. Commit each passing group before proceeding to the next.
5. Run final OpenSpec validation and playable WebApp verification through `run.bat`, with screenshots under `artifacts/screenshots/`.

## Open Questions

- Whether the first implementation group should prioritize tooltip helper extraction or inventory/equipment presentation depends on the dirty `webapp/App.tsx` diff at apply time.
- Full `npx tsc --noEmit` cleanup remains a separate candidate change unless the user explicitly folds it into this pass.
