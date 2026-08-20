## MODIFIED Requirements

### Requirement: Project-local schema resolution

The system SHALL preserve project-local, user override, then package built-in precedence for names without a remote declaration. When a project declares a remote source name, the declaration SHALL own that name and SHALL either resolve its verified locked cache or report an actionable remote-schema error.

#### Scenario: Project-local schema conflicts with remote source
- **WHEN** a schema named "my-workflow" exists at `./openspec/schemas/my-workflow/schema.yaml`
- **AND** project configuration declares a remote source named "my-workflow"
- **AND** `getSchemaDir("my-workflow", projectRoot)` is called
- **THEN** resolution SHALL fail with a `schema_name_conflict` diagnostic
- **AND** the system SHALL NOT silently select either the local or remote bundle

#### Scenario: Project-local schema takes precedence over user override
- **WHEN** a schema named "my-workflow" exists at `./openspec/schemas/my-workflow/schema.yaml`
- **AND** a schema named "my-workflow" exists at `~/.local/share/openspec/schemas/my-workflow/schema.yaml`
- **AND** `getSchemaDir("my-workflow", projectRoot)` is called
- **THEN** the system SHALL return the project-local path

#### Scenario: Project-local schema takes precedence over package built-in
- **WHEN** a schema named "spec-driven" exists at `./openspec/schemas/spec-driven/schema.yaml`
- **AND** "spec-driven" is a package built-in schema
- **AND** `getSchemaDir("spec-driven", projectRoot)` is called
- **THEN** the system SHALL return the project-local path

#### Scenario: Locked remote owns the name over user override
- **WHEN** project configuration declares a synchronized remote source named "my-workflow"
- **AND** a same-named user schema exists
- **THEN** the system SHALL return the verified remote cache path

#### Scenario: Falls back to user override when no project-local schema
- **WHEN** no schema named "my-workflow" exists at `./openspec/schemas/my-workflow/`
- **AND** project configuration does not declare a remote source named "my-workflow"
- **AND** a schema named "my-workflow" exists at `~/.local/share/openspec/schemas/my-workflow/schema.yaml`
- **AND** `getSchemaDir("my-workflow", projectRoot)` is called
- **THEN** the system SHALL return the user override path

#### Scenario: Falls back to package built-in when no project-local or user schema
- **WHEN** no project-local, declared remote, or user schema named "spec-driven" exists
- **AND** "spec-driven" is a package built-in schema
- **AND** `getSchemaDir("spec-driven", projectRoot)` is called
- **THEN** the system SHALL return the package built-in path

#### Scenario: Backward compatibility when projectRoot not provided
- **WHEN** `getSchemaDir("my-workflow")` is called without a `projectRoot` parameter
- **THEN** the system SHALL only check user override and package built-in locations
- **AND** the system SHALL NOT read project configuration, lockfiles, project-local schemas, or remote caches

## ADDED Requirements

### Requirement: Declared remote schemas fail closed

Once a project declares a remote source name, the resolver SHALL either return the matching verified locked cache or report an actionable remote-schema error before considering lower-priority locations.

#### Scenario: Lock source differs from config
- **WHEN** the lock entry's Git URL, requested ref, or bundle path differs from the project declaration
- **THEN** resolution SHALL fail with a stale-lock diagnostic
- **AND** the diagnostic SHALL instruct the user to run `openspec schema sync <name>`

#### Scenario: Schema name differs inside bundle
- **WHEN** cached `schema.yaml` has a name different from the declared source name
- **THEN** resolution SHALL reject the bundle rather than load it under an alias

### Requirement: Remote schemas participate in discovery

Schema listing APIs and commands SHALL include valid locked remote schemas with `source: "remote"` while preserving one visible entry per schema name according to resolution priority.

#### Scenario: Remote schema appears in list
- **WHEN** a declared remote schema has matching lock and cache content
- **THEN** `listSchemas(projectRoot)` SHALL include its name
- **AND** `listSchemasWithInfo(projectRoot)` SHALL report source `remote`

#### Scenario: Remote schema templates report their source
- **WHEN** a user requests template paths for a declared remote schema with matching lock and cache content
- **THEN** human and JSON template output SHALL report source `remote`
- **AND** the cache location SHALL NOT be mislabeled as a package schema

#### Scenario: Project schema conflicts with remote in list
- **WHEN** project-local and remote schemas share a name
- **THEN** diagnostic schema listings SHALL contain one unavailable remote entry with `schema_name_conflict`
- **AND** loadable-schema APIs SHALL fail instead of reporting either bundle as active

#### Scenario: Unsynchronized declaration is listed as unavailable
- **WHEN** project configuration declares a remote schema without usable locked cache content
- **THEN** diagnostic schema surfaces SHALL identify the declaration as requiring synchronization
- **AND** ordinary schema loading SHALL continue to fail closed

#### Scenario: Same-named lower tiers do not mask an unavailable remote
- **WHEN** a declared remote schema is unavailable
- **AND** a same-named user or package schema exists
- **THEN** diagnostic schema surfaces SHALL report the unavailable remote
- **AND** ordinary schema loading SHALL NOT fall back to the lower-tier schema
