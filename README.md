<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_bg.png">
      <img src="assets/openspec_bg.png" alt="OpenSpec logo">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@fission-ai/openspec"><img alt="npm version" src="https://img.shields.io/npm/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/discord/1411657095639601154?style=flat-square&logo=discord&logoColor=white&label=Discord&suffix=%20online" /></a>
</p>

<details>
<summary><strong>The most loved spec framework.</strong></summary>

[![Stars](https://img.shields.io/github/stars/Fission-AI/OpenSpec?style=flat-square&label=Stars)](https://github.com/Fission-AI/OpenSpec/stargazers)
[![Downloads](https://img.shields.io/npm/dm/@fission-ai/openspec?style=flat-square&label=Downloads/mo)](https://www.npmjs.com/package/@fission-ai/openspec)
[![Contributors](https://img.shields.io/github/contributors/Fission-AI/OpenSpec?style=flat-square&label=Contributors)](https://github.com/Fission-AI/OpenSpec/graphs/contributors)

</details>
<p></p>
Our philosophy:

```text
→ fluid not rigid
→ iterative not waterfall
→ easy not complex
→ built for brownfield not just greenfield
→ scalable from personal projects to enterprises
```

> [!TIP]
> **New workflow now available!** We've rebuilt OpenSpec with a new artifact-guided workflow.
>
> Run `/opsx:propose "your idea"` to get started. → [Learn more here](docs/opsx.md)

<p align="center">
  Follow <a href="https://x.com/0xTab">@0xTab on X</a> for updates · Join the <a href="https://discord.gg/YctCnvvshC">OpenSpec Discord</a> for help and questions.
</p>

### Teams

Using OpenSpec in a team? [Email here](mailto:teams@openspec.dev) for access to our Slack channel.

<!-- TODO: Add GIF demo of /opsx:propose → /opsx:archive workflow -->

## See it in action

```text
You: /opsx:propose add-dark-mode
AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!

You: /opsx:apply
AI:  Implementing tasks...
     ✓ 1.1 Add theme context provider
     ✓ 1.2 Create toggle component
     ✓ 2.1 Add CSS variables
     ✓ 2.2 Wire up localStorage
     All tasks complete!

You: /opsx:archive
AI:  Archived to openspec/changes/archive/2025-01-23-add-dark-mode/
     Specs updated. Ready for the next feature.
```

<details>
<summary><strong>OpenSpec Dashboard</strong></summary>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="OpenSpec dashboard preview" width="90%">
</p>

</details>

## Quick Start

**Requires Node.js 20.19.0 or higher.**

Install OpenSpec globally:

```bash
npm install -g @fission-ai/openspec@latest
```

Then navigate to your project directory and initialize:

```bash
cd your-project
openspec init
```

Now tell your AI: `/opsx:propose <what-you-want-to-build>`

If you want the expanded workflow (`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:sync`, `/opsx:bulk-archive`, `/opsx:onboard`), select it with `openspec config profile` and apply with `openspec update`.

> [!NOTE]
> Not sure if your tool is supported? [View the full list](docs/supported-tools.md) – we support 20+ tools and growing.
>
> Also works with pnpm, yarn, bun, and nix. [See installation options](docs/installation.md).

## Docs

→ **[Getting Started](docs/getting-started.md)**: first steps<br>
→ **[Workflows](docs/workflows.md)**: combos and patterns<br>
→ **[Commands](docs/commands.md)**: slash commands & skills<br>
→ **[CLI](docs/cli.md)**: terminal reference<br>
→ **[Supported Tools](docs/supported-tools.md)**: tool integrations & install paths<br>
→ **[Concepts](docs/concepts.md)**: how it all fits<br>
→ **[Multi-Language](docs/multi-language.md)**: multi-language support<br>
→ **[Customization](docs/customization.md)**: make it yours


## Why OpenSpec?

AI coding assistants are powerful but unpredictable when requirements live only in chat history. OpenSpec adds a lightweight spec layer so you agree on what to build before any code is written.

- **Agree before you build** — human and AI align on specs before code gets written
- **Stay organized** — each change gets its own folder with proposal, specs, design, and tasks
- **Work fluidly** — update any artifact anytime, no rigid phase gates
- **Use your tools** — works with 20+ AI assistants via slash commands

### How we compare

**vs. [Spec Kit](https://github.com/github/spec-kit)** (GitHub) — Thorough but heavyweight. Rigid phase gates, lots of Markdown, Python setup. OpenSpec is lighter and lets you iterate freely.

**vs. [Kiro](https://kiro.dev)** (AWS) — Powerful but you're locked into their IDE and limited to Claude models. OpenSpec works with the tools you already use.

**vs. nothing** — AI coding without specs means vague prompts and unpredictable results. OpenSpec brings predictability without the ceremony.

## Updating OpenSpec

**Upgrade the package**

```bash
npm install -g @fission-ai/openspec@latest
```

**Refresh agent instructions**

Run this inside each project to regenerate AI guidance and ensure the latest slash commands are active:

```bash
openspec update
```

## Plugins

OpenSpec supports a plugin system for extending lifecycle hooks, gate types, and schemas without modifying core.

### Quick Start

1. Create a plugin directory with a manifest:

```
openspec/plugins/my-plugin/
  plugin.yaml
  hooks/
    my-hook.md
```

2. Define `plugin.yaml`:

```yaml
name: my-plugin
version: 1.0.0
description: My custom lifecycle hooks
openspec: ">=1.2.0"

hooks:
  archive.post:
    - id: notify
      handler:
        type: command
        run: "echo 'Archived ${OPENSPEC_CHANGE_NAME}'"
```

3. Enable in `openspec/config.yaml`:

```yaml
schema: spec-driven
plugins:
  - my-plugin
```

4. Verify: `openspec plugin list`

### Plugin Manifest (`plugin.yaml`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Plugin name |
| `version` | string | Yes | Semver version |
| `description` | string | No | Brief description |
| `openspec` | string | No | Compatible OpenSpec version range (e.g., `">=1.2.0"`) |
| `schemas` | string[] | No | Schema names bundled in `schemas/` subdirectory |
| `config` | object | No | Config schema (category → field → {type, required, default}) |
| `hooks` | object | No | Lifecycle hooks by hook point |
| `gates` | GateDefinition[] | No | Custom gate types for schema `apply.gates` |
| `skill_overlays` | object | No | Content to inject into generated skills/commands per workflow |

### Hook Points

| Hook Point | When | Use Case |
|------------|------|----------|
| `propose.pre` | Before proposal creation | Pre-checks |
| `propose.post` | After proposal creation | Notifications |
| `apply.pre` | Before apply phase | Git branch creation, env setup |
| `apply.post` | After all tasks complete | Cleanup, notifications |
| `archive.pre` | Before archive operation | Validation, blocking checks |
| `archive.post` | After archive completes | Obsidian sync, git cleanup |

### Handler Types

Hooks and gates support three handler types:

- **`command`** — Execute a shell command. Exit code 0 = success.
- **`prompt`** — Output a markdown prompt for the AI agent to execute.
- **`both`** — Run a command first, then output a prompt with `{{command_output}}`.

```yaml
hooks:
  archive.post:
    # Shell command (deterministic)
    - id: git-cleanup
      handler:
        type: command
        run: "git branch -d feature/${OPENSPEC_CHANGE_NAME}"
        ignore_failure: true

    # AI prompt (judgment-based)
    - id: obsidian-sync
      handler:
        type: prompt
        file: hooks/obsidian-sync.md
```

### Environment Variables

Command handlers receive these environment variables:

| Variable | Description |
|----------|-------------|
| `OPENSPEC_CHANGE_NAME` | Change name |
| `OPENSPEC_CHANGE_DIR` | Absolute path to change directory |
| `OPENSPEC_SCHEMA` | Schema name |
| `OPENSPEC_PROJECT_ROOT` | Absolute path to project root |
| `OPENSPEC_PHASE` | Current phase (propose, apply, archive) |
| `OPENSPEC_HOOK_POINT` | Hook point (e.g., archive.post) |
| `OPENSPEC_ARCHIVE_DIR` | Archive destination (archive.post only) |

Plugin config values are available as `OPENSPEC_PLUGIN_CONFIG_{CATEGORY}_{FIELD}`.

### Plugin Config

Plugins can declare configuration requirements. Users provide values in `config.yaml`:

```yaml
# plugin.yaml
config:
  obsidian:
    vault:
      type: string
      required: true
    target_pattern:
      type: string
      default: "modules/{module}"

# config.yaml
plugins:
  - my-plugin
plugin_config:
  my-plugin:
    obsidian:
      vault: "my-specs"
```

### Skill Overlays

Plugins can inject content into generated skill and command files. When `openspec update` runs, overlay content is appended to the corresponding workflow's output.

```yaml
# plugin.yaml
skill_overlays:
  apply:
    append: overlays/apply-orchestration.md
  explore:
    append: overlays/explore-research.md
```

Create the overlay files in your plugin directory:

```
my-plugin/
  plugin.yaml
  overlays/
    apply-orchestration.md    # Appended to the apply skill/command
    explore-research.md       # Appended to the explore skill/command
```

After `openspec update --force`, the generated skill files include the overlay content. Multiple plugins' overlays are appended in whitelist order. Missing overlay files produce a warning but don't block generation.

Currently only `append` is supported. Future versions may add `prepend` and `replace_section`.

### Plugin-Provided Schemas and Gates

Plugins can bundle schemas in a `schemas/` subdirectory and custom gate types. See `openspec plugin info <name>` for details on any installed plugin.

### Resolution Order

Plugins resolve from three locations (highest priority first):

1. **Project-local**: `openspec/plugins/<name>/`
2. **User-global**: `~/.local/share/openspec/plugins/<name>/`
3. **Package built-in**: `<openspec-package>/plugins/<name>/`

Only plugins listed in `config.yaml`'s `plugins` array are loaded. Order in the array determines hook execution order.

### CLI Commands

```bash
openspec plugin list          # Show all available plugins
openspec plugin list --json   # Machine-readable output
openspec plugin info <name>   # Detailed plugin information
```

## Orchestration

OpenSpec supports parallel execution hints via `--subagents` and `--teams` flags. The CLI declares WHAT can be parallel; the AI harness decides HOW.

### Flags

```bash
openspec instructions apply --change my-change --subagents --json
openspec instructions apply --change my-change --teams --json
```

Flags are mutually exclusive and available on all `openspec instructions <phase>` commands.

### Plugin Orchestration Declaration

Plugins declare parallel capabilities on gates and hooks:

```yaml
# plugin.yaml
gates:
  - id: claude-review
    handler:
      type: prompt
      file: gates/claude-review.md
    orchestration:
      parallel_with: ["codex-review"]   # Can run alongside codex-review
      preferred_mode: teams              # Suggest teams mode

  - id: codex-review
    handler:
      type: prompt
      file: gates/codex-review.md
    orchestration:
      parallel_with: ["claude-review"]   # Bidirectional declaration required
      preferred_mode: teams
```

Both sides must declare `parallel_with` (bidirectional). Unidirectional declarations emit a warning and default to sequential.

### Schema Orchestration Override

Schemas can override plugin declarations at the project level:

```yaml
# schema.yaml
apply:
  orchestration:
    parallel_groups:
      - gates: ["claude-review", "codex-review"]
        parallel: true
        mode: teams
        synthesis: require-both-pass    # Both must pass
```

### Two-Layer Resolution

```
User flag (--teams)  →  mode only, doesn't force parallel grouping
         ↓
Schema orchestration →  final decision on parallel groups + synthesis
         ↓
Plugin declaration   →  default capabilities (parallel_with)
         ↓
Default              →  sequential execution
```

Schema always wins. Plugin is the default when schema is silent.

### Task Group Parallelism

Tasks in `tasks.md` are grouped by `## N.` section headers:

- **Intra-group**: Tasks within a group run in parallel (`parallel: true`)
- **Inter-group**: Sequential by default (group N depends on N-1)
- **Explicit parallel**: Add `<!-- parallel-with: 1 -->` in a section header to override

Domain tags `[domain: backend]` enable `--teams` assignment to specialized agents.

### Gate Result Persistence

Gate results are written to `.gates/` in the change directory (gitignored):

```
openspec/changes/my-change/
└── .gates/
    ├── claude-review.json
    ├── codex-review.json
    └── synthesis.json
```

### Synthesis Strategies

| Strategy | Behavior |
|----------|----------|
| `require-both-pass` | All gates in the group must pass |
| `any-pass` | At least one gate must pass |
| `majority` | More than half must pass |

## Usage Notes

**Model selection**: OpenSpec works best with high-reasoning models. We recommend Opus 4.5 and GPT 5.2 for both planning and implementation.

**Context hygiene**: OpenSpec benefits from a clean context window. Clear your context before starting implementation and maintain good context hygiene throughout your session.

## Contributing

**Small fixes** — Bug fixes, typo corrections, and minor improvements can be submitted directly as PRs.

**Larger changes** — For new features, significant refactors, or architectural changes, please submit an OpenSpec change proposal first so we can align on intent and goals before implementation begins.

When writing proposals, keep the OpenSpec philosophy in mind: we serve a wide variety of users across different coding agents, models, and use cases. Changes should work well for everyone.

**AI-generated code is welcome** — as long as it's been tested and verified. PRs containing AI-generated code should mention the coding agent and model used (e.g., "Generated with Claude Code using claude-opus-4-5-20251101").

### Development

- Install dependencies: `pnpm install`
- Build: `pnpm run build`
- Test: `pnpm test`
- Develop CLI locally: `pnpm run dev` or `pnpm run dev:cli`
- Conventional commits (one-line): `type(scope): subject`

## Other

<details>
<summary><strong>Telemetry</strong></summary>

OpenSpec collects anonymous usage stats.

We collect only command names and version to understand usage patterns. No arguments, paths, content, or PII. Automatically disabled in CI.

**Opt-out:** `export OPENSPEC_TELEMETRY=0` or `export DO_NOT_TRACK=1`

</details>

<details>
<summary><strong>Maintainers & Advisors</strong></summary>

See [MAINTAINERS.md](MAINTAINERS.md) for the list of core maintainers and advisors who help guide the project.

</details>



## License

MIT
