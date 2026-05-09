## Context

The playable WebApp is client-only. The current default runtime map path loads `map/map_001.json`, converts authored tiles, colliders, spawn, and zones into runtime map data, then calls `generateProceduralMonsterSpawns()` to create monster packs for the run. Map progression already includes `map_template_ids`, but map run startup does not yet use that list to choose among multiple authored templates.

This change introduces a map instance layer between map template loading and monster spawning:

```text
selected stage
  -> choose map_template_id
  -> load authored map_xxx JSON
  -> instantiate variant
       template id
       instance seed
       rotation: 0 / 90 / 180 / 270
       player spawn region
  -> runtime battle map
  -> procedural monster spawning
  -> playable WebApp battle view
```

## Goals / Non-Goals

**Goals:**
- Reuse hand-authored map templates across many runs.
- Select a map template from the selected stage's `map_template_ids`.
- Support multiple player spawn regions per authored map.
- Apply four-way map rotation to gameplay data, not just visuals.
- Keep procedural monster packs aligned with the finalized map instance.
- Preserve existing map JSON compatibility and the current `spawn` fallback.
- Keep the whole feature client-only.

**Non-Goals:**
- Procedural map generation.
- Arbitrary-angle rotation such as 45 degrees.
- Backend map run generation, persistence, or canonical server gameplay.
- Reworking combat, loot, skill targeting, or monster AI beyond consuming the finalized runtime map.
- Opening or using the disabled skill editor as a verification surface.

## Decisions

### Add a map instance step rather than changing monster spawning directly

Create a focused map instantiation path that returns the same runtime map shape already consumed by the battle view and `generateProceduralMonsterSpawns()`.

Alternatives considered:
- Put rotation and spawn-region handling inside monster spawning. This would leave movement, blockers, zones, and player placement using a different view of the map.
- Rotate only the rendered map. This would make visuals diverge from movement and monster placement.

### Use four right-angle rotations only

Support `0`, `90`, `180`, and `270` degrees. These can transform grid coordinates exactly:

```text
0:   (x, y) -> (x, y)
90:  (x, y) -> (height - 1 - y, x)
180: (x, y) -> (width - 1 - x, height - 1 - y)
270: (x, y) -> (y, width - 1 - x)
```

For rectangular maps, 90 and 270 degree rotations swap runtime width and height. Tiles, blocker grid, walkable grid, zone points, zone rect endpoints, player spawn regions, boss points, and exit points must all use the same transform.

Alternatives considered:
- Arbitrary-angle rotation. This would require re-rasterizing tiles, blockers, zones, and navigation, and risks jagged blockers or mismatched walkability.
- Eight-way rotation. The 45-degree cases have the same rasterization issue as arbitrary-angle rotation.

### Store authored spawn regions as optional map JSON data

Add optional player spawn region data while keeping the existing `spawn` field. If a map lacks spawn regions, the instancer uses `spawn` exactly as today.

The lowest-risk authoring shape is to reuse the existing zone vocabulary and allow `entrance` zones to serve as spawn regions. If more explicit control is needed during implementation, add a small optional field such as `playerSpawnRegions` without removing `spawn`.

### Drive randomness from a run seed

Each map run should derive a local map instance seed. The seed controls template selection, rotation selection, spawn-region choice, and procedural monster generation salt. It does not need to be stable across normal play, but tests should be able to pass a deterministic seed.

### Keep map progression as the source of eligible templates

The stage's `map_template_ids` list decides which templates are eligible for that stage. The WebApp should choose from those ids and fall back to the existing default map if the list is missing or invalid.

## Risks / Trade-offs

- Rotation may expose assumptions that maps are square -> Tests must cover rectangular coordinate transforms and width/height swapping even if the first production map is square.
- Existing rendering may use unrotated editor tile coordinates -> The runtime map background/tiles must render from transformed runtime data or receive the same transform metadata.
- Spawn regions can land inside blockers after rotation if transformed inconsistently -> Instantiation must validate chosen player spawn against the transformed walkable grid and move to the nearest walkable point only as a fallback with a warning.
- Monster packs might spawn near the new player start if procedural spawning uses stale player coordinates -> `generateProceduralMonsterSpawns()` must receive only the finalized map instance.
- Randomness can make verification flaky -> Tests should inject deterministic seeds, while normal play can still use a fresh run seed.
