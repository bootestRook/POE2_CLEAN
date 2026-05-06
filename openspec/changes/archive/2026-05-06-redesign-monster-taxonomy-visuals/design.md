## Context

The WebApp is now a client-only playable runtime. Monster spawning currently uses `webapp/mapSpawnRuntime.ts` with `normal`, `magic`, `rare`, and `boss` rarity values, ID range conventions, pack entries, base stats, and simple offense defaults. Combat consumption happens in `webapp/App.tsx`, while geometry visuals live in `webapp/monsterGeometryVisuals.ts`.

The redesign needs to separate three concepts that are currently coupled:

```text
monster identity  -> visual body, base stats, base type
monster rarity    -> drops, life/damage multipliers, health bar tier
monster type      -> role, movement/offense defaults, skill shape
```

Existing monster shapes and boss shapes remain useful. They should be reclassified and layered rather than discarded.

## Goals / Non-Goals

**Goals:**
- Add explicit monster rarity values: `normal`, `magic`, `rare`, `legendary_boss`, `supreme_boss`.
- Treat `legendary_boss` and `supreme_boss` as nemesis rarities.
- Add explicit monster type values: `minion`, `melee`, `ranged`, `charger`, `tank`, `assassin`, `support`.
- Allow non-boss base monsters to spawn as `normal`, `magic`, or `rare`.
- Require `legendary_boss` and `supreme_boss` to use a dedicated boss pool.
- Reuse existing geometry shapes as the first visual identity library.
- Add one in-repo visual concept sheet for monster type and boss identity review.
- Update the playable WebApp battle view, health bars, debug output, tests, and screenshot verification.

**Non-Goals:**
- No backend, server runtime, API, or server-generated gameplay behavior.
- No skill editor verification.
- No isometric, 2.5D, or projection-squashed visuals.
- No full hand-painted monster replacement set in this change.
- No ordinary base monster promotion into `legendary_boss` or `supreme_boss`.

## Decisions

### 1. Rarity and type are independent axes for non-boss monsters

Use `spawn_rarity` for `normal | magic | rare` and `monster_type` for combat role. A `hex_eye` ranged monster can appear as normal, magic, or rare; the body stays readable as ranged while the rarity overlay and health bar change.

Alternative considered: keep ID ranges as rarity identity. This keeps the current implementation smaller but blocks reuse and makes visual redesign mostly a renaming exercise.

### 2. Bosses use a separate pool

`legendary_boss` and `supreme_boss` must come from boss definitions. Base monsters cannot be promoted into these rarities. Boss definitions may have a primary type or composite type, but they remain authored boss identities.

Alternative considered: allow any base monster to be promoted into a boss. This was rejected because boss readability requires bespoke body shape, health bar treatment, skill cadence, and drop identity.

### 3. Type controls body language; rarity controls overlays

Initial mapping:

| Monster type | Body language | Existing shapes to reuse |
| --- | --- | --- |
| `minion` | small, simple, low threat, grouped | `circle_ring`, `triangle`, `cluster` |
| `melee` | forward, stable, close-range pressure | `diamond_tail`, `double_triangle`, `tri_crown` |
| `ranged` | core, eye, prism, launcher | `hex_eye`, `crystal_cross`, `circle_square`, `hex_core` |
| `charger` | sharp, directional, arrow-like, broken ring | `needle_ghost`, `broken_ring_bolt`, `double_triangle`, `wind_wheel` |
| `tank` | wide, heavy, armored, blocking | `square_dot`, `hex_core`, `ring_square_corners`, `square_spikes`, `obelisk` |
| `assassin` | thin, offset, shadowed, twin body | `needle_ghost`, `twin_shadow`, `diamond_tail`, `broken_ring_bolt` |
| `support` | rings, nodes, links, ritual symmetry | `wind_wheel`, `double_diamond`, `star_diamonds`, `circle_square` |

Rarity overlay mapping:

| Rarity | Overlay and health bar role |
| --- | --- |
| `normal` | minimal unit bar, no ornate overlay |
| `magic` | blue/cyan accent, small enhanced bar treatment |
| `rare` | gold/orange accent, stronger unit bar marker |
| `legendary_boss` | boss health bar and boss unit overlay |
| `supreme_boss` | upgraded boss health bar, separate supreme accent, stage/threat marker |

### 4. Type contributes combat defaults before per-monster overrides

Add a type defaults table in client config or runtime constants:

```text
base stats -> rarity multiplier -> type multiplier -> per-monster or pack override -> map modifier
```

Type defaults cover life, damage, movement speed, attack range, attack cadence, and skill shape family. Per-monster definitions and pack entries can still override specific values.

### 5. Existing boss shapes are assigned to legendary and supreme identities

Legendary bosses should be clear single-theme bosses:

| Boss shape | Initial role |
| --- | --- |
| `boss_king` | melee legendary boss |
| `boss_judicator` | ranged legendary boss |
| `boss_pinwheel` | charger legendary boss |
| `boss_void` | tank legendary boss |
| `boss_mirror` | assassin legendary boss |
| `boss_star_mother` | support legendary boss |

Supreme bosses should read as composite or final threats:

| Boss shape | Initial role |
| --- | --- |
| `boss_eclipse` | supreme ranged/support field-control boss |
| `boss_triad` | supreme composite multi-role boss |
| `boss_mirror` | optional supreme assassin/ranged variant |
| `boss_star_mother` | optional supreme support/summoner variant |

### 6. The change must produce code and images

Implementation must update code/config/tests and produce visual review artifacts. The minimum image output is an in-repo concept sheet showing the seven monster types plus legendary and supreme boss treatments. Frontend verification must include screenshots from the playable WebApp battle view after implementation.

## Risks / Trade-offs

- Schema churn across config, spawn runtime, combat, visuals, and tests -> keep migration additive first and preserve legacy field fallbacks until all configs are converted.
- Too many visual overlays can reduce readability -> make type silhouette primary and rarity overlay secondary.
- Supreme boss can look like a color-only variant of legendary boss -> require a distinct health bar treatment and at least one extra visible marker.
- Type behavior could become a second combat system -> route type behavior through existing movement, offense, boss skill, and damage paths.
- Existing smoke tests may encode old `boss` rarity assumptions -> update tests in the same implementation task and add explicit coverage for old-to-new compatibility.

## Migration Plan

1. Add taxonomy types and parsing support while preserving existing `boss` compatibility internally.
2. Add config fields for `monster_type`, boss pool identity, type defaults, and rarity presentation.
3. Reclassify existing monsters and boss visuals into the new taxonomy.
4. Update spawn output and debug summaries to expose the new fields.
5. Update combat movement/offense consumption to use type defaults through existing paths.
6. Update health bars and geometric overlays for the five rarity tiers.
7. Add visual concept sheet and verify the playable WebApp with screenshots.
