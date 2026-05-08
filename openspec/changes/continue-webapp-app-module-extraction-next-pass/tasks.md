## 1. Baseline And Boundaries

- [x] 1.1 Inspect `git status --short` and record unrelated dirty files before each extraction group.
- [x] 1.2 Re-read `docs/webapp-module-boundaries.md` and the active `webapp-app-module-extraction` spec before editing.
- [x] 1.3 Map the current `webapp/App.tsx` regions for tooltip helpers, inventory/equipment presentation, guide/debug overlays, and legacy VFX display helpers.
- [x] 1.4 Mark the in-scope and out-of-scope App-owned runtime areas in the implementation notes before the first edit.

## 2. Tooltip Extraction

- [x] 2.1 Extract tooltip view-model normalization helpers from `webapp/App.tsx` into focused client-side tooltip modules.
- [x] 2.2 Keep hover state, tooltip positioning, and owner state wiring in `webapp/App.tsx` while moving only pure display preparation.
- [x] 2.3 Verify tooltip rendering in rest-area inventory/equipment flows with build/test checks and a playable WebApp screenshot.
- [x] 2.4 Commit only the tooltip extraction files after verification passes.

## 3. Inventory And Equipment Presentation Extraction

- [x] 3.1 Extract remaining inventory/equipment render-only helpers into focused presentation components or helper modules.
- [x] 3.2 Keep item storage, drag/drop rules, equipment recalculation, gem mutation, and save orchestration in their current App-owned paths.
- [x] 3.3 Verify rest-area inventory/equipment rendering, tooltip hover behavior, and gem display with build/test checks and a playable WebApp screenshot.
- [x] 3.4 Commit only the inventory/equipment extraction files after verification passes.

## 4. Battle Guide And Debug Overlay Extraction

- [x] 4.1 Extract battle guide/debug overlay views into render-only battle component modules.
- [x] 4.2 Preserve existing guide payload consumption and avoid recalculating target selection, damage zones, projectile timing, or runtime events.
- [x] 4.3 Verify the playable battle view still renders enemies, skill effects, guide/debug overlays where enabled, and no black screen.
- [x] 4.4 Commit only the guide/debug overlay extraction files after verification passes.

## 5. Legacy VFX Presentation Cleanup

- [x] 5.1 Extract remaining legacy VFX sprite/frame/display helpers that do not own projectile lifecycle or hit logic.
- [x] 5.2 Keep projectile spawning, movement, collision, hit timing, damage application, event consumption, and follow-up effects in existing runtime paths.
- [x] 5.3 Verify battle VFX rendering through the actual playable WebApp view with build/test checks and screenshot evidence.
- [x] 5.4 Commit only the VFX presentation cleanup files after verification passes.

## 6. Final Verification

- [ ] 6.1 Run `openspec validate continue-webapp-app-module-extraction-next-pass --strict`.
- [ ] 6.2 Run the repo's relevant WebApp checks, including build, smoke tests, and focused TypeScript checks for touched files.
- [ ] 6.3 Launch the project through the root `run.bat` flow and verify the actual playable WebApp, not the skill editor.
- [ ] 6.4 Store screenshots under `artifacts/screenshots/` and ensure no screenshots or logs are written to the repository root.
- [ ] 6.5 Inspect the final diff to confirm no backend coupling, CSS-only churn, gameplay runtime rewrites, save/schema changes, or unrelated dirty files were included.
- [ ] 6.6 Update task checkboxes and implementation notes with verification results before final handoff.
