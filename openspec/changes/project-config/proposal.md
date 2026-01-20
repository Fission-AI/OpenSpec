# Project Config

## Summary

Add `openspec/config.yaml` support for project-level configuration. This enables teams to customize OpenSpec behavior without forking schemas, by providing context and rules that are injected into artifact generation.

## Motivation

Currently, customizing OpenSpec requires forking entire schemas:
- Must copy all files even to add one rule
- Lose updates when openspec upgrades
- High friction for simple customizations

Most users don't need different workflow structure. They need to:
- Provide project context (tech stack, conventions, constraints)
- Add rules for specific artifacts (requirements, formatting preferences)

## Design Decisions

### Two-Path Model

OpenSpec customization follows two distinct paths:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CONFIGURE (this change)         FORK (project-local-schemas)  │
│   ─────────────────────           ────────────────────────────  │
│                                                                 │
│   Use a preset schema             Define your own schema        │
│   + add context                   from scratch                  │
│   + add rules                                                   │
│                                                                 │
│   openspec/config.yaml            openspec/schemas/my-flow/     │
│                                                                 │
│   ✓ Simple                        ✓ Full control                │
│   ✓ Get updates                   ✗ You maintain everything     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Config Schema

```yaml
# openspec/config.yaml

# Required: which workflow schema to use
schema: spec-driven

# Optional: project context injected into all artifact prompts
context: |
  Tech stack: TypeScript, React, Node.js, PostgreSQL
  API style: RESTful, documented in docs/api-conventions.md
  Testing: Jest + React Testing Library
  We value backwards compatibility for all public APIs

# Optional: per-artifact rules (additive)
rules:
  proposal:
    - Include rollback plan
    - Identify affected teams and notify in #platform-changes
  specs:
    - Use Given/When/Then format
    - Reference existing patterns before inventing new ones
  tasks:
    - Each task should be completable in < 2 hours
    - Include acceptance criteria
```

### What's NOT in Config

The following were explicitly excluded to keep the model simple:

| Feature | Decision | Rationale |
|---------|----------|-----------|
| `skip: [artifact]` | Not supported | Structural changes belong in fork path |
| `add: [{...}]` | Not supported | Structural changes belong in fork path |
| `extends: base` | Not supported | No inheritance, fork is full copy |
| `context: ./file.md` | Not supported (yet) | Start with string, add file reference later if needed |

### Field Definitions

#### `schema` (required)

Which workflow schema to use. Can be:
- Built-in name: `spec-driven`, `tdd`
- Project-local schema name: `my-workflow` (requires project-local-schemas change)

This becomes the default schema for:
- New changes created without `--schema` flag
- Commands run on changes without `.openspec.yaml` metadata

#### `context` (optional)

A string containing project context. Injected into ALL artifact prompts.

Use cases:
- Tech stack description
- Link to conventions/style guides
- Team constraints or preferences
- Domain-specific context

#### `rules` (optional)

Per-artifact rules, keyed by artifact ID. Additive to schema's built-in guidance.

```yaml
rules:
  <artifact-id>:
    - Rule 1
    - Rule 2
```

Rules are injected into the specific artifact's prompt, not all prompts.

### Injection Format

When generating instructions for an artifact:

```xml
<context>
Tech stack: TypeScript, React, Node.js, PostgreSQL
API style: RESTful, documented in docs/api-conventions.md
...
</context>

<rules>
- Include rollback plan
- Identify affected teams and notify in #platform-changes
</rules>

<template>
[Schema's built-in template content]
</template>
```

Context appears for all artifacts. Rules only appear for the matching artifact.

### Config Creation Strategy

**Why integrate with `artifact-experimental-setup`?**

This feature targets **experimental workflow users**. The decision to create config during experimental setup (rather than providing standalone commands) is intentional:

**Rationale:**
1. **Single entry point** - Users setting up experimental features are already in "configuration mode"
2. **Contextual timing** - Natural to configure project defaults when setting up workflow
3. **Avoids premature API surface** - No standalone `openspec config init` until feature graduates
4. **Experimental scope** - Keeps config as experimental feature, not stable API
5. **Progressive disclosure** - Users can skip and create manually later if needed

**Evolution path:**

```
Today (Experimental):
  openspec artifact-experimental-setup
    → prompts for config creation
    → creates .claude/skills/
    → creates openspec/config.yaml

Future (When graduating):
  openspec init
    → prompts for config creation
    → creates openspec/ directory
    → creates openspec/config.yaml

  + standalone commands:
    openspec config init
    openspec config validate
    openspec config set <key> <value>
```

