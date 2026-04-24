# Nested Spec Paths Specification

## Purpose

Define how OpenSpec discovers, names, and operates on specs organized in nested directory hierarchies, replacing the current flat-only structure.

## ADDED Requirements

### Requirement: Recursive Spec Discovery

The system SHALL discover spec files at any depth under a spec root directory by recursively searching for `spec.md` files, replacing the current shallow directory listing.

#### Scenario: Discovering specs in a flat structure

- **WHEN** the spec root contains only direct child capability directories (e.g., `specs/auth/spec.md`, `specs/checkout/spec.md`)
- **THEN** the system discovers all specs exactly as it does today
- **AND** capability names are the direct folder names (`auth`, `checkout`)

#### Scenario: Discovering specs in a nested structure

- **WHEN** the spec root contains nested directories (e.g., `specs/auth/oauth/spec.md`, `specs/auth/session/spec.md`)
- **THEN** the system discovers all `spec.md` files recursively
- **AND** capability names are the relative paths from the spec root to the parent of `spec.md` (e.g., `auth/oauth`, `auth/session`)

#### Scenario: Mixed flat and nested structures

- **WHEN** the spec root contains both flat capabilities (`specs/billing/spec.md`) and nested capabilities (`specs/auth/oauth/spec.md`)
- **THEN** the system discovers all specs regardless of depth
- **AND** each capability name reflects its actual relative path

#### Scenario: Cross-platform path handling

- **WHEN** discovering specs on Windows
- **THEN** the system SHALL use `path.join()` for filesystem operations
- **AND** capability names SHALL use forward-slash separators regardless of platform (e.g., `auth/oauth` not `auth\oauth`)

### Requirement: Grouping vs Capability Directories

The system SHALL distinguish between directories that are grouping containers and directories that are capabilities, based on the presence of `spec.md`.

#### Scenario: Directory is a capability

- **WHEN** a directory directly contains a `spec.md` file
- **THEN** that directory is a capability
- **AND** its relative path from the spec root is the capability name

#### Scenario: Directory is a grouping

- **WHEN** a directory contains subdirectories with specs but does not itself contain a `spec.md` file
- **THEN** that directory is a grouping container
- **AND** it does not appear as a capability in listings

#### Scenario: Directory has both spec.md and subdirectories with specs

- **WHEN** a directory contains a `spec.md` AND also contains subdirectories that contain `spec.md` files
- **THEN** the system SHALL treat this as a validation warning
- **AND** the system SHALL still discover all specs (both the parent and children)
- **AND** the `openspec validate` command SHALL flag this as a structural warning with a message indicating that a directory should be either a grouping or a capability, not both

### Requirement: Nested Delta Spec Matching

The system SHALL match delta specs in changes to their corresponding main specs using the full nested path structure.

#### Scenario: Delta spec targets a nested capability

- **WHEN** a change contains a delta spec at `changes/foo/specs/auth/oauth/spec.md`
- **THEN** the system matches it to the main spec at `specs/auth/oauth/spec.md`
- **AND** applies delta operations (ADDED/MODIFIED/REMOVED/RENAMED) to that spec

#### Scenario: Delta spec creates a new nested capability

- **WHEN** a change contains a delta spec at `changes/foo/specs/auth/mfa/spec.md`
- **AND** no main spec exists at `specs/auth/mfa/spec.md`
- **THEN** the system treats this as a new capability to be created
- **AND** creates the necessary directory structure during archive

#### Scenario: Finding delta specs in a change

- **WHEN** the system scans a change's `specs/` directory for delta specs
- **THEN** it SHALL recursively search for all `spec.md` files at any depth
- **AND** preserve the full relative path for matching against main specs

#### Scenario: Cross-platform delta spec path matching

- **WHEN** matching delta specs to main specs on Windows
- **THEN** the system SHALL normalize path separators before comparison
- **AND** use `path.join()` for all filesystem path construction

### Requirement: No Enforced Depth Limit

The system SHALL NOT enforce a maximum nesting depth for spec directories. Convention recommends 1-2 levels within a module, but the tool does not reject deeper structures.

#### Scenario: Specs nested 1 level deep

- **WHEN** specs are organized as `specs/auth/oauth/spec.md` (depth 2 from spec root)
- **THEN** the system discovers and operates on them normally

