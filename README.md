# pscode

> Spec-driven, AI-native development workflow CLI

[![npm](https://img.shields.io/npm/v/@thiagodiogo/pscode)](https://www.npmjs.com/package/@thiagodiogo/pscode)
[![license](https://img.shields.io/npm/l/@thiagodiogo/pscode)](LICENSE)
[![node](https://img.shields.io/node/v/@thiagodiogo/pscode)](https://nodejs.org)

Pscode installs a planning pipeline inside your repo. Every feature goes through **proposal → specs → design → tasks → apply**, tracked as versioned files and exposed as slash commands to your AI agent.

---

## Requirements

- Node.js `>= 20.19.0`
- At least one supported AI tool: **Claude Code**, **Cursor**, **Gemini CLI**, **GitHub Copilot**, or **Codex CLI**

---

## Install

```bash
npm install -g @thiagodiogo/pscode
# or
pnpm add -g @thiagodiogo/pscode
```

---

## Quick Start

```bash
cd your-project
pscode init
```

The init wizard auto-detects which AI tools you have (`.claude/`, `.cursor/`, etc.), installs skill files and slash commands, and creates the planning folder:

```
pscode/
├── changes/        ← one subfolder per active change
│   └── archive/    ← completed changes
├── specs/          ← project capability specs
└── config.yaml     ← local schema config
```

Once initialized, use slash commands in your AI agent:

```
/ps:propose "add dark mode"   ← creates a new change
/ps:continue                  ← advances to the next artifact
/ps:apply                     ← applies pending tasks
/ps:complete                  ← completes a change
```

---

## How It Works

Each change lives in `pscode/changes/<name>/` and follows a DAG of artifacts defined by a workflow schema:

```
pscode/changes/dark-mode/
├── proposal.md    ← why this change
├── specs/         ← what the system must do
├── design.md      ← how to implement it
└── tasks.md       ← implementation checklist
```

The AI agent reads these files at each step and generates the next artifact using enriched instructions from the schema.

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `pscode init [path]` | Initialize Pscode in a project |
| `pscode update [path]` | Regenerate skill/command files after an upgrade |
| `pscode list` | List active changes |
| `pscode list --specs` | List project specs |
| `pscode status` | Show artifact completion for the current change |
| `pscode instructions [artifact]` | Print enriched instructions for an artifact |
| `pscode validate [name]` | Validate a change or spec |
| `pscode validate --all` | Validate everything |
| `pscode show [name]` | Display a change or spec |
| `pscode complete [name]` | Complete a change |
| `pscode new change <name>` | Create a new change directory |
| `pscode schemas` | List available workflow schemas |
| `pscode view` | Interactive dashboard |
| `pscode feedback <message>` | Submit feedback |
| `pscode completion install` | Install shell completions |

### `init` options

| Flag | Description |
|------|-------------|
| `--tools <list>` | Skip interactive selection. Use `all`, `none`, or e.g. `claude,cursor` |
| `--force` | Skip all confirmations (CI-friendly) |
| `--profile <name>` | Workflow profile: `core` (default) or `custom` |

**Non-interactive example:**

```bash
pscode init --tools claude --force
```

---

## Supported AI Tools

| Tool | Skills dir |
|------|-----------|
| Claude Code | `.claude/` |
| Codex CLI | `.codex/` |
| Cursor | `.cursor/` |
| Gemini CLI | `.gemini/` |
| GitHub Copilot | `.github/` |

---

## Migrating from OpenSpec

If your project used the old `openspec` tool, `pscode init` detects `.openspec/` automatically and offers to migrate your changes and specs — no manual steps needed.

---

## After Upgrading

Re-run `pscode init` (or `pscode update`) to regenerate skill files with the latest instructions:

```bash
pscode update
```

---

## Links

- [npm](https://www.npmjs.com/package/@thiagodiogo/pscode)
- [Repository](https://github.com/eipastel/pscode)
- [Issues / Feedback](https://github.com/eipastel/pscode/issues)
