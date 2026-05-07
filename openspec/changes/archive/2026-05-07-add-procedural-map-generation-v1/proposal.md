## Why

Current maps are hand-authored JSON documents. Before connecting procedural generation to the formal game flow, we need a client-only generator that can write a normal map editor JSON file so the layout quality can be inspected in `mapEditor.bat`.

## What Changes

- Add a client-only procedural dungeon map generator that outputs the same map editor document shape used by existing map JSON files.
- Add a local script that writes a generated JSON file under `map/` for MapEditor review.
- Generate maps from a deterministic seed and local static profile data; no backend map generation, API call, server runtime, or server-authored gameplay behavior is introduced.
- Guarantee each generated map has at least four entrance regions and at least one boss room.
- Guarantee generated map size is at least four fifths of `map_001` by both playable footprint and authored map dimensions, so generated layouts cannot collapse into tiny dungeons.
- Generate a connected 2D top-down dungeon layout with entrance regions, corridors, main rooms, large rooms, dead ends, and a boss-room path.
- Do not register the generated map as a formal playable game map template in this phase.
- Add tests and MapEditor-oriented generation verification for generated-map validity and JSON compatibility.

## Capabilities

### New Capabilities
- `procedural-map-generation-v1`: Defines client-only procedural dungeon map generation for MapEditor JSON preview, including required entrance and boss regions, minimum size constraints, connectivity, and explicit non-integration with the formal playable map registry in this phase.

### Modified Capabilities
- None.

## Impact

- Expected affected areas: local map generation helpers, a generation script, generated map JSON under `map/`, OpenSpec docs, and focused tests under `tests/`.
- The playable WebApp battle map registry and start flow are intentionally not extended by this phase.
- Existing authored maps and map editor JSON compatibility should be preserved.
- No backend APIs, server storage, server runtime, or backend-generated gameplay behavior are added.
