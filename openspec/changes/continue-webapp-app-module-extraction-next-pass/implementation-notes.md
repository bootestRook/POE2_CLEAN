## Baseline Notes

- Branch: `codex/continue-webapp-app-module-extraction`.
- Pre-existing dirty files at apply start:
  - `webapp/App.tsx`
  - `webapp/frontendGemDropData.ts`
  - `webapp/smoke-test.mjs`
  - `openspec/changes/clean-up-full-tsc-errors/`
- Target frontend module boundaries:
  - Tooltip display/pure helpers: `webapp/components/tooltips/` and optional pure helpers under `webapp/utils/`.
  - Inventory/equipment presentation: `webapp/components/inventory/`.
  - Battle guide/debug overlays: `webapp/components/battle/`.
  - Legacy VFX presentation helpers: `webapp/components/battle/`.
- Current `webapp/App.tsx` low-risk candidate regions:
  - Tooltip item view helper near `createFrontendItemTooltipView`.
  - Tooltip normalization, tag replacement, and equipment tooltip formatting helpers around the later tooltip helper block.
  - Battle guide/debug overlay components around `FrontendSkillGuideLayer`, `DamageZoneRuntimeGuide`, and `FireBoltAlignmentDebug`.
  - VFX display helpers around `projectileVfxKind`, sprite frame helpers, `FireBoltView`, and `HitVfxView`.
- Out of scope for this pass unless separately stopped and redesigned:
  - `GameApp` battle loop and runtime refs.
  - Damage application, target selection, monster movement, loot generation, save orchestration, storage keys, skill event generation/consumption, projectile hit timing, and projectile lifecycle.
  - The pre-existing `finishCompletedProjectileBody` dirty runtime change in `webapp/App.tsx`.
- Verification surface:
  - Static checks: `openspec validate`, `npm run build`, `npm test`, and focused TypeScript checks for touched files.
  - Frontend acceptance: project root `run.bat`, actual playable WebApp, screenshots under `artifacts/screenshots/`.

## Tooltip Extraction

- Moved shared tooltip view-model types and `createFrontendItemTooltipView` into `webapp/components/tooltips/tooltipViewModel.ts`.
- Left tooltip hover state, positioning, comparison behavior, inventory state, equipment state, and save/runtime ownership in `webapp/App.tsx`.
- Verification:
  - `npm run build` passed.
  - `npm test` passed.
  - `openspec validate continue-webapp-app-module-extraction-next-pass --strict` passed.
  - Focused TypeScript filter for `tooltipViewModel`, `GemTooltipOverlay`, and `TooltipPrimitives` produced no matching errors; full `tsc --noEmit` still has existing broader type debt outside this split.
  - `run.bat` served the playable WebApp at `http://127.0.0.1:8766/`; screenshot `artifacts/screenshots/tooltip-extraction-rest-area-tooltip.png` shows the rest-area inventory open with a gem tooltip rendering name, level, tags, damage, attack interval, mana cost, and rules.

## Inventory Presentation Extraction

- Moved the floating dragged-item view into `webapp/components/inventory/FloatingGemView.tsx`.
- Left drag state, drag/drop rules, inventory slots, equipment slots, stash ownership, save updates, and gem mutation in `webapp/App.tsx`.
- Updated the smoke assertion for the current editor-map terrain snapshot expression so the existing smoke suite matches the App code path under test.
- Verification:
  - `npm run build` passed.
  - `npm test` passed.
  - `openspec validate continue-webapp-app-module-extraction-next-pass --strict` passed.
  - Focused TypeScript filter for `FloatingGemView` produced no matching errors; full `tsc --noEmit` still has broader existing type debt outside this split.
  - `run.bat` served the playable WebApp at `http://127.0.0.1:8766/`; screenshot `artifacts/screenshots/floating-gem-extraction-drag.png` shows the rest-area inventory open while dragging a gem, with one `.floating-gem` and one `.gem-ghost` rendered.

## Battle Guide Debug Extraction

- Moved `FireBoltAlignmentDebug` into `webapp/components/battle/FireBoltAlignmentDebug.tsx`.
- Left guide selection, target choice, projectile spread, damage-zone guide selection, projection helpers, and runtime event behavior in `webapp/App.tsx`.
- Verification:
  - `npm run build` passed.
  - `npm test` passed.
  - `openspec validate continue-webapp-app-module-extraction-next-pass --strict` passed.
  - Focused TypeScript filter for `FireBoltAlignmentDebug` produced no matching errors; full `tsc --noEmit` still has broader existing type debt outside this split.
  - `run.bat` served the playable WebApp at `http://127.0.0.1:8766/`; screenshot `artifacts/screenshots/firebolt-debug-battle-check.png` shows the actual battle map running with terrain visible, generated monster budget/stat text, and auto-release skill logs.

## VFX Presentation Helper Extraction

- Moved `vfxFrameIndex`, `vfxFrameIndexInRow`, and `vfxSpriteStyle` into `webapp/components/battle/vfxSpriteFrame.ts`.
- Left projectile spawning, body movement, collision, hit timing, damage application, event consumption, follow-up suppression, and target anchoring in `webapp/App.tsx`.
- Verification:
  - `npm run build` passed.
  - `npm test` passed after updating the smoke text assertion for the new `vfxFrameIndexInRow(..., clamp)` call.
  - `openspec validate continue-webapp-app-module-extraction-next-pass --strict` passed.
  - Focused TypeScript filter for `vfxSpriteFrame` produced no matching errors; full `tsc --noEmit` still has broader existing type debt outside this split.
  - `run.bat` served the playable WebApp at `http://127.0.0.1:8766/`; screenshot `artifacts/screenshots/vfx-frame-extraction-battle.png` shows the actual battle map running with terrain visible and generated monster budget/stat text.
