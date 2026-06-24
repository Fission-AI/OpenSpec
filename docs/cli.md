# CLI Reference

The OpenSpec CLI (`openspec`) provides terminal commands for project setup, validation, status inspection, and management. These commands complement the AI slash commands (like `/opsx:propose`) documented in [Commands](commands.md).

## Summary

| Category | Commands | Purpose |
|----------|----------|---------|
| **Setup** | `init`, `update` | Initialize and update OpenSpec in your project |
| **Stores (standalone OpenSpec repos)** | `store setup`, `store register`, `store unregister`, `store remove`, `store list`, `store doctor` | Manage stores — standalone OpenSpec repos you've registered |
| **Health** | `doctor` | Report relationship health for the resolved root |
| **Working context** | `context` | Assemble the working set (root + referenced stores) |
| **Personal worksets** | `workset create`, `workset list`, `workset open`, `workset remove` | Keep and open personal, local working views in your tool |
| **Browsing** | `list`, `view`, `show` | Explore changes and specs |
| **Validation** | `validate` | Check changes and specs for issues |
| **Lifecycle** | `archive` | Finalize completed changes |
| **Workflow** | `new change`, `status`, `instructions`, `templates`, `schemas` | Artifact-driven workflow support |
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
| `openspec init` | Initialize project (interactive prompts) |
| `openspec view` | Interactive dashboard |
| `openspec workset open <name>` | Open a saved workset (editor window or terminal agent session) |
| `openspec config edit` | Open config in editor |
| `openspec feedback` | Submit feedback via GitHub |
| `openspec completion install` | Install shell completions |

### Agent-Compatible Commands

These commands support `--json` output for programmatic use by AI agents and scripts:

| Command | Human Use | Agent Use |
|---------|-----------|-----------|
| `openspec list` | Browse changes/specs | `--json` for structured data |
| `openspec show <item>` | Read content | `--json` for parsing |
| `openspec validate` | Check for issues | `--all --json` for bulk validation |
| `openspec status` | See artifact progress | `--json` for structured status |
| `openspec instructions` | Get next steps | `--json` for agent instructions |
| `openspec templates` | Find template paths | `--json` for path resolution |
| `openspec schemas` | List available schemas | `--json` for schema discovery |
| `openspec store setup <id>` | Create and register a local store | `--json` with explicit inputs for structured setup output |
| `openspec store register <path>` | Register an existing store | `--json` for structured registration output |
| `openspec store unregister <id>` | Forget a local store registration | `--json` for structured cleanup output |
| `openspec store remove <id>` | Delete a registered local store folder | `--yes --json` for non-interactive deletion |
| `openspec store list` | Browse registered stores | `--json` for structured registrations |
| `openspec store doctor` | Check local store setup | `--json` for structured diagnostics |
| `openspec new change <id>` | Create repo-local change scaffolding | `--json`, plus `--store <id>` to use a registered store as the OpenSpec root |
| `openspec workset create [name]` | Compose a personal working view | `--member <path> --json` for non-interactive composition |
| `openspec workset list` | Browse saved worksets | `--json` for structured views |
| `openspec workset remove <name>` | Delete a saved view | `--yes --json` for non-interactive removal |

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

### `openspec init`

Initialize OpenSpec in your project. Creates the folder structure and configures AI tool integrations.

Default behavior uses global config defaults: profile `core`, delivery `both`, workflows `propose, explore, apply, sync, archive`.

```
openspec init [path] [options]
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

`--profile custom` uses whatever workflows are currently selected in global config (`openspec config profile`).

**Supported tool IDs (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `codex`, `forgecode`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `junie`, `kilocode`, `kimi`, `kiro`, `lingma`, `vibe`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `windsurf`

> This list mirrors `AI_TOOLS` in `src/core/config.ts`. See [Supported Tools](supported-tools.md) for each tool's skill and command paths.

**Examples:**

```bash
# Interactive initialization
openspec init

# Initialize in a specific directory
openspec init ./my-project

# Non-interactive: configure for Claude and Cursor
openspec init --tools claude,cursor

# Configure for all supported tools
openspec init --tools all

# Override profile for this run
openspec init --profile core

# Skip prompts and auto-cleanup legacy files
openspec init --force
```

**What it creates:**

```
openspec/
├── specs/              # Your specifications (source of truth)
├── changes/            # Proposed changes
└── config.yaml         # Project configuration

