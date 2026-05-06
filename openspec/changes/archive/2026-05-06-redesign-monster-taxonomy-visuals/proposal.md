## Why

The current monster model blends rarity, boss status, monster identity, and visual shape into a small set of ID ranges. This makes it difficult to add clearer monster combat roles, a fifth rarity tier, distinct nemesis presentation, and reusable monster visuals without creating one-off runtime branches.

This change redesigns monsters around separate rarity, type, and visual identity axes while preserving existing monster assets and keeping all gameplay client-only.

## What Changes

- Add a five-tier monster rarity model: `normal`, `magic`, `rare`, `legendary_boss`, and `supreme_boss`.
- Define `legendary_boss` and `supreme_boss` as nemesis rarities with distinct drops, health bars, and visual presentation.
- Add seven monster types: `minion`, `melee`, `ranged`, `charger`, `tank`, `assassin`, and `support`.
- Allow base non-boss monsters to spawn across `normal`, `magic`, and `rare` rarities.
- Require `legendary_boss` and `supreme_boss` to spawn only from a dedicated boss monster pool, not by promoting base monsters.
- Re-map existing monster shapes into the new monster type visual language instead of discarding them.
- Add type-driven stat multipliers, movement intent, attack range/cadence defaults, and skill-shape selection.
- Add rarity-driven health bar presentation, including a distinct `supreme_boss` presentation beyond existing boss health bars.
- Require a visual concept sheet or equivalent in-repo visual artifact for the monster type and boss identity redesign.
- Keep the playable WebApp as the verification surface and keep the implementation entirely client-side.

## Capabilities

### New Capabilities
- `monster-taxonomy-visual-identity`: Defines monster rarity, monster type, nemesis rules, reusable visual identity, and health bar presentation.

### Modified Capabilities
- `procedural-monster-spawn-v1`: Spawn generation must emit the new rarity/type dimensions and respect the base monster pool versus boss monster pool boundary.
- `monster-pack-combat-behavior`: Runtime combat behavior must consume monster type stats and skill-shape defaults without backend coupling.
- `abstract-geometric-visual-system`: Monster visuals must represent type-driven silhouettes and rarity-driven overlays, including legendary and supreme boss treatments.

## Impact

- `configs/monsters/monster_defs.toml`, `configs/monsters/monster_groups.toml`, and `configs/monsters/map_spawn_v1.json` gain taxonomy and visual identity fields.
- `webapp/mapSpawnRuntime.ts` emits the new rarity and type data while preserving procedural spawn behavior.
- `webapp/App.tsx` consumes type movement/offense/health-bar metadata in the playable battle view.
- `webapp/monsterGeometryVisuals.ts`, visual tokens, and CSS gain type and rarity presentation rules.
- Existing smoke tests and frontend verification must be updated to cover taxonomy, boss pool rules, health bars, and visual output.