**Why optional?**

Config is **additive**, not required:
- OpenSpec works without config (uses defaults)
- Users can skip during setup and add manually later
- Teams can start simple and add config when they feel friction
- No config file in git = no problem, everyone gets defaults

**Design principle:** The system never *requires* config, but makes it easy to create when users want customization.

## Scope

### In Scope

**Core Config System:**
- Define `ProjectConfig` type with Zod schema
- Add `readProjectConfig()` function with graceful error handling
- Update instruction generation to inject context (all artifacts)
- Update instruction generation to inject rules (per-artifact)
- Update schema resolution to use config's `schema` field as default
- Update `openspec new change` to use config's schema as default

**Config Creation (Experimental Setup):**
- Extend `artifact-experimental-setup` command to optionally create config
- Interactive prompts for schema selection (with description of each schema)
- Interactive prompts for project context (optional multi-line input)
- Interactive prompts for per-artifact rules (optional)
- Validate config immediately after creation
- Show clear "skip" option for users who want to create config manually later
- Display created config location and usage examples

### Out of Scope

- `skip` / `add` for structural changes (use fork path for structural changes)
- File reference for context (`context: ./CONTEXT.md`) - start with string, add later if needed
- Global user-level config (XDG directories, etc.)
- Integration with standard `openspec init` (will add when experimental graduates)
- Standalone `openspec config init` command (may add in future change)
- `openspec config validate` command (may add in future change)
- Config editing/updating commands (users edit YAML directly)

## User Experience

### Setting Up Config (Experimental Workflow)

When users set up the experimental workflow, they're prompted to optionally create config:

```bash
$ openspec artifact-experimental-setup

Setting up experimental artifact workflow...

✓ Created .claude/skills/openspec-explore/SKILL.md
✓ Created .claude/skills/openspec-new-change/SKILL.md
✓ Created .claude/skills/openspec-continue-change/SKILL.md
✓ Created .claude/skills/openspec-apply-change/SKILL.md
✓ Created .claude/skills/openspec-ff-change/SKILL.md
✓ Created .claude/skills/openspec-sync-specs/SKILL.md
✓ Created .claude/skills/openspec-archive-change/SKILL.md

✓ Created .claude/commands/opsx/explore.md
✓ Created .claude/commands/opsx/new.md
✓ Created .claude/commands/opsx/continue.md
✓ Created .claude/commands/opsx/apply.md
✓ Created .claude/commands/opsx/ff.md
✓ Created .claude/commands/opsx/sync.md
✓ Created .claude/commands/opsx/archive.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project Configuration (Optional)

Configure project defaults for OpenSpec workflows.

? Create openspec/config.yaml? (Y/n) Y

? Default schema for new changes?
  ❯ spec-driven (proposal → specs → design → tasks)
    tdd (spec → tests → implementation → docs)

? Add project context? (optional)
  Context is shown to AI when creating artifacts.
  Examples: tech stack, conventions, style guides, domain knowledge

  Press Enter to skip, or type/paste context:
  │ Tech stack: TypeScript, React, Node.js, PostgreSQL
  │ API style: RESTful, documented in docs/api-conventions.md
  │ Testing: Jest + React Testing Library
  │ We value backwards compatibility for all public APIs
  │
  [Press Enter when done]

? Add per-artifact rules? (optional) (Y/n) Y

  Which artifacts should have custom rules?
  [Space to select, Enter when done]
  ◯ proposal
  ◉ specs
  ◯ design
  ◯ tasks

? Rules for specs artifact:
  Enter rules one per line, press Enter on empty line to finish:
  │ Use Given/When/Then format for scenarios
  │ Reference existing patterns before inventing new ones
  │
  [Empty line to finish]

✓ Created openspec/config.yaml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Setup Complete!

📖 Config created at: openspec/config.yaml
   • Default schema: spec-driven
   • Project context: Added (4 lines)
   • Rules: 1 artifact configured

Usage:
  • New changes automatically use 'spec-driven' schema
  • Context injected into all artifact instructions
  • Rules applied to matching artifacts

To share with team:
  git add openspec/config.yaml .claude/
  git commit -m "Setup OpenSpec experimental workflow with project config"

[Rest of experimental setup output...]
```

**Key UX decisions:**

1. **Prompted during setup** - Natural place since users are already configuring experimental features
2. **Optional at every step** - Clear skip options, no forced configuration
3. **Guided prompts** - Schema descriptions, example context, artifact selection
4. **Immediate validation** - Config is validated after creation, errors shown immediately
5. **Clear output** - Shows exactly what was created and how it affects workflow

