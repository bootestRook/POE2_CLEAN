## 1. Baseline And Boundaries

- [x] 1.1 Inspect `git status --short`, current branch, existing OpenSpec changes, and `docs/webapp-module-boundaries.md`; identify unrelated dirty files and overlapping in-progress changes before editing.
- [x] 1.2 Inspect `webapp/App.tsx` ownership areas for disabled skill-editor tooling, shared domain types, playable battle scene presentation, enemy runtime helpers, save/inventory/drop handlers, and App orchestration.
- [x] 1.3 Run the current baseline checks or document pre-existing blockers before extraction begins.
- [x] 1.4 Confirm the implementation will remain client-only and will not use backend APIs, server runtime behavior, `/skill-editor`, `?skill_editor=1`, port `8765`, `dist-skill-editor`, or skill-editor surfaces as acceptance evidence.

## 2. Shared Type Boundary

- [x] 2.1 Identify the minimum shared shape definitions required by the first extraction batch and create thin type-only modules under `webapp/types/` or an equivalent focused WebApp type boundary.
- [x] 2.2 Move only shape-preserving type definitions needed by extracted modules, preserving field names, optionality, literal values, and semantics.
- [x] 2.3 Update imports so extracted modules do not import types from `webapp/App.tsx`.
- [x] 2.4 Run focused TypeScript/build checks and review the diff to confirm no runtime logic, storage access, browser side effects, backend calls, or gameplay calculations were added to type modules.

## 3. Disabled Skill-Editor Tooling Boundary

- [x] 3.1 Move disabled skill-editor request stubs, editor-only response types, editor panel presentation, test arena result views, editor form controls, and editor-only helpers into an explicitly named disabled tooling module boundary.
- [x] 3.2 Preserve current disabled behavior, throw-only request paths, storage keys, text, class names, DOM structure, and imports without enabling skill-editor acceptance routes or tooling.
- [x] 3.3 Keep playable WebApp state and runtime ownership in `webapp/App.tsx`; pass existing values and callbacks through props where the disabled boundary remains referenced.
- [x] 3.4 Run focused checks, `npm run build`, `npm test` or document unrelated blockers, and review the diff for backend coupling, CSS, copy, dependency, save-schema, gameplay, or skill-editor acceptance changes.

## 4. Playable Battle Scene Presentation Boundary

- [ ] 4.1 Extract terrain layers, battle entity/effect/text layers, canvas geometry snapshot assembly, minimap, drops, boss portal, rest-area interactables, boss HUD, and player resource overlay wiring into a focused playable battle scene presentation module.
- [ ] 4.2 Preserve existing DOM order, class names, aria labels, layer ordering, canvas placement, projection behavior, rendering gates, text, and callback behavior.
- [ ] 4.3 Keep gameplay state, refs, runtime event queues, monster behavior, damage application, projectile lifecycle, target anchoring, drop pickup rules, minimap exploration, and map-run progression ownership outside the presentation module.
- [ ] 4.4 Run focused TypeScript/build checks and review the diff for rendering-order, gameplay, CSS, copy, backend, dependency, storage, or save-schema changes.

## 5. Enemy Runtime Helper Boundary

- [ ] 5.1 Move enemy spatial indexing, navigation context creation, grid helpers, wall scoring, crowd steering, melee reachability, collision separation, renderable enemy selection, and runtime debug boundary scan helpers into focused client-side runtime modules.
- [ ] 5.2 Preserve existing constants, formulas, deterministic behavior, function inputs, function outputs, map walkability usage, runtime-tier behavior, player contact behavior, and debug scan semantics.
- [ ] 5.3 Update the playable battle path to consume the extracted runtime helpers without creating backend coupling, alternate runtimes, skill-editor acceptance paths, duplicate target selection, or duplicate damage application.
- [ ] 5.4 Add or update focused smoke/test coverage for moved enemy runtime helper paths to catch import leaks, formula drift, circular dependencies, missing exports, and unintended monster runtime behavior changes.
- [ ] 5.5 Run focused TypeScript/build checks and review the diff for gameplay, backend, dependency, CSS, copy, storage, save-schema, or acceptance-surface changes.

## 6. Verification And Artifact Hygiene

- [ ] 6.1 Run `npm run build`.
- [ ] 6.2 Run `npm test` or document any pre-existing unrelated blocker.
- [ ] 6.3 Launch or match the actual WebApp through the project `run.bat` flow and exercise the playable battle view affected by the extracted boundaries.
- [ ] 6.4 Capture frontend verification screenshots under `artifacts/screenshots/` and describe the visible result.
- [ ] 6.5 Confirm no screenshots, logs, traces, or generated verification artifacts were left in the repository root.
- [ ] 6.6 Review the final diff to confirm no unrelated refactors, gameplay behavior changes, save schema changes, storage key changes, CSS redesign, copy edits, backend calls, dependency changes, or skill-editor acceptance changes were introduced.
