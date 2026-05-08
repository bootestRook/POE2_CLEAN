## ADDED Requirements

### Requirement: Third-pass extraction targets remaining battle presentation
The WebApp SHALL continue `webapp/App.tsx` extraction by moving remaining render-only battle presentation code into focused client-side modules without changing playable behavior.

#### Scenario: Projectile body views are extracted safely
- **WHEN** projectile body components, projectile sprite presentation, projectile trail presentation, or projectile body display helpers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render supplied projectile state and SHALL NOT own projectile spawning, movement, collision, lifecycle, target selection, hit timing, damage, pierce, chain, or runtime event consumption

#### Scenario: Hit VFX views are extracted safely
- **WHEN** hit VFX components, impact sprite presentation, fork/nova/rain visual decorations, or hit display helpers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render supplied hit VFX state and SHALL NOT own damage application, floating text generation, follow-up suppression, target anchoring, projectile completion, or runtime event consumption

#### Scenario: Player buff overlays are extracted safely
- **WHEN** player buff overlay presentation is moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render supplied player and buff state without changing buff timing, guard state, movement channels, stat effects, runtime mutations, or skill results

### Requirement: Third-pass extraction isolates pure visual helpers
The WebApp SHALL move shared helper code only when the helper is deterministic display logic needed by extracted battle presentation modules.

#### Scenario: VFX classification helpers remain pure
- **WHEN** VFX kind selection, sprite sheet lookup, CSS token selection, visual tone selection, or scale normalization is moved into a shared helper module
- **THEN** the helper SHALL depend only on explicit inputs and SHALL NOT read or mutate React state, refs, local storage, save data, enemies, projectiles, player state, runtime queues, backend services, or global browser state

#### Scenario: Projectile and hit style helpers remain visual-only
- **WHEN** opacity, travel progress, world-to-screen style construction, ballistic shadow style, or impact visual scale helpers are moved out of `webapp/App.tsx`
- **THEN** the helpers SHALL preserve existing numeric formulas and SHALL NOT decide projectile lifecycle, collision, hit timing, target choice, damage, pierce, chain, or follow-up behavior

#### Scenario: Damage text helpers do not alter runtime damage
- **WHEN** damage number formatting or floating text component display helpers are moved out of `webapp/App.tsx`
- **THEN** the helpers SHALL preserve existing displayed text and component ordering and SHALL NOT change damage totals, damage component data, ailment results, hit results, or combat state

### Requirement: Third-pass guide overlays remain presentation-only
The WebApp SHALL keep skill guide and debug overlay extraction separate from gameplay runtime decisions.

#### Scenario: Skill guide layer renders supplied data
- **WHEN** skill guide layers, projectile alignment debug views, damage-zone guide views, or debug labels are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render supplied skill/package/debug values and projection callbacks without recalculating target selection, hit timing, damage-zone origin, damage, pierce, chain, monster behavior, or skill event results

#### Scenario: Debug toggles keep existing ownership
- **WHEN** guide/debug overlay components are extracted
- **THEN** the extracted components SHALL receive existing debug option values through props and SHALL NOT introduce new storage keys, URL parameters, local state ownership, or debug setting persistence

### Requirement: Third-pass verification is incremental
The WebApp SHALL verify each third-pass extraction group before continuing to the next group.

#### Scenario: Each extraction group is checked and committed
- **WHEN** a visual helper, projectile body, hit VFX, player buff, or guide overlay extraction group is completed
- **THEN** `npm run build`, `npm test`, focused TypeScript checks for touched modules, and actual playable WebApp verification SHALL pass or any remaining failures SHALL be explicitly identified as pre-existing and unrelated before that group is committed

#### Scenario: Playable WebApp is the acceptance surface
- **WHEN** third-pass extraction affects frontend rendering or interaction
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view, capture screenshots under `artifacts/screenshots/`, and describe the visible result

#### Scenario: Artifact hygiene is preserved
- **WHEN** tests, browser verification, or debugging produce screenshots, logs, traces, or generated evidence
- **THEN** those artifacts SHALL be stored under `artifacts/` and SHALL NOT be left in the repository root