### Setting Up Config (Manual Creation)

Users can also create config manually (or skip during setup and add later):

```bash
# Create config file manually
cat > openspec/config.yaml << 'EOF'
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  We follow REST conventions documented in docs/api.md
  All changes require backwards compatibility consideration

rules:
  proposal:
    - Must include rollback plan
    - Must identify affected teams
  specs:
    - Use Given/When/Then format
EOF
```

### Effect on Workflow

Once config is created, it affects the experimental workflow in three ways:

**1. Default Schema Selection**

```bash
# Before config: must specify schema
/opsx:new my-feature --schema spec-driven

# After config (with schema: spec-driven): schema is automatic
/opsx:new my-feature
# Automatically uses spec-driven from config

# Override still works
/opsx:new my-feature --schema tdd
# Uses tdd, ignoring config
```

**2. Context Injection (All Artifacts)**

```bash
# Get instructions for any artifact
openspec instructions proposal --change my-feature

# Output now includes project context:
<context>
Tech stack: TypeScript, React, Node.js, PostgreSQL
API style: RESTful, documented in docs/api-conventions.md
Testing: Jest + React Testing Library
We value backwards compatibility for all public APIs
</context>

<template>
[Schema's proposal template]
</template>
```

Context appears in instructions for **all artifacts** (proposal, specs, design, tasks).

**3. Rules Injection (Per-Artifact)**

```bash
# Get instructions for artifact with rules configured
openspec instructions specs --change my-feature

# Output includes artifact-specific rules:
<context>
[Project context]
</context>

<rules>
- Use Given/When/Then format for scenarios
- Reference existing patterns before inventing new ones
</rules>

<template>
[Schema's specs template]
</template>
```

Rules only appear for the **specific artifact** they're configured for.

**Artifacts without rules** (e.g., design, tasks) don't get a `<rules>` section:

```bash
openspec instructions design --change my-feature
# Output: <context> then <template> only (no rules)
```

### Team Sharing

```bash
# Commit config
git add openspec/config.yaml
git commit -m "Add project config with context and rules"

# Everyone gets the same context and rules automatically
```

## Implementation Notes

### Files to Modify/Create

| File | Changes |
|------|---------|
| `src/core/project-config.ts` | **NEW FILE:** Types, parsing, reading, validation helpers |
| `src/core/artifact-graph/instruction-loader.ts` | Inject context (all artifacts) and rules (per-artifact) |
| `src/utils/change-utils.ts` | Use config schema as default in `createChange()` |
| `src/utils/change-metadata.ts` | Update `resolveSchemaForChange()` to check config |
| `src/commands/artifact-workflow.ts` | Extend `artifactExperimentalSetupCommand()` to prompt for config creation |
| `src/core/config-prompts.ts` | **NEW FILE:** Interactive prompts for config creation (reusable) |

### Config Location

Always at `./openspec/config.yaml` relative to project root. No XDG/global config for simplicity.

### Resolution Order Update

Schema selection order becomes:

```
1. --schema CLI flag                    # Explicit override
2. .openspec.yaml in change directory   # Change-specific binding
3. openspec/config.yaml schema field    # Project default (NEW)
4. "spec-driven"                        # Hardcoded fallback
```

### Validation

- `schema` must be a valid schema name (exists in resolution)
- `context` must be string
- `rules` must be object with string keys (artifact IDs) and array values
- Unknown artifact IDs in `rules` should warn, not error (allows forward compat)

### Experimental Setup Integration

**Changes to `artifactExperimentalSetupCommand()` in `src/commands/artifact-workflow.ts`:**

After creating skills and commands, the setup command will:

