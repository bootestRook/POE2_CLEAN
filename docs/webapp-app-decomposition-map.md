# WebApp App.tsx Decomposition Map

This map records safe first-pass extraction targets for `webapp/App.tsx`. It is descriptive only and must not be used to justify behavior changes.

## Current Responsibilities

- Lines 1-680: imports, shared item/tooltip/skill/map/runtime types, and editor bootstrap state.
- Lines 681-1839: launch flags, viewport helpers, constants, and static configuration.
- Lines 1843-3350: frontend state creation, save/load, stash/equipment normalization, skill preview recalculation, GM option helpers, and request shims.
- Lines 3364-3548: top-level `App` routing between WebApp modes.
- Lines 3549-5320: map editor scene, storage helpers, map document helpers, and map editor rendering helpers.
- Lines 5321-14913: main WebApp/rest/battle orchestration and mode-specific JSX inside the App-owned state surface.
- Lines 14914-20364: drag/drop, inventory/equipment/stash helpers, battle runtime helpers, render sorting, and battle entity rendering helpers.
- Lines 20365-20533: battle unit primitives such as boss bars and unit sprites.
- Lines 20534-21458: gem/equipment tooltip presentation, rich text, tooltip tags, tooltip normalization, and item orb presentation.
- Lines 21459-23013: skill VFX helpers, projectile/hit views, guide layers, damage zones, buffs, arcs, chain segments, and mounted passive visual effects.
- Lines 23014-23498: monster/runtime debug helpers, monster test factories, movement helpers, and generic math helpers.

## Leaf Candidates

- `webapp/components/tooltips/`: `GemTooltip`, `GemTooltipPanel`, support tooltip display, `RichText`, `TooltipTag`, `TooltipSection`, equipment tooltip formatting helpers, and `GemOrb`.
- `webapp/components/inventory/`: item cells, equipment slot presentation, stash page/grid presentation, inventory grid presentation, and drag/drop visual state.
- `webapp/utils/`: pure item/equipment helpers such as slot text, affix line formatting, source search text, rarity tone, and deterministic formatter helpers.
- `webapp/components/battle/`: `BossHealthBar`, `UnitAnimationSprite`, projectile views, hit VFX views, battle guide layers, damage zone layer, buff layer, melee arc layer, and chain segment layer.
- `webapp/components/rest-area/`: rest-area panels, NPC controls, stash entry controls, and rest-area overlays after their props are stable.
- `webapp/hooks/`: viewport hook, mounted passive visual effects hook, and other hooks only after their state ownership is clear.

## First-Pass Folder Layout

- `webapp/components/tooltips/TooltipPrimitives.tsx`
- `webapp/components/tooltips/GemTooltip.tsx`
- `webapp/components/tooltips/GemOrb.tsx`
- `webapp/components/inventory/InventoryGrid.tsx`
- `webapp/components/inventory/EquipmentSlots.tsx`
- `webapp/components/inventory/StashGrid.tsx`
- `webapp/components/battle/BattleUnits.tsx`
- `webapp/components/battle/BattleVfxLayers.tsx`
- `webapp/components/rest-area/RestAreaPanels.tsx`
- `webapp/hooks/useGameViewport.ts`
- `webapp/utils/equipmentDisplay.ts`
- `webapp/utils/tooltipDisplay.ts`

## Risky Areas To Defer

- App-owned state transitions, save/load mutation, autosave, and new-game creation.
- Gameplay/runtime event generation, target selection, hit timing, damage application, projectile pathing, and monster AI.
- Map editor implementation, because it is large and disabled as a verification surface for this WebApp refactor.
- Shared equipment placement logic that is used by both drag/drop behavior and tooltip comparison.
- Any extraction that requires editing Chinese display strings, CSS class names, storage keys, or runtime payload shapes.
