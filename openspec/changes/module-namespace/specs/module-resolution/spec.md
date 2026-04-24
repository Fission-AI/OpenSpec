# Module Resolution Specification

## Purpose

Define how OpenSpec resolves module names to spec root locations, enabling specs to be organized across multiple bounded contexts within a monorepo or across locally-available repositories using a single unified pattern.

## ADDED Requirements

### Requirement: Module Registry in Config

The system SHALL support a `modules` field in `openspec/config.yaml` that maps module names to their locations, and a `module` field that declares the current project's own module name.

#### Scenario: Config declares own module name

- **WHEN** config contains `module: "gateway"`
- **THEN** the current project's specs are accessible under the module name `gateway`
- **AND** unqualified capability references resolve to this module

#### Scenario: Config declares external modules

- **WHEN** config contains:
  ```yaml
  modules:
    payments: ./packages/payments
    users: ./packages/users
  ```
- **THEN** the system registers two modules: `payments` resolving to `./packages/payments` and `users` resolving to `./packages/users`

#### Scenario: No module config (backward compatible default)

- **WHEN** config has no `module` or `modules` fields
- **THEN** the system operates in single-module mode
- **AND** all capability references are unqualified (current behavior preserved exactly)
- **AND** no module resolution logic is invoked

#### Scenario: Module name validation

- **WHEN** config declares module names
- **THEN** module names SHALL be validated as kebab-case identifiers matching the pattern `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`
- **AND** the system SHALL reject configs with invalid module names and log a warning

#### Scenario: Duplicate module names

- **WHEN** config declares two modules with the same name
- **THEN** YAML parsing naturally takes the last value
- **AND** the system SHALL log a warning about the duplicate

### Requirement: Module Location Resolution

The system SHALL resolve each module's location to a spec root directory using the convention `{location}/openspec/specs/`.

#### Scenario: Resolving a relative path module

- **WHEN** a module is configured as `payments: ./packages/payments`
- **THEN** the spec root resolves to `{projectRoot}/packages/payments/openspec/specs/`
- **AND** the system uses `path.resolve()` with the project root as the base

#### Scenario: Resolving an absolute path module

- **WHEN** a module is configured as `payments: /home/user/repos/payments`
- **THEN** the spec root resolves to `/home/user/repos/payments/openspec/specs/`

#### Scenario: Module location does not exist

- **WHEN** a module's resolved path does not exist on the filesystem
- **THEN** the system SHALL log a warning for that specific module
- **AND** other modules SHALL still resolve normally
- **AND** operations targeting the missing module SHALL fail with a clear error

#### Scenario: Module has no openspec/specs/ directory

- **WHEN** a module's location exists but has no `openspec/specs/` subdirectory
- **THEN** the system SHALL treat the module as having zero capabilities
- **AND** log a warning that the module has no specs directory

#### Scenario: Cross-platform module path resolution

- **WHEN** resolving module paths on Windows
- **THEN** the system SHALL use `path.resolve()` for all path construction
- **AND** handle both forward-slash and backslash in config values

### Requirement: Qualified Capability References

The system SHALL support module-qualified capability references using `module:capability` syntax for cross-module operations.

#### Scenario: Referencing a capability in another module

- **WHEN** a capability is referenced as `payments:checkout`
- **THEN** the system resolves `payments` to its spec root via the module registry
- **AND** looks for the capability `checkout` within that spec root (e.g., `{payments_root}/checkout/spec.md`)

#### Scenario: Referencing a nested capability in another module

- **WHEN** a capability is referenced as `payments:checkout/web`
- **THEN** the system resolves `payments` to its spec root
- **AND** looks for the capability at `{payments_root}/checkout/web/spec.md`

#### Scenario: Unqualified reference in multi-module mode

- **WHEN** a capability is referenced without a module prefix (e.g., just `routing`)
- **AND** the config has a `module` field declaring the current module
- **THEN** the reference resolves to the current module's spec root

#### Scenario: Unqualified reference with no module config

- **WHEN** a capability is referenced without a module prefix
- **AND** the config has no `module` or `modules` fields
- **THEN** the reference resolves to `openspec/specs/` as it does today

#### Scenario: Reference to unknown module

- **WHEN** a capability is referenced as `unknown:checkout`
- **AND** `unknown` is not in the module registry
- **THEN** the system SHALL fail with an error: "Module 'unknown' not found in config.yaml modules"

#### Scenario: Colon in capability name disambiguation

- **WHEN** parsing a reference string that contains a colon
- **THEN** the system SHALL split on the FIRST colon only
- **AND** the part before the first colon is the module name
- **AND** the part after is the capability path (which may contain forward slashes but not colons)

### Requirement: Module-Qualified Delta Specs

Changes that target capabilities across modules SHALL use module-prefixed directory paths in their `specs/` directory.

#### Scenario: Delta spec targeting another module

- **WHEN** a change needs to modify `payments:checkout`
- **THEN** the delta spec is placed at `changes/{change}/specs/payments/checkout/spec.md`
- **AND** the first path segment under `specs/` is matched against the module registry to determine if it's a module name

#### Scenario: Delta spec targeting the current module

- **WHEN** a change modifies a capability in the current module
- **THEN** the delta spec MAY be placed at `changes/{change}/specs/{capability}/spec.md` (without module prefix)
- **AND** the system resolves it to the current module

#### Scenario: Distinguishing module prefix from nested path

- **WHEN** the system encounters `changes/{change}/specs/auth/session/spec.md`
- **AND** `auth` is a registered module name
- **THEN** the system interprets this as module `auth`, capability `session`
- **AND** applies the delta to `{auth_root}/session/spec.md`

#### Scenario: Nested path without module prefix

- **WHEN** the system encounters `changes/{change}/specs/auth/session/spec.md`
- **AND** `auth` is NOT a registered module name
- **AND** the project is in single-module mode (no `modules` config)
- **THEN** the system interprets this as capability `auth/session` in the current module
- **AND** applies the delta to `specs/auth/session/spec.md`

### Requirement: Module-Aware Spec Listing

The system SHALL list specs across all registered modules when in multi-module mode.

#### Scenario: Listing specs in multi-module mode

- **WHEN** executing `openspec spec list` with modules configured
- **THEN** the system lists specs from all resolvable modules
- **AND** each spec is displayed with its module-qualified name (e.g., `payments:checkout`, `auth:session`)

#### Scenario: Filtering specs by module

- **WHEN** executing `openspec spec list --module payments`
- **THEN** the system lists only specs from the `payments` module

#### Scenario: Listing specs in single-module mode

- **WHEN** executing `openspec spec list` with no modules configured
- **THEN** the system behaves exactly as today (no module prefixes in output)

### Requirement: Module-Scoped Task Apply

The system SHALL support applying tasks scoped to a specific module, enabling focused implementation within a single module boundary.

#### Scenario: Applying tasks for a specific module

- **WHEN** executing apply with `--module payments`
- **THEN** the system filters tasks to only those associated with the `payments` module
- **AND** the agent works within the `payments` module's root directory

#### Scenario: Applying all tasks without module filter

- **WHEN** executing apply without `--module`
- **THEN** the system presents all tasks across all modules