1. **Display section header:**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📋 Project Configuration (Optional)
   Configure project defaults for OpenSpec workflows.
   ```

2. **Prompt: Create config?**
   - Yes/No prompt with default "Yes"
   - If No → skip entire config section, show usage instructions
   - If Yes → continue to detailed prompts

3. **Prompt: Schema selection**
   - Use `listSchemasWithInfo()` to get available schemas
   - Display each with description and artifact flow
   - Default to first schema (likely "spec-driven")

4. **Prompt: Project context**
   - Multi-line input (or editor if available)
   - Show examples: "tech stack, conventions, style guides"
   - Allow empty (skip)

5. **Prompt: Per-artifact rules**
   - Yes/No prompt, default "No" (rules are less common)
   - If Yes:
     - Show checklist of artifacts from selected schema
     - For each selected artifact, prompt for rules (line-by-line input)
     - Allow empty line to finish each artifact's rules

6. **Create and validate config:**
   - Build `ProjectConfig` object from inputs
   - Validate with Zod schema
   - Write to `openspec/config.yaml` using YAML serializer
   - If validation fails, show error and ask to retry or skip

7. **Display success summary:**
   - Path to created config
   - Summary: schema used, context added (line count), rules count
   - Usage examples showing how config affects workflow
   - Suggestion to commit config to git

**Error handling:**
- Invalid schema selection → show available schemas with fuzzy match suggestions, retry
- Context too large (>50KB) → reject with error, ask to reduce size
- Rules reference invalid artifact → warn but continue (forward compat)
- File write fails → show error, suggest manual creation
- Config already exists → show message, skip config section, continue with setup
- User cancellation (Ctrl+C) → log "Config creation cancelled", continue with rest of setup (skills/commands already created)

**If config already exists:**

When `openspec/config.yaml` already exists:

```bash
$ openspec artifact-experimental-setup

[Skills and commands created...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project Configuration

ℹ️  openspec/config.yaml already exists. Skipping config creation.

   To update config, edit openspec/config.yaml manually or:
   1. Delete openspec/config.yaml
   2. Run openspec artifact-experimental-setup again

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Rest of setup output...]
```

This prevents accidentally overwriting user's config.

**Implementation approach:**

Create separate `src/core/config-prompts.ts` module:

```typescript
export interface ConfigPromptResult {
  createConfig: boolean;
  schema?: string;
  context?: string;
  rules?: Record<string, string[]>;
}

export async function promptForConfig(): Promise<ConfigPromptResult> {
  // Prompt logic using inquirer or similar
  // Returns structured result for config creation
  // Throws ExitPromptError on Ctrl+C (handled by caller)
}
```

**Ctrl+C handling in setup command:**

```typescript
try {
  const configResult = await promptForConfig();
  if (configResult.createConfig) {
    writeConfigFile(configResult);
    console.log('✓ Created openspec/config.yaml');
  }
} catch (error) {
  if (error.name === 'ExitPromptError') {
    console.log('\nℹ️  Config creation cancelled');
    console.log('   Skills and commands already created');
    console.log('   Run setup again to create config later');
    // Continue with rest of setup (not a fatal error)
  } else {
    throw error; // Re-throw unexpected errors
  }
}
```

This keeps prompts reusable and testable separately from the setup command.

### Dependencies

**Interactive Prompting Library:**

The experimental setup command will need an interactive prompting library for the config creation flow. Options:

1. **@inquirer/prompts** (recommended)
   - Modern, tree-shakeable, TypeScript-first
   - Individual imports: `@inquirer/input`, `@inquirer/confirm`, `@inquirer/checkbox`, `@inquirer/editor`
   - Already used in OpenSpec (if not, lightweight addition)

2. **inquirer** (classic)
   - More established, larger ecosystem
   - Heavier bundle size
   - Single package with all prompt types

**Prompts needed:**
- `confirm` - "Create config?" "Add rules?"
- `select` - Schema selection with descriptions
- `editor` or multi-line `input` - Project context
- `checkbox` - Artifact selection for rules
- `input` (repeated) - Rule entry (line-by-line)

**Alternative (no dependency):**

Use Node's built-in `readline` for basic prompts:
- More code to write
- Less polished UX (no arrow key navigation, checkbox selection)
- Zero dependency cost

**Recommendation:** Use `@inquirer/prompts` for best UX. Config setup is a one-time operation where UX matters.

### YAML Serialization

Config creation needs YAML serialization:

- **yaml** package (already a dependency)
- Use `yaml.stringify()` to write config
- Preserve multi-line strings with `|` literal style
- Format: 2-space indent, no quotes unless needed

Example:
```typescript
import { stringify } from 'yaml';

const config = {
  schema: 'spec-driven',
  context: 'Multi-line\ncontext\nhere',
  rules: { proposal: ['Rule 1', 'Rule 2'] }
};

