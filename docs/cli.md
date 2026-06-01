# CLI Reference

The Pscode CLI (`pscode`) provides terminal commands for project setup, validation, status inspection, and management. These commands complement the AI slash commands (like `/ps:propose`) documented in [Commands](commands.md).

## Summary

| Category | Commands | Purpose |
|----------|----------|---------|
| **Setup** | `init`, `update` | Initialize and update Pscode in your project |
| **Workspaces (beta)** | `workspace setup`, `workspace list`, `workspace ls`, `workspace link`, `workspace relink`, `workspace doctor`, `workspace update`, `workspace open` | Set up local views over linked repos or folders |
| **Shared context (beta)** | `context-store setup`, `context-store register`, `context-store list`, `context-store doctor`, `initiative create`, `initiative show`, `initiative list` | Manage local context-store registrations and durable initiative context |
| **Browsing** | `list`, `view`, `show` | Explore changes and specs |
| **Validation** | `validate` | Check changes and specs for issues |
| **Lifecycle** | `complete` | Finalize completed changes |
| **Workflow** | `new change`, `set change`, `status`, `instructions`, `templates`, `schemas` | Artifact-driven workflow support |
| **Schemas** | `schema init`, `schema fork`, `schema validate`, `schema which` | Create and manage custom workflows |
| **Config** | `config` | View and modify settings |
| **Utility** | `feedback`, `completion` | Feedback and shell integration |

---

## Human vs Agent Commands

Most CLI commands are designed for **human use** in a terminal. Some commands also support **agent/script use** via JSON output.

### Human-Only Commands

These commands are interactive and designed for terminal use:

| Command | Purpose |
|---------|---------|
| `pscode init` | Initialize project (interactive prompts) |
| `pscode view` | Interactive dashboard |
| `pscode config edit` | Open config in editor |
| `pscode feedback` | Submit feedback via GitHub |
| `pscode completion install` | Install shell completions |

### Agent-Compatible Commands

These commands support `--json` output for programmatic use by AI agents and scripts:

| Command | Human Use | Agent Use |
|---------|-----------|-----------|
| `pscode list` | Browse changes/specs | `--json` for structured data |
| `pscode show <item>` | Read content | `--json` for parsing |
| `pscode validate` | Check for issues | `--all --json` for bulk validation |
| `pscode status` | See artifact progress | `--json` for structured status |
| `pscode instructions` | Get next steps | `--json` for agent instructions |
| `pscode templates` | Find template paths | `--json` for path resolution |
| `pscode schemas` | List available schemas | `--json` for schema discovery |
| `pscode workspace setup --no-interactive` | Create a workspace with explicit inputs | `--json` for structured setup output |
| `pscode workspace list` | Browse known workspaces | `--json` for typed workspace objects |
| `pscode workspace link` | Link a repo or folder | `--json` for structured link output |
| `pscode workspace relink` | Repair a linked path | `--json` for structured link output |
| `pscode workspace doctor` | Check one workspace | `--json` for structured status output |
| `pscode workspace update` | Refresh workspace-local guidance and agent skills | `--tools` selects agents; profile selects workflows |
| `pscode context-store list` | Browse registered context stores | `--json` for structured registrations |
| `pscode context-store doctor` | Check local store setup | `--json` for structured diagnostics |
| `pscode initiative list` | Browse shared initiatives | `--json` for structured initiative records |
| `pscode initiative show <id>` | Resolve an initiative | `--json` for canonical paths and metadata |
| `pscode new change <id>` | Create repo-local change scaffolding | `--json`, plus `--initiative` for shared coordination links |
| `pscode set change <id>` | Update checked-in change metadata | `--json`, plus `--initiative` for shared coordination links |

---

## Global Options

These options work with all commands:

| Option | Description |
|--------|-------------|
| `--version`, `-V` | Show version number |
| `--no-color` | Disable color output |
| `--help`, `-h` | Display help for command |

