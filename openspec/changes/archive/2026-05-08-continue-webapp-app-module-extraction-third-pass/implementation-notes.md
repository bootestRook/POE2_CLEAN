## Baseline

- Branch/worktree before implementation: only the untracked OpenSpec change directory for this change is present.
- Target frontend boundary: `webapp/components/battle/` for battle-only presentation and `webapp/utils/` only for pure deterministic helpers if needed.
- Acceptance surface: actual playable WebApp launched through the root `run.bat` flow, with screenshots under `artifacts/screenshots/`.

## In Scope

- Pure visual helper extraction for projectile/VFX presentation.
- Projectile body rendering components.
- Hit VFX rendering components.
- Player buff overlay rendering.
- Skill guide/debug overlay rendering.

## Out Of Scope

- `GameApp` ownership, battle loop, runtime refs, skill event consumption, projectile lifecycle, hit timing, target selection, damage calculation, monster movement/AI, enemy creation, drop generation, save data, storage keys, backend/API calls, CSS redesign, and skill-editor verification.

## Region Map

- Pure helper region: `webapp/App.tsx` near `normalizedVfxScale`, `projectileVfxKind`, `damageNumberText`, `floatingTextDamageComponents`, projectile travel/opacity/world-point, and ballistic shadow helpers.
- Projectile body views: `FireBoltView`, `BurningShotProjectileView`, `SparkleProjectileView`.
- Hit VFX views: `HitVfxView`, `SparkleHitVfxView`.
- Player buff overlay: `PlayerBuffLayer`.
- Guide overlays: `FrontendSkillGuideLayer`, `DamageZoneRuntimeGuide`, and existing `FireBoltAlignmentDebug` usage.

## Group 2 Verification

- Extracted pure projectile/VFX display helpers into `webapp/components/battle/projectileVfxPresentation.ts`.
- Removed the retired sprite-sheet VFX asset import chain; `webapp/vfxAssets.ts` now carries only the shared `VfxSpriteSheet` type, and the deleted `assets/battle/vfx/**` files remain deleted.
- Updated smoke coverage to reject the retired sprite-sheet VFX call chain instead of requiring it.
- Verification passed: `npx tsc --noEmit`, `npm run build`, `npm test`.
- `run.bat` playable verification passed on `http://127.0.0.1:8766/`; screenshot saved at `artifacts/screenshots/third-pass-helper-vfx-cleanup-battle.png`.
- Visible result: new save entered rest area, Wang Yang opened map selection, `map_001` loaded without black screen, player/map rendered, and procedural spawn debug showed generated map content.

## Group 3 Verification

- Extracted projectile body presentation into `webapp/components/battle/ProjectileBodyViews.tsx`.
- App now passes existing projection and direction helpers into the component; projectile runtime ownership, lifecycle, hit timing, collision, damage, pierce/chain, and event consumption stayed in App/runtime paths.
- Verification passed: `npx tsc --noEmit`, `npm run build`, `npm test`.
- `run.bat` playable verification passed; screenshot saved at `artifacts/screenshots/third-pass-projectile-views-battle.png`.
- Visible result: new save entered `map_001`, map and player rendered, canvas layers were present, and procedural spawn debug showed generated map content.

## Group 4 Verification

- Extracted hit VFX and player buff presentation into `webapp/components/battle/HitAndBuffViews.tsx`.
- App now passes projection, shape-effect lookup, and z-index base into the extracted hit VFX view, and passes player/buff state into the extracted buff layer.
- Runtime ownership stayed in App/runtime paths: damage application, floating text generation, target anchoring, follow-up suppression, buff timing, guard state, movement channels, and runtime mutations were not moved.
- Updated smoke coverage so the player buff channel visual marker can live in a focused component while the caster-attached damage-zone runtime checks still remain App-owned.
- Verification passed: `npx tsc --noEmit`, `npm run build`, `npm test`.
- `run.bat` playable verification passed; screenshot saved at `artifacts/screenshots/third-pass-hit-buff-views-battle.png`.
- Visible result: new save entered `map_001`, canvas battle view rendered, procedural spawn debug showed 120 generated monster packs with nonzero spawn budget, and combat log showed hit/kill activity.

## Group 5 Verification

- Extracted skill guide and damage-zone guide presentation into `webapp/components/battle/SkillGuideOverlay.tsx`.
- Reused the existing `FireBoltAlignmentDebug` component from the new guide overlay module.
- App keeps the existing guide helper implementations and passes them into the extracted overlay; playable runtime event consumption, hit timing, damage, pierce/chain behavior, monster behavior, and skill results were not moved.
- Updated smoke coverage so damage-zone guide visual separation can live outside `App.tsx`.
- Verification passed: `npx tsc --noEmit`, `npm run build`, `npm test`.
- `run.bat` playable verification passed; screenshot saved at `artifacts/screenshots/third-pass-guide-overlay-battle.png`.
- Visible result: new save entered `map_001`, canvas battle view rendered, procedural spawn debug showed 120 generated monster packs with nonzero spawn budget, and combat log showed auto-cast/kill activity.

## Final Verification

- OpenSpec validation passed: `openspec validate continue-webapp-app-module-extraction-third-pass --strict`.
- Final verification passed: `npx tsc --noEmit`, `npm run build`, `npm test`.
- Final `run.bat` playable verification passed; screenshot saved at `artifacts/screenshots/third-pass-final-battle.png`.
- Visible result: new save entered `map_001`, canvas battle view rendered, procedural spawn debug showed 120 generated monster packs with nonzero spawn budget, and no browser console/page errors were observed.
- Final inspection confirmed no backend coupling, dependency changes, CSS-only churn, gameplay runtime rewrites, save/schema changes, or unrelated dirty files were included.
