## 1. Boundary And Terminology

- [ ] 1.1 Audit frontend skill runtime names, Python runtime tests, and OpenSpec references for `canonical` wording that implies backend playable authority.
- [ ] 1.2 Add or update static boundary tests proving playable frontend skill runtime helpers do not use backend-canonical naming.
- [ ] 1.3 Rename playable frontend skill runtime entrypoints from canonical terminology to playable/frontend terminology without changing behavior.
- [ ] 1.4 Rename Python runtime tests that execute `SkillRuntime`, `CombatSession`, or `V1WebAppApi.runtime_skill_events` so they read as tooling, legacy, or comparison tests.

## 2. Frontend Runtime Characterization

- [ ] 2.1 Add focused frontend runtime tests for projectile skill event generation and event consumption.
- [ ] 2.2 Add focused frontend runtime tests for chain and module-chain skill event generation and event consumption.
- [ ] 2.3 Add focused frontend runtime tests for damage-zone dynamic tick behavior, including black hole `forced_movement` generation.
- [ ] 2.4 Add focused frontend runtime tests for `forced_movement` consumption using current enemy positions and area radius filtering.
- [ ] 2.5 Add focused frontend runtime tests for melee-arc and player-nova skill families.
- [ ] 2.6 Add focused frontend runtime tests for status application, kill-triggered follow-ups, hit VFX scheduling, and floating text scheduling.

## 3. Runtime Module Extraction

- [ ] 3.1 Introduce frontend skill runtime module boundaries with shared event types, event factory helpers, geometry helpers, and test fixtures.
- [ ] 3.2 Move projectile event generation into the frontend runtime module and keep existing behavior tests passing.
- [ ] 3.3 Move chain and module-chain event generation into the frontend runtime module and keep existing behavior tests passing.
- [ ] 3.4 Move damage-zone event generation into the frontend runtime module and keep dynamic tick, black hole pull, and status tests passing.
- [ ] 3.5 Move melee-arc and player-nova event generation into the frontend runtime module and keep existing behavior tests passing.
- [ ] 3.6 Extract or wrap event consumers for damage, status, forced movement, hit VFX, and floating text so they can be tested without relying only on browser interaction.

## 4. Tooling Demotion

- [ ] 4.1 Update Python runtime test descriptions and helper names to state that they are tooling, legacy compatibility, reports, or migration comparison evidence.
- [ ] 4.2 Ensure no Python runtime test is named or documented as canonical playable skill acceptance.
- [ ] 4.3 Keep report/import/export workflows using Python `SkillRuntime` working where they are still relevant outside normal play.
- [ ] 4.4 Add a guard test that backend-only runtime evidence cannot satisfy frontend playable skill behavior acceptance.

## 5. Verification

- [ ] 5.1 Run focused frontend runtime tests for all representative skill families and cross-cutting event consumers.
- [ ] 5.2 Run Python tooling/comparison tests that remain relevant after renaming.
- [ ] 5.3 Run static client-only boundary tests proving the playable WebApp does not call backend gameplay APIs.
- [ ] 5.4 Build the WebApp.
- [ ] 5.5 Run the actual playable WebApp battle view in a browser and capture screenshots for black hole, projectile, chain/module-chain, damage-zone, melee/nova, status, and loot/death scenarios under `artifacts/screenshots/`.
- [ ] 5.6 Confirm no screenshots, logs, or generated verification artifacts were written to the repository root.
