## 1. Baseline And Configuration

- [x] 1.1 Add a client-side helper or constant that measures the current `map_001` reference width, height, and walkable `ground` cell count.
- [x] 1.2 Add local static generation profile data for V1 room counts, corridor width, branch counts, loop chance, retry limit, and minimum-size ratio.
- [x] 1.3 Add deterministic seed helpers for procedural map generation and test/debug overrides.

## 2. Procedural Map Generator

- [x] 2.1 Add a client-only procedural map generation module that returns a `MapEditorFileDocument`-compatible object.
- [x] 2.2 Build a region graph step that always creates at least four entrance regions, a hub or major room path, branch rooms, corridors, and at least one boss room.
- [x] 2.3 Rasterize the region graph into `ground`, `wall`, and `empty` tiles while preserving existing map editor collider semantics.
- [x] 2.4 Emit generated zones with existing `zoneType` values: `entrance`, `corridor`, `main_room`, `large_room`, `dead_end`, and `boss_room`.
- [x] 2.5 Set the generated `spawn` fallback to a walkable entrance position while keeping all generated entrance zones available to the existing player-spawn candidate path.

## 3. Validation And Fallback

- [x] 3.1 Validate generated map dimensions against at least 80% of `map_001` width and height.
- [x] 3.2 Validate generated walkable `ground` cell count against at least 80% of `map_001` walkable `ground` cells.
- [x] 3.3 Validate all required zone centers are in bounds and walkable.
- [x] 3.4 Validate every entrance can reach a boss room and all major generated zones are reachable from an entrance.
- [x] 3.5 Add bounded deterministic retries and a warning-bearing fallback to a valid local map template when generation cannot produce an accepted map.

## 4. MapEditor JSON Preview

- [x] 4.1 Add a local script that writes an accepted generated map JSON file for MapEditor review.
- [x] 4.2 Reuse the existing map editor JSON shape instead of introducing a new preview-only format.
- [x] 4.3 Keep the generated map out of the formal playable map template registry/start flow in this phase.
- [x] 4.4 Generate `map/procedural_map_v1.json` as the first preview artifact.
- [x] 4.5 Keep the skill editor disabled and do not add `/skill-editor`, `?skill_editor=1`, port `8765`, or `dist-skill-editor` verification paths.

## 5. Tests

- [x] 5.1 Add deterministic unit tests proving the same seed and profile produce the same generated map document.
- [x] 5.2 Add tests proving accepted generated maps have at least four `entrance` zones and at least one `boss_room`.
- [x] 5.3 Add tests proving generated maps meet the `map_001` 80% dimension and walkable-area thresholds.
- [x] 5.4 Add tests proving generated entrances and boss rooms are walkable and connected.
- [x] 5.5 Add tests proving invalid candidates are rejected and fallback behavior uses a valid local template.
- [x] 5.6 Add boundary tests proving generated map JSON creation remains client-only and is not registered as a formal playable template yet.

## 6. Verification

- [x] 6.1 Run focused unit/static tests for procedural map generation and client-only MapEditor JSON boundaries.
- [x] 6.2 Run the JSON generation script and write `map/procedural_map_v1.json`.
- [x] 6.3 Run `mapEditor.bat --check` to verify the MapEditor build/check path.
- [x] 6.4 Tell the user how to open `mapEditor.bat` and load the generated JSON for visual review.
