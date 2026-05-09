## 1. Baseline And Guardrails

- [x] 1.1 Inspect branch, `git status --short`, and existing dirty files; avoid mixing unrelated work into extraction commits.
- [x] 1.2 Review `docs/webapp-module-boundaries.md`, `webapp/App.tsx`, and current `webapp/components/tooltips/`, `webapp/components/inventory/`, and `webapp/utils/` ownership before editing.
- [x] 1.3 Run a baseline `npm run build` or document any pre-existing unrelated blocker before starting the first extraction batch.
- [x] 1.4 Confirm the implementation will not use backend APIs, server runtime behavior, skill-editor routes, port `8765`, `dist-skill-editor`, or skill-editor preview surfaces as acceptance evidence.

## 2. Tooltip View-Model Extraction

- [x] 2.1 Identify tooltip-only types and helpers in `webapp/App.tsx`, including rich-text highlighting, tooltip stat/tag normalization, support tooltip lines, equipment tooltip lines, and `buildGemTooltipViewModel`.
- [x] 2.2 Move tooltip view-model and formatting helpers into focused modules under `webapp/components/tooltips/` or pure utility modules, preserving text, class names, tag ordering, rarity tones, comparison behavior, icon behavior, and hover state ownership.
- [x] 2.3 Keep App-owned tooltip state, pointer/hover state, drag state, item lookup maps, and `GemTooltipOverlay` usage unchanged.
- [x] 2.4 Update static checks only as needed so required tooltip strings and helper coverage are still enforced after moving code out of `App.tsx`.
- [x] 2.5 Run `npm run build`, `npm test`, playable WebApp verification through `run.bat`, and screenshot capture under `artifacts/screenshots/`; review the diff for unrelated changes.
- [x] 2.6 Commit the tooltip extraction before starting the next extraction batch.

## 3. Inventory And Equipment Helper Extraction

- [x] 3.1 Identify pure inventory/equipment helpers in `webapp/App.tsx`, including item classification, equipment slot targeting, weapon/two-handed checks, source-slot mapping, comparison lookup, and inventory slot removal helpers.
- [x] 3.2 Move pure helper code into focused client-side inventory utility modules while preserving existing helper names or adapter exports where useful for a small diff.
- [x] 3.3 Keep App-owned inventory/equipment arrays, drag/drop state, mutation handlers, save writes, storage writes, equipment stat recalculation, pickup rules, and tooltip state unchanged.
- [x] 3.4 Verify equipment slot behavior, two-handed weapon displacement behavior, bag/stash interactions, and tooltip comparison still use the same data flow.
- [x] 3.5 Run `npm run build`, `npm test`, playable WebApp verification through `run.bat`, and screenshot capture under `artifacts/screenshots/`; review the diff for unrelated changes.
- [x] 3.6 Commit the inventory/equipment helper extraction before starting the next extraction batch.

## 4. Save Storage Utility Extraction

- [x] 4.1 Reassess whether save storage helper extraction is still low enough risk after the previous batches; stop or split into a separate change if payload or migration semantics need alteration.
- [x] 4.2 If safe, move local save-slot/autosave key helpers, load helpers, summary helpers, payload conversion helpers, and clear/save helpers into a focused client-only utility module.
- [x] 4.3 Preserve storage keys, save payload shape, active-slot behavior, legacy autosave migration behavior, error text, timestamp handling, and save/load semantics exactly.
- [x] 4.4 Keep React state ownership, new-game creation, equipment/stat recalculation ownership, and UI save-selection callbacks in `webapp/App.tsx`.
- [x] 4.5 Run `npm run build`, `npm test`, playable WebApp verification through `run.bat`, and screenshot capture under `artifacts/screenshots/`; review the diff for storage, schema, copy, backend, or unrelated changes.
- [x] 4.6 Commit the save storage utility extraction only after verification passes.

## 5. Deferred High-Risk Areas

- [ ] 5.1 Confirm no extraction in this change moved or changed monster AI, enemy navigation, damage resolution, skill event generation, projectile targeting, hit timing, damage-zone origin, runtime event consumption, or battle-loop mutation.
- [ ] 5.2 Record any high-risk combat/runtime candidates discovered during implementation as follow-up work instead of folding them into this change.

## 6. Final Verification

- [ ] 6.1 Run final `npm run build`.
- [ ] 6.2 Run final `npm test` or document any pre-existing unrelated blocker.
- [ ] 6.3 Launch or match the actual WebApp through the project `run.bat` flow and exercise the playable view affected by the completed extraction batches.
- [ ] 6.4 Capture final frontend verification screenshots under `artifacts/screenshots/` and describe the visible result.
- [ ] 6.5 Confirm no screenshots, logs, traces, or generated verification artifacts were left in the repository root.
- [ ] 6.6 Review the final diff to confirm no gameplay, save schema, storage key, copy, CSS, backend, dependency, skill-runtime, or skill-editor acceptance changes were introduced.
