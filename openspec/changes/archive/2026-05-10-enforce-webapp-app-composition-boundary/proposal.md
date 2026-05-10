## Why

Future WebApp work can still regress into adding feature UI, state, rules, text, or data transforms directly inside `webapp/App.tsx` unless the planning workflow makes the App role explicit before editing. This change turns the App composition boundary from guidance into a required pre-implementation checkpoint.

## What Changes

- Require every non-trivial WebApp implementation plan to include an explicit `App.tsx role` statement before editing.
- Define `webapp/App.tsx` as a composition/app-shell file by default: it may wire focused modules, pass props, forward callbacks, initialize top-level app-shell state/refs, and connect top-level modes.
- Require feature UI structure, feature-owned state, business rules, display text decisions, and data transformations to live in focused owner modules unless an App-level exception is justified before implementation.
- Require missing owner modules to be created or documented before feature code is added.
- Require App-level exceptions to state the reason, expected scope, and extraction threshold before editing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `webapp-module-boundaries`: Adds mandatory App composition-role planning and exception rules for future WebApp changes.

## Impact

- Affects WebApp planning, review, and implementation workflow.
- Expected implementation touches `docs/webapp-module-boundaries.md`, `AGENTS.md`, and `openspec/specs/webapp-module-boundaries/spec.md`.
- No backend APIs, server runtime, gameplay backend coupling, or production WebApp behavior changes are introduced by this proposal.
