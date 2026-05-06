## 1. Taxonomy Data Model

- [x] 1.1 Add client-side TypeScript types for `MonsterRarity`, `MonsterType`, and nemesis classification.
- [x] 1.2 Add config schema/loading support for monster type defaults and five rarity multipliers.
- [x] 1.3 Preserve legacy `boss` config compatibility only as an input migration path, not as emitted runtime rarity.
- [x] 1.4 Add tests proving `normal`, `magic`, `rare`, `legendary_boss`, and `supreme_boss` are valid emitted rarities.

## 2. Monster Config Migration

- [x] 2.1 Update `configs/monsters/monster_defs.toml` so each non-boss monster has a `monster_type`.
- [x] 2.2 Update boss monster definitions so each boss belongs to the dedicated boss pool and has `legendary_boss` or `supreme_boss` eligibility.
- [x] 2.3 Update `configs/monsters/monster_groups.toml` so groups no longer rely on rarity-only ID ranges as the design source of truth.
- [x] 2.4 Update `configs/monsters/map_spawn_v1.json` with type defaults, boss rarity selection, and debug count support.
- [x] 2.5 Add config validation or smoke coverage proving base monsters cannot be selected as `legendary_boss` or `supreme_boss`.

## 3. Procedural Spawn Runtime

- [x] 3.1 Update `webapp/mapSpawnRuntime.ts` to emit `monster_type` for every generated monster.
- [x] 3.2 Update rarity selection to emit `legendary_boss` and `supreme_boss` for boss-pool monsters instead of legacy `boss`.
- [x] 3.3 Allow base monster instances to roll `normal`, `magic`, or `rare` while preserving their base visual identity.
- [x] 3.4 Apply stat order as base stats, rarity multiplier, type multiplier, per-monster or pack override, then map modifier.
- [x] 3.5 Extend procedural spawn debug summaries with five rarity counts and seven type counts.

## 4. Combat Behavior

- [x] 4.1 Update WebApp enemy instance mapping to carry `monster_type`, nemesis state, movement multiplier, and skill-shape defaults.
- [x] 4.2 Replace the legacy boss/non-boss chase speed split with type-aware speed resolution while preserving boss-grade behavior for nemesis monsters.
- [x] 4.3 Route type attack range and attack cadence through existing monster attack readiness and player mitigation paths.
- [x] 4.4 Add or adapt tests proving type defaults affect movement/offense through the playable runtime paths.

## 5. Visual Identity And Health Bars

- [x] 5.1 Update `webapp/monsterGeometryVisuals.ts` to map existing shapes to `minion`, `melee`, `ranged`, `charger`, `tank`, `assassin`, and `support`.
- [x] 5.2 Add rarity overlay metadata for `normal`, `magic`, `rare`, `legendary_boss`, and `supreme_boss`.
- [x] 5.3 Update unit health bars so all five rarities have distinct in-battle presentation.
- [x] 5.4 Update boss health bar rendering so `legendary_boss` and `supreme_boss` are both nemesis bars but remain visually distinguishable.
- [x] 5.5 Keep circular effects and circular target/damage visuals circular in screen space.

## 6. Visual Artifacts

- [x] 6.1 Keep or revise `openspec/changes/redesign-monster-taxonomy-visuals/monster-visual-concept-sheet.svg` as the taxonomy concept sheet.
- [x] 6.2 Add final implementation-era screenshots under `artifacts/screenshots/` showing monster type visuals in the playable WebApp battle view.
- [x] 6.3 Add final implementation-era screenshots under `artifacts/screenshots/` showing legendary and supreme boss health bar treatments.
- [x] 6.4 Describe what is visible in each verification screenshot in the implementation summary.

## 7. Verification

- [x] 7.1 Run focused smoke/unit tests covering spawn taxonomy, boss pool boundaries, type counts, and rarity counts.
- [x] 7.2 Run the frontend locally and verify the playable WebApp battle view in a browser.
- [x] 7.3 Capture screenshots from the playable WebApp battle view; do not use the skill editor.
- [x] 7.4 Run the project build or existing WebApp smoke check and record pass/fail.
- [x] 7.5 Confirm no screenshots, logs, or verification artifacts were written to the repository root.
