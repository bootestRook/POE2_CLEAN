## Why

`webapp/App.tsx` is still over 18k lines and its remaining low-risk presentation code sits close to the playable `GameApp` runtime. A third extraction pass should reduce accidental edit risk by moving the remaining render-only battle/VFX surfaces and pure visual helpers out before any higher-coupling runtime work is considered.

## What Changes

- Continue behavior-preserving extraction from `webapp/App.tsx` into focused client-side modules.
- Prioritize remaining presentation-only battle boundaries: projectile body views, hit VFX views, player buff overlays, and skill guide/debug overlay components.
- Move only pure visual helpers that support those components, such as VFX kind selection, sprite sheet lookup, display scale, opacity, screen-style construction, and damage text formatting.
- Keep App-owned runtime state, refs, save orchestration, battle loop, damage calculation, monster movement, target selection, projectile lifecycle, hit timing, drop generation, storage keys, text, class names, DOM order, and rendering order unchanged.
- Do not introduce backend coupling, dependency changes, CSS redesign, route changes, skill-editor verification, or new gameplay simulators.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `webapp-app-module-extraction`: Adds third-pass extraction requirements for remaining battle presentation, projectile/hit VFX views, player buff overlays, and pure visual helpers while preserving playable WebApp behavior.

## Impact

- Affected areas: `webapp/App.tsx`, focused files under `webapp/components/battle/`, optional thin `webapp/types/`, and pure helpers under `webapp/utils/`.
- Verification: `openspec validate`, `npm run build`, `npm test`, focused TypeScript checks for touched modules, and actual playable WebApp verification through `run.bat` with screenshots under `artifacts/screenshots/`.
- No backend, API, server runtime, package dependency, asset, save schema, balance, gameplay runtime, or disabled skill-editor surface is intended.
