## 1. Baseline And Guardrails

- [x] 1.1 Inspect branch and `git status --short` before editing; identify unrelated dirty files and do not mix them into this refactor.
- [x] 1.2 Confirm the WebApp has a buildable or explicitly documented baseline before extraction; if existing syntax damage blocks the baseline, stop and report it separately.
- [x] 1.3 Add or update AI-visible repository guidance so future WebApp feature plans must name an existing module or propose a focused new module before implementation.
- [x] 1.4 Add a concise WebApp module-boundary guide if AGENTS guidance needs a stable reference for future AI work.

## 2. Dependency Map

- [x] 2.1 Map the major `webapp/App.tsx` regions by responsibility without editing behavior.
- [x] 2.2 Identify leaf UI blocks and pure helpers that can be moved without changing state ownership.
- [x] 2.3 Define the initial folder layout under `webapp/components/`, `webapp/hooks/`, and `webapp/utils/` using existing project naming style.
- [x] 2.4 Record any areas that are too coupled to move safely in the first pass.

## 3. Behavior-Preserving Extractions

- [x] 3.1 Extract equipment tooltip and comparison tooltip presentation into focused client-side modules, preserving text, DOM order, class names, props, and behavior.
- [x] 3.2 Extract inventory, equipment slot, stash, and item grid presentation modules while keeping App-owned state and callbacks unchanged.
- [x] 3.3 Extract repeated pure formatting helpers, type guards, and display utilities into utility modules without changing returned strings or values.
- [x] 3.4 Extract rest-area or battle-HUD presentational sections only when they can be moved without touching gameplay/runtime logic.
- [x] 3.5 Leave orchestration, shared state, and any risky cross-cutting logic in `App.tsx` until a later explicitly scoped change.

## 4. Verification

- [x] 4.1 Run the project build after each extraction group and record pass/fail with any unrelated blocker called out clearly.
- [x] 4.2 Launch the actual WebApp through the project `run.bat` flow for frontend verification.
- [x] 4.3 Capture screenshots of the visible extracted areas in the running WebApp and store them under `artifacts/screenshots/`.
- [x] 4.4 Verify no screenshots, logs, or test output files were written to the repository root.
- [x] 4.5 Review the final diff to confirm no gameplay, copy, CSS, storage, backend, dependency, or skill-editor changes were introduced.
