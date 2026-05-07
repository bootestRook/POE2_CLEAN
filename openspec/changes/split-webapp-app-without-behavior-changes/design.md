## Context

The WebApp is client-only and currently concentrates many unrelated UI panels, helpers, state handlers, and gameplay-facing view code in `webapp/App.tsx`. This makes small changes fragile because every edit touches a very large file with many Chinese strings and dense JSX, increasing the chance of accidental syntax or encoding damage.

The implementation must not change any user-visible behavior. The purpose is to reduce future editing risk and to make future AI-assisted feature work follow a clear module placement rule.

## Goals / Non-Goals

**Goals:**

- Split `webapp/App.tsx` into focused client-side modules through small, reviewable, behavior-preserving extraction steps.
- Keep existing props, state ownership, text, styles, runtime calls, storage behavior, and rendering order unchanged during extraction.
- Establish a repository rule that future WebApp feature plans must name the target module or propose a new focused module before implementation.
- Put the AI-facing development rule where future Codex work will read it before coding, such as `AGENTS.md` plus a short referenced WebApp module-boundary doc.
- Verify each frontend-affecting extraction in the actual WebApp launched through the `run.bat` flow, with screenshots stored outside the repository root.

**Non-Goals:**

- No gameplay, equipment, tooltip, skill runtime, monster runtime, save format, balance, copy, or visual design changes.
- No backend/API/service coupling.
- No large state-management rewrite.
- No route restructure, build tool migration, package dependency change, or CSS redesign.
- No use of the skill editor as a verification surface.

## Decisions

1. Use behavior-preserving extraction before abstraction.

   Move exact component/helper code into new files first. Keep prop drilling and existing state ownership until the extracted boundaries are stable. This avoids mixing file decomposition with logic redesign.

   Alternative considered: introduce a new state architecture while splitting. Rejected because it would make behavior preservation hard to prove and would increase the diff size.

2. Extract leaf UI and pure helpers before stateful orchestration.

   Start with low-dependency areas such as tooltip rendering, equipment/inventory panels, stat formatting helpers, and repeated presentational controls. Leave high-level App orchestration and cross-cutting state in `App.tsx` until late.

   Alternative considered: split by route or top-level game mode first. Rejected because those boundaries often depend on shared state and would create larger prop surfaces immediately.

3. Preserve CSS class names and DOM structure unless a move requires only import-path changes.

   Existing visual behavior should remain the acceptance target. Any class rename, layout adjustment, text edit, or style change is out of scope for this change.

   Alternative considered: clean up styles while extracting components. Rejected because visual cleanup is a separate functional/UI change.

4. Codify future module placement in AI-visible guidance.

   Add a short WebApp module-boundary rule to repository guidance read by Codex and, if useful, link to a concise docs file that maps feature types to target folders. Future plans for new WebApp features must include the module placement decision.

   Alternative considered: rely on OpenSpec tasks only. Rejected because the rule needs to affect future work after this change is archived.

5. Require clean-baseline implementation.

   Before implementation, identify existing uncommitted or syntax-damaged changes and keep them separate from this refactor. Do not repair unrelated damage inside the module-splitting change unless the user explicitly scopes it in.

   Alternative considered: repair and refactor in one pass. Rejected because it hides root cause and makes rollback difficult.

## Risks / Trade-offs

- Existing dirty worktree or syntax damage -> Mitigation: start from a known-good baseline or isolate the refactor from unrelated repairs before moving code.
- Circular imports after extraction -> Mitigation: extract leaf modules first and keep shared types/helpers in one-directional utility modules.
- Accidental behavior change through closure/state movement -> Mitigation: keep state ownership in `App.tsx` initially and pass existing values/callbacks through props.
- Visual regression that build checks cannot catch -> Mitigation: run the actual WebApp through `run.bat` and capture screenshots for each visible extraction area.
- App remains partly large after safe first pass -> Mitigation: accept incremental reduction; do not force risky extractions to satisfy a size target.
