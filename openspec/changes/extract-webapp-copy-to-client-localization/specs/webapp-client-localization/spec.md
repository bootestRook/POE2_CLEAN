## ADDED Requirements

### Requirement: WebApp copy resolves from client-side localization resources
The WebApp SHALL provide a client-only localization layer for migrated user-facing copy, backed by local static resources and available without backend APIs, server runtimes, or remote fetches.

#### Scenario: Migrated copy is requested
- **WHEN** a migrated WebApp component or formatter needs user-facing text
- **THEN** it SHALL request the text through the client localization layer instead of embedding the display string directly in feature logic

#### Scenario: App runs offline
- **WHEN** the WebApp is launched through the local client flow
- **THEN** localized text SHALL resolve from bundled local resources without contacting any backend or remote localization service

### Requirement: Localization lookups have explicit fallback behavior
The localization layer SHALL return deterministic fallback text for missing keys and SHALL make missing-key behavior testable.

#### Scenario: Key exists
- **WHEN** code requests an existing localization key
- **THEN** the lookup SHALL return the configured localized string

#### Scenario: Key is missing
- **WHEN** code requests a missing localization key
- **THEN** the lookup SHALL return an explicit fallback string that includes or otherwise identifies the missing key

### Requirement: Migrated WebApp source prevents mojibake regressions
The implementation SHALL include automated coverage that detects common mojibake in migrated WebApp source and localized resources.

#### Scenario: Mojibake is introduced in migrated source
- **WHEN** a migrated WebApp source file contains common mojibake sequences in user-facing copy
- **THEN** the verification check SHALL fail and identify the offending file

#### Scenario: UTF-8 config is read by tooling
- **WHEN** localization config is read by project tooling
- **THEN** the tooling SHALL read it as UTF-8 and preserve valid Chinese text

### Requirement: Generated content text is migrated through source data or generation
Generated WebApp data files SHALL NOT be manually edited as the primary way to localize or repair generated content text.

#### Scenario: Generated content text needs migration
- **WHEN** display text inside generated frontend data needs to move to localization
- **THEN** the implementation SHALL update the source config or generation path so generated output remains reproducible

#### Scenario: Generated data is consumed by UI
- **WHEN** the WebApp renders generated content that has not yet been migrated to localization keys
- **THEN** the UI SHALL continue to render the existing generated display text without changing gameplay behavior

### Requirement: Localization changes preserve gameplay behavior
Localization changes SHALL only affect display text and SHALL NOT alter gameplay runtime behavior, save semantics, target selection, damage calculation, projectile behavior, map spawning, or drop selection.

#### Scenario: Runtime module contains migrated labels
- **WHEN** a runtime helper uses text only for display, logs, debug labels, or errors
- **THEN** migrating that text SHALL preserve the runtime data flow and calculations

#### Scenario: Gameplay value is generated
- **WHEN** a gameplay event, drop, skill, or map result is produced
- **THEN** localization lookups SHALL NOT recalculate or change the gameplay result
