## Purpose

Define the documentation obligations for the plugin system: how the marketplace, the code-first OpenLore onboarding path, and plugin authoring are presented to users and plugin authors. Kept separate from `plugin-marketplace` (registry mechanics) so technical and documentation contracts do not mix.

## ADDED Requirements

### Requirement: Code-first onboarding path via OpenLore
OpenSpec documentation SHALL present OpenLore as the supported path for generating initial specs from an existing codebase, with OpenSpec evolving them thereafter.

#### Scenario: Existing project onboarding documented
- **WHEN** a user reads the plugins/onboarding guidance
- **THEN** it SHALL describe using OpenLore to generate initial specs and OpenSpec to validate and evolve them

### Requirement: Plugin authoring and manifest documentation
OpenSpec documentation SHALL describe how to author a plugin, including the manifest fields and the namespaced delegation model.

#### Scenario: Author reads how to build a plugin
- **WHEN** a developer reads the plugins documentation
- **THEN** it SHALL explain the manifest location and fields, the reserved namespace, and how arguments and exit codes are forwarded to the plugin executable

### Requirement: Registry submission guidance
OpenSpec documentation SHALL describe how a plugin author submits a listing to the curated registry.

#### Scenario: Author wants to be listed
- **WHEN** a plugin author reads the marketplace documentation
- **THEN** it SHALL explain the manifest requirements and the submission process for a registry entry
