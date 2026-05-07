## 1. Rest Area State And Assets

- [x] 1.1 Add rest-area mode/state to the normal WebApp entry flow after title and save selection.
- [x] 1.2 Add the provided `王阳` NPC image as a frontend static asset under an existing WebApp asset path.
- [x] 1.3 Define rest-area object data for the player spawn, `王阳`, and the stash interactable using client-only constants.
- [x] 1.4 Add rest-area player movement state with 2D top-down bounds and no combat runtime activation.

## 2. Rest Area Interactions

- [x] 2.1 Render the rest-area scene, player, `王阳`, stash object, and clickable name labels.
- [x] 2.2 Implement clickable label interaction range checks for `王阳` and stash.
- [x] 2.3 Implement out-of-range click behavior so the player moves or is guided into interaction range before opening the target panel.
- [x] 2.4 Reuse the existing map progression data and `startGame(stageId)` path from the `王阳` stage-selection panel.
- [x] 2.5 Ensure closing stage selection returns to the rest-area scene without starting combat.

## 3. Stash Data And Persistence

- [x] 3.1 Add frontend save data for 5 stash pages with 100 slots per page.
- [x] 3.2 Add default empty stash data for new saves.
- [x] 3.3 Add migration/sanitization for existing saves with missing or malformed stash data.
- [x] 3.4 Persist stash page placement in the existing client-only save slot payload.
- [x] 3.5 Add duplicate item ownership guards so one item instance cannot occupy multiple storage locations.

## 4. Stash UI And Transfers

- [x] 4.1 Build the stash panel with the active 10x10 stash page in the center and page tabs for all 5 pages.
- [x] 4.2 Show the player's inventory/gem item slots on the right side of the stash panel.
- [x] 4.3 Reuse existing item orb, tooltip, hover, and drag styling where practical.
- [x] 4.4 Implement transfer behavior between inventory slots and stash slots while preserving item instance data.
- [x] 4.5 Ensure closing the stash panel returns to rest-area focus with save state preserved.

## 5. Return Flow

- [x] 5.1 Route combat completion/failure/return actions back to the rest-area scene.
- [x] 5.2 Preserve inventory, stash, board, equipment, and map progress when returning from combat.
- [x] 5.3 Ensure the player can interact with `王阳` again after returning from a combat run.

## 6. Tests And Verification

- [x] 6.1 Add focused automated tests for stash defaults, save migration, save reload, and duplicate ownership sanitization.
- [x] 6.2 Add focused automated tests for rest-area entry and `王阳` stage-selection routing where the current frontend test setup supports it.
- [ ] 6.3 Run the existing relevant test suite and WebApp build.
- [x] 6.4 Start/open the playable WebApp locally and verify the rest-area scene in the browser.
- [x] 6.5 Capture screenshots under `artifacts/screenshots/` showing the rest area with `王阳`, `王阳` opening stage selection, and the stash panel with a 10x10 page and 5 page tabs.
- [x] 6.6 Confirm no screenshot, log, server output, or generated verification artifact was written to the repository root.
