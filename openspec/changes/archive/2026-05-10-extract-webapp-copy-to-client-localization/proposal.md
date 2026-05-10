## Why

WebApp user-facing copy is currently split across hard-coded TypeScript strings, generated frontend seed data, and `configs/localization/zh_cn.toml`; several source strings have already been corrupted into mojibake and can render as unreadable UI. Centralizing client-side copy behind a local localization/config layer reduces encoding risk, makes text reviewable outside application logic, and gives future UI changes a clear place for copy.

## What Changes

- Add a client-only WebApp localization capability that exposes typed access to local string resources.
- Move user-facing WebApp copy out of runtime/component logic into local static localization config where practical.
- Repair existing mojibake in WebApp source strings as part of migration, prioritizing visibly rendered UI and errors.
- Keep generated gameplay/content data on its existing generation path; do not manually edit generated data blobs as the primary localization strategy.
- Add tests or checks that catch newly introduced mojibake and prevent common UI copy from being re-hardcoded in migrated modules.
- Do not add backend APIs, server runtimes, or remote localization fetches.

## Capabilities

### New Capabilities

- `webapp-client-localization`: Client-only localization/config access for WebApp user-facing strings, including fallback behavior and mojibake prevention.

### Modified Capabilities

- `webapp-module-boundaries`: Define localization ownership so future WebApp copy changes land in a focused module instead of `webapp/App.tsx` or scattered feature code.

## Impact

- Affected code: `webapp/` UI components, tooltip/formatting utilities, save/drop/status text helpers, generated-data consumers, and a new focused localization module.
- Affected config: `configs/localization/zh_cn.toml` and any generated frontend localization artifact derived from it.
- Affected docs/specs: module boundary guidance for the localization owner.
- Verification: Vite build, targeted tests/checks for localization lookups and mojibake detection, plus browser screenshot verification through the normal `run.bat` WebApp flow for frontend-visible changes.
