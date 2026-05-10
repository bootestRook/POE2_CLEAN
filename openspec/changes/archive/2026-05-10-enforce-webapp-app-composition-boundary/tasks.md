## 1. Boundary Rule Implementation

- [x] 1.1 Update `AGENTS.md` so every non-trivial WebApp plan must include an explicit `App.tsx role` section before editing.
- [x] 1.2 Update `docs/webapp-module-boundaries.md` with the concrete App composition role template, allowed wiring examples, disallowed feature ownership examples, and pre-edit exception format.
- [x] 1.3 Update `openspec/specs/webapp-module-boundaries/spec.md` by applying the delta requirements from this change.

## 2. Verification

- [x] 2.1 Verify the updated docs/specs contain the required `App.tsx role` wording and the 15-20 line pre-edit extraction threshold.
- [x] 2.2 Run OpenSpec status/validation for `enforce-webapp-app-composition-boundary` and confirm the change is apply-ready.
- [x] 2.3 Confirm no production WebApp source or frontend behavior was changed by this implementation-only guardrail update.
