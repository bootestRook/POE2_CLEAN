## Context

The WebApp is client-only and currently enters the playable experience through `webapp/App.tsx`. Earlier extraction work already moved many leaf components and helpers into `webapp/components/`, `webapp/features/`, `webapp/state/`, `webapp/runtime/`, `webapp/hooks/`, and `webapp/utils/`. The file is still roughly ten thousand lines and remains expensive to search because it mixes unrelated responsibilities:

- top-level App mode routing and launch flags
- title/save/rest/battle UI shell rendering
- inventory, equipment, stash, tooltip, and skill-board UI composition
- App-owned React state, refs, save/load, autosave, and drag/drop orchestration
- battle loop orchestration and runtime visual state mutation
- monster skill dispatching, event payload construction, pending player-hit wiring, and VFX classification
- player damage mitigation, resource regeneration, block/recovery, and status handling
- procedural spawn/drop/map-run orchestration
- compatibility checks that still search `App.tsx` for behavior that should eventually live in focused modules

The user wants a final plan, not another partial extraction pass. The outcome should make future code placement obvious and stop `App.tsx` from becoming the default destination again.

## Goals / Non-Goals

**Goals:**

- Define the final maintainable role of `webapp/App.tsx`.
- Define where future WebApp code belongs when it is UI, runtime, state, domain types, formatting, data loading, tests, or verification.
- Complete the App decomposition through ordered, independently verified batches.
- Keep current gameplay, save data, text, CSS classes, DOM order, storage keys, runtime event payloads, and visual rendering behavior unchanged during extraction.
- Make source-text and smoke tests follow ownership boundaries so they do not force behavior-preserving code to remain in `App.tsx`.
- Update AI-visible docs so future implementation plans must name a module owner before editing WebApp code.

**Non-Goals:**