#### Scenario: Specs nested 3+ levels deep

- **WHEN** specs are organized as `specs/platform/payments/providers/stripe/spec.md` (depth 4 from spec root)
- **THEN** the system discovers and operates on them normally
- **AND** the capability name is `platform/payments/providers/stripe`

### Requirement: No Inheritance Between Nested Specs

The system SHALL NOT infer any inheritance, extension, or parent-child behavioral relationship between specs based on their directory nesting. Nesting is purely organizational.

#### Scenario: Sibling specs are independent

- **WHEN** `specs/checkout/web/spec.md` and `specs/checkout/ios/spec.md` exist
- **THEN** each is treated as a fully independent capability
- **AND** changes to one do not affect the other

#### Scenario: Specs at different depths are independent

- **WHEN** `specs/checkout/contract/spec.md` and `specs/checkout/web/spec.md` exist as siblings under `checkout/`
- **THEN** modifying `checkout/contract` does not trigger any validation or warning about `checkout/web`

### Requirement: Capability Name Extraction Utility

The system SHALL provide a utility function for extracting capability names from full file paths relative to a spec root, replacing all uses of the `path.basename(path.dirname())` pattern.

#### Scenario: Extracting capability name from a nested path

- **WHEN** extracting capability name from `specs/auth/oauth/spec.md` with spec root `specs/`
- **THEN** return `auth/oauth`

#### Scenario: Extracting capability name from a flat path (backward compatible)

- **WHEN** extracting capability name from `specs/checkout/spec.md` with spec root `specs/`
- **THEN** return `checkout`

#### Scenario: Cross-platform capability name extraction

- **WHEN** extracting capability name on Windows
- **THEN** return forward-slash-separated capability name regardless of platform

#### Scenario: Path not under spec root

- **WHEN** called with a path not under the spec root
- **THEN** throw an error

### Requirement: Delta Type Path Awareness

The system's Delta type/schema SHALL store full capability paths instead of bare directory names, enabling nested spec identification in all delta operations.

#### Scenario: Parsing delta specs with nested paths

- **WHEN** parsing delta specs from `changes/foo/specs/auth/oauth/spec.md`
- **THEN** the Delta.spec field SHALL contain `auth/oauth`

#### Scenario: Displaying delta operations

- **WHEN** displaying delta operations
- **THEN** show the full capability path

#### Scenario: Validating delta specs against main specs

- **WHEN** validating delta specs
- **THEN** match against main specs using the full capability path

### Requirement: AI Instruction Text for Nested Paths

Schema instruction text and workflow templates that guide AI agents SHALL reference nested capability paths, not just flat structures.

#### Scenario: Schema instruction for new capabilities

- **WHEN** the schema instruction describes how to create new capabilities
- **THEN** it SHALL show that capability names can be nested paths (e.g., `auth/oauth`)

#### Scenario: Proposal template examples

- **WHEN** the proposal template provides examples
- **THEN** it SHALL include both flat and nested examples

#### Scenario: Workflow template spec path references

- **WHEN** workflow templates reference spec paths
- **THEN** they SHALL use the pattern `openspec/specs/{capability-path}/spec.md` indicating the path may contain slashes

#### Scenario: Validation guidance examples

- **WHEN** validation guidance shows examples
- **THEN** it SHALL include nested examples alongside flat ones

### Requirement: Display Formatting for Nested Paths

CLI display and formatting code SHALL handle variable-length capability names from nested paths without breaking alignment.

#### Scenario: Dynamic padding in view command

- **WHEN** displaying spec names in the view command
- **THEN** use dynamic padding based on the longest name instead of hardcoded width

#### Scenario: Full paths in interactive selection

- **WHEN** displaying spec names in interactive selection
- **THEN** show the full nested path

#### Scenario: Full paths in archive output

- **WHEN** displaying delta operations during archive
- **THEN** show the full capability path in output messages

### Requirement: Shell Completion for Nested Paths

Shell completion SHALL provide nested capability paths for tab completion.

#### Scenario: Completing spec IDs

- **WHEN** completing spec IDs for shell completion
- **THEN** output full nested paths (e.g., `auth/oauth`, `checkout/web`)

#### Scenario: Partial nested path completion

- **WHEN** the user types a partial nested path
- **THEN** completions filter correctly
