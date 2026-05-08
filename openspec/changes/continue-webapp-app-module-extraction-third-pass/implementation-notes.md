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
