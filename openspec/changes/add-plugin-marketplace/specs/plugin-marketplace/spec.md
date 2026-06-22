## Purpose

Define the curated plugin registry that powers discovery, and establish OpenLore as the inaugural marketplace listing.

## ADDED Requirements

### Requirement: Curated registry index
OpenSpec SHALL ship a curated, versioned registry index describing approved plugins.

#### Scenario: Registry available offline
- **WHEN** OpenSpec needs registry data for discovery
- **THEN** it SHALL read the curated index distributed with the package without requiring network access

#### Scenario: Registry entry fields
- **WHEN** the registry lists a plugin
- **THEN** each entry SHALL include id, npm package name, namespace, OpenSpec compatibility range, summary, and homepage

#### Scenario: Unknown registry format
- **WHEN** the registry index declares a version the running OpenSpec does not understand
- **THEN** OpenSpec SHALL decline to use it and report the unsupported version rather than misinterpreting entries

### Requirement: OpenLore inaugural listing
The registry SHALL include OpenLore as the first marketplace plugin.

#### Scenario: OpenLore discoverable
- **WHEN** a user runs `openspec plugin search`
- **THEN** the results SHALL include OpenLore with npm package `openlore` and namespace `lore`

#### Scenario: OpenLore add guidance
- **WHEN** a user runs `openspec plugin add openlore`
- **THEN** OpenSpec SHALL resolve OpenLore's install instructions and compatibility from the registry entry

### Requirement: Code-first onboarding path via OpenLore
OpenSpec documentation SHALL present OpenLore as the supported path for generating initial specs from an existing codebase, with OpenSpec evolving them thereafter.

#### Scenario: Existing project onboarding documented
- **WHEN** a user reads the existing-projects onboarding guidance
- **THEN** it SHALL describe using OpenLore to generate initial specs and OpenSpec to validate and evolve them

### Requirement: Registry submission guidance
OpenSpec documentation SHALL describe how a plugin author submits a listing to the curated registry.

#### Scenario: Author wants to be listed
- **WHEN** a plugin author reads the marketplace documentation
- **THEN** it SHALL explain the manifest requirements and the submission process for a registry entry
