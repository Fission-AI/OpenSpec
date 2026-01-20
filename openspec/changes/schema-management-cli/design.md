## Context

OpenSpec uses workflow schemas to define artifact sequences for change proposals. Currently, schemas are resolved from three locations (project → user → package), but managing custom schemas requires manual file creation with no tooling support. The resolver infrastructure exists (`src/core/artifact-graph/resolver.ts`) but there's no CLI exposure for schema management operations.

Users who want to customize workflows must:
1. Manually create directory structures under `openspec/schemas/<name>/`
2. Copy and modify `schema.yaml` files without validation
3. Debug resolution issues by inspecting the filesystem directly

This creates friction for schema customization and leads to runtime errors when schemas are malformed.

## Goals / Non-Goals

**Goals:**
- Provide CLI commands for common schema management operations
- Enable interactive schema creation with guided prompts
- Allow forking existing schemas as customization starting points
- Surface schema validation errors before runtime
- Help debug schema resolution order when shadowing occurs

**Non-Goals:**
- Schema editing (users edit YAML directly or via `$EDITOR`)
- Schema publishing or sharing mechanisms
- Schema versioning or migration tooling
- Validation of template file contents (only checks existence)
- Schema inheritance or composition beyond simple forking

## Decisions

### 1. Command Structure: `openspec schema <subcommand>`

Add a new command group following the existing pattern used by `openspec config` and `openspec completion`.

**Rationale:** Grouping related commands under a noun (schema) matches the established CLI patterns and provides a natural namespace for future schema operations.

**Alternatives considered:**
- Flat commands (`openspec schema-init`, `openspec schema-fork`): Rejected because it pollutes the top-level namespace and doesn't scale well.
- Extending existing commands (`openspec init --schema`): Rejected because schema management is distinct from project initialization.

### 2. Implementation Location

New file `src/commands/schema.ts` with a `registerSchemaCommand(program: Command)` function that registers the `schema` command group and all subcommands.

**Rationale:** Follows the pattern established by `config.ts` and matches how other command groups are organized.

### 3. Schema Validation Approach

Validation checks:
1. `schema.yaml` exists and is valid YAML
2. Parses successfully against the Zod schema in `types.ts`
3. All referenced template files exist in the schema directory
4. Artifact dependency graph has no cycles (use existing topological sort)

**Rationale:** Reuse existing validation infrastructure (`parseSchema` from `schema.ts`) and extend with template existence checks. This catches the most common errors without duplicating validation logic.

**Alternatives considered:**
- Deep template validation (check frontmatter, syntax): Rejected as over-engineering. Template contents are free-form markdown.

### 4. Interactive Prompts for `schema init`

Use `@inquirer/prompts` (already a dependency) for:
- Schema name input with kebab-case validation
- Schema description input
- Multi-select for artifact selection with descriptions
- Optional: set as project default

**Rationale:** Matches the UX established by `openspec init` and `openspec config reset`. Provides a guided experience while keeping the wizard lightweight.

### 5. Fork Source Resolution

`schema fork <source>` resolves the source schema using the existing `getSchemaDir()` function, respecting the full resolution order (project → user → package). This allows forking from any accessible schema.

The destination is always project-local: `openspec/schemas/<name>/`

**Rationale:** Forking to project scope makes sense because:
- Custom schemas are project-specific decisions
- User-global schemas can be added manually if needed
- Keeps the command simple with a clear default

### 6. Output Format Consistency

All commands support `--json` flag for machine-readable output:
- `schema init`: Outputs `{ "created": true, "path": "...", "schema": "..." }`
- `schema fork`: Outputs `{ "forked": true, "source": "...", "destination": "..." }`
- `schema validate`: Outputs validation report matching existing validate command format
- `schema which`: Outputs `{ "name": "...", "source": "project|user|package", "path": "..." }`

Text output uses ora spinners for progress and clear success/error messaging.

**Rationale:** Consistent with existing OpenSpec commands and enables scripting/automation.

### 7. Schema `which` Command Design

Shows resolution details for a schema name:
- Which location it resolves from (project/user/package)
- Full path to the schema directory
- Whether it shadows other schemas at lower priority levels

**Rationale:** Essential for debugging "why isn't my schema being used?" scenarios when multiple schemas with the same name exist.

## Risks / Trade-offs

**[Template scaffolding may become stale]** → The `schema init` command will scaffold a default set of artifacts (proposal, specs, design, tasks). If the built-in schema patterns evolve, these templates may not reflect best practices.
- *Mitigation*: Document that `init` creates a minimal starting point. Users can `fork` built-in schemas for the latest patterns.

**[Interactive prompts in CI environments]** → `schema init` with prompts may hang in non-interactive environments.
- *Mitigation*: Support `--name`, `--description`, and `--artifacts` flags for non-interactive use. Detect TTY and show helpful error if prompts would hang.

**[Validation doesn't catch all errors]** → Schema validation checks structure but can't verify semantic correctness (e.g., a template that doesn't match its artifact purpose).
- *Mitigation*: This is acceptable. Full semantic validation would require understanding template intent, which is out of scope.

**[Fork overwrites without warning]** → If target schema already exists, `fork` could overwrite it.
- *Mitigation*: Check for existing schema and require `--force` flag or interactive confirmation before overwriting.
