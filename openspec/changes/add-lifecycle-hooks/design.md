## Context

OpenSpec schemas define artifact creation workflows (proposal, specs, design, tasks) with instructions for each artifact. Operations like archive, sync, new, apply, and verify are orchestrated by skills (LLM prompt files) that call CLI commands. There is currently no mechanism for schemas or projects to inject custom behavior at operation lifecycle points.

The existing `openspec instructions` command already demonstrates the pattern: it reads schema + config, merges them, and outputs enriched data for the LLM. It already supports two modes — artifact instructions (`openspec instructions <artifact>`) and apply instructions (`openspec instructions apply`). Hooks follow the same architecture and fit naturally as a third mode via `--hook`.

Key files:
- Schema types: `src/core/artifact-graph/types.ts` (Zod schemas for `SchemaYaml`)
- Schema resolution: `src/core/artifact-graph/resolver.ts`
- Instruction loading: `src/core/artifact-graph/instruction-loader.ts`
- Project config: `src/core/project-config.ts`
- CLI commands: `src/commands/workflow/instructions.ts`
- Hook resolution: `src/commands/workflow/hooks.ts` (internal module)
- Skill templates: `src/core/templates/skill-templates.ts` (source of truth, generates agent skills via `openspec update`)

## Goals / Non-Goals

**Goals:**
- Allow schemas to define LLM instruction hooks at operation lifecycle points
- Allow projects to add/extend hooks via config.yaml
- Expose hooks via `openspec instructions --hook` for skills to consume
- Update all operation skills (archive, sync, new, apply, verify) to execute hooks

**Non-Goals:**
- Shell script execution (`run` field) — deferred to future iteration
- Variable substitution in hook instructions — deferred
- Hook-level dependency/ordering between hooks — schema first, config second is sufficient
- Hooks on artifact creation — artifact `instruction` already covers this

## Decisions

### Decision 1: Hook YAML structure

Hooks use a flat key-value structure under a `hooks` key, where each key is a lifecycle point:

```yaml
# In schema.yaml or config.yaml
hooks:
  post-archive:
    instruction: |
      Review the archived change and generate ADR entries...
  pre-verify:
    instruction: |
      Run the full test suite before verification begins...
```

**Why this over nested structure**: Flat keys are simpler to parse, validate, and merge. Each lifecycle point maps to exactly one hook per source (schema or config). No need for arrays of hooks per point — if a schema author needs multiple actions, they write them as a single instruction.

**Alternative considered**: Array of hooks per lifecycle point (`post-archive: [{instruction: ...}, {instruction: ...}]`). Rejected because it adds complexity without clear benefit — a single instruction can contain multiple steps, and the schema/config split already provides two layers.

### Decision 2: `--hook` flag on `openspec instructions`

Hooks are exposed as a `--hook <lifecycle-point>` flag on the existing `instructions` command rather than as a separate top-level command:

```bash
openspec instructions --hook <lifecycle-point> [--change "<name>"] [--json]
```

The `--hook` flag is mutually exclusive with the `[artifact]` positional argument. If both are provided, the command exits with an error: `"--hook cannot be used with an artifact argument"`.

The `--change` flag is optional. When provided, hooks are resolved from the change's schema (via metadata) and the project config. When omitted, the schema is resolved from `config.yaml`'s default `schema` field, and hooks are returned from both schema and config. This ensures lifecycle points like `pre-new` (where no change exists yet) still receive schema-level hooks.

Hook resolution logic lives in `src/commands/workflow/hooks.ts` as an internal module. The `instructions` command imports and delegates to it when `--hook` is present.

Output (JSON mode, with change):
```json
{
  "lifecyclePoint": "post-archive",
  "changeName": "add-dark-mode",
  "hooks": [
    { "source": "schema", "instruction": "Generate ADR entries..." },
    { "source": "config", "instruction": "Notify Slack channel..." }
  ]
}
```

Output (JSON mode, without change — schema resolved from config.yaml):
```json
{
  "lifecyclePoint": "pre-new",
  "changeName": null,
  "hooks": [
    { "source": "schema", "instruction": "Verify prerequisites before creating change..." },
    { "source": "config", "instruction": "Notify Slack channel..." }
  ]
}
```

Output (text mode):
```
## Hooks: post-archive (change: add-dark-mode)

### From schema (spec-driven)
Generate ADR entries...

### From config
Notify Slack channel...
```

**Why `--hook` on `instructions` instead of separate command**: The `instructions` command is the single entry point for "what does the LLM need right now". It already has two modes (artifact and apply), and `apply` is already operation-scoped rather than artifact-scoped. Adding hooks as a third mode is consistent. Fewer top-level commands keeps the CLI surface clean.

### Decision 3: Schema type extension

Extend `SchemaYamlSchema` in `types.ts` with an optional `hooks` field:

```typescript
const HookSchema = z.object({
  instruction: z.string().min(1),
});

const HooksSchema = z.record(z.string(), HookSchema).optional();

// Added to SchemaYamlSchema
hooks: HooksSchema,
```

