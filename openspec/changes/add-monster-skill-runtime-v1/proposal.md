## Why

The current monster runtime has typed monsters, finite melee cadence, and a separate hardcoded boss skill path, but the 40 configured monsters do not yet have reusable, data-driven skills. This change adds client-only monster skills that reuse the existing frontend battle and skill-event systems while keeping range, travel speed, and counterplay bounded for each skill design.

## What Changes

- Add a client-only monster skill runtime that assigns every configured monster a reusable skill definition or boss pattern.
- Add local static monster skill config that can be validated against the existing 40 monster definitions.
- Reuse existing frontend event families where possible: projectile, damage zone, melee arc, chain-like followups, forced movement, buff/status, floating text, hit VFX, and player defensive hit resolution.
- Add new reusable monster modules only where current paths are insufficient: charge, ambush, guard, support, and data-driven boss pattern orchestration.
- Require every monster skill to define finite cast range, minimum cast range where relevant, effect range, and leash/cancel range.
- Bound monster projectile speeds relative to the current player move speed of 250 px/s so projectiles remain dodgeable and visually readable.
- Preserve the client-only project boundary: no backend gameplay API, server runtime, or Python `SkillRuntime` path may drive playable monster skills.

## Capabilities

### New Capabilities

- `monster-skill-runtime-v1`: Defines data-driven, client-only monster skill assignment, reusable monster skill modules, finite range rules, dodgeable projectile speed constraints, and playable WebApp verification requirements.

### Modified Capabilities

- `monster-pack-combat-behavior`: Extends monster type combat behavior so `skill_shape` and monster identity can release finite, module-backed skills through the frontend runtime while still using existing player defensive mitigation.

## Impact

- `configs/monsters/`: Add or extend local static config for monster skill definitions and monster-to-skill assignments.
- `webapp/mapSpawnRuntime.ts`: Materialize monster skill identity/range data into procedural runtime enemies without backend coupling.
- `webapp/App.tsx` and/or new frontend runtime modules: Dispatch monster skill modules, schedule events, consume projectile/zone/hit/VFX/floating-text events, and resolve player damage.
- `webapp/smoke-test.mjs` and focused tests: Validate config coverage, finite skill ranges, projectile speed caps, module dispatch, player mitigation reuse, and client-only boundaries.
- Playable WebApp browser verification: Representative monster skills must be visually verified in the actual battle view with screenshots under `artifacts/screenshots/`.
