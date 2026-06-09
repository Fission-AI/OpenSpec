# CLI Reference

The ClearSpec CLI (`clearspec`) provides terminal commands for project setup, validation, status inspection, and management. These commands complement the AI slash commands (like `/clsx:propose`) documented in [Commands](commands.md).

## Summary

| Category | Commands | Purpose |
|----------|----------|---------|
| **Setup** | `init`, `update` | Initialize and update ClearSpec in your project |
| **Workspaces (beta)** | `workspace setup`, `workspace list`, `workspace ls`, `workspace link`, `workspace relink`, `workspace doctor`, `workspace update`, `workspace open` | Set up local views over linked repos or folders |
| **Shared context (beta)** | `context-store setup`, `context-store register`, `context-store unregister`, `context-store remove`, `context-store list`, `context-store doctor`, `initiative create`, `initiative show`, `initiative list` | Manage local context-store registrations and durable initiative context |
| **Browsing** | `list`, `view`, `show` | Explore changes and specs |
| **Validation** | `validate` | Check changes and specs for issues |
| **Lifecycle** | `archive` | Finalize completed changes |
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
| `clearspec init` | Initialize project (interactive prompts) |
| `clearspec view` | Interactive dashboard |
| `clearspec config edit` | Open config in editor |
| `clearspec feedback` | Submit feedback via GitHub |
| `clearspec completion install` | Install shell completions |

### Agent-Compatible Commands

These commands support `--json` output for programmatic use by AI agents and scripts:

| Command | Human Use | Agent Use |
|---------|-----------|-----------|
| `clearspec list` | Browse changes/specs | `--json` for structured data |
| `clearspec show <item>` | Read content | `--json` for parsing |
| `clearspec validate` | Check for issues | `--all --json` for bulk validation |
| `clearspec status` | See artifact progress | `--json` for structured status |
| `clearspec instructions` | Get next steps | `--json` for agent instructions |
| `clearspec templates` | Find template paths | `--json` for path resolution |
| `clearspec schemas` | List available schemas | `--json` for schema discovery |
| `clearspec workspace setup --no-interactive` | Create a workspace with explicit inputs | `--json` for structured setup output |
| `clearspec workspace list` | Browse known workspaces | `--json` for typed workspace objects |
| `clearspec workspace link` | Link a repo or folder | `--json` for structured link output |
| `clearspec workspace relink` | Repair a linked path | `--json` for structured link output |
| `clearspec workspace doctor` | Check one workspace | `--json` for structured status output |
| `clearspec workspace update` | Refresh workspace-local guidance and agent skills | `--tools` selects agents; profile selects workflows |
| `clearspec context-store setup <id>` | Create a local context store | `--json` with explicit inputs for structured setup output |
| `clearspec context-store register <path>` | Register an existing context store | `--json` for structured registration output |
| `clearspec context-store unregister <id>` | Forget a local context-store registration | `--json` for structured cleanup output |
| `clearspec context-store remove <id>` | Delete a registered local context-store folder | `--yes --json` for non-interactive deletion |
| `clearspec context-store list` | Browse registered context stores | `--json` for structured registrations |
| `clearspec context-store doctor` | Check local store setup | `--json` for structured diagnostics |
| `clearspec initiative list` | Browse shared initiatives | `--json` for structured initiative records |
| `clearspec initiative show <id>` | Resolve an initiative | `--json` for canonical paths and metadata |
| `clearspec new change <id>` | Create repo-local change scaffolding | `--json`, plus `--initiative` for shared coordination links |
| `clearspec set change <id>` | Update checked-in change metadata | `--json`, plus `--initiative` for shared coordination links |

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

### `clearspec init`

Initialize ClearSpec in your project. Creates the folder structure and configures AI tool integrations.

Default behavior uses global config defaults: profile `core`, delivery `both`, workflows `propose, explore, apply, sync, archive`.

```
clearspec init [path] [options]
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

`--profile custom` uses whatever workflows are currently selected in global config (`clearspec config profile`).

**Supported tool IDs (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `codex`, `forgecode`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `junie`, `kilocode`, `kimi`, `kiro`, `opencode`, `pi`, `qoder`, `lingma`, `qwen`, `roocode`, `trae`, `windsurf`

**Examples:**

```bash
# Interactive initialization
clearspec init