const yamlContent = stringify(config, {
  indent: 2,
  defaultStringType: 'QUOTE_DOUBLE',
  defaultKeyType: 'PLAIN',
});
// context will use | literal style automatically for multi-line
```

## Testing Considerations

**Core Config Functionality:**
- Create config with all fields (schema, context, rules), verify parsing
- Create minimal config (schema only), verify parsing
- Verify context appears in instruction output for all artifacts
- Verify rules appear only for matching artifact (not all artifacts)
- Verify schema from config is used for new changes
- Verify CLI `--schema` flag overrides config
- Verify change's `.openspec.yaml` overrides config
- Verify graceful handling of missing config (fallback to defaults)
- Verify graceful handling of invalid YAML syntax (warning, fallback)
- Verify graceful handling of invalid schema (warning, show valid schemas)
- Verify unknown artifact IDs in rules emit warnings but don't halt

**Schema Resolution Precedence:**
- Test all four levels of schema resolution:
  1. CLI flag `--schema` (highest priority)
  2. Change metadata `.openspec.yaml`
  3. Project config `openspec/config.yaml`
  4. Hardcoded default "spec-driven" (lowest priority)
- Verify each level correctly overrides lower levels

**Context and Rules Injection:**
- Verify context injection uses `<context>` XML-style tags
- Verify rules injection uses `<rules>` XML-style tags with bullets
- Verify injection order: `<context>` → `<rules>` → `<template>`
- Verify multi-line context is preserved
- Verify special characters in context/rules are not escaped
- Verify empty context/rules don't create tags

**Experimental Setup Integration:**
- Test `artifact-experimental-setup` with user skipping config creation
- Test `artifact-experimental-setup` with minimal config (schema only)
- Test `artifact-experimental-setup` with full config (schema + context + rules)
- Test schema selection from available schemas
- Test multi-line context input
- Test per-artifact rules prompts
- Test artifact selection (checkboxes)
- Test validation errors during config creation
- Test file write errors (permissions, etc.)
- Verify created config can be parsed by `readProjectConfig()`
- Verify success summary shows correct information

**Edge Cases:**
- Config file exists but is empty → treat as invalid, warn
- Config has `.yml` extension instead of `.yaml` → accept both
- Both `.yaml` and `.yml` exist → prefer `.yaml`
- Context contains YAML-significant characters → properly escape in output
- Rules array contains empty strings → filter out or warn
- Schema references non-existent schema → error with suggestions
- Config in subdirectory (not project root) → not found, use defaults

**Backward Compatibility:**
- Existing projects without config continue to work
- Existing changes with `.openspec.yaml` metadata aren't affected by config
- Adding config to existing project doesn't break in-progress changes

**Integration Tests:**
- Create config → create change → verify schema used
- Create config → get instructions → verify context injected
- Create config → get instructions → verify rules injected
- Update config → verify changes reflected immediately (no caching)
- Run `artifact-experimental-setup` → create config → create change → verify flow

## Related Changes

- **project-local-schemas**: Enables `schema: my-workflow` to reference project-local schemas

## Appendix: Full Config Schema

```typescript
import { z } from 'zod';

// Zod schema serves as both runtime validation and documentation
// Type is inferred from schema for type safety
export const ProjectConfigSchema = z.object({
  // Required: which schema to use (e.g., "spec-driven", "tdd", or project-local schema name)
  schema: z.string().min(1).describe('The workflow schema to use (e.g., "spec-driven", "tdd")'),

  // Optional: project context (injected into all artifact instructions)
  // Max size: 50KB (enforced during parsing)
  context: z.string().optional().describe('Project context injected into all artifact instructions'),

  // Optional: per-artifact rules (additive to schema's built-in guidance)
  rules: z.record(
    z.string(),           // artifact ID
    z.array(z.string())   // list of rules
  ).optional().describe('Per-artifact rules, keyed by artifact ID'),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

// Note: Parsing uses safeParse() on individual fields for resilient error handling
// Invalid fields are warned about but don't prevent other fields from being loaded
```

## Appendix: Visual Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   User provides:                                                │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ openspec/config.yaml                                    │   │
│   │                                                         │   │
│   │ schema: spec-driven                                     │   │
│   │ context: "We use React, TypeScript..."                  │   │
│   │ rules:                                                  │   │
│   │   proposal: [...]                                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ OpenSpec merges:                                        │   │
│   │                                                         │   │
│   │   Schema (spec-driven)                                  │   │
│   │   + User's context                                      │   │
│   │   + User's rules                                        │   │
│   │   ─────────────────────────                             │   │
│   │   = Enriched instructions                               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Agent sees (for proposal artifact):                     │   │
│   │                                                         │   │
│   │ <context>                                               │   │
│   │ We use React, TypeScript...                             │   │
│   │ </context>                                              │   │
│   │                                                         │   │
│   │ <rules>                                                 │   │
│   │ - Include rollback plan                                 │   │
│   │ - Identify affected teams                               │   │
│   │ </rules>                                                │   │
│   │                                                         │   │
│   │ <template>                                              │   │
│   │ [Built-in proposal template]                            │   │
│   │ </template>                                             │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
