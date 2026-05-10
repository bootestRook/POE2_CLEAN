## ADDED Requirements

### Requirement: WebApp localization has a focused owner module
The WebApp SHALL define a focused client-side localization owner for string resources, lookup helpers, fallback behavior, and localization-specific tests.

#### Scenario: New localized copy is added
- **WHEN** future WebApp work adds or migrates user-facing copy
- **THEN** the work SHALL place localization maps, lookup helpers, and fallback rules in the localization owner instead of `webapp/App.tsx`

#### Scenario: Feature module renders localized copy
- **WHEN** a feature module renders migrated user-facing copy
- **THEN** the feature module SHALL consume the localization owner through a narrow lookup API or passed display text and SHALL NOT parse localization config directly

#### Scenario: Module boundary docs are updated
- **WHEN** the localization owner module is implemented
- **THEN** the WebApp module-boundary documentation SHALL list that owner and its responsibilities