# Initialize in a specific directory
clearspec init ./my-project

# Non-interactive: configure for Claude and Cursor
clearspec init --tools claude,cursor

# Configure for all supported tools
clearspec init --tools all

# Override profile for this run
clearspec init --profile core

# Skip prompts and auto-cleanup legacy files
clearspec init --force
```

**What it creates:**

```
clearspec/
├── specs/              # Your specifications (source of truth)
├── changes/            # Proposed changes
└── config.yaml         # Project configuration

.claude/skills/         # Claude Code skills (if claude selected)
.cursor/skills/         # Cursor skills (if cursor selected)
.cursor/commands/       # Cursor OPSX commands (if delivery includes commands)
... (other tool configs)
```

---

### `clearspec update`

Update ClearSpec instruction files after upgrading the CLI. Re-generates AI tool configuration files using your current global profile, selected workflows, and delivery mode.

```
clearspec update [path] [options]
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
npm update clearspec
clearspec update
```

---

## Workspace Commands

Workspace commands are in beta. The local-view model below is the current direction, but external automation, integrations, and long-lived workflows should still treat command behavior, state files, and JSON output as evolving.

Coordination workspaces are machine-local views over linked repos or folders. Workspace visibility is not change commitment: link the repos or folders ClearSpec should know about, then create changes when you are ready to plan specific work.

### `clearspec workspace setup`

Create a workspace in the standard ClearSpec workspace location and link at least one existing repo or folder.

```bash
clearspec workspace setup [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--name <name>` | Workspace name. Names must be kebab-case |
| `--link <path>` | Link an existing repo or folder and infer the link name from the folder name |
| `--link <name>=<path>` | Link an existing repo or folder with an explicit link name |
| `--opener <id>` | Store a preferred opener during non-interactive setup: `codex-cli`, `claude`, `github-copilot`, or `editor` |
| `--tools <tools>` | Install workspace-local ClearSpec skills for agents. Use `all`, `none`, or comma-separated tool IDs |
| `--no-interactive` | Disable prompts; requires `--name` and at least one `--link` |
| `--json` | Output JSON; requires `--no-interactive` |

**Examples:**

```bash
clearspec workspace setup
clearspec workspace setup --no-interactive --name platform --link /repos/api --link web=/repos/web
clearspec workspace setup --no-interactive --name platform --link /repos/api --opener codex-cli
clearspec workspace setup --no-interactive --name platform --link /repos/api --tools codex,claude
clearspec workspace setup --no-interactive --json --name checkout --link /repos/platform/apps/checkout
```

Interactive setup asks for a preferred opener and can install workspace-local ClearSpec skills for selected agents. Non-interactive setup stores a preferred opener only when `--opener` is provided; otherwise `workspace open` prompts later in interactive terminals when a supported opener is available, or asks scripts to pass `--agent <tool>` or `--editor`.

Workspace skill installation is skills-only in this beta slice: even if global delivery is `commands` or `both`, workspace setup writes agent skill folders in the workspace root and does not create slash command files. The active global profile chooses which workflow skills are installed; `--tools` chooses which agents receive them. If `--tools` is omitted in non-interactive setup, no skills are installed and `workspace update --tools <ids>` can add them later.

### `clearspec workspace list`

List known ClearSpec workspaces from the local registry.

```bash
clearspec workspace list [--json]
clearspec workspace ls [--json]
```

The list shows each workspace location and linked repos or folders. Stale registry records are reported but not changed.

### `clearspec workspace link`

Record an existing repo or folder for one workspace.

```bash
clearspec workspace link [name] <path> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--workspace <name>` | Select a known workspace from the local registry |
| `--json` | Output JSON |
| `--no-interactive` | Disable workspace picker prompts |

**Examples:**

```bash
clearspec workspace link /repos/api
clearspec workspace link api-service /repos/api
clearspec workspace link --workspace platform /repos/platform/apps/checkout
```

The path must already exist. Relative paths are resolved against the command's current directory before ClearSpec stores the verified absolute path in machine-local workspace state. Linked paths can be full repos, packages, services, apps, or folders without repo-local `clearspec/` state.

### `clearspec workspace relink`

Repair or change the local path for an existing link.

```bash
clearspec workspace relink <name> <path> [options]
```

The path must already exist. Relink updates only the machine-local path for the stable link name.

### `clearspec workspace doctor`

Check what one workspace can resolve on the current machine.

```bash
clearspec workspace doctor [options]
```

Doctor shows the workspace location, linked repos or folders, missing paths, repo-local specs paths when present, and suggested fixes. JSON output also includes the workspace planning path for compatibility. It reports issues only; it does not repair them automatically.

Commands that need one workspace use the current workspace when run from inside a workspace folder or subdirectory. From elsewhere, pass `--workspace <name>`, select from the picker in an interactive terminal, or rely on the only known workspace when exactly one exists. In `--json` or `--no-interactive` mode, ambiguous selection fails with a structured status error and suggests `--workspace <name>`.

JSON responses use typed objects plus `status` arrays. Primary data lives in `workspace`, `workspaces`, or `link`; warnings and errors live in `status`.

### `clearspec workspace update`

Refresh workspace-local ClearSpec guidance and agent skills.

```bash
clearspec workspace update [name] [options]
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
clearspec workspace update
clearspec workspace update platform
clearspec workspace update --workspace platform --tools codex,claude
clearspec workspace update --workspace platform --tools none
```

`workspace update` refreshes the generated workspace guidance block and local open surface. For agent skills, it reuses the stored workspace skill agent selection when `--tools` is omitted. Passing `--tools` replaces that stored selection. It refreshes only ClearSpec-managed workflow skill directories in the workspace root, removes deselected managed workflow skills, and leaves linked repos and folders untouched.

Running `clearspec update` from inside a workspace does not update workspace-local files. Use `clearspec workspace update` when you want workspace-local guidance and skills refreshed, and run `clearspec update` inside repo-local projects when you want repo-owned tool files updated.

### `clearspec workspace open`

Open a workspace working set through the stored preferred opener, a one-session agent override, or VS Code editor mode.

```bash
clearspec workspace open [name] [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--workspace <name>` | Alias for the positional workspace name |
| `--initiative <id>` | Open an initiative as a local workspace view. Accepts `<id>` or `<store>/<id>` |
| `--store <id>` | Registered context store id for `--initiative` |
| `--store-path <path>` | Existing local context store root for `--initiative` |
| `--agent <tool>` | One-session agent override: `codex-cli`, `claude`, or `github-copilot` |
| `--editor` | Open the maintained VS Code workspace file as a normal editor workspace |
| `--no-interactive` | Disable workspace and opener picker prompts |

**Examples:**

```bash
clearspec workspace open
clearspec workspace open platform
clearspec workspace open platform --agent github-copilot
clearspec workspace open --agent codex-cli
clearspec workspace open --editor
clearspec workspace open --initiative billing-launch --store platform
clearspec workspace open --initiative platform/billing-launch
```

`workspace open` uses the current workspace when run inside one, auto-selects the only known workspace when run elsewhere, and asks the user to choose when multiple workspaces are known. `--agent` and `--editor` do not change the stored preferred opener. Passing both opener overrides is an error; choose either `--agent <tool>` or `--editor`.

When `--initiative` is used, ClearSpec prepares or selects a private local workspace view for that initiative. Registry-selected stores are stored by id; `--store-path` stores a runtime-local path selector because workspace views are private local state.

ClearSpec maintains `<workspace-name>.code-workspace` at the workspace root for VS Code editor and GitHub Copilot-in-VS-Code opens. That file is machine-local workspace view state.

The maintained VS Code workspace lists valid linked repos or folders first, then initiative context when attached, then the ClearSpec workspace files. VS Code displays those entries as a multi-root workspace.

Root workspace open makes linked repos or folders visible for exploration and context. Implementation edits should start only after an explicit user request and a normal ClearSpec implementation workflow.

---

## Shared Context Commands

Context stores and initiatives are beta coordination surfaces. A context store is a local registration for durable shared context, usually a Git-backed folder or clone. An initiative is shared coordination context inside a context store; repo-local changes can link to it without copying the shared plan into every repo.

### `clearspec context-store setup`

Create and register a local context store. With no arguments in a terminal,
ClearSpec guides the user through setup. Agents and scripts should pass explicit
inputs and use `--json`.

```bash
clearspec context-store setup [id] [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--path <path>` | Context store folder path; defaults to ClearSpec's managed local data directory |
| `--init-git` | Initialize a Git repository in the context store |
| `--no-init-git` | Do not initialize a Git repository |
| `--json` | Output JSON |

When `--path` is omitted, setup creates the store under `getGlobalDataDir()/context-stores/<id>`: `$XDG_DATA_HOME/clearspec/context-stores/<id>` when `XDG_DATA_HOME` is set, or `~/.local/share/clearspec/context-stores/<id>` on Unix-style fallbacks. Pass `--path` when you want the store in a visible clone or team-specific folder.

Examples:

```bash
clearspec context-store setup
clearspec context-store setup team-context
clearspec context-store setup team-context --path /repos/team-context --no-init-git
clearspec context-store setup team-context --json --no-init-git
```

### `clearspec context-store register`

Register an existing local context store folder.

```bash
clearspec context-store register [path] [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--id <id>` | Context store id; defaults to store metadata or folder name |
| `--json` | Output JSON |

### `clearspec context-store unregister`

Forget a local context-store registration without deleting files.

```bash
clearspec context-store unregister <id> [--json]
```

Use this when a store was moved, cloned somewhere else, or should no longer be
shown by ClearSpec on this machine.

### `clearspec context-store remove`

Forget a local context-store registration and delete its local folder.

```bash
clearspec context-store remove <id> [--yes] [--json]
```

`remove` shows the exact folder before deleting in an interactive terminal.
Agents, scripts, and JSON callers must pass `--yes` to confirm deletion.
ClearSpec refuses to delete a folder that does not contain matching
context-store metadata.

### `clearspec context-store list`

List locally registered context stores.

```bash
clearspec context-store list [--json]
clearspec context-store ls [--json]
```

### `clearspec context-store doctor`

Check local context-store registration, metadata, and Git presence.

```bash
clearspec context-store doctor [id] [--json]
```

Doctor is diagnostic-only; it reports missing roots, metadata mismatches, and invalid local registry state without modifying the store.

### `clearspec initiative create`

Create an initiative in a context store.

```bash
clearspec initiative create <id> --title <title> --summary <summary> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--store <id>` | Context store id from the local registry |
| `--store-path <path>` | Existing local context store root |
| `--title <title>` | Initiative title |
| `--summary <summary>` | Initiative summary |
| `--json` | Output JSON |

### `clearspec initiative list`

List initiatives. Without a selector, this searches all registered context stores and reports partial-read warnings in `status`.

```bash
clearspec initiative list [options]
clearspec initiative ls [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--store <id>` | List one registered context store |
| `--store-path <path>` | List one existing local context store root |
| `--json` | Output JSON |

### `clearspec initiative show`

Resolve an initiative and print its canonical location.

```bash
clearspec initiative show <id> [options]
clearspec initiative show <store>/<id> [options]
```

Without `--store`, ClearSpec searches registered context stores. If the same initiative id exists in multiple stores, pass `--store <id>` or use the `<store>/<id>` form.

---

## Browsing Commands

### `clearspec list`

List changes or specs in your project.

```
clearspec list [options]
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
clearspec list

# List all specs
clearspec list --specs

# JSON output for scripts
clearspec list --json
```

**Output (text):**

```
Active changes:
  add-dark-mode     UI theme switching support
  fix-login-bug     Session timeout handling
```

---

### `clearspec view`

Display an interactive dashboard for exploring specs and changes.

```
clearspec view
```

Opens a terminal-based interface for navigating your project's specifications and changes.

---

### `clearspec show`

Display details of a change or spec.

```
clearspec show [item-name] [options]
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
clearspec show

# Show a specific change
clearspec show add-dark-mode

# Show a specific spec
clearspec show auth --type spec

# JSON output for parsing
clearspec show add-dark-mode --json
```

---

## Validation Commands

### `clearspec validate`

Validate changes and specs for structural issues.

```
clearspec validate [item-name] [options]
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
| `--concurrency <n>` | Max parallel validations (default: 6, or `CLEARSPEC_CONCURRENCY` env) |
| `--no-interactive` | Disable prompts |

**Examples:**

```bash
# Interactive validation
clearspec validate

# Validate a specific change
clearspec validate add-dark-mode

# Validate all changes
clearspec validate --changes

# Validate everything with JSON output (for CI/scripts)
clearspec validate --all --json

# Strict validation with increased parallelism
clearspec validate --all --strict --concurrency 12
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

### `clearspec archive`

Archive a completed change and merge delta specs into main specs.

```
clearspec archive [change-name] [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Change to archive (prompts if omitted) |

**Options:**

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip confirmation prompts |
| `--skip-specs` | Skip spec updates (for infrastructure/tooling/doc-only changes) |
| `--no-validate` | Skip validation (requires confirmation) |

**Examples:**

```bash
# Interactive archive
clearspec archive

# Archive specific change
clearspec archive add-dark-mode

# Archive without prompts (CI/scripts)
clearspec archive add-dark-mode --yes

# Archive a tooling change that doesn't affect specs
clearspec archive update-ci-config --skip-specs
```

**What it does:**

1. Validates the change (unless `--no-validate`)
2. Prompts for confirmation (unless `--yes`)
3. Merges delta specs into `clearspec/specs/`
4. Moves change folder to `clearspec/changes/archive/YYYY-MM-DD-<name>/`

---

## Workflow Commands

These commands support the artifact-driven OPSX workflow. They're useful for both humans checking progress and agents determining next steps.

### `clearspec new change`

Create a repo-local change directory and optional checked-in metadata.

```bash
clearspec new change <name> [options]
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
clearspec new change add-billing-api --initiative billing-launch --store platform
clearspec new change add-billing-api --initiative platform/billing-launch --json
```

### `clearspec set change`

Update checked-in repo-local change metadata without recreating the change.

```bash
clearspec set change <name> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--initiative <id>` | Link the repo-local change to an initiative |
| `--store <id>` | Context store id for `--initiative` |
| `--store-path <path>` | Existing local context store root for `--initiative` |
| `--json` | Output JSON |

`set change --initiative` is idempotent when the requested link already exists and refuses to replace a different existing initiative link.

### `clearspec status`

Display artifact completion status for a change.

```
clearspec status [options]
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
clearspec status

# Status for specific change
clearspec status --change add-dark-mode

# JSON for agent use
clearspec status --change add-dark-mode --json
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

### `clearspec instructions`

Get enriched instructions for creating an artifact or applying tasks. Used by AI agents to understand what to create next.

```
clearspec instructions [artifact] [options]
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
clearspec instructions --change add-dark-mode

# Get specific artifact instructions
clearspec instructions design --change add-dark-mode

# Get apply/implementation instructions
clearspec instructions apply --change add-dark-mode

# JSON for agent consumption
clearspec instructions design --change add-dark-mode --json
```

**Output includes:**

- Template content for the artifact
- Project context from config
- Content from dependency artifacts
- Per-artifact rules from config

---

### `clearspec templates`

Show resolved template paths for all artifacts in a schema.

```
clearspec templates [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--schema <name>` | Schema to inspect (default: `spec-driven`) |
| `--json` | Output as JSON |

**Examples:**

```bash
# Show template paths for default schema
clearspec templates

# Show templates for custom schema
clearspec templates --schema my-workflow

# JSON for programmatic use
clearspec templates --json
```

**Output (text):**

```
Schema: spec-driven

Templates:
  proposal  → ~/.clearspec/schemas/spec-driven/templates/proposal.md
  specs     → ~/.clearspec/schemas/spec-driven/templates/specs.md
  design    → ~/.clearspec/schemas/spec-driven/templates/design.md
  tasks     → ~/.clearspec/schemas/spec-driven/templates/tasks.md
```

---

### `clearspec schemas`

List available workflow schemas with their descriptions and artifact flows.

```
clearspec schemas [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

**Example:**

```bash
clearspec schemas
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

### `clearspec schema init`

Create a new project-local schema.

```
clearspec schema init <name> [options]
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
clearspec schema init research-first

# Non-interactive with specific artifacts
clearspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

**What it creates:**

```
clearspec/schemas/<name>/
├── schema.yaml           # Schema definition
└── templates/
    ├── proposal.md       # Template for each artifact
    ├── specs.md
    ├── design.md
    └── tasks.md
```

---

### `clearspec schema fork`

Copy an existing schema to your project for customization.

```
clearspec schema fork <source> [name] [options]
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
clearspec schema fork spec-driven my-workflow
```

---

### `clearspec schema validate`

Validate a schema's structure and templates.

```
clearspec schema validate [name] [options]
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
clearspec schema validate my-workflow

# Validate all schemas
clearspec schema validate
```

---

### `clearspec schema which`

Show where a schema resolves from (useful for debugging precedence).

```
clearspec schema which [name] [options]
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
clearspec schema which spec-driven
```

**Output:**

```
spec-driven resolves from: package
  Source: /usr/local/lib/node_modules/clearspec/schemas/spec-driven
```

**Schema precedence:**

1. Project: `clearspec/schemas/<name>/`
2. User: `~/.local/share/clearspec/schemas/<name>/`
3. Package: Built-in schemas

---

## Configuration Commands

### `clearspec config`

View and modify global ClearSpec configuration.

```
clearspec config <subcommand> [options]
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
clearspec config path

# List all settings
clearspec config list

# Get a specific value
clearspec config get telemetry.enabled

# Set a value
clearspec config set telemetry.enabled false

# Set a string value explicitly
clearspec config set user.name "My Name" --string

# Remove a custom setting
clearspec config unset user.name

# Reset all configuration
clearspec config reset --all --yes

# Edit config in your editor
clearspec config edit

# Configure profile with action-based wizard
clearspec config profile

# Fast preset: switch workflows to core (keeps delivery mode)
clearspec config profile core
```

`clearspec config profile` starts with a current-state summary, then lets you choose:
- Change delivery + workflows
- Change delivery only
- Change workflows only
- Keep current settings (exit)

If you keep current settings, no changes are written and no update prompt is shown.
If there are no config changes but the current project or workspace files are out of sync with your global profile/delivery, ClearSpec will show a warning and suggest `clearspec update` for repo-local projects or `clearspec workspace update` for workspace-local guidance and skills.
Pressing `Ctrl+C` also cancels the flow cleanly (no stack trace) and exits with code `130`.
In the workflow checklist, `[x]` means the workflow is selected in global config. To apply those selections to project files, run `clearspec update` (or choose `Apply changes to this project now?` when prompted inside a project). From inside a workspace, use `clearspec workspace update` to refresh workspace-local guidance and skills; this remains skills-only for generated agent workflow files and does not generate workspace slash commands.

**Interactive examples:**

```bash
# Delivery-only update
clearspec config profile
# choose: Change delivery only
# choose delivery: Skills only

# Workflows-only update
clearspec config profile
# choose: Change workflows only
# toggle workflows in the checklist, then confirm
```

---

## Utility Commands

### `clearspec feedback`

Submit feedback about ClearSpec. Creates a GitHub issue.

```
clearspec feedback <message> [options]
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
clearspec feedback "Add support for custom artifact types" \
  --body "I'd like to define my own artifact types beyond the built-in ones."
```

---

### `clearspec completion`

Manage shell completions for the ClearSpec CLI.

```
clearspec completion <subcommand> [shell]
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
clearspec completion install

# Install for specific shell
clearspec completion install zsh

# Generate script for manual installation
clearspec completion generate bash > ~/.bash_completion.d/clearspec

# Uninstall
clearspec completion uninstall
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
| `CLEARSPEC_TELEMETRY` | Set to `0` to disable telemetry |
| `DO_NOT_TRACK` | Set to `1` to disable telemetry (standard DNT signal) |
| `CLEARSPEC_CONCURRENCY` | Default concurrency for bulk validation (default: 6) |
| `EDITOR` or `VISUAL` | Editor for `clearspec config edit` |
| `NO_COLOR` | Disable color output when set |

---

## Related Documentation

- [Commands](commands.md) - AI slash commands (`/clsx:propose`, `/clsx:apply`, etc.)
- [Workflows](workflows.md) - Common patterns and when to use each command
- [Customization](customization.md) - Create custom schemas and templates
- [Getting Started](getting-started.md) - First-time setup guide
