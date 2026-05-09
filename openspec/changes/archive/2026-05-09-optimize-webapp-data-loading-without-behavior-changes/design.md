## Context

The WebApp is client-only and currently starts from a single React/Vite entry that imports `webapp/App.tsx`. Several large generated data sets are imported through this path, including equipment generation data, gem drop data, initial game state data, and skill level tables. That makes the initial `/webapp` load pay for data that is only needed later by item generation, GM/debug tools, drops, or specific skill calculations.

The optimization must preserve behavior exactly. The change is about file organization, import timing, and deterministic data access. It must not change gameplay rules, save data, UI copy, map layouts, item outcomes, drop outcomes, skill preview values, debug capabilities, or rendered battle behavior.

## Goals / Non-Goals

**Goals:**

- Reduce the initial `/webapp` bundle and startup work by moving optional large data behind explicit lazy loaders.
- Move large generated data out of the root `webapp/` module area into a clear data/generated folder structure.
- Preserve deterministic results for equipment generation, gem drops, skill previews, map entry flows, and GM/debug tools.
- Add verification that compares before/after outputs for representative deterministic generation paths.
- Keep all implementation client-only.

**Non-Goals:**

- No backend service, API, worker service, or server-generated gameplay behavior.
- No change to map spawn budgets, monster counts, skill effects, item affixes, drop rules, save storage keys, UI copy, CSS class names, or visible workflows.
- No removal of GM/debug tools; they may load later, but must still expose the same options and results.
- No broad App refactor beyond the data loading boundaries needed for this change.

## Decisions

1. Use lazy module loaders for optional large data.

   Eager imports keep data inside the startup bundle even when the first visible screen does not use it. Dynamic `import()` keeps data as client-side static assets while letting Vite split it into separate chunks. The loaders should cache resolved promises so repeated equipment generation or GM panel opens do not refetch or reparses unnecessarily.

   Alternative considered: keep static imports and only reorganize files. That improves clarity but does not solve startup cost.

2. Separate runtime-required seed data from optional generated catalogs.

   Data required to render the title/save/rest screen can remain available on the initial path. Large data needed only for equipment generation, GM option lists, debug panels, or late combat events should live under a folder such as `webapp/data/generated/` or `webapp/data/equipment/` and be loaded through small access modules.

   Alternative considered: move all data to `public/` and fetch JSON. That adds fetch/error handling and makes deterministic module typing weaker. Dynamic imports are simpler and remain client-only.

3. Preserve synchronous behavior at call sites with narrow async boundaries.

   Existing gameplay actions that need optional data should explicitly await data readiness before performing the same calculation. UI actions that trigger lazy loading should show the existing visible state until the same result can be produced. Runtime loops should not introduce repeated awaits per frame; they should resolve data before the relevant action or cache it in refs/state.

   Alternative considered: convert broad runtime functions to async. That risks changing timing and gameplay behavior, so async should stay at screen/action boundaries.

4. Verify behavior with deterministic equivalence checks.

   Tests should compare representative generated equipment, GM option counts/ids, gem drop pool access, skill level lookups, and startup state before/after the loader split. Frontend verification should launch the actual playable WebApp through the accepted `run.bat` flow and capture screenshots under `artifacts/screenshots/`.

   Alternative considered: rely on bundle size only. Bundle size proves loading changed, but not behavior equivalence.

## Risks / Trade-offs

- Lazy loading can add a small delay when the player first opens GM tools or triggers equipment generation -> preload optional data after first paint or when entering a relevant panel, while keeping deterministic actions blocked until data is ready.
- Async boundaries can accidentally change combat timing -> keep lazy loading out of per-frame runtime loops and resolve required data before starting the action that consumes it.
- Moving generated files can break import paths or smoke-test assumptions -> update path checks narrowly and add smoke coverage for the new data location.
- Bundle budget checks can be noisy as data grows -> budget against initial chunk inclusion and explicit large-data imports rather than a single fragile byte threshold.
- Existing dirty worktree edits may overlap App/data files -> inspect and preserve unrelated edits before implementation, and keep commits scoped to this change.

## Migration Plan

1. Inventory current large imports and classify each as startup-required, gameplay-required before first action, or optional/debug-only.
2. Introduce client-only loader modules for optional generated data, with caching and typed accessors.
3. Move large data files to explicit data/generated locations and update imports through the loader modules.
4. Convert only the necessary screen/action boundaries to await loaded data.
5. Add equivalence tests and bundle/import guard checks.
6. Run `npm run build`, `npm test`, and playable WebApp visual verification through the `run.bat` flow.

Rollback is straightforward: restore the previous static imports and file paths if lazy loading causes a behavior or timing regression.

## Open Questions

- Which large data sets are truly required for the title/save/rest first paint after measuring the current dependency graph?
- Should optional data preload after first paint, after save selection, or only on first use?
- What initial chunk budget is realistic once current unrelated App extraction work settles?
