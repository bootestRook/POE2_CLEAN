## 1. Baseline And Boundaries

- [x] 1.1 Inspect existing `webapp/proceduralMapGeneration.ts`, `scripts/generate-procedural-map-json.mjs`, map template loading, MapEditor normalization, and procedural map tests to identify compatibility points.
- [x] 1.2 Confirm `map_001.json` remains loadable and document the reused editor JSON fields, collider semantics, zone vocabulary, and runtime adapter path.
- [x] 1.3 Create or update the focused `webapp/mapGeneration/` owner module boundary; keep `webapp/App.tsx` limited to wiring if touched.

## 2. V1 Types And Configuration

- [x] 2.1 Add V1 map generation types for tile kinds, topology presets, generated room nodes, corridor edges, zones, graph, validation result, and generator result.
- [x] 2.2 Add locked V1 config for map size `256 x 144`, `cellSize = 96`, standard colliders, room sizes, room counts, corridor widths, layout padding/gap, and retry limits.
- [x] 2.3 Add deterministic seeded random helpers and remove direct `Math.random` influence from generated map results.

## 3. Graph And Layout Generation

- [x] 3.1 Implement topology selection from explicit preset or deterministic seed.
- [x] 3.2 Implement `hub_spoke` graph generation with a large-room hub, varied entrance access, branches, and boss destination.
- [x] 3.3 Implement `main_path_branches` graph generation with a main entrance-to-boss path and branch/dead-end attachments.
- [x] 3.4 Implement `loop_with_branches` graph generation with at least one four-room local loop and controlled boss degree.
- [x] 3.5 Implement seeded rectangular room sizing and placement with map padding, minimum room gap, non-overlap, and bounded retry behavior.

## 4. Corridors, Tiles, Zones, And Spawn

- [x] 4.1 Implement corridor path generation from graph edges with width 2 or 3, using varied straight, L-shaped, stepped, or multi-segment routes.
- [x] 4.2 Implement tile carving: fill `empty`, carve room/corridor `ground`, add `wall` around ground via 8-neighbor boundary fill, and preserve ground connectivity.
- [x] 4.3 Build zones for every room and corridor using Chinese names and compatible zone types, including a fallback plan if `dead_end` compatibility fails.
- [x] 4.4 Generate spawn on an entrance `ground` tile, falling back to the nearest valid entrance ground if the room center is blocked.

## 5. Validation And Debug

- [x] 5.1 Implement `validateGeneratedMap(map)` with structured `ok`, `errors`, `warnings`, and stats for dimensions, counts, corridors, and tile totals.
- [x] 5.2 Validate graph rules: all rooms connected, all entrances can reach boss, boss not directly connected to entrance, dead ends are leaves, large rooms have degree at least 2, and boss degree is 1 or 2.
- [x] 5.3 Validate tile rules: format, dimensions, cellSize, legal tile kinds, full ground connectivity, walkable zone centers, spawn ground legality, and collider semantics.
- [x] 5.4 Implement Chinese `debugText` with seed, localized topology name, map size, room counts, corridor count, connectivity, boss degree, dead-end rule, and validation result.

## 6. Public API And Integration

- [x] 6.1 Add `generateProceduralEditorMap({ seed, topologyPreset })` returning `{ map, graph, validation, debugText }` with default seed `v1_map_seed_001`.
- [x] 6.2 Keep existing script/test-facing exports compatible where practical, or update callers intentionally with focused diffs.
- [x] 6.3 Update `scripts/generate-procedural-map-json.mjs` so generated preview JSON uses the upgraded V1 generator and fails with Chinese validation/debug details when invalid.
- [x] 6.4 Add an additive client-only loading entry for V1 generated maps without removing existing authored map entries, keeping any `App.tsx` change to wiring only.

## 7. Tests

- [x] 7.1 Update procedural map tests for V1 locked format, dimensions, cellSize, tile legality, standard colliders, and `map_001.json` compatibility.
- [x] 7.2 Add deterministic seed tests proving repeated generation matches tiles, zones, spawn, graph summary, validation, and debug text.
- [x] 7.3 Add room count and topology tests for `hub_spoke`, `main_path_branches`, and `loop_with_branches`.
- [x] 7.4 Add connectivity tests for graph reachability, ground flood fill, entrance-to-boss path, dead-end degree, large-room degree, boss degree, and spawn legality.
- [x] 7.5 Add Chinese debug tests for required labels and localized topology names.
- [x] 7.6 Update old boundary tests that asserted the generated map must not be exposed as a playable template selector, replacing them with additive loading-entry checks if implemented.

## 8. Verification

- [x] 8.1 Run focused procedural map tests and any affected client-only boundary/localization tests.
- [x] 8.2 Run the JSON generation script and refresh `map/procedural_map_v1.json` only if it is an intended generated artifact for this change.
- [x] 8.3 Run the frontend build/check path.
- [x] 8.4 Launch the WebApp through project root `run.bat`, exercise the generated map path in the actual playable WebApp view, and save a screenshot under `artifacts/screenshots/`.
- [x] 8.5 Report visible screenshot evidence, tests run, any frontend behavior not verified, and changed/new files.
