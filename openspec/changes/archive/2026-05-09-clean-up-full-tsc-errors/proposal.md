## Why

`npm test` and `npm run build` pass, but the full WebApp TypeScript check still fails with many existing strict-type errors. This should be tracked as its own cleanup change because the scope is larger than the current App module extraction finish work and cuts across generated data shapes, runtime view models, and nullable UI state.

## What Changes

- Add a dedicated WebApp typecheck cleanup effort whose acceptance target is `npx tsc --noEmit --pretty false`.
- Fix existing TypeScript errors without changing playable WebApp behavior, backend coupling, generated gameplay behavior, or the current App module extraction scope.
- Group fixes by ownership area before editing: seed/static data typing, skill preview typing, battle view model adapters, monster skill metadata, map data nullability, equipment runtime helpers, and disabled skill-editor-only surfaces.
- Preserve the existing passing `npm test` and `npm run build` checks while making the full TypeScript check pass.

## Capabilities

### New Capabilities
- `webapp-typecheck-cleanliness`: Covers the WebApp requirement that the full repository TypeScript check for the client-side WebApp passes and remains part of verification for broad frontend maintenance.

### Modified Capabilities
- None.

## Impact

- Affected code is expected to be TypeScript under `webapp/`, primarily existing type declarations, adapters, guards, readonly/static data conversion points, and null-safe render paths.
- No backend APIs, services, server runtimes, or server-generated gameplay behavior may be introduced.
- No intended gameplay, visual, save-data, generated data, or module-extraction behavior changes.
- Verification includes `npx tsc --noEmit --pretty false`, `npm test`, `npm run build`, and, for any frontend-affecting implementation, actual WebApp browser verification through the project `run.bat` flow with screenshots under `artifacts/screenshots/`.
