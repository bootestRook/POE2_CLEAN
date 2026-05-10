## 1. Localization Owner Setup

- [x] 1.1 Add the focused WebApp localization owner module and narrow lookup API.
- [x] 1.2 Add a client-readable zh-CN string map derived from local static localization data.
- [x] 1.3 Define deterministic missing-key fallback behavior and tests.
- [x] 1.4 Update WebApp module-boundary documentation to include the localization owner.

## 2. Mojibake Repair And First Migration

- [x] 2.1 Replace known mojibake strings in viewport, save storage, drop state, App top HUD, and skill-board placement paths.
- [x] 2.2 Move the repaired strings into localization resources and consume them through the localization API.
- [x] 2.3 Migrate high-traffic layout, save/drop status, skill-board, tooltip, and map-selection copy where the diff stays focused.
- [x] 2.4 Preserve generated frontend data by updating source or generation paths instead of hand-editing generated blobs.

## 3. Guardrails And Tests

- [x] 3.1 Add a test or hygiene check that detects common mojibake sequences in migrated WebApp source and localization resources.
- [x] 3.2 Add localization lookup tests for existing keys, missing keys, and UTF-8 preservation.
- [x] 3.3 Update affected source-text tests so they protect behavior and module ownership without requiring copy to remain hard-coded.
- [x] 3.4 Confirm localization changes do not alter gameplay runtime, save semantics, targeting, damage, spawning, or drop selection.

## 4. Verification

- [x] 4.1 Run `npm run build` and relevant focused tests or hygiene checks.
- [x] 4.2 Launch the app through `run.bat` and verify migrated visible UI in the actual WebApp.
- [x] 4.3 Capture a screenshot under `artifacts/screenshots/` and describe visible localized text.
- [x] 4.4 Document any frontend behavior that could not be visually verified.
