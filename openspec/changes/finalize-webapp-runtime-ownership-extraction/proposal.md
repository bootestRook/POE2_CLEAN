## Why

`webapp/App.tsx` has already been reduced through presentation and helper extraction, but the remaining maintenance pain is runtime ownership: skill event consumption, damage application, and battle-loop wiring are still embedded in the App file. This change is intended to be the final architecture extraction pass before returning focus to new gameplay/content work.

## What Changes

- Extract the playable skill event consumption boundary first, covering `consumeSkillEventTimeline`, scheduled event consumption, immediate event batching, active damage-zone tick routing, projectile follow-up suppression, VFX queue updates, status routing, forced movement routing, and damage-event routing.
- Extract the damage application boundary second, covering `applyDamageEventBatch`, enemy HP and energy-shield mutation, kill detection, on-kill event emission, drop/progression side effects, player on-hit recovery, and combat-log side effects.
- Consider a narrow `stepGame` / battle-loop wiring extraction only after the two runtime ownership boundaries above are stable, tested, and visually verified.
- Update source-text and smoke checks so protected invariants follow the new owner modules instead of requiring the functions to remain in `webapp/App.tsx`.
- Define this as the final App decomposition pass: after completion, remaining App code is acceptable when it is shell routing, state/ref initialization, cross-domain wiring, or intentionally deferred gameplay orchestration.
- Preserve existing gameplay behavior, frontend-only runtime ownership, rendering behavior, storage keys, save schema, text, class names, event payload semantics, and playable WebApp acceptance flow.
- Do not add backend coupling, server gameplay behavior, new API calls, skill-editor acceptance, dependency changes, CSS redesign, gameplay rebalance, or alternate gameplay runtimes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `webapp-app-module-extraction`: Add final runtime ownership extraction requirements for event consumption, damage application, optional battle-loop wiring, invariant checks, and the stop condition for further App decomposition.

## Impact

- Affected code: `webapp/App.tsx`, focused modules under `webapp/runtime/` and possibly `webapp/hooks/`, shared type-only modules under `webapp/types/`, and source/smoke tests such as `webapp/smoke-test.mjs`.
- Verification: OpenSpec validation, focused runtime/source checks, TypeScript/build/test flow, and actual playable WebApp browser verification through the project `run.bat` flow with screenshots stored under `artifacts/screenshots/`.
- No backend APIs, server runtimes, external services, dependency changes, save migrations, storage-key changes, CSS redesign, or skill-editor routes are in scope.
