## 1. Map Template Loading

- [x] 1.1 Add a client-side registry for authored `map_xxx` JSON templates and preserve the current `map_001` default.
- [x] 1.2 Parse each selected stage's `map_template_ids` in the WebApp map start flow and choose an eligible template for the run.
- [x] 1.3 Add deterministic test hooks or helper inputs so template choice can be verified without depending on `Date.now()` or `Math.random()`.

## 2. Map Instance Variant Runtime

- [x] 2.1 Add map instance metadata for template id, instance seed, rotation angle, and player spawn source.
- [x] 2.2 Implement four-way grid coordinate transforms for `0`, `90`, `180`, and `270` degree rotations, including rectangular map width/height swapping.
- [x] 2.3 Transform tiles, walkable grid, blocker grid, zone points, zone rects, player spawn candidates, boss points, and exit points through the same rotation path.
- [x] 2.4 Support multiple authored player spawn regions while keeping the existing `spawn` fallback for old map JSON.
- [x] 2.5 Validate the chosen transformed player spawn against the transformed walkable grid and fall back to the nearest walkable point with a warning when needed.

## 3. Playable WebApp Integration

- [x] 3.1 Insert the map instantiation step before `resetBattleRuntimeForChallenge()` and procedural monster spawn creation in the playable map run path.
- [x] 3.2 Ensure player movement, camera bounds, map rendering, and debug markers use the finalized map instance dimensions and transformed grids.
- [x] 3.3 Ensure `generateProceduralMonsterSpawns()` receives only the finalized map instance and its transformed player spawn and zones.
- [x] 3.4 Keep the skill editor disabled and do not use `/skill-editor`, `?skill_editor=1`, port `8765`, or `dist-skill-editor` for this feature.

## 4. Tests

- [x] 4.1 Add focused tests for four-way coordinate transforms, including rectangular map width/height behavior.
- [x] 4.2 Add tests proving old maps with only `spawn` still instantiate successfully.
- [x] 4.3 Add tests proving multiple spawn regions can produce different transformed player spawns under deterministic seeds.
- [x] 4.4 Add tests proving procedural monster spawn filtering uses the transformed player spawn and transformed zone geometry.
- [x] 4.5 Add client-only boundary tests proving map runs do not call backend map start, combat tick, save, restore, or pickup APIs.

## 5. Verification

- [x] 5.1 Run the relevant unit/static test set for map instancing, procedural monster spawning, and WebApp map-run boundaries.
- [x] 5.2 Start the local frontend and enter the actual playable WebApp battle view with a map instance variant.
- [x] 5.3 Capture a screenshot under `artifacts/screenshots/` showing the rendered playable map run.
- [x] 5.4 Describe the visible result and clearly state any frontend behavior that could not be verified.
