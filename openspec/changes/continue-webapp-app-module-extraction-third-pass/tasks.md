## 1. Baseline And Scope Control

- [x] 1.1 Inspect `git status --short` and record unrelated dirty files before each extraction group.
- [x] 1.2 Re-read `docs/webapp-module-boundaries.md`, the active `webapp-app-module-extraction` spec, and this change's design before editing.
- [x] 1.3 Map the current `webapp/App.tsx` regions for projectile body views, hit VFX views, player buff overlays, skill guide overlays, and pure visual helpers.
- [x] 1.4 Record in-scope and out-of-scope App regions in implementation notes before the first code edit.

## 2. Pure Visual Helper Extraction

- [x] 2.1 Extract VFX kind selection, sprite sheet lookup, display scale, opacity, and visual style helpers into focused client-side battle utility modules.
- [x] 2.2 Keep helpers deterministic and dependent only on explicit inputs; do not move runtime state, event queues, collision, hit timing, damage, target selection, or lifecycle logic.
- [x] 2.3 Run `npm run build`, `npm test`, and focused TypeScript checks for touched helper modules.
- [x] 2.4 Launch or match the root `run.bat` WebApp flow, verify the actual playable battle view, save screenshots under `artifacts/screenshots/`, and commit only this helper extraction group.

## 3. Projectile Body View Extraction

- [ ] 3.1 Extract `FireBoltView`, `BurningShotProjectileView`, `SparkleProjectileView`, and their render-only child markup into focused battle component modules.
- [ ] 3.2 Preserve existing props, class names, DOM order, data attributes, style formulas, sprite-frame behavior, and rendering order.
- [ ] 3.3 Keep projectile spawning, movement, collision, pierce/chain behavior, target selection, hit timing, damage, and runtime event consumption in their current App-owned paths.
- [ ] 3.4 Run `npm run build`, `npm test`, focused TypeScript checks, playable WebApp verification, screenshot capture under `artifacts/screenshots/`, and commit only this projectile view group.

## 4. Hit VFX And Player Buff View Extraction

- [ ] 4.1 Extract `HitVfxView`, `SparkleHitVfxView`, and hit decoration render-only markup into focused battle component modules.
- [ ] 4.2 Extract `PlayerBuffLayer` into a focused battle component module while preserving supplied player/buff props and rendered markup.
- [ ] 4.3 Keep damage application, floating text generation, target anchoring, follow-up suppression, buff timing, guard state, movement channels, and runtime mutations in their current App-owned paths.
- [ ] 4.4 Run `npm run build`, `npm test`, focused TypeScript checks, playable WebApp verification, screenshot capture under `artifacts/screenshots/`, and commit only this hit/buff view group.

## 5. Skill Guide And Debug Overlay Extraction

- [ ] 5.1 Extract `FrontendSkillGuideLayer`, `DamageZoneRuntimeGuide`, and remaining guide/debug render-only helpers into focused battle component modules.
- [ ] 5.2 Reuse existing `FireBoltAlignmentDebug` and preserve current debug option props, labels, class names, DOM order, data attributes, and projection callbacks.
- [ ] 5.3 Keep target selection, guide payload ownership, damage-zone origin decisions, hit timing, damage, pierce/chain, monster behavior, and skill event results in their current runtime paths.
- [ ] 5.4 Run `npm run build`, `npm test`, focused TypeScript checks, playable WebApp verification, screenshot capture under `artifacts/screenshots/`, and commit only this guide/debug group.

## 6. Final Verification And Handoff

- [ ] 6.1 Run `openspec validate continue-webapp-app-module-extraction-third-pass --strict`.
- [ ] 6.2 Run final `npm run build`, `npm test`, and focused TypeScript checks for all touched modules.
- [ ] 6.3 Launch the project through the root `run.bat` flow and verify the actual playable WebApp battle/rest flow, not the skill editor.
- [ ] 6.4 Ensure screenshots, logs, traces, and generated evidence are under `artifacts/` and not in the repository root.
- [ ] 6.5 Inspect the final diff to confirm no backend coupling, dependency changes, CSS-only churn, gameplay runtime rewrites, save/schema changes, or unrelated dirty files were included.
- [ ] 6.6 Update task checkboxes and implementation notes with verification results before final handoff.
