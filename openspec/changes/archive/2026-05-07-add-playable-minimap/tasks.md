## 1. Exploration Runtime

- [x] 1.1 Add run-scoped minimap exploration state to the playable WebApp battle path without adding save payload fields.
- [x] 1.2 Add helper logic to convert player world position to runtime map grid coordinates and reveal nearby cells.
- [x] 1.3 Reset minimap exploration whenever a formal playable map run starts.
- [x] 1.4 Seed exploration around the finalized runtime player spawn before the first battle frame.
- [x] 1.5 Update exploration only when the player's grid cell changes or the current run/map changes.

## 2. Minimap Rendering And Interaction

- [x] 2.1 Add a formal battle minimap component that consumes finalized runtime map data and explored-cell state.
- [x] 2.2 Render compact minimap terrain only for explored cells, including walkable and blocker distinctions.
- [x] 2.3 Render the player's current position on the minimap relative to explored terrain.
- [x] 2.4 Add `M` keyboard handling gated to active formal playable battle runs.
- [x] 2.5 Add an enlarged centered semi-transparent overlay mode that uses the same explored-cell state as compact mode.
- [x] 2.6 Ensure the enlarged overlay does not pause gameplay and does not capture pointer events needed for pickup interaction.
- [x] 2.7 Add responsive CSS for compact and enlarged modes without overlapping critical HUD, inventory, failure, or pause overlays.
- [x] 2.8 Keep map editor minimap and skill editor surfaces unchanged.

## 3. Tests

- [x] 3.1 Add tests proving map-run startup resets minimap exploration and seeds the spawn reveal.
- [x] 3.2 Add tests proving movement updates explored cells through runtime player grid position.
- [x] 3.3 Add tests proving compact and enlarged minimaps do not render unexplored cells.
- [x] 3.4 Add tests proving `M` toggling is scoped to playable battle and does not introduce skill editor paths.
- [x] 3.5 Add tests or static assertions proving the overlay is pointer-transparent for battle pickup interaction.
- [x] 3.6 Add client-only boundary tests proving minimap state and rendering do not call backend APIs or backend runtime services.

## 4. Verification

- [x] 4.1 Run the relevant unit/static tests for WebApp battle boundaries and playable minimap behavior.
- [x] 4.2 Run `npm run build`.
- [x] 4.3 Start the local frontend without opening the skill editor.
- [x] 4.4 Enter the actual playable WebApp battle view and verify the compact minimap shows only explored cells.
- [x] 4.5 Press `M`, verify the centered semi-transparent overlay appears, and verify WASD movement still works while it is open.
- [ ] 4.6 Verify drop pickup interaction remains usable while the enlarged overlay is visible.
- [x] 4.7 Capture screenshots under `artifacts/screenshots/` for compact minimap and enlarged overlay verification.
- [x] 4.8 Describe the visible screenshot results and clearly state any frontend behavior that could not be verified.
