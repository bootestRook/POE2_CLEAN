## Context

The playable WebApp is already client-only and stores save slots in browser localStorage. Normal play currently progresses from title screen to save selection to map selection, while inventory, equipment, gem board, drops, and map progress are already owned by frontend state. The requested change adds an in-world preparation scene between save load and combat entry.

The rest area must respect the repository constraints: no backend gameplay dependency, no skill editor verification surface, no root-level screenshots or logs, and no unrelated combat/runtime refactor. The NPC `王阳` is a stage-selection affordance, not a new combat actor or dialogue system.

## Goals / Non-Goals

**Goals:**

- Make the rest area the normal post-save destination.
- Let the player move in the rest-area scene and click object name labels to interact.
- Add `王阳` as the stage-selection NPC using the provided white-haired brown-cloaked character image.
- Add a stash object with 5 pages of 10x10 slots.
- Reuse existing inventory item rendering, drag placement, tooltip, and save patterns where practical.
- Persist stash contents in the same client-only save slot payload as inventory, equipment, board, and map progress.
- Verify the finished frontend behavior in the actual playable WebApp with screenshots under `artifacts/screenshots/`.

**Non-Goals:**

- No backend API, server runtime, or server-authored gameplay state.
- No new dialogue tree, quest system, vendor, crafting, currency, or account-wide stash.
- No changes to combat balance, skill runtime behavior, monster AI, loot probabilities, map progression rules, or equipment affix generation.
- No use of `/skill-editor`, `?skill_editor=1`, port `8765`, or `dist-skill-editor` for acceptance verification.
- No 2.5D, isometric, dimetric, or projection-scaled gameplay visuals for the rest area.

## Decisions

### Rest Area As A WebApp Mode

Add a new normal-play UI mode for the rest area instead of treating map selection as a full-screen entry step.

- Rationale: the current `entryStep` flow already separates title/save/map states, so the smallest safe path is to replace the post-save `map` step with a rest-area mode and open map selection as an overlay from `王阳`.
- Alternative considered: launch directly into the existing battle map with NPC and stash objects injected. This would couple preparation UI to combat state, enemy spawning, drops, and map-run lifecycle.

### Clickable Labels As Interactions

Render `王阳` and stash labels as clickable in-world UI, similar to ground drop labels.

- Rationale: this matches the user's requested interaction style and can reuse the existing ground-label affordance pattern.
- Interaction behavior: clicking a label should either open the target panel when the player is in range, or set an interaction target so movement/approach completes the interaction when the player reaches range.
- Alternative considered: keyboard-only prompts near objects. This is less aligned with the user's requested mouse-click flow.

### `王阳` Opens Existing Stage Selection

Use `王阳` as the only normal rest-area stage-selection NPC.

- Rationale: stage selection data and `startGame(stageId)` already exist; this change should move the entry point without rewriting map progression.
- Alternative considered: create a separate NPC dialogue menu that then links to stage selection. That adds a dialogue system before it is needed.

### Stash Reuses Item Interaction Semantics

Represent stash pages as saved slot arrays that reference player-owned item instance IDs, while inventory remains the owner of item payloads.

- Rationale: existing inventory, board, and equipment logic already uses item instance IDs for slot placement. Storing duplicate item payloads inside stash pages would create consistency and migration risk.
- Stash shape: 5 pages, each 100 slots. UI page tabs switch the active stash page. Empty slots are explicit `null` entries.
- Alternative considered: move full item records into stash storage. This makes board/equipment/inventory/stash transfers harder to keep consistent and increases save migration surface.

### Dedicated Stash Panel Layout

When stash opens, show player inventory/gems on the right and the active 10x10 stash page in the center.

- Rationale: this follows the user's requested layout and keeps the player's familiar inventory interaction on the same side as the existing bag workflow.
- The normal board/equipment workbench can remain separate from the stash panel unless later requirements ask to edit the board while the stash is open.

## Risks / Trade-offs

- Stash slot ownership can drift from inventory item ownership if item IDs are removed elsewhere -> sanitize stash pages during save load and after item deletion/equipment/board reconciliation.
- Existing `App.tsx` is large, so adding hub logic there may increase complexity -> keep helper functions small and avoid unrelated extraction unless needed for tests.
- Auto-approach interactions can feel inconsistent if movement collides with scene props -> use simple 2D top-down bounds and explicit interaction radius before adding obstacle complexity.
- Using the provided NPC image as-is may include background or framing artifacts -> import it as a static asset first, then crop/style only as needed for the rest-area visual.
- Visual verification may miss stash drag edge cases -> pair screenshot verification with focused automated tests for persistence and transfer invariants.

## Migration Plan

1. Add default stash data for new saves.
2. Migrate existing save payloads by adding empty 5-page stash data when missing.
3. Route loaded/new saves into the rest-area scene instead of direct stage selection.
4. Preserve existing map progression and combat entry behavior behind `王阳`.
5. If rollback is needed, existing saves can ignore stash fields and return to direct map selection without corrupting inventory items because stash stores only item IDs.

## Open Questions

- The implementation should decide the final static filename for the provided `王阳` image when the asset is added.
- The stash object visual can start as a simple chest/warehouse prop unless a specific image is provided later.
