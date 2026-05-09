## Context

The previous App extraction pass moved map/debug presentation, the character panel, and skill-board presentation out of `webapp/App.tsx`. The file is still large, but the remaining code mixes pure display helpers, inventory rules, save storage utilities, and high-coupling combat runtime behavior.

The next work should reduce `App.tsx` without widening blast radius. The project is client-only, the playable WebApp is the only frontend acceptance surface, and each split must be tested and committed before another split begins.

## Goals / Non-Goals

**Goals:**

- Establish a risk-ordered extraction sequence for the next implementation pass.
- Keep extracted modules client-only, focused, and behavior-preserving.
- Keep App-owned state in `webapp/App.tsx` unless a later change explicitly scopes state movement.
- Define clear stop points, verification gates, and commit boundaries for each extraction batch.

**Non-Goals:**

- Do not implement the extraction in this planning change.
- Do not move combat runtime ownership, monster AI/navigation, damage calculation, skill event generation, projectile targeting, save schema migration, or storage key ownership.
- Do not use the disabled skill editor or any backend/server runtime as acceptance evidence.
- Do not redesign CSS, rewrite copy, or introduce dependencies.

## Decisions

1. Extract tooltip view-model and formatting code first.

   Tooltip helpers are mostly deterministic display logic and already align with `webapp/components/tooltips/`. Moving them first reduces `App.tsx` size while avoiding gameplay, save, and battle-loop ownership. The alternative was to start with inventory/equipment rules, but those touch drag/drop and equipment interactions more directly.

2. Extract inventory/equipment placement helpers second, while keeping App state and mutation handlers in place.

   Inventory and equipment helpers are a useful next boundary, but they can affect user interaction if props or callback semantics drift. This batch should move pure item classification, target-slot, and placement helper code without moving save writes, equipment stat recalculation, drag state, or storage behavior. The alternative was to extract whole panels, but presentation components already exist and broad panel extraction would be easier to over-scope.

3. Treat local save-slot storage utility extraction as isolated and higher-risk.

   Storage helpers can be moved to a focused utility only if field shapes, storage keys, migration behavior, active-slot behavior, and error text are preserved exactly. This batch should not be mixed with UI extraction. The alternative was to defer saves entirely; keeping it planned but isolated makes the risk explicit.

4. Defer combat runtime and skill event extraction.

   Enemy navigation, damage resolution, projectile decisions, skill event consumption, monster AI, and battle-loop mutation are high-risk because small changes can alter gameplay. They require a separate dedicated change with stronger runtime-specific tests.

5. Commit after every completed extraction batch.

   Each batch should run `npm run build`, `npm test`, and playable WebApp verification through `run.bat` before commit. This preserves the user's requested rhythm: one split, test, commit, then continue.

## Risks / Trade-offs

- Tooltip static checks may fail after moving strings out of `App.tsx` -> update tests to scan the focused WebApp source boundary rather than only `App.tsx`, without weakening required text checks.
- Inventory/equipment extraction may accidentally change drag/drop behavior -> keep mutation handlers and React state in `App.tsx`, move only pure helpers, and verify interaction in the playable WebApp.
- Save utility extraction may alter persistence behavior -> keep it as a separate batch, compare storage keys and payload shapes before and after, and stop if migration semantics need changes.
- Large type movement can create circular imports -> introduce thin type-only modules only when needed, and avoid importing from `App.tsx`.
- Verification can produce stray artifacts -> store screenshots/logs under `artifacts/` and check the repository root before finishing.
