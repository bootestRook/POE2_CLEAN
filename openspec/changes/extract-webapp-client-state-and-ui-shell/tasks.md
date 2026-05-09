## 1. Baseline And Scope

- [x] 1.1 Inspect branch and `git status --short`; identify unrelated dirty files and keep them out of this extraction.
- [x] 1.2 Review `docs/webapp-module-boundaries.md`, `webapp/App.tsx`, `webapp/smoke-test.mjs`, and existing extracted component/state folders to confirm target ownership before editing.
- [x] 1.3 Run or confirm the current baseline with `npm run build` and `npm test`; document any pre-existing unrelated blocker before extraction.
- [x] 1.4 Confirm implementation will not use backend APIs, server runtime behavior, skill-editor routes, port `8765`, `dist-skill-editor`, or skill-editor preview surfaces as acceptance evidence.

## 2. UI Shell Extraction

- [x] 2.1 Extract monster-test controls into a focused render-only component that receives existing values and callbacks through props.
- [x] 2.2 Extract game failure, battle pause/settings, and portal confirmation overlays into focused render-only components while preserving text, class names, aria labels, DOM order, button order, and callback behavior.
- [x] 2.3 Extract help text, map debug toggle, spawn plan warning display, and combat feed display where they can move without changing state ownership or rendering gates.
- [x] 2.4 Run focused TypeScript/build checks for the UI shell extraction and review the diff for copy, CSS, DOM-order, backend, storage, save, runtime, or dependency changes.

## 3. Smoke Test Source Boundary Update

- [ ] 3.1 Inventory smoke-test checks that currently use `functionBody(app, ...)`, `app.includes(...)`, or App-only slices for functions planned to move.
- [ ] 3.2 Update smoke-test source reads so protected invariants for moved helpers read the owning extracted source file or an explicit combined source instead of requiring the function to remain in `webapp/App.tsx`.
- [ ] 3.3 Keep App-owned runtime checks tied to the actual owner of `stepGame`, skill event consumption, mutable runtime refs, and playable battle-loop behavior.
- [ ] 3.4 Run `npm test` after the smoke-test boundary update and confirm the checks still protect equivalent behavior.

## 4. Client State And Save Helper Extraction

- [ ] 4.1 Move initial App state, new-save starter state, save payload conversion, autosave, and save migration helpers into focused client-only state/save modules.
- [ ] 4.2 Preserve existing storage keys, payload shape, player-name normalization, starter gem rules, migration behavior, active-slot behavior, and recalculation order.
- [ ] 4.3 Keep React state ownership, runtime refs, effects, battle loop mutation, gameplay event queues, and `GameApp` orchestration in `webapp/App.tsx`.
- [ ] 4.4 Run focused TypeScript/build checks and `npm test` for the state/save extraction.

## 5. Stash And Ownership Helper Extraction

- [ ] 5.1 Move stash page creation, stash normalization, stash item id collection, stash item removal, and stash slot movement helpers into a focused inventory/stash state module.
- [ ] 5.2 Preserve page counts, slot counts, duplicate rejection, foreign-item rejection, board/equipment ownership exclusion, slot movement behavior, and sanitized state results.
- [ ] 5.3 Move equipment slot sanitization or related helper code only if dependency direction remains one-way and App imports do not create cycles.
- [ ] 5.4 Run focused TypeScript/build checks and `npm test` for the stash helper extraction.

## 6. Verification

- [ ] 6.1 Run `npm run build`.
- [ ] 6.2 Run `npm test` and document any remaining pre-existing unrelated blocker.
- [ ] 6.3 Launch or match the actual WebApp through the project `run.bat` flow and exercise the playable view affected by UI shell and inventory/state extraction.
- [ ] 6.4 Capture frontend verification screenshots under `artifacts/screenshots/` and describe the visible result.
- [ ] 6.5 Confirm no screenshots, logs, traces, or generated verification artifacts were left in the repository root.
- [ ] 6.6 Review the final diff to confirm no gameplay runtime, skill runtime, save schema, storage key, copy, CSS, backend, dependency, or skill-editor acceptance changes were introduced.
