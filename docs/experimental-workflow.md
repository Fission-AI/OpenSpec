# Experimental Workflow (OPSX)

> **Status:** Experimental. Things might break. Feedback welcome on [Discord](https://discord.gg/BYjPaKbqMt).
>
> **Compatibility:** Claude Code only (for now)

## What Is It?

OPSX is a new way to work with OpenSpec changes. Instead of one big proposal, you build **artifacts** step-by-step:

```
proposal → specs → design → tasks → implementation → archive
```

Each artifact has dependencies. Can't write tasks until you have specs. Can't implement until you have tasks. The system tracks what's ready and what's blocked.

## Setup

```bash
# 1. Make sure you have openspec installed and initialized
openspec init

# 2. Generate the experimental skills
openspec artifact-experimental-setup
```

This creates skills in `.claude/skills/` that Claude Code auto-detects.

## Commands

| Command | What it does |
|---------|--------------|
| `/opsx:new` | Start a new change |
| `/opsx:continue` | Create the next artifact |
| `/opsx:ff` | Fast-forward (create all artifacts at once) |
| `/opsx:apply` | Implement the tasks |
| `/opsx:sync` | Sync delta specs to main specs |
| `/opsx:archive` | Archive when done |

## Usage

### Start a new change
```
/opsx:new
```
You'll be asked what you want to build and which workflow schema to use.

### Build artifacts step-by-step
```
/opsx:continue
```
Creates one artifact at a time. Good for reviewing each step.

### Or fast-forward
```
/opsx:ff add-dark-mode
```
Creates all artifacts in one go. Good when you know what you want.

### Implement
```
/opsx:apply
```
Works through tasks, checking them off as you go.

### Sync specs and archive
```
/opsx:sync      # Update main specs with your delta specs
/opsx:archive   # Move to archive when done
```

## What's Different?

**Standard workflow** (`/openspec:proposal`):
- One big proposal document
- Linear phases: plan → implement → archive
- All-or-nothing artifact creation

**Experimental workflow** (`/opsx:*`):
- Discrete artifacts with dependencies
- Fluid actions (not phases) - update artifacts anytime
- Step-by-step or fast-forward
- Schema-driven (can customize the workflow)

The key insight: work isn't linear. You implement, realize the design is wrong, update it, continue. OPSX supports this.

## Schemas

Schemas define what artifacts exist and their dependencies. Currently available:

- **spec-driven** (default): proposal → specs → design → tasks
- **tdd**: tests → implementation → docs

Run `openspec schemas` to see available schemas.

## Tips

- Use `/opsx:ff` when you have a clear idea, `/opsx:continue` when exploring
- Tasks track progress via checkboxes in `tasks.md`
- Delta specs (in `specs/`) get synced to main specs with `/opsx:sync`
- If you get stuck, the status command shows what's blocked: `openspec status --change "name"`

## Feedback

This is rough. That's intentional - we're learning what works.

Found a bug? Have ideas? Join us on [Discord](https://discord.gg/BYjPaKbqMt) or open an issue on [GitHub](https://github.com/Fission-AI/openspec/issues).