Validation of lifecycle point keys happens at a higher level (in the hook resolution function), not in the Zod schema. This keeps the schema format forward-compatible — new lifecycle points can be added without changing the Zod schema.

**Why not validate keys in Zod**: Using `z.enum()` for keys would make the schema rigid. A `z.record()` with runtime validation of keys (with warnings for unknown keys) is more resilient and matches the pattern used for config `rules` validation.

### Decision 4: Config extension

Extend `ProjectConfigSchema` in `project-config.ts` with the same `hooks` structure:

```typescript
hooks: z.record(z.string(), z.object({
  instruction: z.string(),
})).optional(),
```

Parsed using the same resilient field-by-field approach already used for `rules`.

### Decision 5: Hook resolution function

New function in `instruction-loader.ts`:

```typescript
interface ResolvedHook {
  source: 'schema' | 'config';
  instruction: string;
}

function resolveHooks(
  projectRoot: string,
  changeName: string | null,
  lifecyclePoint: string
): ResolvedHook[]
```

This function:
1. If `changeName` is provided, resolves the schema from the change's metadata (via existing `resolveSchemaForChange`)
2. If `changeName` is null, resolves the schema from `config.yaml`'s `schema` field (if configured)
3. Reads schema hooks for the lifecycle point (if a schema was resolved)
4. Reads config hooks for the lifecycle point
5. Returns array: schema hooks first (if any), then config hooks
6. Warns on unrecognized lifecycle points

### Decision 6: Valid lifecycle points

10 lifecycle points covering all operations:

```
pre-new       post-new        — creating a change
pre-apply     post-apply      — implementing tasks
pre-verify    post-verify     — verifying implementation
pre-sync      post-sync       — syncing delta specs
pre-archive   post-archive    — archiving a change
```

These are defined in `VALID_LIFECYCLE_POINTS` in `types.ts` and validated at runtime.

### Decision 7: Skill integration pattern

Skills call `openspec instructions --hook` and follow the returned instructions. Example for archive skill:

```
# Before archive operation:
openspec instructions --hook pre-archive --change "<name>" --json
→ If hooks returned, follow each instruction in order

# [normal archive steps...]

# After archive operation:
openspec instructions --hook post-archive --change "<name>" --json
→ If hooks returned, follow each instruction in order
```

The same pattern applies to all skills: new, apply, verify, sync, archive.

The skill templates in `src/core/templates/skill-templates.ts` are updated to include these steps, and `openspec update` regenerates the output files. This is the same pattern as how skills already call `openspec instructions` and `openspec status`.

### Decision 8: Documentation

The `instructions` command gets documented with all three modes:
- Artifact mode: `openspec instructions <artifact> --change <name>`
- Apply mode: `openspec instructions apply --change <name>`
- Hook mode: `openspec instructions --hook <lifecycle-point> [--change <name>]`

Documentation covers the mutual exclusivity constraint, the hook resolution order (schema first, config second), and examples for each mode.

## Testing Strategy

Three levels of testing, following existing patterns in the codebase:

**Unit tests** — Pure logic, no filesystem or CLI:
- `test/core/artifact-graph/schema.test.ts` — Hook parsing tests: valid hooks, missing hooks, empty hooks, invalid instruction
- `test/core/project-config.test.ts` — Config hook parsing: valid, invalid, unknown lifecycle points, resilient parsing
- `test/core/artifact-graph/instruction-loader.test.ts` — `resolveHooks()` tests: schema only, config only, both (ordering), neither, null changeName (config-only)

**CLI integration tests** — Run the actual CLI binary:
- `test/commands/artifact-workflow.test.ts` — `openspec instructions --hook` tests: with --change, without --change, no hooks found, invalid lifecycle point, JSON output format, mutual exclusivity error with positional artifact

**Skill template tests** — Verify generated content:
- Existing skill template tests extended to verify hook steps appear in generated output

## Risks / Trade-offs

- **[LLM compliance]** Hooks are instructions the LLM should follow, but there's no guarantee it will execute them perfectly. → Mitigation: Same limitation applies to artifact instructions, which work well in practice. Hook instructions should be written as clear, actionable prompts.
- **[Hook sprawl]** Users might define too many hooks, making operations slow. → Mitigation: Start with 10 lifecycle points only. Each hook adds one CLI call + LLM reasoning time, which is bounded.
- **[Schema/config conflict]** Both define hooks for the same point — user might expect override semantics. → Mitigation: Document clearly that both execute (schema first, config second). This is additive, not override.

## Resolved Questions

- **Should `--hook` work without `--change`?** Yes. Without `--change`, the schema is resolved from `config.yaml`'s default `schema` field, so both schema and config hooks are returned. This is essential for lifecycle points like `pre-new` where the change doesn't exist yet but the project's default schema is known. If no schema is configured in `config.yaml`, only config hooks are returned.
- **Why not a separate `openspec hooks` command?** The `instructions` command already serves as the "what does the LLM need" entry point with two modes (artifact, apply). Adding hooks as `--hook` is consistent and avoids adding another top-level command. The hook resolution logic stays in its own module (`hooks.ts`) for separation of concerns.
