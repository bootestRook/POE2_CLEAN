## Why

The current playable WebApp sends players from save selection directly into map selection, leaving no in-world transition space for managing inventory, storage, or challenge flow. A rest-area hub gives the V1 loop a clearer rhythm: load save, manage items, choose a stage through an NPC, fight, then return to preparation.

## What Changes

- Add a client-only rest-area scene that becomes the normal destination after creating or loading a save.
- Add an interactable NPC named `王阳`, using the user-provided white-haired brown-cloaked character image as the NPC visual.
- Make `王阳` the in-scene stage-selection entry: clicking the NPC name label opens the existing stage selection flow.
- Add an interactable stash object in the rest area; clicking its name label opens a stash interface.
- Add stash storage with 5 switchable pages, each page sized 10x10 slots.
- Reuse the existing inventory/item/gem interaction model for stash transfers, tooltips, slot display, and drag behavior where possible.
- Keep all new behavior client-only through frontend code, local static assets, and versioned frontend save data.
- Ensure frontend changes are visually verified in the actual playable WebApp view, not the disabled skill editor.

## Capabilities

### New Capabilities
- `rest-area-hub`: Defines the client-only rest-area scene, click-label interactions, NPC stage-selection entry, stash interaction, and return flow between saves, rest area, and combat.

### Modified Capabilities
- `v1-minimal-sudoku-gem-loop`: Extends Inventory / Storage and WebApp entry requirements so the V1 loop includes rest-area preparation, stash pages, and returning to the rest area before entering another combat run.

## Impact

- Affected frontend: `webapp/App.tsx`, `webapp/styles.css`, rest-area UI state, movement/interaction handling, inventory/stash panels, save/load serialization, and static asset imports.
- Affected assets: add the `王阳` NPC image under `webapp/assets/` or another existing frontend static asset path.
- Affected persistence: frontend save payload gains stash page data and migration/default handling for existing saves.
- Affected tests: frontend persistence/schema tests, interaction tests for rest-area labels, stash transfer behavior, and playable WebApp visual verification screenshots under `artifacts/screenshots/`.
- Not affected: no backend APIs, no server runtime, no skill editor surface, no combat balance, no skill runtime behavior, no map editor behavior.
