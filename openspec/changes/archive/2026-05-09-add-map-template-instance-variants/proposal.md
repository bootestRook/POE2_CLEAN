## Why

Map progression already has `map_template_ids`, authored map JSON already carries tiles, colliders, zones, and a player spawn, and procedural monster spawning already consumes runtime map data. The missing piece is a client-only map instance layer that turns reusable authored maps into varied playable runs without requiring procedural map generation yet.

## What Changes

- Add a client-only map template selection flow that chooses one authored `map_xxx` template from the selected stage's `map_template_ids` when a map run starts.
- Add a map instance variant step that can choose a player spawn region, apply one of the supported four right-angle rotations (`0`, `90`, `180`, `270`), and produce transformed runtime tiles, blockers, walkable grid, zones, player spawn, boss points, and exit points.
- Support multiple authored player spawn regions per map while preserving the existing single `spawn` field as a compatibility fallback.
- Keep monster pack generation driven by the existing procedural spawn profile and monster pack config, but make it consume the finalized map instance so pack centers and pack members vary inside the transformed zones each run.
- Keep the implementation fully frontend/client-only. No backend map start, backend run generation, server runtime, or server-authored gameplay behavior is introduced.
- Defer procedural map creation and arbitrary-angle rotation to later changes.

## Capabilities

### New Capabilities
- `map-template-instance-variants`: Defines client-only map template selection, reusable authored map instances, multiple player spawn regions, and four-way map rotation for playable WebApp map runs.

### Modified Capabilities
- `procedural-monster-spawn-v1`: Procedural monster spawning must consume the finalized map instance, including transformed zones and player spawn, so spawn filtering and pack placement remain aligned with the selected template variant.

## Impact

- Affected files are expected under `webapp/`, `map/`, `configs/maps/`, `configs/monsters/`, and focused tests under `tests/`.
- The playable WebApp battle view and map run startup flow are affected and require browser screenshot verification.
- Existing map editor JSON compatibility must be preserved; old maps with only `spawn` and no spawn regions remain valid.
- No new backend APIs, server storage, or runtime services are added.
