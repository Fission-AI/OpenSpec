# pastelsdd

> Spec-driven, AI-native development workflow CLI

[![npm](https://img.shields.io/npm/v/@thiagodiogo/pastelsdd)](https://www.npmjs.com/package/@thiagodiogo/pastelsdd)
[![license](https://img.shields.io/npm/l/@thiagodiogo/pastelsdd)](LICENSE)
[![node](https://img.shields.io/node/v/@thiagodiogo/pastelsdd)](https://nodejs.org)

Pastelsdd installs a planning pipeline inside your repo. Every feature goes through **proposal → specs → design → tasks → apply**, tracked as versioned files and exposed as slash commands to your AI agent.

---

## Requirements

- Node.js `>= 20.19.0`
- At least one supported AI tool: **Claude Code**, **Cursor**, **Gemini CLI**, **GitHub Copilot**, or **Codex CLI**

---

## Install

```bash
npm install -g @thiagodiogo/pastelsdd
# or
pnpm add -g @thiagodiogo/pastelsdd
```

---

## Quick Start

```bash
cd your-project
pastelsdd init
```

The init wizard auto-detects which AI tools you have (`.claude/`, `.cursor/`, etc.), installs skill files and slash commands, and creates the planning folder:

```
pastelsdd/
├── changes/        ← one subfolder per active change
│   └── archive/    ← completed changes
├── specs/          ← project capability specs
└── config.yaml     ← local schema config
```

Once initialized, use slash commands in your AI agent:

```
/pastel:propose "add dark mode"   ← creates a new change
/pastel:continue                  ← advances to the next artifact
/pastel:apply                     ← applies pending tasks
/pastel:archive                   ← archives a completed change
```

---

## How It Works

Each change lives in `pastelsdd/changes/<name>/` and follows a DAG of artifacts defined by a workflow schema:

```
pastelsdd/changes/dark-mode/
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
| `pastelsdd init [path]` | Initialize Pastelsdd in a project |
| `pastelsdd update [path]` | Regenerate skill/command files after an upgrade |
| `pastelsdd list` | List active changes |
| `pastelsdd list --specs` | List project specs |
| `pastelsdd status` | Show artifact completion for the current change |
| `pastelsdd instructions [artifact]` | Print enriched instructions for an artifact |
| `pastelsdd validate [name]` | Validate a change or spec |
| `pastelsdd validate --all` | Validate everything |
| `pastelsdd show [name]` | Display a change or spec |
| `pastelsdd archive [name]` | Archive a completed change |
| `pastelsdd new change <name>` | Create a new change directory |
| `pastelsdd schemas` | List available workflow schemas |
| `pastelsdd view` | Interactive dashboard |
| `pastelsdd feedback <message>` | Submit feedback |
| `pastelsdd completion install` | Install shell completions |

### `init` options

| Flag | Description |
|------|-------------|
| `--tools <list>` | Skip interactive selection. Use `all`, `none`, or e.g. `claude,cursor` |
| `--force` | Skip all confirmations (CI-friendly) |
| `--profile <name>` | Workflow profile: `core` (default) or `custom` |

**Non-interactive example:**

```bash
pastelsdd init --tools claude --force
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

If your project used the old `openspec` tool, `pastelsdd init` detects `.openspec/` automatically and offers to migrate your changes and specs — no manual steps needed.

---

## After Upgrading

Re-run `pastelsdd init` (or `pastelsdd update`) to regenerate skill files with the latest instructions:

```bash
pastelsdd update
```

---

## Links

- [npm](https://www.npmjs.com/package/@thiagodiogo/pastelsdd)
- [Repository](https://github.com/eipastel/pastelsdd)
- [Issues / Feedback](https://github.com/eipastel/pastelsdd/issues)