---

## Setup Commands

### `pscode init`

Initialize Pscode in your project. Creates the folder structure and configures AI tool integrations.

Default behavior uses global config defaults: profile `core`, delivery `both`, workflows `propose, explore, apply, sync, complete`.

```
pscode init [path] [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `path` | No | Target directory (default: current directory) |

**Options:**

| Option | Description |
|--------|-------------|
| `--tools <list>` | Configure AI tools non-interactively. Use `all`, `none`, or comma-separated list |
| `--force` | Auto-cleanup legacy files without prompting |
| `--profile <profile>` | Override global profile for this init run (`core` or `custom`) |

`--profile custom` uses whatever workflows are currently selected in global config (`pscode config profile`).

**Supported tool IDs (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `codex`, `forgecode`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `junie`, `kilocode`, `kimi`, `kiro`, `opencode`, `pi`, `qoder`, `lingma`, `qwen`, `roocode`, `trae`, `windsurf`

**Examples:**

```bash
# Interactive initialization
pscode init

# Initialize in a specific directory
pscode init ./my-project

# Non-interactive: configure for Claude and Cursor
pscode init --tools claude,cursor

# Configure for all supported tools
pscode init --tools all

# Override profile for this run
pscode init --profile core

# Skip prompts and auto-cleanup legacy files
pscode init --force
```

**What it creates:**

```
pscode/
├── specs/              # Your specifications (source of truth)
├── changes/            # Proposed changes
└── config.yaml         # Project configuration

