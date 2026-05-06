## Context

The playable WebApp has already been migrated toward a client-only game runtime. Normal play must not call backend gameplay APIs, and Python systems are allowed only as tooling, migration comparison, reports, or legacy compatibility.

The current codebase still carries ambiguous boundaries:
- Frontend skill paths use names such as `buildFrontendCanonicalSkillEvents`, even though the frontend is the playable source.
- Python tests around `V1WebAppApi.runtime_skill_events` and `SkillRuntime` still read as canonical gameplay evidence.
- Frontend behavior coverage exists mostly as static string checks and broad smoke tests, while individual playable skill event builders and consumers remain concentrated in `webapp/App.tsx`.

The black hole pull regression exposed the practical consequence. Python `SkillRuntime` emitted the expected area `forced_movement` ticks, but the playable frontend damage-zone path skipped those events when `dynamic_tick_runtime` was active.

## Goals / Non-Goals

**Goals:**
- Make frontend-owned skill runtime terminology explicit and remove misleading canonical/backend wording from playable code paths.
- Put skill event generation and event consumption behind clearer frontend runtime module boundaries.
- Add tests that exercise frontend runtime behavior for active skill families and cross-cutting events such as forced movement, dynamic ticking, statuses, kill triggers, hit VFX, and floating text.
- Keep Python runtime tests only as tooling or migration-comparison checks, with names and assertions that cannot be mistaken for playable acceptance.
- Preserve all existing skill numbers, timings, target policies, damage semantics, visual intent, and player-visible behavior.

**Non-Goals:**
- No backend gameplay service, API, server runtime, or server-authoritative validation.
- No skill rebalance, redesign, or content migration.
- No deletion of Python runtime tooling in the first implementation pass unless it is provably unused outside tooling.
- No use of the disabled skill editor as verification evidence.

## Decisions

### Decision: Frontend runtime is the playable source

Playable skill correctness SHALL be proven through frontend runtime code and actual WebApp battle verification. Python `SkillRuntime` can remain useful as a comparison oracle, but it is not playable acceptance.

Alternative considered: keep Python `SkillRuntime` as canonical and port failures into frontend as needed. Rejected because the project is client-only and this exact split allowed a shipped gameplay bug.

### Decision: Rename before deeper refactor

The first implementation step should rename frontend runtime functions and tests away from `canonical` language. This is low-risk and makes later diffs easier to review.

Candidate naming:
- `releaseFrontendCanonicalSkill` -> `releaseFrontendPlayableSkill`
- `buildFrontendCanonicalSkillEvents` -> `buildFrontendPlayableSkillEvents`
- backend/Python tests using `canonical_runtime` -> `legacy_runtime`, `tooling_runtime`, or `comparison_runtime`

Alternative considered: jump directly to a module extraction. Rejected because unclear naming would continue to confuse review and test intent during the extraction.

### Decision: Extract by behavior family, not by event type

Frontend skill generation should move out of `webapp/App.tsx` by behavior family first:
- projectile
- chain
- module_chain
- damage_zone
- melee_arc
- player_nova

Each family can share helper types and common event factories, but the first extraction should preserve behavior and avoid a broad runtime redesign.

Alternative considered: create a generic declarative event interpreter. Rejected for this change because it would be a larger behavior rewrite and risks incidental effect drift.

### Decision: Test generation and consumption separately

Event generation tests should prove the frontend runtime emits the expected timeline for seeded skills. Event consumption tests should prove emitted events mutate frontend runtime state correctly.

For black hole-class behavior this means:
- generation emits `damage_zone` plus area `forced_movement` even when dynamic tick runtime is active
- consumption pulls all live enemies inside the zone toward the origin using current positions
- browser verification shows the circular black hole effect in the playable battle view

Alternative considered: rely on browser screenshots only. Rejected because screenshots are necessary but too coarse to catch every event timeline regression.

### Decision: Python runtime remains explicit tooling

Python `SkillRuntime`, `CombatSession`, and `V1WebAppApi.runtime_skill_events` may continue serving reports, import/export workflows, and migration comparison tests. Any test using them must be named and scoped as tooling or comparison evidence.

Alternative considered: delete Python runtime now. Rejected because it still appears in reports and legacy tools, and deletion would mix cleanup with frontend runtime hardening.

## Risks / Trade-offs

- [Risk] Module extraction changes runtime behavior accidentally. -> Mitigation: add characterization tests before moving each family, then compare after extraction.
- [Risk] Static string tests remain brittle. -> Mitigation: use them only for boundary/terminology checks; behavior must be covered by executable frontend runtime tests.
- [Risk] Python tooling tests are accidentally interpreted as playable proof again. -> Mitigation: rename test files/functions and add a boundary test that rejects `canonical` wording around backend skill runtime evidence.
- [Risk] Browser verification becomes slow. -> Mitigation: use one focused playable battle scenario per representative family and keep screenshots under `artifacts/screenshots/`.
- [Risk] Dirty worktree contains unrelated frontend changes. -> Mitigation: implementation must keep diffs scoped and must not revert unrelated user changes.

## Migration Plan

1. Add terminology boundary tests and rename frontend playable skill runtime functions away from `canonical`.
2. Rename Python runtime tests and helper APIs in tests/docs to make their tooling/comparison role explicit.
3. Add focused frontend runtime tests around current `App.tsx` behavior before extraction, prioritizing black hole/damage-zone forced movement, projectile, chain, module-chain, melee, nova, status, and kill-triggered behavior.
4. Extract frontend skill event generation by behavior family into frontend runtime modules while keeping public behavior unchanged.
5. Extract or wrap event consumption helpers for damage, status, forced movement, VFX, and floating text so they are testable without browser-only interaction.
6. Run the playable WebApp battle view and capture screenshots for representative skills, including black hole.
7. Keep Python runtime tests passing as tooling/comparison tests, but do not use them as acceptance evidence for playable behavior.

Rollback is per phase: if extraction changes behavior, keep the existing `App.tsx` implementation and retain the added characterization tests until the mismatch is fixed.

## Open Questions

- Whether to eventually delete `V1WebAppApi.runtime_skill_events` or keep it indefinitely for reports and migration comparison.
- Whether the frontend runtime module should initially stay React-adjacent or be made fully framework-independent for easier tests.