.claude/skills/         # Claude Code skills (if claude selected)
.cursor/skills/         # Cursor skills (if cursor selected)
.cursor/commands/       # Cursor OPSX commands (if delivery includes commands)
... (other tool configs)
```

---

### `openspec update`

Update OpenSpec instruction files after upgrading the CLI. Re-generates AI tool configuration files using your current global profile, selected workflows, and delivery mode.

```
openspec update [path] [options]
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
npm update @fission-ai/openspec
openspec update
```

---

## Stores (standalone OpenSpec repos)

> **Beta.** Stores and the features built on them (references, working context, worksets) are new; command names, flags, file formats, and JSON output may change shape between releases. For the problem-first walkthrough, see the [stores guide](stores-beta/user-guide.md).

A store is a standalone OpenSpec repo you've registered on this machine — for example a planning repo or a contracts repo. Registering a store lets normal commands (`list`, `show`, `status`, `validate`, `new change`, `archive`, ...) act in it from anywhere by passing `--store <id>`.

### `openspec store setup`

Create and register a local store. With no arguments in a terminal,
OpenSpec guides the user through setup. Agents and scripts should pass explicit
inputs and use `--json`.

```bash
openspec store setup [id] [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--path <path>` | Folder where the store should live (for example `~/openspec/<id>`) |
| `--remote <url>` | Record the canonical remote in the new store's `store.yaml` |
| `--init-git` | Initialize a Git repository with an initial commit (default) |
| `--no-init-git` | Skip every Git action: no init, no initial commit |
| `--json` | Output JSON |

Non-interactive runs (`--json`, scripts, agents) must pass both the store id and `--path`. In an interactive terminal, setup prompts for the location with an editable suggestion in a visible, user-owned place (for example `~/openspec/<id>`); it never defaults to OpenSpec's managed data directory.

Examples:

```bash
openspec store setup
openspec store setup team-context
openspec store setup team-context --path ~/openspec/team-context --no-init-git
openspec store setup team-context --path ~/openspec/team-context --no-init-git --json
```

### `openspec store register`

Register an existing local store folder.

```bash
openspec store register [path] [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--id <id>` | Store id; defaults to store metadata or folder name |
| `--yes` | Confirm creating store identity metadata for a healthy OpenSpec root |
| `--json` | Output JSON |

### `openspec store unregister`

Forget a local store registration without deleting files.

```bash
openspec store unregister <id> [--json]
```

Use this when a store was moved, cloned somewhere else, or should no longer be
shown by OpenSpec on this machine.

### `openspec store remove`

Forget a local store registration and delete its local folder.

```bash
openspec store remove <id> [--yes] [--json]
```

`remove` shows the exact folder before deleting in an interactive terminal.
Agents, scripts, and JSON callers must pass `--yes` to confirm deletion.
OpenSpec refuses to delete a folder that does not contain matching
store metadata.

### `openspec store list`

List locally registered stores.

```bash
openspec store list [--json]
openspec store ls [--json]
```

### `openspec store doctor`

Check local store registration, metadata, and Git presence.

```bash
openspec store doctor [id] [--json]
```

Doctor is diagnostic-only; it reports missing roots, metadata mismatches, and invalid local registry state without modifying the store.

### Referencing stores from a project

A project repo can declare which stores its work draws on in `openspec/config.yaml`:

```yaml
schema: spec-driven
references:
  - team-context
```

From then on, `openspec instructions` output in that repo (both the per-artifact and `apply` surfaces, JSON and human modes) carries an index of each referenced store's specs — spec ids, a one-line summary from each spec's Purpose section, and the fetch command (`openspec show <spec-id> --type spec --store <id>`). The index is built live from the registered checkout on every run; spec content is never copied into the output.

References are read-only context. They never change where commands act: work stays in the repo's own root, and writing to a referenced store remains an explicit `--store` action. A reference that cannot be resolved (for example, a store not registered on this machine) degrades to a warning in the index with the exact fix, and instructions still generate. `openspec doctor` reports reference health in one place.

### Recording where a store is cloned from

A store can record its canonical clone source in its committed identity file, so onboarding never dead-ends at "register the store":

```bash
openspec store setup team-context --path ~/openspec/team-context \
  --remote git@github.com:acme/team-context.git
```

The remote lands in `.openspec-store/store.yaml` inside the initial commit, so every clone is born knowing it. For an existing store, edit `store.yaml` by hand and commit. `store doctor` shows the recorded remote (and the checkout's observed Git origin); setup/register sharing guidance names it; and register records the checkout's origin in the machine-local registry.

A reference declaration can carry the clone source too, so a teammate who doesn't have the store yet gets a complete, pasteable fix (`git clone <remote> <path> && openspec store register <path> --id <id>`):

```yaml
references:
  - { id: team-context, remote: "git@github.com:acme/team-context.git" }
```

Recording a remote is not sync: OpenSpec never clones, pulls, or pushes on its own.

### Declaring a default store

A repo whose planning is fully externalized — no local `openspec/specs/` or `openspec/changes/` — can declare its store once instead of passing `--store` on every command:

```yaml
# openspec/config.yaml (the only file under openspec/)
store: team-context
```

Normal commands then resolve to the declared store automatically; the root banner and JSON `root` block report `source: "declared"` with the store id, and printed hints still carry `--store <id>`. The declaration is a fallback, never an override: explicit `--store` always wins, and a directory with real planning folders ignores the pointer (with a warning). To convert a pointer repo into a local OpenSpec root, remove the `store:` line and run `openspec init` — init refuses to scaffold while the declaration is present.

## Doctor (relationship health)

One read-only question, one place: is the OpenSpec root healthy, and are the stores it references available on this machine?

```bash
openspec doctor [--store <id>] [--json]
```

The report separates root health, store metadata health (including a note when the recorded remote and the checkout's origin diverge), and reference health (the same diagnostics instructions show, with clone fixes for unresolved references). Health findings of any severity exit 0 — agents read the `status` arrays; only command failures (no root, unknown store) exit 1. Doctor never clones, syncs, or repairs. To get the assembled set itself rather than its health, use `openspec context`.

## Working context (the assembled set)

Everything this work relates to through OpenSpec declarations, in one working set: the OpenSpec root and the stores it references.

```bash
openspec context [--store <id>] [--json] [--code-workspace <path> [--force]]
```

The JSON brief is agent-consumable (each available referenced store carries its fetch recipe; unresolved members carry the same fixes instructions and doctor show). `--code-workspace` additionally writes a VS Code workspace file containing the root plus the available referenced stores (`ref:<id>` folders) — the one write this command performs, refused without `--force` if the file exists. Unavailable members are reported, never guessed at.

"Working context" is the assembled set; the `context:` field in `openspec/config.yaml` is project background injected into instructions — two different things. `openspec doctor` answers whether the set is healthy; `openspec context` answers what the set is.

## Personal worksets

> **Beta.** Worksets are part of the new beta surface; commands, flags, and file formats may change shape between releases. For the walkthrough, see the [stores guide](stores-beta/user-guide.md#worksets-reopen-the-folders-you-work-on-together).

A workset is a personal, named view of the folders you work on together — a planning root plus whatever else you choose — kept on your machine and reopened by name in your tool. It is purely local: never committed, never shared, never derived from declarations, and removing one never touches a member folder.

```bash
openspec workset create [name] [--member <path> | --member <name>=<path>]... [--tool <id>] [--json]
openspec workset list [--json]
openspec workset open <name> [--tool <id>]
openspec workset remove <name> [--yes] [--json]
```

`create` runs a short guided flow (or takes `--member` flags non-interactively; the first member is the primary — sessions start there). `open` launches the chosen tool: editors (VS Code, Cursor) open a window with every member and return; CLI agents (Claude Code, codex) take over this terminal as a session with every member attached and no prompt pre-filled, ending when you exit. A member folder missing at open time is skipped with a note; the rest opens. The saved tool preference is overridable per open with `--tool`.

Supporting a new tool is configuration, not code. Every tool is one of two launch styles — `workspace-file` (launched with the generated `.code-workspace`) or `attach-dirs` (one attach flag per member) — and the `openers` key in the global `config.json` (open it with `openspec config edit`) adds tools or adjusts built-ins per field:

```json
{
  "openers": {
    "zed": { "style": "workspace-file" },
    "claude": { "attach_flag": "--dir" }
  }
}
```

All workset state lives under the global data dir's `worksets/` folder (the saved views plus the generated `<name>.code-workspace` files, regenerated on every open); deleting that folder removes every trace.

---

## Browsing Commands

### `openspec list`

List changes or specs in your project.

```
openspec list [options]
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
openspec list

# List all specs
openspec list --specs

# JSON output for scripts
openspec list --json
```

**Output (text):**

```
Changes:
  add-dark-mode     No tasks      just now
```

---

### `openspec view`

Display an interactive dashboard for exploring specs and changes.

```
openspec view
```

Opens a terminal-based interface for navigating your project's specifications and changes.

---

### `openspec show`

Display details of a change or spec.

```
openspec show [item-name] [options]
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
openspec show

# Show a specific change
openspec show add-dark-mode

# Show a specific spec
openspec show auth --type spec

# JSON output for parsing
openspec show add-dark-mode --json
```

---

## Validation Commands

### `openspec validate`

Validate changes and specs for structural issues.

```
openspec validate [item-name] [options]
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
| `--concurrency <n>` | Max parallel validations (default: 6, or `OPENSPEC_CONCURRENCY` env) |
| `--no-interactive` | Disable prompts |

**Examples:**

```bash
# Interactive validation
openspec validate

# Validate a specific change
openspec validate add-dark-mode

# Validate all changes
openspec validate --changes

# Validate everything with JSON output (for CI/scripts)
openspec validate --all --json

# Strict validation with increased parallelism
openspec validate --all --strict --concurrency 12
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

### `openspec archive`

Archive a completed change and merge delta specs into main specs.

```
openspec archive [change-name] [options]
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
openspec archive

# Archive specific change
openspec archive add-dark-mode

# Archive without prompts (CI/scripts)
openspec archive add-dark-mode --yes

# Archive a tooling change that doesn't affect specs
openspec archive update-ci-config --skip-specs
```

**What it does:**

1. Validates the change (unless `--no-validate`)
2. Prompts for confirmation (unless `--yes`)
3. Merges delta specs into `openspec/specs/`
4. Moves change folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`

---

## Workflow Commands

These commands support the artifact-driven OPSX workflow. They're useful for both humans checking progress and agents determining next steps.

### `openspec new change`

Create a change directory and optional checked-in metadata in the resolved OpenSpec root.

```bash
openspec new change <name> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--description <text>` | Description to add to `README.md` |
| `--goal <text>` | Optional goal metadata to store with the change |
| `--schema <name>` | Workflow schema to use |
| `--store <id>` | Store id to use as the OpenSpec root (a store is a standalone OpenSpec repo you've registered) |
| `--json` | Output JSON |

Examples:

```bash
openspec new change add-billing-api
openspec new change add-billing-api --store team-context --json
```

### `openspec status`

Display artifact completion status for a change.

```
openspec status [options]
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
openspec status

# Status for specific change
openspec status --change add-dark-mode

# JSON for agent use
openspec status --change add-dark-mode --json
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

### `openspec instructions`

Get enriched instructions for creating an artifact or applying tasks. Used by AI agents to understand what to create next.

```
openspec instructions [artifact] [options]
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
openspec instructions --change add-dark-mode

# Get specific artifact instructions
openspec instructions design --change add-dark-mode

# Get apply/implementation instructions
openspec instructions apply --change add-dark-mode

# JSON for agent consumption
openspec instructions design --change add-dark-mode --json
```

**Output includes:**

- Template content for the artifact
- Project context from config
- Content from dependency artifacts
- Per-artifact rules from config

---

### `openspec templates`

Show resolved template paths for all artifacts in a schema.

```
openspec templates [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--schema <name>` | Schema to inspect (default: `spec-driven`) |
| `--json` | Output as JSON |

**Examples:**

```bash
# Show template paths for default schema
openspec templates

# Show templates for custom schema
openspec templates --schema my-workflow

# JSON for programmatic use
openspec templates --json
```

**Output (text):**

```
Schema: spec-driven

Templates:
  proposal  → ~/.openspec/schemas/spec-driven/templates/proposal.md
  specs     → ~/.openspec/schemas/spec-driven/templates/specs.md
  design    → ~/.openspec/schemas/spec-driven/templates/design.md
  tasks     → ~/.openspec/schemas/spec-driven/templates/tasks.md
```

---

### `openspec schemas`

List available workflow schemas with their descriptions and artifact flows.

```
openspec schemas [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

**Example:**

```bash
openspec schemas
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

### `openspec schema init`

Create a new project-local schema.

```
openspec schema init <name> [options]
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
openspec schema init research-first

# Non-interactive with specific artifacts
openspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

**What it creates:**

```
openspec/schemas/<name>/
├── schema.yaml           # Schema definition
└── templates/
    ├── proposal.md       # Template for each artifact
    ├── specs.md
    ├── design.md
    └── tasks.md
```

---

### `openspec schema fork`

Copy an existing schema to your project for customization.

```
openspec schema fork <source> [name] [options]
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
openspec schema fork spec-driven my-workflow
```

---

### `openspec schema validate`

Validate a schema's structure and templates.

```
openspec schema validate [name] [options]
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
openspec schema validate my-workflow

# Validate all schemas
openspec schema validate
```

---

### `openspec schema which`

Show where a schema resolves from (useful for debugging precedence).

```
openspec schema which [name] [options]
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
openspec schema which spec-driven
```

**Output:**

```
spec-driven resolves from: package
  Source: /usr/local/lib/node_modules/@fission-ai/openspec/schemas/spec-driven
```

**Schema precedence:**

1. Project: `openspec/schemas/<name>/`
2. User: `~/.local/share/openspec/schemas/<name>/`
3. Package: Built-in schemas

---

## Configuration Commands

### `openspec config`

View and modify global OpenSpec configuration.

```
openspec config <subcommand> [options]
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
openspec config path

# List all settings
openspec config list

# Get a specific value
openspec config get telemetry.enabled

# Set a value
openspec config set telemetry.enabled false

# Set a string value explicitly
openspec config set user.name "My Name" --string

# Remove a custom setting
openspec config unset user.name

# Reset all configuration
openspec config reset --all --yes

# Edit config in your editor
openspec config edit

# Configure profile with action-based wizard
openspec config profile

# Fast preset: switch workflows to core (keeps delivery mode)
openspec config profile core
```

`openspec config profile` starts with a current-state summary, then lets you choose:
- Change delivery + workflows
- Change delivery only
- Change workflows only
- Keep current settings (exit)

If you keep current settings, no changes are written and no update prompt is shown.
If there are no config changes but the current project files are out of sync with your global profile/delivery, OpenSpec will show a warning and suggest `openspec update`.
Pressing `Ctrl+C` also cancels the flow cleanly (no stack trace) and exits with code `130`.
In the workflow checklist, `[x]` means the workflow is selected in global config. To apply those selections to project files, run `openspec update` (or choose `Apply changes to this project now?` when prompted inside a project).

**Interactive examples:**

```bash
# Delivery-only update
openspec config profile
# choose: Change delivery only
# choose delivery: Skills only

# Workflows-only update
openspec config profile
# choose: Change workflows only
# toggle workflows in the checklist, then confirm
```

---

## Utility Commands

### `openspec feedback`

Submit feedback about OpenSpec. Creates a GitHub issue.

```
openspec feedback <message> [options]
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
openspec feedback "Add support for custom artifact types" \
  --body "I'd like to define my own artifact types beyond the built-in ones."
```

---

### `openspec completion`

Manage shell completions for the OpenSpec CLI.

```
openspec completion <subcommand> [shell]
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
openspec completion install

# Install for specific shell
openspec completion install zsh

# Generate script for manual installation
openspec completion generate bash > ~/.bash_completion.d/openspec

# Uninstall
openspec completion uninstall
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
| `OPENSPEC_TELEMETRY` | Set to `0` to disable telemetry |
| `DO_NOT_TRACK` | Set to `1` to disable telemetry (standard DNT signal) |
| `OPENSPEC_CONCURRENCY` | Default concurrency for bulk validation (default: 6) |
| `EDITOR` or `VISUAL` | Editor for `openspec config edit` |
| `NO_COLOR` | Disable color output when set |

---

## Related Documentation

- [Commands](commands.md) - AI slash commands (`/opsx:propose`, `/opsx:apply`, etc.)
- [Workflows](workflows.md) - Common patterns and when to use each command
- [Customization](customization.md) - Create custom schemas and templates
- [Getting Started](getting-started.md) - First-time setup guide
