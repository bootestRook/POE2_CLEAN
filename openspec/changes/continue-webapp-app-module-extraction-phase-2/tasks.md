## 1. Baseline And Boundaries

- [x] 1.1 Inspect branch, `git status --short --branch`, and current `webapp/App.tsx` line count; identify unrelated dirty files before editing.
- [x] 1.2 Review `docs/webapp-module-boundaries.md`, this OpenSpec change, and current extracted folders to confirm target module ownership.
- [x] 1.3 Run or confirm the current `npm run build` and `npm test` baseline before the first extraction batch.
- [x] 1.4 Confirm verification will use the actual WebApp `run.bat` flow and will not use `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, or `dist-skill-editor`.

## 2. Frontend Loot And Drop State Extraction

- [x] 2.1 Inspect `webapp/App.tsx` loot/drop functions around map stage selection, drop rolls, drop kind selection, map-entry selection, gem weighting, drop payload creation, and inventory item creation.
- [x] 2.2 Create `webapp/state/frontendDropState.ts` for deterministic client-side loot/drop helper functions with explicit dependencies passed as arguments.
- [x] 2.3 Move pure helpers such as map-stage selection, drop roll/chance/attempt calculations, random map level, equipment rarity selection, drop kind selection, map-entry target selection, gem weighting, gem option selection, frontend drop creation, guaranteed map-entry drop creation, next item id, and frontend inventory item creation.
- [x] 2.4 Keep `spawnFrontendDrops`, `applyFrontendPickup`, `beginDropPickup`, `finishDropPickup`, boss portal confirmation/use, player proximity checks, save writes, and inventory mutation orchestration in `webapp/App.tsx`.
- [x] 2.5 Run `npm run build`, `npm test`, and review the diff to confirm formulas, payload fields, storage behavior, save schema, backend coupling, copy, CSS, and runtime orchestration are unchanged.
- [x] 2.6 Launch the WebApp through `run.bat`, exercise an actual playable map/drop or pickup-visible flow, capture a screenshot under `artifacts/screenshots/`, and commit the loot/drop extraction batch.

## 3. Skill-Board Support Preview Hook Extraction

- [x] 3.1 Inspect `useLinkedGemIds`, `useSupportPreview`, `useSupportLines`, and `useActiveTargetLines` in `webapp/App.tsx` and identify any type-only imports needed by extracted hooks.
- [x] 3.2 Create `webapp/components/skill-board/supportPreviewState.ts` and move the support preview hooks without changing relation ids, colors, hover filtering, floating item suppression, or line construction.
- [x] 3.3 Keep placement legality, drag/drop mutation, floating item state, tooltip state, support modifier calculation, mounted skill recalculation, storage, and save ownership unchanged.
- [x] 3.4 Run `npm run build`, `npm test`, and review the diff for behavior-preserving hook movement only.
- [x] 3.5 Launch the WebApp through `run.bat`, open the board/inventory surface, verify support preview or hover line rendering in the actual playable view, capture a screenshot under `artifacts/screenshots/`, and commit the support-preview extraction batch.

## 4. Remaining Battle Presentation Helpers

- [x] 4.1 Inspect remaining battle render helpers in `webapp/App.tsx`, including `renderBattleRenderItem`, `shouldRenderLegacyBattleItem`, `renderBattleEntity`, `battleUnitStyle`, and adjacent render-only style helpers.
- [x] 4.2 Move only render-only helpers into `webapp/components/battle/` modules when they can consume existing state, projection callbacks, constants, and render callbacks through explicit arguments.
- [x] 4.3 Keep monster behavior, player damage, projectile lifecycle, target selection, hit timing, damage-zone origins, damage results, pickup rules, runtime queues, and skill event generation/consumption unchanged in the existing playable App path.
- [x] 4.4 Update smoke-test source-boundary checks only when a protected invariant moves to a new owning module, preserving the invariant rather than weakening it.
- [x] 4.5 Run `npm run build`, `npm test`, and review the diff to confirm class names, DOM order, layer order, text, rendering gates, CSS, copy, backend coupling, and runtime behavior are unchanged.
- [x] 4.6 Launch the WebApp through `run.bat`, enter an actual playable battle view, capture a screenshot under `artifacts/screenshots/`, describe visible canvas/entity/render state, and commit the battle-presentation extraction batch.

## 5. Small Display, Type, And Utility Cleanup

- [x] 5.1 Identify any remaining small pure helpers in `webapp/App.tsx` that are display-only or type-only, such as tooltip positioning wrappers, dropped-item kind display mapping, point parsing, or formatting helpers.
- [x] 5.2 Move helpers only into existing focused modules when the move removes App coupling and does not require runtime state, refs, storage writes, save data, browser side effects, backend calls, or gameplay calculations.
- [x] 5.3 Stop and defer any helper whose extraction requires changing App state flow, runtime event queues, inventory mutation orchestration, map progression, or save/load behavior.
- [x] 5.4 Run `npm run build`, `npm test`, and final diff review for each small cleanup batch before committing.
- [x] 5.5 Launch the WebApp through `run.bat` for any frontend-affecting cleanup, capture screenshots under `artifacts/screenshots/`, and confirm no artifacts were written to the repository root.

## 6. Final Verification And Closeout

- [x] 6.1 Run `npm run build`.
- [x] 6.2 Run `npm test`.
- [ ] 6.3 Run `run.bat --check` and store command output under `artifacts/logs/`.
- [ ] 6.4 Launch or match the actual WebApp through `run.bat`, exercise the affected playable surfaces, and capture final screenshots under `artifacts/screenshots/`.
- [ ] 6.5 Review `git diff` and `git status --short` to confirm there are no unrelated refactors, CSS redesigns, copy edits, dependency changes, save-schema changes, gameplay behavior changes, backend calls, root-level screenshots/logs, or skill-editor acceptance changes.
- [ ] 6.6 Record the final `webapp/App.tsx` line count and summarize which extraction batches were committed.
