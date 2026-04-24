# cli-spec Specification — Delta

## MODIFIED Requirements

### Requirement: Spec Command

The system SHALL provide a `spec` command with subcommands for displaying, listing, and validating specifications, supporting nested capability paths and module-qualified references.

#### Scenario: Show spec as JSON

- **WHEN** executing `openspec spec show auth/oauth --json`
- **THEN** parse the markdown spec file at `specs/auth/oauth/spec.md`
- **AND** extract headings and content hierarchically
- **AND** output valid JSON to stdout

#### Scenario: Show spec from another module

- **WHEN** executing `openspec spec show payments:checkout --json`
- **AND** `payments` is a registered module
- **THEN** resolve the module to its spec root
- **AND** parse the markdown spec file at `{payments_root}/checkout/spec.md`
- **AND** output valid JSON to stdout

#### Scenario: List all specs

- **WHEN** executing `openspec spec list`
- **THEN** recursively scan the spec root directories for `spec.md` files
- **AND** return list of all available capabilities with nested paths (e.g., `auth/oauth`, `checkout/web`)
- **AND** in multi-module mode, prefix each capability with its module name (e.g., `payments:checkout`, `auth:session`)
- **AND** support JSON output with `--json` flag

#### Scenario: List specs filtered by module

- **WHEN** executing `openspec spec list --module payments`
- **THEN** list only specs from the `payments` module
- **AND** display capability names without the module prefix

#### Scenario: Filter spec content

- **WHEN** executing `openspec spec show auth/oauth --requirements`
- **THEN** display only requirement names and SHALL statements
- **AND** exclude scenario content

#### Scenario: Validate spec structure

- **WHEN** executing `openspec spec validate auth/oauth`
- **THEN** parse the spec file at `specs/auth/oauth/spec.md`
- **AND** validate against Zod schema
- **AND** report any structural issues

#### Scenario: Validate spec from another module

- **WHEN** executing `openspec spec validate payments:checkout`
- **THEN** resolve `payments` module and validate the spec at that location

### Requirement: Interactive spec show

The spec show command SHALL support interactive selection when no spec-id is provided, including nested and module-qualified specs.

#### Scenario: Interactive spec selection for show

- **WHEN** executing `openspec spec show` without arguments
- **THEN** display an interactive list of available specs
- **AND** in multi-module mode, group specs by module and show module-qualified names
- **AND** in single-module mode, show nested capability paths
- **AND** allow the user to select a spec to show
- **AND** display the selected spec content

#### Scenario: Non-interactive fallback keeps current behavior

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `openspec spec show` without a spec-id
- **THEN** do not prompt interactively
- **AND** print the existing error message for missing spec-id
- **AND** set non-zero exit code

### Requirement: Interactive spec validation

The spec validate command SHALL support interactive selection when no spec-id is provided, including nested and module-qualified specs.

#### Scenario: Interactive spec selection for validation

- **WHEN** executing `openspec spec validate` without arguments
- **THEN** display an interactive list of available specs (grouped by module in multi-module mode)
- **AND** allow the user to select a spec to validate
- **AND** validate the selected spec

#### Scenario: Non-interactive fallback keeps current behavior

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `openspec spec validate` without a spec-id
- **THEN** do not prompt interactively
- **AND** print the existing error message for missing spec-id
- **AND** set non-zero exit code
