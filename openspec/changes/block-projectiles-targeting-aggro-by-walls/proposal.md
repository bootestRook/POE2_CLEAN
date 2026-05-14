## Why

Projectile, targeting, and aggro behavior currently uses distance-based checks in several playable WebApp paths. This allows skills and monsters to see, target, or hit through walls, which makes authored and procedural dungeon layouts feel visually and mechanically inconsistent.

## What Changes

- Introduce a shared client-only wall-blocking capability for playable battle interactions.
- Require player skill target selection, chained target selection, split/secondary target selection, and dynamic tick target selection to respect wall-blocked line checks when the interaction implies direct visibility or projectile travel.
- Require player and monster projectiles to stop at walls instead of visually or mechanically passing through blocked terrain.
- Require authored encounter aggro/search radius checks to be blocked by walls before locking a pack onto the player.
- Require monster and boss projectile releases and in-flight player hit checks to respect the same wall blocking rules.
- Keep all behavior in frontend/client-side runtime code and local map data; do not add backend services or backend gameplay authority.

## Capabilities

### New Capabilities
- `wall-blocked-battle-interactions`: Defines shared client-only wall blocking semantics for line checks, projectile travel, skill target selection, monster aggro, and player-hit legality.

### Modified Capabilities
- `frontend-skill-runtime-source`: Player skill event generation and dynamic target selection must filter wall-blocked targets and projectile travel.
- `monster-pack-combat-behavior`: Monster aggro and movement/attack engagement must not treat wall-blocked distance as direct player awareness.
- `monster-skill-runtime-v1`: Monster and boss skill projectiles must respect wall-blocked travel and hit legality.
- `map-editor-encounter-aggro`: Runtime encounter aggro source triggering must require wall-unblocked visibility to the player.
- `client-only-game-runtime`: Frontend-owned gameplay logic must include wall-blocked projectile, targeting, and aggro rules without backend dependency.

## Impact

- Affected WebApp runtime areas include `webapp/bakedMapLoader.ts`, `webapp/runtime/enemyRuntime.ts`, `webapp/runtime/frontendPlayableSkillEventBuilders.ts`, `webapp/runtime/skillEventConsumerRuntime.ts`, `webapp/runtime/damageZoneLifecycleRuntime.ts`, `webapp/runtime/monsterSkillEventBuilder.ts`, and the App-level wiring that currently passes battle map/runtime dependencies.
- Affected behavior includes player projectile skills, chain/module-chain follow-ups, dynamic damage-zone ticks, monster authored/procedural aggro, monster projectile releases, boss/supreme boss projectile visuals, and projectile-to-player hit checks.
- Verification will require frontend runtime tests plus the normal playable WebApp battle view launched through `run.bat`, with screenshots stored under `artifacts/screenshots/`.
