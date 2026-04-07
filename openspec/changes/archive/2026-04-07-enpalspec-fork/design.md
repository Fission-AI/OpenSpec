## Context

The codebase is currently published as `@fission-ai/openspec` with a single `openspec` binary. The fork establishes `enpalspec` as a distinct product identity. Three things need to change: the package identity (name + bin), the default schema on init, and the slash command namespace (`opsx` → `enpalspec`) in all generated command files.

**Current state:**
- `package.json`: `name: @fission-ai/openspec`, `bin: { openspec: ... }`
- `src/core/init.ts`: `DEFAULT_SCHEMA = 'spec-driven'`
- 24 command-generation adapters: `opsx` hardcoded in each file path and frontmatter template
- 10 workflow template files: 46 inline `/opsx:*` references in skill body content
- No shared constant for the command namespace

**Stakeholders:** Users of `enpalspec init` who get command files installed into their AI tool configurations.

## Goals / Non-Goals

**Goals:**
- `enpalspec` bin resolves and runs the CLI
- `enpalspec init` writes `schema: enpal-spec-driven` to `openspec/config.yaml`
- Generated command files use `enpalspec` namespace (e.g. `.claude/commands/enpalspec/explore.md`, `/enpalspec:explore`)
- Skill folder names remain unchanged (`openspec-explore`, etc.)
- Internal source paths, documentation, and folder names remain unchanged

**Non-Goals:**
- Keeping `openspec` as an alias binary
- Renaming skill folder names or internal skill directory structure
- Renaming the `openspec/` project directory in target projects
- Any changes to the `spec-driven` schema or existing installed commands

## Decisions

### Decision 1: Introduce a shared `COMMAND_NAMESPACE` constant

**Choice:** Extract the `opsx` string to a single `COMMAND_NAMESPACE` constant defined once and imported by all adapters and workflow templates.

**Why:** `opsx` is currently hardcoded in 24 adapters and 46 workflow template references. Changing it now requires a find-and-replace across 34 files. More importantly, a future upstream merge from openspec would re-introduce `opsx` everywhere unless there is a single place to override it. A shared constant makes the fork maintainable.

**Where it lives:** `src/core/command-generation/namespace.ts` exports `COMMAND_NAMESPACE = 'enpalspec'`.

**Alternatives considered:**
- Leave hardcoded, use sed/find-replace — works once but conflicts on every upstream merge
- Config file / runtime value — over-engineered; this is a compile-time identity, not a runtime setting

### Decision 2: Skill folder names remain `openspec-*`

**Choice:** `WORKFLOW_TO_SKILL_DIR` entries (`openspec-explore`, `openspec-propose`, etc.) are not renamed.

**Why:** The user confirmed that "folders and documentation still refers to openspec" is acceptable. Renaming skill folders would cascade into many skill template paths and test fixtures. The command namespace (what users type) is what matters for product identity; the skill folder is an internal installation detail.

### Decision 3: bin entry replaces rather than aliases

**Choice:** `package.json` `bin` field has only `enpalspec`. The `openspec` key is removed.

**Why:** This is a fork, not a compatibility shim. Keeping `openspec` would cause confusion when both packages are installed on the same machine. Users of the upstream `@fission-ai/openspec` package remain on `openspec`.

### Decision 4: Package name TBD — placeholder in tasks

**Choice:** The exact npm package name (e.g. `@enpal/enpalspec`) is left as a task for the implementer to confirm with stakeholders before publishing.

**Why:** NPM scope ownership and naming conventions need to be verified. The code changes are mechanical regardless of the final name.

## Risks / Trade-offs

- **[Risk] Upstream merge conflicts** → Mitigation: `COMMAND_NAMESPACE` constant concentrates the diff to one file; adapters become conflict-free after the initial change.
- **[Risk] Existing projects re-initialised get `enpalspec:*` commands, breaking muscle memory for `opsx:*` users** → Mitigation: this is expected and desired — it's a different product.
- **[Risk] Some adapters also embed the namespace in frontmatter fields (e.g. `name: /opsx-explore`)** → Mitigation: the `COMMAND_NAMESPACE` constant is used in both `getFilePath` and `formatFile` implementations, covering frontmatter too.

## Migration Plan

- No migration for existing projects; the `enpalspec` binary is a new installation
- Projects that ran `openspec init` and want to migrate: re-run `enpalspec init` to regenerate commands with the new namespace; manually delete old `.claude/commands/opsx/` directory