.claude/skills/         # Claude Code skills (if claude selected)
.cursor/skills/         # Cursor skills (if cursor selected)
.cursor/commands/       # Cursor OPSX commands (if delivery includes commands)
... (other tool configs)
```

---

### `pscode update`

Update Pscode instruction files after upgrading the CLI. Re-generates AI tool configuration files using your current global profile, selected workflows, and delivery mode.

```
pscode update [path] [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `path` | No | Target directory (default: current directory) |

**Options:**

| Option | Description |
|--------|-------------|
| `--force` | Force update even when files are up to date |

**Example:**

```bash
# Update instruction files after npm upgrade
npm update @thiagodiogo/pscode
pscode update
```

---

## Workspace Commands

Workspace commands are in beta. The local-view model below is the current direction, but external automation, integrations, and long-lived workflows should still treat command behavior, state files, and JSON output as evolving.

Coordination workspaces are machine-local views over linked repos or folders. Workspace visibility is not change commitment: link the repos or folders Pscode should know about, then create changes when you are ready to plan specific work.

### `pscode workspace setup`

Create a workspace in the standard Pscode workspace location and link at least one existing repo or folder.

```bash
pscode workspace setup [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--name <name>` | Workspace name. Names must be kebab-case |
| `--link <path>` | Link an existing repo or folder and infer the link name from the folder name |
| `--link <name>=<path>` | Link an existing repo or folder with an explicit link name |
| `--opener <id>` | Store a preferred opener during non-interactive setup: `codex`, `claude`, `github-copilot`, or `editor` |
| `--tools <tools>` | Install workspace-local Pscode skills for agents. Use `all`, `none`, or comma-separated tool IDs |
| `--no-interactive` | Disable prompts; requires `--name` and at least one `--link` |
| `--json` | Output JSON; requires `--no-interactive` |

**Examples:**

```bash
pscode workspace setup
pscode workspace setup --no-interactive --name platform --link /repos/api --link web=/repos/web
pscode workspace setup --no-interactive --name platform --link /repos/api --opener codex
pscode workspace setup --no-interactive --name platform --link /repos/api --tools codex,claude
pscode workspace setup --no-interactive --json --name checkout --link /repos/platform/apps/checkout
```

Interactive setup asks for a preferred opener and can install workspace-local Pscode skills for selected agents. Non-interactive setup stores a preferred opener only when `--opener` is provided; otherwise `workspace open` prompts later in interactive terminals when a supported opener is available, or asks scripts to pass `--agent <tool>` or `--editor`.

Workspace skill installation is skills-only in this beta slice: even if global delivery is `commands` or `both`, workspace setup writes agent skill folders in the workspace root and does not create slash command files. The active global profile chooses which workflow skills are installed; `--tools` chooses which agents receive them. If `--tools` is omitted in non-interactive setup, no skills are installed and `workspace update --tools <ids>` can add them later.

### `pscode workspace list`

List known Pscode workspaces from the local registry.

```bash
pscode workspace list [--json]
pscode workspace ls [--json]
```

The list shows each workspace location and linked repos or folders. Stale registry records are reported but not changed.

### `pscode workspace link`

Record an existing repo or folder for one workspace.

```bash
pscode workspace link [name] <path> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--workspace <name>` | Select a known workspace from the local registry |
| `--json` | Output JSON |
| `--no-interactive` | Disable workspace picker prompts |

**Examples:**

```bash
pscode workspace link /repos/api
pscode workspace link api-service /repos/api
pscode workspace link --workspace platform /repos/platform/apps/checkout
```

The path must already exist. Relative paths are resolved against the command's current directory before Pscode stores the verified absolute path in machine-local workspace state. Linked paths can be full repos, packages, services, apps, or folders without repo-local `pscode/` state.

### `pscode workspace relink`

Repair or change the local path for an existing link.

```bash
pscode workspace relink <name> <path> [options]
```

The path must already exist. Relink updates only the machine-local path for the stable link name.

### `pscode workspace doctor`

Check what one workspace can resolve on the current machine.

```bash
pscode workspace doctor [options]
```

Doctor shows the workspace location, planning path, linked repos or folders, missing paths, repo-local specs paths when present, and suggested fixes. It reports issues only; it does not repair them automatically.

Commands that need one workspace use the current workspace when run from inside a workspace folder or subdirectory. From elsewhere, pass `--workspace <name>`, select from the picker in an interactive terminal, or rely on the only known workspace when exactly one exists. In `--json` or `--no-interactive` mode, ambiguous selection fails with a structured status error and suggests `--workspace <name>`.

JSON responses use typed objects plus `status` arrays. Primary data lives in `workspace`, `workspaces`, or `link`; warnings and errors live in `status`.

### `pscode workspace update`

Refresh workspace-local Pscode guidance and agent skills.

```bash
pscode workspace update [name] [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--workspace <name>` | Select a known workspace from the local registry |
| `--tools <tools>` | Select agents for workspace skills. Use `all`, `none`, or comma-separated tool IDs |
| `--json` | Output JSON |
| `--no-interactive` | Disable workspace picker prompts |

**Examples:**

```bash
pscode workspace update
pscode workspace update platform
pscode workspace update --workspace platform --tools codex,claude
pscode workspace update --workspace platform --tools none
```

`workspace update` refreshes the generated workspace guidance block and local open surface. For agent skills, it reuses the stored workspace skill agent selection when `--tools` is omitted. Passing `--tools` replaces that stored selection. It refreshes only Pscode-managed workflow skill directories in the workspace root, removes deselected managed workflow skills, and leaves linked repos and folders untouched.

Running `pscode update` from inside a workspace redirects to `pscode workspace update`; run `pscode update` inside repo-local projects when you want repo-owned tool files updated.

### `pscode workspace open`

Open a workspace working set through the stored preferred opener, a one-session agent override, or VS Code editor mode.

```bash
pscode workspace open [name] [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--workspace <name>` | Alias for the positional workspace name |
| `--initiative <id>` | Open an initiative as a local workspace view. Accepts `<id>` or `<store>/<id>` |
| `--store <id>` | Registered context store id for `--initiative` |
| `--store-path <path>` | Existing local context store root for `--initiative` |
| `--agent <tool>` | One-session agent override: `codex`, `claude`, or `github-copilot` |
| `--editor` | Open the maintained VS Code workspace file as a normal editor workspace |
| `--no-interactive` | Disable workspace and opener picker prompts |

**Examples:**

```bash
pscode workspace open
pscode workspace open platform
pscode workspace open platform --agent github-copilot
pscode workspace open --agent codex
pscode workspace open --editor
pscode workspace open --initiative billing-launch --store platform
pscode workspace open --initiative platform/billing-launch
```

`workspace open` uses the current workspace when run inside one, auto-selects the only known workspace when run elsewhere, and asks the user to choose when multiple workspaces are known. `--agent` and `--editor` do not change the stored preferred opener. Passing both opener overrides is an error; choose either `--agent <tool>` or `--editor`.

When `--initiative` is used, Pscode prepares or selects a private local workspace view for that initiative. Registry-selected stores are stored by id; `--store-path` stores a runtime-local path selector because workspace views are private local state.

Pscode maintains `<workspace-name>.code-workspace` at the workspace root for VS Code editor and GitHub Copilot-in-VS-Code opens. That file is machine-local and ignored by default with a specific `<workspace-name>.code-workspace` `.gitignore` entry, so user-authored `*.code-workspace` files remain eligible for tracking.

The maintained VS Code workspace includes the coordination root as `.` plus valid linked repos or folders as additional roots. VS Code displays those entries as a multi-root workspace.

Root workspace open makes linked repos or folders visible for exploration and context. Implementation edits should start only after an explicit user request and a normal Pscode implementation workflow.

---

## Shared Context Commands

Context stores and initiatives are beta coordination surfaces. A context store is a local registration for durable shared context, usually a Git-backed folder or clone. An initiative is shared coordination context inside a context store; repo-local changes can link to it without copying the shared plan into every repo.

### `pscode context-store setup`

Create and register a local context store.

```bash
pscode context-store setup [id] [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--path <path>` | Context store folder path; defaults to `./<id>` |
| `--init-git` | Initialize a Git repository in the context store |
| `--no-init-git` | Do not initialize a Git repository |
| `--json` | Output JSON |

Examples:

```bash
pscode context-store setup team-context
pscode context-store setup team-context --path /repos/team-context --no-init-git
pscode context-store setup team-context --json --no-init-git
```

### `pscode context-store register`

Register an existing local context store folder.

```bash
pscode context-store register [path] [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--id <id>` | Context store id; defaults to store metadata or folder name |
| `--json` | Output JSON |

### `pscode context-store list`

List locally registered context stores.

```bash
pscode context-store list [--json]
pscode context-store ls [--json]
```

### `pscode context-store doctor`

Check local context-store registration, metadata, and Git presence.

```bash
pscode context-store doctor [id] [--json]
```

Doctor is diagnostic-only; it reports missing roots, metadata mismatches, and invalid local registry state without modifying the store.

### `pscode initiative create`

Create an initiative in a context store.

```bash
pscode initiative create <id> --title <title> --summary <summary> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--store <id>` | Context store id from the local registry |
| `--store-path <path>` | Existing local context store root |
| `--title <title>` | Initiative title |
| `--summary <summary>` | Initiative summary |
| `--json` | Output JSON |

### `pscode initiative list`

List initiatives. Without a selector, this searches all registered context stores and reports partial-read warnings in `status`.

```bash
pscode initiative list [options]
pscode initiative ls [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--store <id>` | List one registered context store |
| `--store-path <path>` | List one existing local context store root |
| `--json` | Output JSON |

### `pscode initiative show`

Resolve an initiative and print its canonical location.

```bash
pscode initiative show <id> [options]
pscode initiative show <store>/<id> [options]
```

Without `--store`, Pscode searches registered context stores. If the same initiative id exists in multiple stores, pass `--store <id>` or use the `<store>/<id>` form.

---

## Browsing Commands

### `pscode list`

List changes or specs in your project.

```
pscode list [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--specs` | List specs instead of changes |
| `--changes` | List changes (default) |
| `--sort <order>` | Sort by `recent` (default) or `name` |
| `--json` | Output as JSON |

**Examples:**

```bash
# List all active changes
pscode list

# List all specs
pscode list --specs

# JSON output for scripts
pscode list --json
```

**Output (text):**

```
Active changes:
  add-dark-mode     UI theme switching support
  fix-login-bug     Session timeout handling
```

---

### `pscode view`

Display an interactive dashboard for exploring specs and changes.

```
pscode view
```

Opens a terminal-based interface for navigating your project's specifications and changes.

---

### `pscode show`

Display details of a change or spec.

```
pscode show [item-name] [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `item-name` | No | Name of change or spec (prompts if omitted) |

**Options:**

| Option | Description |
|--------|-------------|
| `--type <type>` | Specify type: `change` or `spec` (auto-detected if unambiguous) |
| `--json` | Output as JSON |
| `--no-interactive` | Disable prompts |

**Change-specific options:**

| Option | Description |
|--------|-------------|
| `--deltas-only` | Show only delta specs (JSON mode) |

**Spec-specific options:**

| Option | Description |
|--------|-------------|
| `--requirements` | Show only requirements, exclude scenarios (JSON mode) |
| `--no-scenarios` | Exclude scenario content (JSON mode) |
| `-r, --requirement <id>` | Show specific requirement by 1-based index (JSON mode) |

**Examples:**

```bash
# Interactive selection
pscode show

# Show a specific change
pscode show add-dark-mode

# Show a specific spec
pscode show auth --type spec

# JSON output for parsing
pscode show add-dark-mode --json
```

---

## Validation Commands

### `pscode validate`

Validate changes and specs for structural issues.

```
pscode validate [item-name] [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `item-name` | No | Specific item to validate (prompts if omitted) |

**Options:**

| Option | Description |
|--------|-------------|
| `--all` | Validate all changes and specs |
| `--changes` | Validate all changes |
| `--specs` | Validate all specs |
| `--type <type>` | Specify type when name is ambiguous: `change` or `spec` |
| `--strict` | Enable strict validation mode |
| `--json` | Output as JSON |
| `--concurrency <n>` | Max parallel validations (default: 6, or `PSCODE_CONCURRENCY` env) |
| `--no-interactive` | Disable prompts |

**Examples:**

```bash
# Interactive validation
pscode validate

# Validate a specific change
pscode validate add-dark-mode

# Validate all changes
pscode validate --changes

# Validate everything with JSON output (for CI/scripts)
pscode validate --all --json

# Strict validation with increased parallelism
pscode validate --all --strict --concurrency 12
```

**Output (text):**

```
Validating add-dark-mode...
  ✓ proposal.md valid
  ✓ specs/ui/spec.md valid
  ⚠ design.md: missing "Technical Approach" section

1 warning found
```

**Output (JSON):**

```json
{
  "version": "1.0.0",
  "results": {
    "changes": [
      {
        "name": "add-dark-mode",
        "valid": true,
        "warnings": ["design.md: missing 'Technical Approach' section"]
      }
    ]
  },
  "summary": {
    "total": 1,
    "valid": 1,
    "invalid": 0
  }
}
```

---

## Lifecycle Commands

### `pscode complete`

Complete a change and merge delta specs into main specs.

```
pscode complete [change-name] [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Change to complete (prompts if omitted) |

**Options:**

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip confirmation prompts |
| `--skip-specs` | Skip spec updates (for infrastructure/tooling/doc-only changes) |
| `--no-validate` | Skip validation (requires confirmation) |

**Examples:**

```bash
# Interactive complete
pscode complete

# Complete specific change
pscode complete add-dark-mode

# Complete without prompts (CI/scripts)
pscode complete add-dark-mode --yes

# Complete a tooling change that doesn't affect specs
pscode complete update-ci-config --skip-specs
```

**What it does:**

1. Validates the change (unless `--no-validate`)
2. Prompts for confirmation (unless `--yes`)
3. Merges delta specs into `pscode/specs/`
4. Moves change folder to `pscode/changes/archive/YYYY-MM-DD-<name>/`

---

## Workflow Commands

These commands support the artifact-driven OPSX workflow. They're useful for both humans checking progress and agents determining next steps.

### `pscode new change`

Create a repo-local change directory and optional checked-in metadata.

```bash
pscode new change <name> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--description <text>` | Description to add to `README.md` |
| `--goal <text>` | Workspace product goal to store with the change |
| `--areas <names>` | Comma-separated affected workspace link names |
| `--initiative <id>` | Link the repo-local change to an initiative |
| `--store <id>` | Context store id for `--initiative` |
| `--store-path <path>` | Existing local context store root for `--initiative` |
| `--schema <name>` | Workflow schema to use |
| `--json` | Output JSON |

Examples:

```bash
pscode new change add-billing-api --initiative billing-launch --store platform
pscode new change add-billing-api --initiative platform/billing-launch --json
```

### `pscode set change`

Update checked-in repo-local change metadata without recreating the change.

```bash
pscode set change <name> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--initiative <id>` | Link the repo-local change to an initiative |
| `--store <id>` | Context store id for `--initiative` |
| `--store-path <path>` | Existing local context store root for `--initiative` |
| `--json` | Output JSON |

`set change --initiative` is idempotent when the requested link already exists and refuses to replace a different existing initiative link.

### `pscode status`

Display artifact completion status for a change.

```
pscode status [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--change <id>` | Change name (prompts if omitted) |
| `--schema <name>` | Schema override (auto-detected from change's config) |
| `--json` | Output as JSON |

**Examples:**

```bash
# Interactive status check
pscode status

# Status for specific change
pscode status --change add-dark-mode

# JSON for agent use
pscode status --change add-dark-mode --json
```

**Output (text):**

```
Change: add-dark-mode
Schema: spec-driven
Progress: 2/4 artifacts complete

[x] proposal
[ ] design
[x] specs
[-] tasks (blocked by: design)
```

**Output (JSON):**

```json
{
  "changeName": "add-dark-mode",
  "schemaName": "spec-driven",
  "isComplete": false,
  "applyRequires": ["tasks"],
  "artifacts": [
    {"id": "proposal", "outputPath": "proposal.md", "status": "done"},
    {"id": "design", "outputPath": "design.md", "status": "ready"},
    {"id": "specs", "outputPath": "specs/**/*.md", "status": "done"},
    {"id": "tasks", "outputPath": "tasks.md", "status": "blocked", "missingDeps": ["design"]}
  ]
}
```

---

### `pscode instructions`

Get enriched instructions for creating an artifact or applying tasks. Used by AI agents to understand what to create next.

```
pscode instructions [artifact] [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `artifact` | No | Artifact ID: `proposal`, `specs`, `design`, `tasks`, or `apply` |

**Options:**

| Option | Description |
|--------|-------------|
| `--change <id>` | Change name (required in non-interactive mode) |
| `--schema <name>` | Schema override |
| `--json` | Output as JSON |

**Special case:** Use `apply` as the artifact to get task implementation instructions.

**Examples:**

```bash
# Get instructions for next artifact
pscode instructions --change add-dark-mode

# Get specific artifact instructions
pscode instructions design --change add-dark-mode

# Get apply/implementation instructions
pscode instructions apply --change add-dark-mode

# JSON for agent consumption
pscode instructions design --change add-dark-mode --json
```

**Output includes:**

- Template content for the artifact
- Project context from config
- Content from dependency artifacts
- Per-artifact rules from config

---

### `pscode templates`

Show resolved template paths for all artifacts in a schema.

```
pscode templates [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--schema <name>` | Schema to inspect (default: `spec-driven`) |
| `--json` | Output as JSON |

**Examples:**

```bash
# Show template paths for default schema
pscode templates

# Show templates for custom schema
pscode templates --schema my-workflow

# JSON for programmatic use
pscode templates --json
```

**Output (text):**

```
Schema: spec-driven

Templates:
  proposal  → ~/.pscode/schemas/spec-driven/templates/proposal.md
  specs     → ~/.pscode/schemas/spec-driven/templates/specs.md
  design    → ~/.pscode/schemas/spec-driven/templates/design.md
  tasks     → ~/.pscode/schemas/spec-driven/templates/tasks.md
```

---

### `pscode schemas`

List available workflow schemas with their descriptions and artifact flows.

```
pscode schemas [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

**Example:**

```bash
pscode schemas
```

**Output:**

```
Available schemas:

  spec-driven (package)
    The default spec-driven development workflow
    Flow: proposal → specs → design → tasks

  my-custom (project)
    Custom workflow for this project
    Flow: research → proposal → tasks
```

---

## Schema Commands

Commands for creating and managing custom workflow schemas.

### `pscode schema init`

Create a new project-local schema.

```
pscode schema init <name> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Schema name (kebab-case) |

**Options:**

| Option | Description |
|--------|-------------|
| `--description <text>` | Schema description |
| `--artifacts <list>` | Comma-separated artifact IDs (default: `proposal,specs,design,tasks`) |
| `--default` | Set as project default schema |
| `--no-default` | Don't prompt to set as default |
| `--force` | Overwrite existing schema |
| `--json` | Output as JSON |

**Examples:**

```bash
# Interactive schema creation
pscode schema init research-first

# Non-interactive with specific artifacts
pscode schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

**What it creates:**

```
pscode/schemas/<name>/
├── schema.yaml           # Schema definition
└── templates/
    ├── proposal.md       # Template for each artifact
    ├── specs.md
    ├── design.md
    └── tasks.md
```

---

### `pscode schema fork`

Copy an existing schema to your project for customization.

```
pscode schema fork <source> [name] [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `source` | Yes | Schema to copy |
| `name` | No | New schema name (default: `<source>-custom`) |

**Options:**

| Option | Description |
|--------|-------------|
| `--force` | Overwrite existing destination |
| `--json` | Output as JSON |

**Example:**

```bash
# Fork the built-in spec-driven schema
pscode schema fork spec-driven my-workflow
```

---

### `pscode schema validate`

Validate a schema's structure and templates.

```
pscode schema validate [name] [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | No | Schema to validate (validates all if omitted) |

**Options:**

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed validation steps |
| `--json` | Output as JSON |

**Example:**

```bash
# Validate a specific schema
pscode schema validate my-workflow

# Validate all schemas
pscode schema validate
```

---

### `pscode schema which`

Show where a schema resolves from (useful for debugging precedence).

```
pscode schema which [name] [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `name` | No | Schema name |

**Options:**

| Option | Description |
|--------|-------------|
| `--all` | List all schemas with their sources |
| `--json` | Output as JSON |

**Example:**

```bash
# Check where a schema comes from
pscode schema which spec-driven
```

**Output:**

```
spec-driven resolves from: package
  Source: /usr/local/lib/node_modules/@thiagodiogo/pscode/schemas/spec-driven
```

**Schema precedence:**

1. Project: `pscode/schemas/<name>/`
2. User: `~/.local/share/pscode/schemas/<name>/`
3. Package: Built-in schemas

---

## Configuration Commands

### `pscode config`

View and modify global Pscode configuration.

```
pscode config <subcommand> [options]
```

**Subcommands:**

| Subcommand | Description |
|------------|-------------|
| `path` | Show config file location |
| `list` | Show all current settings |
| `get <key>` | Get a specific value |
| `set <key> <value>` | Set a value |
| `unset <key>` | Remove a key |
| `reset` | Reset to defaults |
| `edit` | Open in `$EDITOR` |
| `profile [preset]` | Configure workflow profile interactively or via preset |

**Examples:**

```bash
# Show config file path
pscode config path

# List all settings
pscode config list

# Get a specific value
pscode config get telemetry.enabled

# Set a value
pscode config set telemetry.enabled false

# Set a string value explicitly
pscode config set user.name "My Name" --string

# Remove a custom setting
pscode config unset user.name

# Reset all configuration
pscode config reset --all --yes

# Edit config in your editor
pscode config edit

# Configure profile with action-based wizard
pscode config profile

# Fast preset: switch workflows to core (keeps delivery mode)
pscode config profile core
```

`pscode config profile` starts with a current-state summary, then lets you choose:
- Change delivery + workflows
- Change delivery only
- Change workflows only
- Keep current settings (exit)

If you keep current settings, no changes are written and no update prompt is shown.
If there are no config changes but the current project or workspace files are out of sync with your global profile/delivery, Pscode will show a warning and suggest `pscode update` for repo-local projects or `pscode workspace update` for workspace-local guidance and skills.
Pressing `Ctrl+C` also cancels the flow cleanly (no stack trace) and exits with code `130`.
In the workflow checklist, `[x]` means the workflow is selected in global config. To apply those selections to project files, run `pscode update` (or choose `Apply changes to this project now?` when prompted inside a project). From inside a workspace, use `pscode workspace update` to refresh workspace-local guidance and skills; this remains skills-only for generated agent workflow files and does not generate workspace slash commands.

**Interactive examples:**

```bash
# Delivery-only update
pscode config profile
# choose: Change delivery only
# choose delivery: Skills only

# Workflows-only update
pscode config profile
# choose: Change workflows only
# toggle workflows in the checklist, then confirm
```

---

## Utility Commands

### `pscode feedback`

Submit feedback about Pscode. Creates a GitHub issue.

```
pscode feedback <message> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `message` | Yes | Feedback message |

**Options:**

| Option | Description |
|--------|-------------|
| `--body <text>` | Detailed description |

**Requirements:** GitHub CLI (`gh`) must be installed and authenticated.

**Example:**

```bash
pscode feedback "Add support for custom artifact types" \
  --body "I'd like to define my own artifact types beyond the built-in ones."
```

---

### `pscode completion`

Manage shell completions for the Pscode CLI.

```
pscode completion <subcommand> [shell]
```

**Subcommands:**

| Subcommand | Description |
|------------|-------------|
| `generate [shell]` | Output completion script to stdout |
| `install [shell]` | Install completion for your shell |
| `uninstall [shell]` | Remove installed completions |

**Supported shells:** `bash`, `zsh`, `fish`, `powershell`

**Examples:**

```bash
# Install completions (auto-detects shell)
pscode completion install

# Install for specific shell
pscode completion install zsh

# Generate script for manual installation
pscode completion generate bash > ~/.bash_completion.d/pscode

# Uninstall
pscode completion uninstall
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (validation failure, missing files, etc.) |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PSCODE_TELEMETRY` | Set to `0` to disable telemetry |
| `DO_NOT_TRACK` | Set to `1` to disable telemetry (standard DNT signal) |
| `PSCODE_CONCURRENCY` | Default concurrency for bulk validation (default: 6) |
| `EDITOR` or `VISUAL` | Editor for `pscode config edit` |
| `NO_COLOR` | Disable color output when set |

---

## Related Documentation

- [Commands](commands.md) - AI slash commands (`/ps:propose`, `/ps:apply`, etc.)
- [Workflows](workflows.md) - Common patterns and when to use each command
- [Customization](customization.md) - Create custom schemas and templates
- [Getting Started](getting-started.md) - First-time setup guide
