## 1. Baseline And Scope

- [x] 1.1 Inspect branch and `git status --short`; identify unrelated dirty files and avoid mixing them into this extraction.
- [x] 1.2 Review `docs/webapp-module-boundaries.md`, `webapp/App.tsx`, and the current extracted component folders to confirm target module ownership before editing.
- [x] 1.3 Run the current WebApp build or document any pre-existing build blocker before starting extraction.
- [x] 1.4 Confirm the implementation will not use skill-editor routes, port `8765`, `dist-skill-editor`, backend APIs, or server runtime behavior as acceptance evidence.

## 2. Map And Debug Presentation Extraction

- [ ] 2.1 Move baked map background and editor runtime map background presentation out of `webapp/App.tsx` into a focused battle presentation module while preserving markup, class names, and styles.
- [ ] 2.2 Move map debug overlay, debug marker, and debug cell style presentation into the same focused boundary without changing map data, walkability, camera, or minimap ownership.
- [ ] 2.3 Move procedural spawn debug panel presentation into a render-only module that receives the existing debug summary through props and does not touch spawn generation.
- [ ] 2.4 Run focused TypeScript/build checks for the map/debug extraction and review the diff for behavior, copy, CSS, storage, backend, or runtime changes.

## 3. Character Panel Extraction

- [ ] 3.1 Create a focused character presentation boundary for `CharacterInfoPanel` and its display-only row/time/resource formatting helpers.
- [ ] 3.2 Keep stat recalculation, equipment effects, player runtime resource ownership, save data, and App state ownership unchanged in `webapp/App.tsx`.
- [ ] 3.3 Run focused TypeScript/build checks for the character panel extraction and review the diff for behavior, copy, CSS, storage, backend, or runtime changes.

## 4. Skill-Board Presentation Extraction

- [ ] 4.1 Identify any thin shared type definitions needed for board presentation imports and move only shape-preserving type definitions when necessary.
- [ ] 4.2 Move board cell rendering, gem ghost rendering, support preview display, boundary class helpers, hover class helpers, and support preview class helpers into `webapp/components/skill-board/`.
- [ ] 4.3 Keep placement legality, drag/drop mutation, floating item state, tooltip state, support modifier calculation, mounted skill recalculation, storage, and save ownership unchanged in `webapp/App.tsx`.
- [ ] 4.4 Run focused TypeScript/build checks for the skill-board extraction and review the diff for behavior, copy, CSS, storage, backend, or runtime changes.

## 5. Verification

- [ ] 5.1 Run `npm run build`.
- [ ] 5.2 Run `npm test` or document any pre-existing unrelated blocker.
- [ ] 5.3 Launch or match the actual WebApp through the project `run.bat` flow and exercise the playable view affected by the extracted presentation.
- [ ] 5.4 Capture frontend verification screenshots under `artifacts/screenshots/` and describe the visible result.
- [ ] 5.5 Confirm no screenshots, logs, traces, or generated verification artifacts were left in the repository root.
- [ ] 5.6 Review the final diff to confirm no gameplay, save schema, storage key, copy, CSS, backend, dependency, skill-runtime, or skill-editor acceptance changes were introduced.
