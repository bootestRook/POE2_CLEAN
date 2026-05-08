## Context

The WebApp currently builds and passes its smoke test, but the full strict TypeScript check fails under the root `tsconfig.json`, which includes `webapp/`. The first observed run of `npx tsc --noEmit --pretty false` reports errors clustered around `webapp/App.tsx`, `webapp/battleGeometryRenderer.ts`, `webapp/frontendEquipmentRuntime.ts`, and `webapp/mapSpawnRuntime.ts`.

The current branch is focused on App module extraction. This cleanup must be independent from that work because most errors are broad pre-existing type mismatches rather than extraction blockers.

## Goals / Non-Goals

**Goals:**
- Make `npx tsc --noEmit --pretty false` pass for the full WebApp TypeScript surface.
- Preserve passing `npm test` and `npm run build` results.
- Keep fixes client-only and behavior-preserving.
- Use focused type definitions, guards, adapters, and null handling to express existing runtime behavior accurately.
- Keep each implementation slice small enough to review and verify independently.

**Non-Goals:**
- Do not add backend APIs, services, server runtimes, or server-derived gameplay behavior.
- Do not change playable battle behavior, skill event generation, damage calculations, targeting, projectile paths, or map generation semantics.
- Do not fold this work into `webapp-app-module-extraction`.
- Do not open or use the disabled skill editor as a verification surface.
- Do not use broad `any`, blanket `unknown as X`, or compiler-option weakening as the primary cleanup strategy.

## Decisions

1. Treat `npx tsc --noEmit --pretty false` as the canonical check for this change.

   Alternative considered: rely on `npm run build`, which already passes. That misses strict type errors because Vite can build transpiled TypeScript without enforcing the full `tsconfig.json` check.

2. Fix by error cluster, not by line order.

   Current errors naturally group into static seed data readonly/mutability mismatches, skill preview payload shape mismatches, battle view model ID/nullability mismatches, monster skill metadata fields, map data shape/nullability, generic equipment stat mutation, and disabled skill-editor-only nullable state. Handling these as clusters reduces repeated local casts and makes verification easier.

3. Prefer accurate boundary types and adapters over suppressive casts.

   Static config and generated fixture data can remain readonly at the source, but mutable UI state must receive explicit cloned/adapted values when mutation is expected. Unknown external or saved payloads should pass through type guards before use.

4. Keep gameplay runtime authority unchanged.

   Type fixes may describe existing client-side runtime data more accurately, but must not recalculate skill trajectories, target selection, hit timing, damage application, chain behavior, or combat results as part of type cleanup.

5. Verify visually only when implementation touches rendered frontend behavior.

   Because this change is expected to touch WebApp TypeScript, final implementation must still run the project `run.bat` WebApp flow and capture a screenshot under `artifacts/screenshots/`. The screenshot verifies that the playable WebApp still renders after the type cleanup, not that typecheck passed.

## Risks / Trade-offs

- Large App surface area -> Mitigation: implement in reviewed slices and rerun `tsc` after each major cluster to reveal the next true error set.
- Casts can hide real schema drift -> Mitigation: only allow localized casts at well-named boundaries after the source value shape is understood; prefer named types, guards, and adapters.
- Readonly fixture conversion can accidentally share mutable state -> Mitigation: clone arrays/objects when assigning static seed data into mutable App state.
- Disabled skill-editor code can consume time despite not being a verification surface -> Mitigation: make nullability/type fixes only; do not launch, script, or validate `/skill-editor`.
- Frontend visual verification can be mistaken for behavior proof -> Mitigation: pair browser screenshot verification with `npx tsc --noEmit --pretty false`, `npm test`, and `npm run build`.

## Migration Plan

1. Capture the current `npx tsc --noEmit --pretty false` failure set and group errors by owner area.
2. Clean one cluster at a time with minimal behavior-preserving edits.
3. Rerun `npx tsc --noEmit --pretty false` after each cluster until it passes.
4. Rerun `npm test` and `npm run build`.
5. Launch the playable WebApp through the project `run.bat` flow and capture a screenshot under `artifacts/screenshots/`.

Rollback is standard source rollback for the cleanup change; no data migration or dependency migration is expected.

## Open Questions

- Should a dedicated `typecheck` script be added to `package.json`, or should the acceptance command remain explicit as `npx tsc --noEmit --pretty false`?
- Should disabled skill-editor-only TypeScript surfaces remain included in the root `tsconfig.json`, or should a future separate change isolate them from the playable WebApp build surface?
