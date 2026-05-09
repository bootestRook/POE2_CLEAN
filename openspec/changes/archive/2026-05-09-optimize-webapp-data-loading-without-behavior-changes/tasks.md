## 1. Baseline And Scope

- [x] 1.1 Inspect current dirty worktree changes in WebApp files and record which edits are unrelated so they are preserved.
- [x] 1.2 Review the archived `plan-next-webapp-app-extraction` result and the current `openspec/specs/webapp-app-module-extraction/spec.md` so the optimization follows the latest extracted tooltip, inventory/equipment, and save-storage boundaries.
- [x] 1.3 Measure current `run.bat --check` or equivalent build output, initial bundle files, and `/webapp` first-load behavior; store logs/screenshots under `artifacts/`.
- [x] 1.4 Inventory all large WebApp data imports across `webapp/App.tsx`, newly extracted WebApp modules, and data/runtime utilities; classify each as first-paint required, normal-play required before action, optional action-scoped, or debug/GM-only.
- [x] 1.5 Identify the minimal frontend modules in scope and confirm no backend, server runtime, API call, save-shape, gameplay-rule, CSS, text, class-name, or DOM-order change is required.

## 2. Data Ownership And Loader Structure

- [x] 2.1 Create focused client-side data ownership folders for large generated data, such as `webapp/data/generated/` or `webapp/data/equipment/`.
- [x] 2.2 Move optional large generated data files into the chosen data folders without changing their serialized content.
- [x] 2.3 Add small typed loader/accessor modules that use cached dynamic imports for optional large data.
- [x] 2.4 Keep first-paint-required seed data on the startup path only when removing it would change title, save, or rest-area rendering behavior.
- [x] 2.5 Place loader/accessor modules so extracted tooltip, inventory/equipment, save-storage, and future App modules can depend on them without importing from `webapp/App.tsx` or creating circular dependencies.

## 3. Behavior-Preserving Call Site Migration

- [x] 3.1 Replace direct startup-path imports of optional equipment catalog data with loader/accessor calls at equipment generation and GM/debug boundaries.
- [x] 3.2 Replace direct startup-path imports of optional gem drop or option catalogs with loader/accessor calls where those catalogs are first used.
- [x] 3.3 Replace direct startup-path imports of optional skill level data only where the lookup can remain deterministic and action-scoped.
- [x] 3.4 Ensure lazy loading does not occur inside per-frame combat, movement, enemy AI, VFX, rendering, or per-enemy loops.
- [x] 3.5 Update extracted modules only through narrow imports or accessor calls; do not move App-owned state, drag/drop ownership, save writes, storage keys, or gameplay runtime ownership as part of this optimization.
- [x] 3.6 Preserve all deterministic outputs for equipment generation, drops, skill previews, GM options, and current map-entry flows.

## 4. Regression Guards

- [x] 4.1 Add or update smoke checks that fail when large optional generated data is directly imported from `webapp/App.tsx`, newly extracted presentation modules, or another startup-critical module.
- [x] 4.2 Add deterministic equivalence tests for representative equipment generation inputs, gem drop pool/options, skill level lookups, and initial state behavior.
- [x] 4.3 Add a bundle/import guard that records or checks the initial WebApp bundle no longer includes optional large data through direct eager imports.
- [x] 4.4 Update any existing path-based smoke checks to recognize the new data folder structure without weakening behavior checks.

## 5. Verification

- [x] 5.1 Run `npm run build` and record pass/fail plus any bundle-size warning changes.
- [x] 5.2 Run `npm test` and record pass/fail, identifying any unrelated pre-existing failures if present.
- [x] 5.3 Launch or match the project root `run.bat` WebApp flow and verify `/webapp` first load, save selection, rest area, map selection, and first playable battle.
- [x] 5.4 Capture screenshots of the actual playable WebApp under `artifacts/screenshots/` and describe the visible result.
- [x] 5.5 Confirm no screenshots, logs, traces, or generated verification files were left in the repository root.
