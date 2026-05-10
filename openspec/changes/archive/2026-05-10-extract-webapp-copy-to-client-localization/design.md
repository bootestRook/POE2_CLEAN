## Context

The project is client-only and already has local string data in `configs/localization/zh_cn.toml`. Many content configs reference localization keys, but WebApp presentation and formatting code still contains user-facing copy directly in TypeScript. A small set of source strings are already mojibake, which means unreadable text can be bundled and rendered even when the app builds.

The implementation must follow WebApp module boundaries, must not use a backend or remote translation service, and must verify visible frontend behavior through the normal `run.bat` WebApp flow.

## Goals / Non-Goals

**Goals:**

- Provide a focused client-only localization owner for WebApp copy.
- Use local static resources as the source of truth for migrated UI strings.
- Repair existing mojibake in WebApp source during migration.
- Keep generated content data on its generation path and avoid hand-editing generated blobs as the long-term solution.
- Add automated checks that catch common mojibake and missing localization access regressions.

**Non-Goals:**

- No backend localization API, server runtime, or remote fetch.
- No runtime language switching unless explicitly added by a later change.
- No full rewrite of all generated data in one pass.
- No redesign of UI, gameplay runtime behavior, damage logic, target selection, or skill behavior.

## Decisions

1. Create a focused localization module.

   Add a WebApp owner such as `webapp/localization/` for static string maps, lookup helpers, fallback handling, and tests. This keeps copy infrastructure out of `webapp/App.tsx` and avoids scattering ad hoc maps through feature components.

   Alternative considered: import `configs/localization/zh_cn.toml` directly from many components. This would couple UI modules to config parsing details and make fallback behavior inconsistent.

2. Generate or adapt a client-readable string map from local config.

   The browser should consume a local static artifact or TypeScript module derived from `configs/localization/zh_cn.toml`. The implementation can choose the smallest repo-consistent path, but the runtime result must be bundled client-side and deterministic.

   Alternative considered: parse TOML in the browser at runtime. This would add parsing complexity and likely require a dependency for a narrow problem.

3. Migrate copy in risk-based slices.

   First fix known mojibake and highly visible UI strings, then move reusable formatting labels and tooltip text, then address debug or lower-priority surfaces. Generated data should be changed through the generator or source config instead of manual edits.

   Alternative considered: migrate every Chinese string in one change. That would create a large risky diff across runtime, generated data, tests, and disabled tooling.

4. Preserve gameplay and rendering behavior.

   Localization lookup must only affect display strings. Runtime event generation, damage application, targeting, map spawning, drop selection, and save semantics must stay unchanged.

## Risks / Trade-offs

- Existing generated data contains many Chinese strings -> migrate generated sources and consumers gradually, and do not hand-edit generated files as proof of the architecture.
- Tests may currently assert literal Chinese strings -> update tests to verify rendered behavior or localization keys without weakening coverage.
- Missing keys can hide copy regressions -> lookups must provide explicit fallback text and tests for required keys.
- Encoding issues can reappear through editors or scripts -> add a repository check for mojibake patterns in migrated WebApp source and run it in verification.
- Frontend verification can be blocked by unrelated workspace errors -> report blockers clearly and avoid claiming visual behavior was observed unless a screenshot was captured.

## Migration Plan

1. Add the localization owner module and document its boundary.
2. Add or generate the initial client-readable zh-CN string map from local config.
3. Replace the known mojibake strings with localization keys and correct fallback copy.
4. Migrate high-traffic UI copy in focused modules such as layout, save/drop status, skill-board placement, tooltip labels, and map selection.
5. Add checks for mojibake and required localization keys.
6. Run build/tests and verify the actual WebApp through `run.bat` with screenshots under `artifacts/screenshots/`.

Rollback is straightforward because the change is client-side only: revert the localization module wiring and restored source strings. No persisted data migration is required.

## Open Questions

- Should the first implementation include only zh-CN, or also reserve an English fallback map?
- Should generated frontend seed data keep resolved `*_text` fields, or should future generation include both localization keys and resolved display text?
- Which UI surfaces should be considered first-pass mandatory beyond the known mojibake files?
