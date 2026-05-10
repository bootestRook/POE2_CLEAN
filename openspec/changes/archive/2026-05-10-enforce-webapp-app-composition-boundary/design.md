## Context

`docs/webapp-module-boundaries.md` and `openspec/specs/webapp-module-boundaries/spec.md` already define owner-first WebApp module boundaries and describe `webapp/App.tsx` as an orchestration root. The remaining gap is procedural: a future implementation can acknowledge the guidance but still begin by adding feature code to App, then extract later.

This change makes the App role an explicit planning artifact before implementation starts. It keeps App edits legal when they are genuinely app-shell/composition work, while requiring feature-specific UI, state, rules, text, and transforms to land in focused owner modules first.

## Goals / Non-Goals

**Goals:**

- Require WebApp plans to include an `App.tsx role` statement before editing.
- Make owner-module selection the first step for non-trivial WebApp work.
- Define a clear exception path for legitimate App-level work.
- Make large App diffs a pre-edit extraction trigger instead of a post-edit cleanup signal.
- Keep the process client-only and compatible with existing WebApp verification requirements.

**Non-Goals:**

- Do not ban all `webapp/App.tsx` edits.
- Do not move existing App code as part of this proposal.
- Do not introduce backend coupling, server runtime behavior, or new WebApp runtime behavior.
- Do not require visual browser verification for this proposal-only step; visual verification applies when implementation changes frontend behavior.

## Decisions

1. **Make `App.tsx role` a mandatory plan section.**

   The plan must state exactly what App will do, such as importing a focused module, mounting a component, passing props, forwarding callbacks, connecting mode/state, or initializing app-shell refs. This is stricter than a general reminder because implementation cannot begin until the role is named.

   Alternative considered: rely on the existing owner map. That leaves too much room for silent assumptions and does not force the App-specific decision into the plan.

2. **Allow App exceptions, but require pre-edit justification.**

   App can own app-shell responsibilities. If a change needs more than composition wiring, the plan must state the reason, expected line scope, and exit condition for extraction. This avoids a false absolute ban while making exceptions reviewable.

   Alternative considered: ban all non-wiring App edits. That would be brittle because top-level mode/state and app-shell orchestration legitimately belong in App.

3. **Use a 15-20 line threshold as a planning trigger, not an after-the-fact metric.**

   If an App edit is expected to exceed roughly 15-20 lines, the implementation must first split or create a focused module unless the extra lines are documented as app-shell ownership. The threshold is intentionally approximate; its purpose is to stop feature growth before editing starts.

   Alternative considered: enforce an exact line-count test. That would create noisy failures and can miss semantic violations in small diffs.

4. **Update both AI-facing docs and OpenSpec requirements.**

   `AGENTS.md` makes the workflow visible to Codex before every task, while the OpenSpec requirement makes it reviewable and archivable. `docs/webapp-module-boundaries.md` remains the detailed owner map and should carry the concrete App role examples.

## Risks / Trade-offs

- **Risk:** The new checklist becomes boilerplate without changing behavior.  
  **Mitigation:** Require concrete owner names, concrete App wiring statements, and explicit exception fields before editing.

- **Risk:** Legitimate App-shell changes are slowed down.  
  **Mitigation:** Keep the exception path lightweight and scoped to reason, expected size, and extraction exit condition.

- **Risk:** The App line threshold is treated as the only rule.  
  **Mitigation:** State that semantic ownership is primary; even a small diff is invalid if it adds feature UI, state, rules, text, or transforms to App.

- **Risk:** Docs and specs drift.  
  **Mitigation:** Implementation tasks update `AGENTS.md`, `docs/webapp-module-boundaries.md`, and the OpenSpec requirement together.
