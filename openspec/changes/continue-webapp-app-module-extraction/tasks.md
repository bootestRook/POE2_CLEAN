## 1. Baseline And Scope

- [x] 1.1 Inspect current branch and `git status --short`; identify unrelated dirty files before editing.
- [x] 1.2 Run or confirm a buildable WebApp baseline before extraction; stop and report unrelated syntax or build damage if present.
- [x] 1.3 Re-read `docs/webapp-module-boundaries.md` and confirm the target folder for each extraction group before editing.
- [x] 1.4 Map the current `webapp/App.tsx` regions by line range for tool modes, playable panels, tooltips, battle presentation, shared types, hooks, and risky runtime internals.

## 2. Low-Risk Module Extractions

- [x] 2.1 Extract `MapEditorScene` and its private map-editor types/helpers into `webapp/components/map-editor/` without changing behavior.
- [x] 2.2 Extract `SpriteTestScene` and its private sprite-test helpers into `webapp/components/sprite-test/` without changing behavior.
- [x] 2.3 Keep `App()` mode dispatch in `webapp/App.tsx` and update only imports/call sites required by the moved modules.
- [x] 2.4 Build after the tool-mode extraction group and fix only extraction-related issues.

## 3. Playable Leaf Presentation Extractions

- [x] 3.1 Extract rest-area presentation such as `RestAreaScene` and `RestAreaMapInteractableLayer` into `webapp/components/rest-area/`, preserving props, class names, text, and DOM order.
- [x] 3.2 Extract save, map-selection, stash, and GM/tool panels only where they can remain prop-driven and not own App gameplay or save state.
- [x] 3.3 Extract battle HUD/presentation leaves such as boss health, ground-drop layer, playable minimap rendering, and resource panels into `webapp/components/battle/` where safe.
- [x] 3.4 Build after each playable presentation extraction group and fix only extraction-related issues.

## 4. Type And Utility Boundaries

- [x] 4.1 Create thin `webapp/types/` modules only when extracted components need shared types without importing from `App.tsx`.
- [x] 4.2 Move type definitions with field names, optionality, literal values, and semantics unchanged.
- [x] 4.3 Move pure deterministic display helpers into `webapp/utils/` only when they have no React state, browser side effects, storage access, or gameplay ownership.
- [x] 4.4 Check for circular imports after type and utility extraction and resolve them by narrowing imports or moving types, not by adding behavior.

## 5. Tooltip And Battle Visual Boundaries

- [ ] 5.1 Extract tooltip presentation modules only after their needed shared types/helpers are available without importing from `App.tsx`.
- [ ] 5.2 Extract projectile and hit VFX view components only as renderers of supplied runtime state; do not recalculate trajectory, targets, timing, damage, pierce, chain, or damage-zone origins.
- [x] 5.3 Leave high-coupling `GameApp` battle loop, runtime refs, damage application, target selection, monster movement, save orchestration, and skill event consumption in `App.tsx` unless a later change scopes them separately.
- [ ] 5.4 Build after tooltip or battle visual extraction and fix only extraction-related issues.

## 6. Verification And Review

- [x] 6.1 Run the project build/check command used by the WebApp and record pass/fail in the implementation summary.
- [x] 6.2 Launch or match the actual WebApp through the project root `run.bat` flow; do not use skill-editor routes, port `8765`, or `dist-skill-editor`.
- [x] 6.3 Exercise the actual playable WebApp view affected by the extractions and capture a browser screenshot under `artifacts/screenshots/`.
- [x] 6.4 Describe the visible screenshot result and clearly state any frontend behavior that could not be verified.
- [x] 6.5 Confirm no screenshots, logs, captures, or test outputs were written to the repository root.
- [x] 6.6 Review the final diff for no gameplay, copy, CSS, storage, backend, dependency, asset, or skill-editor changes.
