# Experimental Workflow (OPSX)

> **Status:** Experimental. Things might break. Feedback welcome on [Discord](https://discord.gg/BYjPaKbqMt).
>
> **Compatibility:** Claude Code only (for now)

## What Is It?

OPSX is a **fluid, iterative workflow** for OpenSpec changes. No more rigid phases — just actions you can take anytime.

**The problem with linear workflows:**
You're "in planning phase", then "in implementation phase", then "done". But real work doesn't work that way. You implement something, realize your design was wrong, need to update specs, continue implementing. Linear phases fight against how work actually happens.

**OPSX approach:**
- **Actions, not phases** — create, implement, update, archive — do any of them anytime
- **Dependencies are enablers** — they show what's possible, not what's required next
- **Update as you learn** — halfway through implementation? Go back and fix the design. That's normal.

```
You can always go back:

     ┌────────────────────────────────────┐
     │                                    │
     ▼                                    │
  proposal ──→ specs ──→ design ──→ tasks ──→ implement
     ▲           ▲          ▲               │
     │           │          │               │
     └───────────┴──────────┴───────────────┘
              update as you learn
```

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
| `/opsx:continue` | Create the next artifact (based on what's ready) |
| `/opsx:ff` | Fast-forward — create all planning artifacts at once |
| `/opsx:apply` | Implement tasks, updating artifacts as needed |
| `/opsx:sync` | Sync delta specs to main specs |
| `/opsx:archive` | Archive when done |

## Usage

### Start a new change
```
/opsx:new
```
You'll be asked what you want to build and which workflow schema to use.

### Create artifacts
```
/opsx:continue
```
Shows what's ready to create based on dependencies, then creates one artifact. Use repeatedly to build up your change incrementally.

```
/opsx:ff add-dark-mode
```
Creates all planning artifacts at once. Use when you have a clear picture of what you're building.

### Implement (the fluid part)
```
/opsx:apply
```
Works through tasks, checking them off as you go. **Key difference:** if you discover issues during implementation, you can update your specs, design, or tasks — then continue. No phase gates.

### Finish up
```
/opsx:sync      # Update main specs with your delta specs
/opsx:archive   # Move to archive when done
```

## What's Different?

| | Standard (`/openspec:proposal`) | Experimental (`/opsx:*`) |
|---|---|---|
| **Structure** | One big proposal document | Discrete artifacts with dependencies |
| **Workflow** | Linear phases: plan → implement → archive | Fluid actions — do anything anytime |
| **Iteration** | Awkward to go back | Update artifacts as you learn |
| **Customization** | Fixed structure | Schema-driven (define your own artifacts) |

**The key insight:** work isn't linear. OPSX stops pretending it is.

## Schemas

Schemas define what artifacts exist and their dependencies. Currently available:

- **spec-driven** (default): proposal → specs → design → tasks
- **tdd**: tests → implementation → docs

Run `openspec schemas` to see available schemas.

## Tips

- `/opsx:ff` when you know what you want, `/opsx:continue` when exploring
- During `/opsx:apply`, if something's wrong — fix the artifact, then continue
- Tasks track progress via checkboxes in `tasks.md`
- Check status anytime: `openspec status --change "name"`

## Feedback

This is rough. That's intentional — we're learning what works.

Found a bug? Have ideas? Join us on [Discord](https://discord.gg/BYjPaKbqMt) or open an issue on [GitHub](https://github.com/Fission-AI/openspec/issues).
