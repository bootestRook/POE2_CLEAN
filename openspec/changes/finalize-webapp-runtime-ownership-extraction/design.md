## Context

Previous WebApp architecture passes moved presentation, pure helpers, event builders, enemy damage formulas, and damage-zone lifecycle helpers out of `webapp/App.tsx`. The remaining high-friction code in App is no longer mostly JSX size; it is runtime ownership code that coordinates live battle state, event queues, damage results, visual queues, drops, and map progression.

The project is client-only. The playable WebApp frontend is the runtime source of truth for normal play. This change must not reconnect gameplay to backend APIs, Python runtime services, disabled skill-editor surfaces, or any parallel simulator. It must preserve current gameplay behavior while making the last runtime ownership boundaries searchable and explicit.

The important sequencing constraint is risk order:

1. Move event consumption ownership first.
2. Move damage application ownership second.
3. Consider battle-loop wiring only after those two owners are stable.

This is also a stop condition. After this change, `webapp/App.tsx` may remain a shell plus wiring file with some intentionally App-owned cross-domain state and refs. The goal is not to keep splitting for line count.

## Goals / Non-Goals

**Goals:**

- Establish a focused client-side owner for playable skill event consumption.
- Establish a focused client-side owner for playable damage application.
- Migrate smoke/source checks so protected invariants follow the new owner modules.
- Keep all target selection, hit timing, damage application, projectile trajectory, and damage-zone origin behavior single-owned.
- Leave `webapp/App.tsx` as shell, state/ref initialization, mode routing, and callback wiring after this pass.
- Define a concrete completion point so App decomposition stops after this architecture pass unless future feature work creates a specific new need.

**Non-Goals:**

- No gameplay balance changes, damage formula changes, AI redesign, projectile redesign, or skill behavior redesign.
- No backend APIs, backend services, server runtimes, or server-generated gameplay behavior.
- No skill-editor verification or acceptance surface.
- No new global state library, route rewrite, dependency addition, save-schema migration, storage-key change, CSS redesign, copy change, or unrelated refactor.
- No attempt to make `webapp/App.tsx` tiny by moving wiring into low-value wrapper files.

## Decisions

1. Extract the event consumer as an explicit dependency object, not a hidden global.

   The event consumer needs access to current player/enemy state, scheduled queues, active damage-zone refs, visual queue setters, status handlers, forced movement, projectile completion helpers, and damage routing. It should be introduced as a focused runtime module that receives explicit dependencies from App.

   Alternative considered: move `consumeSkillEventBatch` as-is into a hook with broad closure capture. Rejected because that would mostly rename the monolith and make ownership harder to audit.

2. Keep event builders separate from event consumption.

   Event builders already produce event payloads from explicit inputs in focused runtime modules. The new event consumer must consume those events and route side effects; it must not rebuild target lists, recompute projectile travel, choose damage-zone origins, or generate an alternate skill event stream.

   Alternative considered: combine builders and consumers into one skill runtime service. Rejected because it increases blast radius and risks duplicating target selection and hit timing.

3. Extract damage application after the event consumer is stable.

   `applyDamageEventBatch` depends on damage projection, HP and energy-shield mutation, kill detection, on-kill triggers, drops, player on-hit recovery, enemy retention, and combat logs. Moving it before the event consumer would force a premature callback shape and make recursive on-kill event routing harder to verify.

   Alternative considered: move damage application first because formulas already live in `enemyDamageRuntime.ts`. Rejected because the remaining function is mostly side-effect orchestration, not formula ownership.

4. Treat battle-loop extraction as optional and gated.

   `stepGame` touches elapsed time, pickups, portals, minimap reveal, enemy spawning, monster skills, player attacks, continuous/channel skills, projectile impacts, boss damage zones, active damage-zone ticks, and scheduled events. It should move only if the first two boundaries make a narrow hook or service obvious.

   Alternative considered: extract `stepGame` in the same pass unconditionally. Rejected because battle-loop ownership has the largest cross-domain dependency surface and is not necessary to unblock new content if App is already shell plus wiring.

5. Update tests from location checks to owner checks.

   Existing smoke checks intentionally assert that App owns event consumption, damage application, and battle-loop orchestration. This change must convert those checks so they assert the same invariant tokens in the new owner modules while still preventing backend coupling, disabled tooling acceptance, and duplicate runtime paths.

   Alternative considered: delete the smoke checks after moving code. Rejected because these checks are the main guard against accidental runtime duplication.

6. Make completion ownership-based, not line-count-based.

   The final state is acceptable when runtime owners are searchable, App imports them and wires dependencies, and remaining App code is clearly routing/state/ref/callback wiring. Further splitting should stop unless a future feature requires a specific owner.

   Alternative considered: continue extracting until App reaches a target line count. Rejected because line-count goals encourage wrapper files and obscure ownership.

## Risks / Trade-offs

- Event consumer dependency object becomes too broad -> Keep dependencies named by responsibility, preserve existing App-owned refs/setters, and avoid introducing a new global runtime container.
- Event consumption accidentally recalculates gameplay decisions -> Add smoke checks that fail on duplicate target selection, hit timing, projectile trajectory, damage-zone origin, or damage application logic in the wrong owner.
- Damage application move changes kill/drop ordering -> Preserve current event order, on-kill recursion, enemy retention filtering, combat log mutation, and drop spawning sequence; add focused checks around those tokens.
- Battle loop extraction expands scope -> Gate it behind completed event-consumer and damage-application extraction; skip it if it would create large unrelated dependency movement.
- Source tests become brittle during moves -> Move checks to owner modules in the same batch as each function move, and keep invariant tokens behavioral rather than line-number based.
- App still looks large after the pass -> Accept this if remaining code is shell, state/ref initialization, callback wiring, and intentionally deferred orchestration.
- Frontend verification is expensive -> Run the actual `run.bat` WebApp flow only at acceptance points, store screenshots under `artifacts/screenshots/`, and keep logs under `artifacts/logs/`.
