# webapp-typecheck-cleanliness Specification

## Purpose
TBD - created by archiving change clean-up-full-tsc-errors. Update Purpose after archive.
## Requirements
### Requirement: Full WebApp TypeScript Check Passes
The WebApp SHALL pass the full TypeScript check using the repository root `tsconfig.json`.

#### Scenario: Full typecheck command succeeds
- **WHEN** `npx tsc --noEmit --pretty false` is run from the repository root
- **THEN** the command exits successfully with no TypeScript diagnostics

### Requirement: Existing WebApp Verification Remains Green
The cleanup MUST preserve existing WebApp smoke and production build verification.

#### Scenario: Existing checks still pass
- **WHEN** `npm test` and `npm run build` are run from the repository root
- **THEN** both commands exit successfully

### Requirement: Type Cleanup Preserves Client-Only Behavior
The cleanup MUST remain client-only and MUST NOT introduce backend coupling or new server-derived gameplay behavior.

#### Scenario: No backend coupling is added
- **WHEN** the cleanup is reviewed
- **THEN** no new backend API, backend service, server runtime, web API layer, or server-generated gameplay dependency is introduced

### Requirement: Type Fixes Preserve Playable WebApp Behavior
The cleanup MUST express existing runtime behavior with safer TypeScript types without intentionally changing playable WebApp behavior.

#### Scenario: Playable WebApp still renders
- **WHEN** the WebApp is launched through the project `run.bat` flow after the cleanup
- **THEN** the actual playable WebApp view renders and a verification screenshot is captured under `artifacts/screenshots/`

### Requirement: Type Suppressions Are Not The Primary Strategy
The cleanup MUST NOT satisfy typecheck primarily by weakening compiler options or adding broad suppressive casts.

#### Scenario: Cleanup approach is reviewed
- **WHEN** the cleanup diff is reviewed
- **THEN** it uses focused types, guards, adapters, or localized boundary conversions instead of broad `any`, blanket `unknown as X`, `@ts-ignore`, or TypeScript strictness weakening

