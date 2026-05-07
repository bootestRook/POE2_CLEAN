## Context

The project is client-only, and authored maps are stored as map editor JSON documents. `map_001` is the current production baseline: it uses a 256 by 144 authored grid, contains 2,286 walkable `ground` cells, and has four `entrance` zones plus one `boss_room`.

This phase adds procedural map creation as an offline/local JSON generation path for MapEditor review. The generator should produce the same map editor document shape as authored maps, but it should not be registered as a formal playable game map template yet.

## Goals / Non-Goals

**Goals:**
- Generate dungeon map editor JSON from a seed using only frontend/client-side code and local static configuration.
- Guarantee at least four `entrance` zones and at least one `boss_room` in every accepted generated map.
- Guarantee generated maps are not undersized: use `map_001` as the reference and require at least 80% of its authored dimensions and at least 80% of its walkable cell count.
- Reuse the existing map editor document shape so `mapEditor.bat` can inspect the output.
- Keep the generated JSON out of the formal playable map registry/start flow in this phase.
- Keep maps 2D top-down; circular gameplay areas and VFX remain screen-space circles.
- Provide deterministic test hooks so layout validity can be asserted without flaky randomness.

**Non-Goals:**
- No backend map generation, backend run creation, server persistence, server API, or server-authored gameplay behavior.
- No integration into the formal playable game map selection or stage/template registry in this phase.
- No separate frontend-local battle runtime for skill, monster, target, damage, projectile, or spawn behavior.
- No arbitrary-angle rotation, isometric projection, 2.5D projection, or perspective-squashed gameplay visuals.
- No replacement of the map editor save format.
- No use of the disabled skill editor as a verification surface.

## Decisions

### Generate a region graph before carving tiles

The generator should first create a small semantic graph of required regions, then rasterize that graph into map editor tiles and zones.

Recommended graph shape:

```text
entrance A --\
entrance B --- hub/large_room -- main path -- boss antechamber -- boss_room
entrance C --/       |
entrance D ----------+-- side room -- dead_end/reward room
                     |
                     +-- large_room/elite room -- loopback
```

This makes the required four entrances and one boss room explicit before tile carving begins. It also gives the generator control over pacing: safe entrances, a central hub, branching rooms, optional loops, and a distant boss room.

Alternative considered: randomly carve tile cells first and infer zones afterward. That would be simpler initially, but it makes the four-entrance guarantee, boss distance, room quality, and monster-spawn rules harder to test.

### Output existing map editor documents

The generator should return a `MapEditorFileDocument`-compatible object with `tiles`, `colliders`, `zones`, `spawn`, `width`, `height`, and `cellSize`.

Alternative considered: introduce a new runtime map format. That would duplicate existing conversion and rendering logic and risks divergence between generated maps and authored maps.

For this phase, the document is written by `scripts/generate-procedural-map-json.mjs` to a JSON path such as `map/procedural_map_v1.json`. The user can open `mapEditor.bat` and load that JSON for visual review.

### Use `map_001` as the minimum-size reference

`map_001` should be measured locally by the implementation, with constants or helper output used by tests. V1 should require:
- generated authored width >= floor(`map_001.width * 0.8`)
- generated authored height >= floor(`map_001.height * 0.8`)
- generated walkable `ground` cells >= floor(`map_001.ground_count * 0.8`)

For the current `map_001`, that means at least 204 by 115 authored cells and at least 1,828 walkable cells. Keeping both dimension and walkable-area constraints prevents a map from passing by using a large empty canvas with a tiny playable dungeon.

Alternative considered: only compare total canvas area. That would not protect gameplay quality because empty cells are not playable map size.

### Keep randomness deterministic and local

The generator should consume a seed derived from the selected stage/template/run context and should expose deterministic test hooks. The seed controls graph variation, room placement, corridor routing, optional loop placement, and final entrance spawn selection.

Alternative considered: use `Date.now()` or `Math.random()` directly inside generation. That would make tests and screenshot reproduction unreliable.

### Validate before returning a map

Generation should include a validation pass before a map is accepted:
- all required zones exist
- all zone centers are walkable
- all walkable cells belong to one connected playable component or an explicitly accepted connected component
- the boss room is reachable from every entrance
- boss room distance from the selected/default spawn is meaningfully greater than nearby room distance
- no generated zone rectangle extends outside map bounds
- minimum dimension and walkable-area constraints are satisfied

If a seed fails validation, the generator may retry with deterministic sub-seeds up to a bounded limit, then fall back to `map_001` with a warning rather than returning an invalid map.

### Keep game integration out of this phase

Generated maps should not enter the authored template registry or stage selection flow yet. This keeps the first review loop focused on layout quality in MapEditor. Later game integration can reuse the same JSON-compatible generator once the generated layouts feel good.

Alternative considered: register a generated template immediately. The user explicitly asked to avoid formal game integration first, so this phase stops at JSON generation.

## Risks / Trade-offs

- Generated maps may feel samey if the graph has too few variants -> Include profile-controlled room counts, branch counts, loop chance, and corridor width variation.
- Deterministic retries could hide frequent generator failures -> Tests should assert primary seeds pass and debug warnings should expose retry/fallback counts.
- Four entrance zones reduce available monster spawn area because `entrance` does not spawn monsters -> Keep entrances compact and enforce the 80% walkable-area floor after entrances are carved.
- Large maps can be expensive to validate if every seed retries many times -> Keep validation grid-based, bounded, and reuse existing walkable/blocker arrays.
- Accidental integration could change playable map behavior before layout review -> Add boundary tests proving generated map JSON is not registered as a formal playable template in this phase.
