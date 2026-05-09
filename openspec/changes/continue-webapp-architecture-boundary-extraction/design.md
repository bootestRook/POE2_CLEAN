## Context

The completed WebApp extraction passes reduced several presentation areas, but `webapp/App.tsx` still mixes unrelated responsibilities: App shell selection, playable game orchestration, disabled skill-editor tooling, shared domain types, enemy runtime/navigation helpers, player resource helpers, save/inventory/drop handlers, and battle scene presentation. The file remains expensive to search because inactive tooling and active runtime code share names such as skill, runtime, projectile, enemy, tooltip, and editor.

The project is client-only. The implementation must not introduce backend coupling, server-generated gameplay behavior, new API calls, skill-editor acceptance surfaces, save schema changes, dependency changes, CSS redesign, or gameplay behavior changes. Existing WebApp module-boundary rules still apply: preserve behavior first, abstract later.

## Goals / Non-Goals

**Goals:**

- Make `webapp/App.tsx` a smaller orchestration file rather than the owner of disabled tooling, battle presentation, shared domain shapes, and enemy helper implementations.
- Reduce future search/edit scope by moving inactive skill-editor tooling into an explicitly disabled tooling boundary.
- Establish one-directional imports from App into focused modules by extracting shared type-only domain shapes where needed.
- Move playable battle scene presentation and canvas snapshot assembly behind a focused render-only boundary.
- Move enemy runtime/navigation helper implementations into a focused client-side runtime boundary in a separately verified batch.
- Preserve existing gameplay behavior, rendering behavior, save behavior, storage keys, class names, text, DOM order, runtime data flow, and playable WebApp acceptance flow.

**Non-Goals:**

- No state-management rewrite, global store introduction, route restructure, build migration, or dependency addition.
- No gameplay rebalance, monster AI redesign, damage formula change, projectile behavior change, target selection change, hit timing change, or skill runtime rewrite.
- No CSS redesign, copy edit, class rename, DOM reordering, save schema migration, or storage key change.
- No re-enabling or accepting behavior through the disabled skill editor, `/skill-editor`, `?skill_editor=1`, port `8765`, or `dist-skill-editor`.
- No backend API, server runtime, web API layer, or server-generated gameplay behavior.

## Decisions

1. Extract by architecture responsibility, not just by remaining JSX size.

   The next pass should split `App.tsx` along ownership lines: disabled tooling, shared domain types, playable battle presentation, and enemy runtime helpers. This gives future changes a better search target than continuing to move only small render fragments.

   Alternative considered: continue extracting only leaf UI components. Rejected because the remaining pain comes from mixed runtime/tooling/domain responsibilities, so another leaf-only pass would leave most search noise intact.

2. Isolate disabled skill-editor tooling before active gameplay runtime work.

   The disabled skill-editor panel, request stubs, editor-only types, and arena presentation should move into a clearly named disabled tooling folder. The boundary should preserve the current disabled behavior and must not become an acceptance surface.

   Alternative considered: delete the disabled editor code. Rejected because deletion may be a product/tooling decision beyond this architecture pass and could hide behavior from existing smoke checks.

3. Introduce type-only domain modules only as extraction support.

   Shared shapes such as gems, skill previews, App save payloads, player runtime state, enemy views, battle VFX views, and map progression views should move only when needed to avoid importing from `App.tsx`. These modules should contain no runtime logic, storage access, browser effects, or gameplay calculations.

   Alternative considered: create a comprehensive domain model package first. Rejected because it would invite broad field cleanup and semantic redesign before the extraction proves what shared shapes are actually needed.

4. Make playable battle scene extraction render-only.

   The battle scene module may assemble existing visual props and the existing canvas snapshot from supplied state, refs, callbacks, and helpers. It must not own monster behavior, damage application, projectile lifecycle, target anchoring, drop pickup rules, minimap exploration, or runtime event queues.

   Alternative considered: move the whole battle loop with the scene. Rejected because visual extraction and runtime ownership movement have different risk profiles and verification needs.

5. Move enemy runtime helpers as their own verified runtime batch.

   Enemy navigation, spatial indexing, crowd steering, melee reachability, debug boundary scans, and renderable enemy selection should move together only after their type dependencies are clear. This batch must preserve formulas and behavior exactly and should include focused smoke/test coverage for the moved functions.

   Alternative considered: leave enemy helpers in `App.tsx` indefinitely. Rejected because they are a large source of unrelated search hits and make future monster/runtime work harder to localize.

6. Keep App as the orchestration owner during this change.

   `GameApp` can continue owning high-level React state, refs, save transitions, battle loop wiring, and callbacks while extracted modules receive props and explicit inputs. State ownership changes can be proposed later once boundaries are stable.

   Alternative considered: extract a large `useGameApp` hook. Rejected because it would mostly move the monolith into a hook without reducing responsibility coupling.

## Risks / Trade-offs

- Circular imports between extracted modules and `App.tsx` -> Mitigation: introduce type-only modules first and keep dependencies one-directional from App into features/runtime modules.
- Disabled tooling becomes accidentally re-enabled -> Mitigation: keep the folder and exports explicitly named as disabled tooling and preserve existing throw-only request behavior.
- Battle scene extraction changes render ordering -> Mitigation: preserve DOM order, class names, canvas placement, layer ordering, and prop values exactly, then verify through the playable WebApp screenshot.
- Enemy runtime helper extraction changes gameplay behavior -> Mitigation: move formulas without edits, add focused checks for exported helpers, run existing smoke tests, and verify the playable battle view.
- Type extraction grows into model redesign -> Mitigation: keep field names, optionality, literal values, and semantics unchanged; avoid renaming or normalizing shapes.
- The App file remains large after this pass -> Mitigation: accept incremental reduction and stop before crossing into state-management rewrite or gameplay redesign.
