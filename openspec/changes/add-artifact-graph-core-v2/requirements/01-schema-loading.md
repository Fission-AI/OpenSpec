# Schema Loading

## Requirement

The system SHALL load artifact graph definitions from YAML schema files.

## Scenarios

### Scenario: Valid schema loaded
- **WHEN** a valid schema YAML file is provided
- **THEN** the system returns an ArtifactGraph with all artifacts and dependencies

### Scenario: Invalid schema rejected
- **WHEN** a schema YAML file is missing required fields
- **THEN** the system throws an error with a descriptive message

### Scenario: Cyclic dependencies detected
- **WHEN** a schema contains cyclic artifact dependencies
- **THEN** the system throws an error listing the artifact IDs in the cycle

### Scenario: Invalid dependency reference
- **WHEN** an artifact's `requires` array references a non-existent artifact ID
- **THEN** the system throws an error identifying the invalid reference

### Scenario: Duplicate artifact IDs rejected
- **WHEN** a schema contains multiple artifacts with the same ID
- **THEN** the system throws an error identifying the duplicate

## Design

### Decision: Zod for Schema Validation
Use Zod for validating YAML schema structure and deriving TypeScript types.

**Rationale:**
- Already a project dependency (v4.0.17) used in `src/core/schemas/`
- Type inference via `z.infer<>` - single source of truth for types
- Runtime validation with detailed error messages
- Consistent with existing project patterns (`base.schema.ts`, `config-schema.ts`)

**Alternatives considered:**
- Manual validation: More code, error-prone, no type inference
- JSON Schema: Would require additional dependency, less TypeScript integration
- io-ts: Not already in project, steeper learning curve

### Decision: Two-Level Schema Resolution
Schemas resolve from global user config, falling back to package built-ins.

**Resolution order:**
1. `~/.config/openspec/schemas/<name>.yaml` - Global user override
2. `<package>/schemas/<name>.yaml` - Built-in defaults

**Rationale:**
- Follows common CLI patterns (ESLint, Prettier, Git, npm)
- Built-ins baked into package, never auto-copied
- Users customize by creating files in global config dir
- Simple - no project-level overrides (can add later if needed)

**Alternatives considered:**
- Project-level overrides: Added complexity, not needed initially
- Auto-copy to user space: Creates drift, harder to update defaults

### Decision: Cycle Error Format
Cycle errors list all artifact IDs in the cycle for easy debugging.

**Format:** `"Cyclic dependency detected: A → B → C → A"`

**Rationale:**
- Shows the full cycle path, not just that a cycle exists
- Actionable - developer can see exactly which artifacts to fix
- Consistent with Kahn's algorithm which naturally identifies cycle participants

### Decision: Template Field Parsed But Not Resolved
The `template` field is required in schema YAML for completeness, but template resolution is deferred to Slice 3.

**Rationale:**
- Slice 1 focuses on "What's Ready?" - dependency and completion queries only
- Template paths are validated syntactically (non-empty string) but not resolved
- Keeps Slice 1 focused and independently testable

## Tasks

### Type Definitions
- [ ] 1.1 Create `src/core/artifact-graph/types.ts` with Zod schemas (`ArtifactSchema`, `SchemaYamlSchema`) and inferred types via `z.infer<>`
- [ ] 1.2 Define `CompletedSet` (Set<string>), `BlockedArtifacts`, and `ArtifactGraphResult` types for runtime state

### Schema Parser
- [ ] 2.1 Create `src/core/artifact-graph/schema.ts` with YAML loading and Zod validation via `.safeParse()`
- [ ] 2.2 Implement dependency reference validation (ensure `requires` references valid artifact IDs)
- [ ] 2.3 Implement duplicate artifact ID detection
- [ ] 2.4 Add cycle detection during schema load (error format: "Cyclic dependency detected: A → B → C → A")

### Schema Resolution
- [ ] 6.1 Create `src/core/artifact-graph/resolver.ts` with schema resolution logic
- [ ] 6.2 Implement `resolveSchema(name)` - global (`~/.config/openspec/schemas/`) → built-in fallback
- [ ] 6.3 Use existing `getGlobalConfigDir()` from `src/core/global-config.ts`

### Built-in Schemas
- [ ] 7.1 Create `src/core/artifact-graph/schemas/spec-driven.yaml` (default: proposal → specs → design → tasks)
- [ ] 7.2 Create `src/core/artifact-graph/schemas/tdd.yaml` (alternative: tests → implementation → docs)

### Tests
- [ ] 9.1 Test: Parse valid schema YAML returns correct artifact graph
- [ ] 9.2 Test: Parse invalid schema (missing fields) throws descriptive error
- [ ] 9.3 Test: Duplicate artifact IDs throws error
- [ ] 9.4 Test: Invalid `requires` reference throws error identifying the invalid ID
- [ ] 9.5 Test: Cycle in schema throws error listing cycle path (e.g., "A → B → C → A")
- [ ] 9.18 Test: Schema resolution finds global override before built-in
- [ ] 9.19 Test: Schema resolution falls back to built-in when no global
