# Runtime Orchestration Extraction Baseline Audit

## 1.1 Branch And Worktree

- Branch: `main`.
- Starting worktree status: clean.
- Last commit before implementation: `13f532b Propose App runtime orchestration extraction`.
- No unrelated dirty files overlap `webapp/App.tsx`, WebApp runtime modules, WebApp type modules, smoke tests, or this change's OpenSpec files.

## 1.2 Context Review

- Re-read `AGENTS.md`: the project remains client-only, WebApp changes must identify focused owner modules before editing, frontend-affecting work requires actual playable WebApp browser screenshots, and skill-editor verification is forbidden.
- Re-read `docs/webapp-module-boundaries.md`: `webapp/App.tsx` is limited to mode routing, App-owned state/ref initialization, viewport shell composition, imports, callback adapters, and unavoidable focused-module wiring.
- Re-read `docs/webapp-app-decomposition-map.md`: remaining App responsibilities are dominated by runtime/domain types, constants, playable skill event generation/consumption, damage/status/resource helpers, projectile/damage-zone lifecycle, battle-loop orchestration, and state/ref wiring.
- Re-read `docs/codex-skill-workflow.md`: skill runtime work must start from gameplay mechanisms, reuse existing frontend runtime/config/test paths, and prove runtime behavior rather than payload presence alone.
- Re-read this change's proposal, design, and spec deltas: extraction order is type/constant boundaries, pure deterministic helpers, playable event builders, damage/status/resource/lifecycle helpers, then orchestration only after dependencies are stable.
- Explicit non-goals remain unchanged: no backend/API/server runtime, Python `SkillRuntime`, save-schema or storage-key changes, dependencies, CSS redesign, copy edits, gameplay balance changes, or skill-editor acceptance path.