- No visual redesign, CSS theme pass, copy rewrite, or layout rework.
- No backend APIs, server runtimes, web API layers, or backend-generated gameplay behavior.
- No save-schema changes or storage-key changes.
- No gameplay balance changes, skill behavior changes, target selection changes, hit timing changes, damage formula changes, projectile path changes, or monster AI behavior changes.
- No skill-editor launch, skill-editor acceptance path, or use of `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, or `dist-skill-editor`.
- No line-count-only micro-splitting after the architecture boundaries are clear.

## Decisions

### 1. `App.tsx` remains the orchestration root, not a zero-line shell

Final `App.tsx` should own only:

- top-level `App` routing between mode surfaces
- launch flags and global viewport shell composition
- App-owned React state/ref initialization that crosses multiple domains
- high-level callback wiring between focused modules
- battle loop entrypoint orchestration until a later hook has a clear single owner
- small adapter calls that intentionally connect separate modules

Target size is a maintainability target, not a strict gate: about 1200-1800 lines is acceptable if responsibilities are clear. The project should not chase an arbitrary sub-1000-line `App.tsx` by creating many tiny files with no search value.

Alternative considered: split `App.tsx` until it is only a router. Rejected because current battle state and cross-module refs are tightly coupled, and forcing them into hooks too early would move complexity instead of reducing it.

### 2. Extract presentation composition before runtime ownership

The first implementation batches should move render-only composition out of App:

1. `webapp/components/inventory/InventoryOverlay.tsx`
2. `webapp/components/inventory/EquipmentPanel.tsx`
3. `webapp/components/skill-board/SkillBoardPanel.tsx` or equivalent focused board presentation module
4. `webapp/components/layout/EntryTitleScreen.tsx`
5. `webapp/components/layout/GameChromeOverlays.tsx` or equivalent shell module

These modules receive existing state and callbacks through props. They do not own save writes, drag/drop rules, board placement, equipment stat recalculation, runtime refs, or gameplay state.

Alternative considered: extract battle runtime first because it is high value. Rejected as the first step because it has the highest coupling and the largest behavior-regression surface.

### 3. Split monster skill runtime into pure helper, event-builder, and App-owned side-effect layers

Monster skill work should settle into these ownership boundaries:

- `webapp/monsterSkillRuntime.ts`: config validation, assignment lookup, timer/candidate selection, release readiness, cooldown bookkeeping.
- `webapp/runtime/monsterSkillPresentation.ts`: pure display/runtime-adapter helpers such as spread angles, zone centers, aim policy, VFX key selection, and suppress-hit-VFX rules.
- `webapp/runtime/monsterSkillEventBuilder.ts`: pure or dependency-injected construction of `SkillEvent` payloads for monster projectiles, damage zones, melee arcs, guard/support pulses, and movement skill event requests.
- `webapp/App.tsx` or a later focused hook: React state/ref mutation, `consumeSkillEventTimeline`, pending hit queues, `setTexts`, `setAreaNovas`, and battle-loop scheduling until those side effects have a single clear owner.

This preserves one canonical playable runtime path while making monster skill logic searchable.

Alternative considered: move `updateMonsterSkillRuntime` and all release functions into one hook immediately. Rejected for the initial architecture pass because it would still need many App refs/setters and would likely become a second monolith.

### 4. Player damage and projectile lifecycle are later focused runtime modules

After monster skill event construction is isolated, player and projectile runtime code can be moved only if formulas are preserved exactly:

- `webapp/runtime/playerDamageRuntime.ts`: player resistance, armor/evasion/block, incoming conversion, resource damage, recovery-on-hit/block, status prevention, and damage-result shape helpers.
- `webapp/runtime/projectileLifecycleRuntime.ts`: deterministic projectile completion/follow-up suppression/anchoring helpers only when they can be isolated without changing event ownership.

App keeps orchestration until the pure runtime modules are stable.

Alternative considered: create one `usePlayableBattleRuntime` immediately. Rejected until pure runtime boundaries are extracted because it would hide several unrelated responsibilities behind a large hook.

### 5. Shared types are allowed only as thin dependency breakers

If extracted modules need shapes currently declared in `App.tsx`, place them in focused type-only modules such as:

- `webapp/types/itemTypes.ts`
- `webapp/types/appStateTypes.ts`
- `webapp/types/battleRuntimeTypes.ts`
- `webapp/types/tooltipTypes.ts`
- `webapp/types/mapProgressionTypes.ts`

Type modules must not read storage, call browser APIs, import large data, mutate gameplay state, or contain runtime formulas.

Alternative considered: keep all types in App and use generics everywhere. Rejected because it keeps circular pressure on `App.tsx` and makes extracted modules harder to search.

### 6. Future code placement is governed by an explicit owner table

Future WebApp plans should use this first-destination table:

| Work kind | First destination |
| --- | --- |
| Inventory/stash/equipment visible UI | `webapp/components/inventory/` |
| Inventory placement/save mutation helpers | `webapp/components/inventory/placementState.ts` or focused state helper |
| Skill-board visible UI | `webapp/components/skill-board/` |
| Support line/preview hooks | `webapp/components/skill-board/` |
| Battle HUD/layers/VFX presentation | `webapp/components/battle/` |
| Playable battle scene composition | `webapp/features/playable-battle/` |
| Monster skill config/candidate logic | `webapp/monsterSkillRuntime.ts` |
| Monster skill event payload construction | `webapp/runtime/monsterSkillEventBuilder.ts` |
| Monster skill VFX/zone/spread helpers | `webapp/runtime/monsterSkillPresentation.ts` |
| Player mitigation/damage/resource formulas | `webapp/runtime/playerDamageRuntime.ts` |
| Enemy navigation/AI helpers | `webapp/runtime/enemyRuntime.ts` |
| Save/load/autosave state helpers | `webapp/state/` or `webapp/utils/frontendSaveStorage.ts` |
| Drop/map-run deterministic helpers | `webapp/state/frontendDropState.ts` |
| Tooltip rendering/formatting | `webapp/components/tooltips/` |
| Rest-area visible UI | `webapp/components/rest-area/` |
| Layout shell and non-gameplay overlays | `webapp/components/layout/` |
| Pure math/formatting/token helpers | `webapp/utils/` |
| Shared shapes only | `webapp/types/` |
| Disabled skill-editor tooling | `webapp/features/disabled-skill-editor/` |

If new work does not fit this table, the task must first update the module-boundary docs/specs or create a focused module plan before implementation.

### 7. Completion is based on ownership clarity, not endless splitting

This architecture task is complete when:

- `App.tsx` no longer contains large render-only inventory/UI shell composition.
- monster skill pure helpers and event building are searchable outside `App.tsx`.
- future module placement rules are documented and tested through source-boundary checks.
- `App.tsx` retains only intentional orchestration and cross-module wiring.
- no extracted module imports from `webapp/App.tsx`.
- smoke tests protect behavior by reading owning modules instead of forcing functions to remain in App.
- playable WebApp build, smoke checks, and screenshot verification pass through the accepted `run.bat` flow.

## Risks / Trade-offs

- Runtime extraction changes gameplay behavior → Keep runtime side effects in App until pure helpers and event builders are isolated; add focused tests before moving side-effect ownership.
- Prop surfaces become large for extracted UI shells → Accept explicit props for the first pass; abstract later only when repeated patterns are real and stable.
- Circular imports appear after moving types → Introduce type-only modules first; extracted modules must not import from `webapp/App.tsx`.
- Smoke tests become weaker after functions move → Update tests to read the exact owning module or a deliberate combined source; do not replace ownership checks with broad text searches.
- Verification slows down because each batch needs browser evidence → Keep batches small and store screenshots/logs under `artifacts/`.
- Future contributors still add code to `App.tsx` by default → Update `docs/webapp-module-boundaries.md`, `docs/webapp-app-decomposition-map.md`, and AGENTS-visible planning guidance so non-trivial WebApp plans must name a module owner before editing.
