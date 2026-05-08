## Why

The playable WebApp is now client-only, but skill runtime ownership is still ambiguous in names, tests, and acceptance evidence. The black hole pull bug showed the failure mode: Python `SkillRuntime` emitted the expected `forced_movement` events while the actual playable frontend runtime skipped them, so backend/tooling tests passed but browser gameplay regressed.

## What Changes

- Make the frontend skill runtime the explicit source of truth for playable skill behavior, event generation, event consumption, damage, status, forced movement, and presentation scheduling.
- Demote Python `SkillRuntime`, `CombatSession`, and `V1WebAppApi.runtime_skill_events` to legacy tooling, reports, import/export, and migration comparison only.
- Replace misleading `canonical` naming in playable frontend skill paths and tests with frontend/playable/client-owned terminology.
- Add frontend-owned runtime tests for each active skill family and for cross-cutting event behavior such as dynamic tick zones, forced movement, status application, kill triggers, and VFX/floating text scheduling.
- Add boundary tests that prevent backend-only or tooling-only runtime tests from being used as playable gameplay acceptance evidence.
- Keep playable verification in the actual WebApp battle view, with screenshots under `artifacts/screenshots/`.

## Capabilities

### New Capabilities
- `frontend-skill-runtime-source`: Defines the frontend-owned skill runtime as the only playable source for skill event generation, event consumption, behavior tests, and browser verification.

### Modified Capabilities
- `v1-minimal-sudoku-gem-loop`: Clarifies that V1 active skill behavior acceptance must come from the frontend playable runtime, while Python skill runtime checks are tooling or comparison evidence only.

## Impact

- Affected frontend: `webapp/App.tsx`, any new frontend skill runtime modules, skill event builders/consumers, runtime state mutation, VFX scheduling, and browser verification scripts.
- Affected tests: frontend runtime tests, static boundary tests, browser/screenshot verification, and Python tests whose names or assertions currently imply canonical playable behavior.
- Affected tooling: Python `SkillRuntime`, `CombatSession`, `V1WebAppApi.runtime_skill_events`, skill reports, and import/export scripts remain available only outside the normal playable WebApp path.
- No backend gameplay service may be added, restored, or called by this change.
