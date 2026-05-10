## ADDED Requirements

### Requirement: Extracted playable skill runtime remains frontend-owned
Frontend playable skill runtime extraction SHALL keep normal-play skill generation and consumption in client code as the sole playable source.

#### Scenario: Extracted generators stay client-only
- **WHEN** active skill event generation is moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL run in frontend WebApp code and SHALL NOT call Python `SkillRuntime`, `CombatSession`, `V1WebAppApi.runtime_skill_events`, `/api/runtime/skill-events`, backend gameplay services, or server-generated combat behavior

#### Scenario: Extracted consumers stay in the playable path
- **WHEN** skill event consumption or event batch adapters are moved
- **THEN** the moved code SHALL be consumed by the normal playable WebApp battle path and SHALL update playable state only through explicit frontend-owned dependencies

### Requirement: Extracted runtime naming avoids backend authority
Extracted frontend runtime modules and helpers SHALL use names that identify them as frontend-owned, playable, or WebApp runtime code rather than backend-canonical code.

#### Scenario: New names avoid canonical terminology
- **WHEN** new modules, functions, tests, or smoke checks are added for playable frontend skill runtime extraction
- **THEN** their names SHALL NOT use `canonical` to imply backend authority or Python runtime ownership

#### Scenario: Tooling references remain explicit
- **WHEN** retained Python or backend runtime names appear in comments, docs, tests, or checks
- **THEN** they SHALL be identified as tooling, legacy, comparison, or forbidden backend-coupling references rather than playable runtime evidence

### Requirement: Extracted skill runtime has representative frontend coverage
Frontend skill runtime extraction SHALL include executable coverage for representative event generation and consumption families.

#### Scenario: Event builder coverage follows families
- **WHEN** frontend playable event builder modules are extracted
- **THEN** tests or smoke checks SHALL cover representative projectile, chain, module-chain, damage-zone, melee-arc, player-nova, status, kill-triggered, hit VFX, floating text, and forced-movement payloads using frontend runtime paths

#### Scenario: Event consumer coverage follows side effects
- **WHEN** frontend playable event consumption helpers or adapters are extracted
- **THEN** tests or smoke checks SHALL cover representative enemy damage, player damage, status application, forced movement, projectile completion, dynamic zone ticks, floating text, hit VFX, kill-triggered effects, and drop/progression boundaries without backend evidence

### Requirement: Playable verification remains mandatory for skill runtime extraction
Frontend skill runtime extraction SHALL be accepted only with actual playable WebApp verification when battle behavior or visuals can be affected.

#### Scenario: Browser verification uses playable battle
- **WHEN** extraction changes files that can affect skill event generation, event consumption, projectiles, VFX timing, damage zones, target feedback, status visuals, forced movement, drops, or battle loop timing
- **THEN** verification SHALL run the normal playable WebApp battle view in a browser, capture screenshots under `artifacts/screenshots/`, and describe what was visible

#### Scenario: Disabled tooling is excluded
- **WHEN** frontend skill runtime extraction is verified
- **THEN** the skill editor, `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, `dist-skill-editor`, backend-only runtime reports, and Python-only runtime tests SHALL NOT be used as sufficient acceptance evidence
