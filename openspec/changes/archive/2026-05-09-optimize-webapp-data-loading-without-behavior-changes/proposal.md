## Why

The WebApp currently loads large generated data and development-oriented option data through the main application path, which makes opening `/webapp` and entering the first playable map more expensive than the visible feature set requires. This change plans a behavior-preserving optimization so normal play can keep the same content and results while paying heavy data costs only when those systems are actually needed.

## What Changes

- Reorganize large WebApp data artifacts into explicit data/generated locations instead of keeping them beside root application modules.
- Replace eager imports of large equipment, gem drop, skill level, and debug/GM-only data with behavior-preserving lazy loaders where the current screen or action does not need the data immediately.
- Preserve all user-visible gameplay, UI text, save data shape, storage keys, map selection, item generation results, drop behavior, skill preview behavior, GM/debug behavior, and combat runtime behavior.
- Add verification that optimized data loading does not remove required runtime data, alter deterministic generation outputs, or change the playable WebApp experience.
- Add bundle/load-budget checks or smoke-test coverage that prevents accidental reintroduction of large optional data into the initial `/webapp` bundle.

## Capabilities

### New Capabilities
- `webapp-data-loading-performance`: Defines behavior-preserving requirements for loading large WebApp data assets, keeping normal play equivalent while reducing initial bundle and startup work.

### Modified Capabilities
- `webapp-app-module-extraction`: Clarifies that future App extraction and module planning must keep large generated data outside the root App path unless the data is required for the current visible flow.

## Impact

- Affected areas: `webapp/App.tsx`, `webapp/frontendEquipmentRuntime.ts`, generated WebApp data files, GM/debug option loading, item/drop/equipment generation call sites, Vite bundle output, and WebApp smoke/visual verification.
- No backend APIs, services, or server-generated behavior are introduced.
- No public gameplay rules, save format, UI workflow, or visual behavior should change.
