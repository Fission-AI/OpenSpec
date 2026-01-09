# Experimental Workflow (OPSX)

> **Status:** Experimental. Things might break. Feedback welcome on [Discord](https://discord.gg/BYjPaKbqMt).
>
> **Compatibility:** Claude Code only (for now)

## What Is It?

OPSX is a **fluid, iterative workflow** for OpenSpec changes. No more rigid phases — just actions you can take anytime.

## Why We Built This

The standard OpenSpec workflow works, but it's **hard to improve**:

- **Instructions are hardcoded** — buried in TypeScript strings, changing them requires code changes and a release
- **All-or-nothing** — one big command creates everything, hard to test individual pieces
- **Fixed structure** — same workflow for everyone, no way to customize for your team's needs
- **Opaque failures** — when something goes wrong, hard to know which part of the instructions failed

We needed a system where we could:

1. **Experiment with instructions** — try different prompts, see what works better
2. **Test granularly** — validate each artifact's instructions independently
3. **Customize workflows** — let teams define their own artifacts and dependencies
4. **Iterate quickly** — change a template, test it immediately, no rebuild needed

**OPSX makes the instruction system itself hackable:**

```
Standard workflow:                    OPSX:
┌────────────────────────┐           ┌────────────────────────┐
│  Hardcoded TypeScript  │           │  schema.yaml           │◄── Edit this
│  strings               │           │  templates/*.md        │◄── Or this
│        ↓               │           │        ↓               │
│  Rebuild package       │           │  Instant effect        │
│        ↓               │           │        ↓               │
│  Release new version   │           │  Test immediately      │
│        ↓               │           │                        │
│  Users upgrade         │           │  No release needed     │
└────────────────────────┘           └────────────────────────┘
```

This matters because **we're still learning what works**. Different instruction styles, different artifact structures, different dependency graphs — we need to be able to try things quickly. OPSX is the foundation for that experimentation.

## The User Experience

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

## Architecture Deep Dive

This section explains how OPSX works under the hood and how it compares to the standard workflow.

### Philosophy: Phases vs Actions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STANDARD WORKFLOW                                    │
│                    (Phase-Locked, All-or-Nothing)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│   │   PLANNING   │ ───► │ IMPLEMENTING │ ───► │   ARCHIVING  │             │
│   │    PHASE     │      │    PHASE     │      │    PHASE     │             │
│   └──────────────┘      └──────────────┘      └──────────────┘             │
│         │                     │                     │                       │
│         ▼                     ▼                     ▼                       │
│   /openspec:proposal   /openspec:apply      /openspec:archive              │
│                                                                             │
│   • Creates ALL artifacts at once                                          │
│   • Can't go back to update specs during implementation                    │
│   • Phase gates enforce linear progression                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                            OPSX WORKFLOW                                     │
│                      (Fluid Actions, Iterative)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              ┌────────────────────────────────────────────┐                 │
│              │           ACTIONS (not phases)             │                 │
│              │                                            │                 │
│              │   new ◄──► continue ◄──► apply ◄──► sync   │                 │
│              │    │          │           │          │     │                 │
│              │    └──────────┴───────────┴──────────┘     │                 │
│              │              any order                     │                 │
│              └────────────────────────────────────────────┘                 │
│                                                                             │
│   • Create artifacts one at a time OR fast-forward                         │
│   • Update specs/design/tasks during implementation                        │
│   • Dependencies enable progress, phases don't exist                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Standard workflow** uses hardcoded templates in TypeScript:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STANDARD WORKFLOW COMPONENTS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Hardcoded Templates (TypeScript strings)                                  │
│                    │                                                        │
│                    ▼                                                        │
│   Configurators (18+ classes, one per editor)                               │
│                    │                                                        │
│                    ▼                                                        │
│   Generated Command Files (.claude/commands/openspec/*.md)                  │
│                                                                             │
│   • Fixed structure, no artifact awareness                                  │
│   • Change requires code modification + rebuild                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**OPSX** uses external schemas and a dependency graph engine:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OPSX COMPONENTS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Schema Definitions (YAML)                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  name: spec-driven                                                  │   │
│   │  artifacts:                                                         │   │
│   │    - id: proposal                                                   │   │
│   │      generates: proposal.md                                         │   │
│   │      requires: []              ◄── Dependencies                     │   │
│   │    - id: specs                                                      │   │
│   │      generates: specs/**/*.md  ◄── Glob patterns                    │   │
│   │      requires: [proposal]      ◄── Enables after proposal           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                    │                                                        │
│                    ▼                                                        │
│   Artifact Graph Engine                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  • Topological sort (dependency ordering)                           │   │
│   │  • State detection (filesystem existence)                           │   │
│   │  • Rich instruction generation (templates + context)                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                    │                                                        │
│                    ▼                                                        │
│   Skill Files (.claude/skills/openspec-*/SKILL.md)                          │
│                                                                             │
│   • Cross-editor compatible (Claude Code, Cursor, Windsurf)                 │
│   • Skills query CLI for structured data                                    │
│   • Fully customizable via schema files                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dependency Graph Model

Artifacts form a directed acyclic graph (DAG). Dependencies are **enablers**, not gates:

```
                              proposal
                             (root node)
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
                 specs                       design
              (requires:                  (requires:
               proposal)                   proposal)
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                               tasks
                           (requires:
                           specs, design)
                                  │
                                  ▼
                          ┌──────────────┐
                          │ APPLY PHASE  │
                          │ (requires:   │
                          │  tasks)      │
                          └──────────────┘
```

**State transitions:**

```
   BLOCKED ────────────────► READY ────────────────► DONE
      │                        │                       │
   Missing                  All deps               File exists
   dependencies             are DONE               on filesystem
```

### Information Flow

**Standard workflow** — agent receives static instructions:

```
  User: "/openspec:proposal"
           │
           ▼
  ┌─────────────────────────────────────────┐
  │  Static instructions:                   │
  │  • Create proposal.md                   │
  │  • Create tasks.md                      │
  │  • Create design.md                     │
  │  • Create specs/*.md                    │
  │                                         │
  │  No awareness of what exists or         │
  │  dependencies between artifacts         │
  └─────────────────────────────────────────┘
           │
           ▼
  Agent creates ALL artifacts in one go
```

**OPSX** — agent queries for rich context:

```
  User: "/opsx:continue"
           │
           ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Step 1: Query current state                                             │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  $ openspec status --change "add-auth" --json                      │  │
  │  │                                                                    │  │
  │  │  {                                                                 │  │
  │  │    "artifacts": [                                                  │  │
  │  │      {"id": "proposal", "status": "done"},                         │  │
  │  │      {"id": "specs", "status": "ready"},      ◄── First ready      │  │
  │  │      {"id": "design", "status": "ready"},                          │  │
  │  │      {"id": "tasks", "status": "blocked", "missingDeps": ["specs"]}│  │
  │  │    ]                                                               │  │
  │  │  }                                                                 │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                          │
  │  Step 2: Get rich instructions for ready artifact                        │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  $ openspec instructions specs --change "add-auth" --json          │  │
  │  │                                                                    │  │
  │  │  {                                                                 │  │
  │  │    "template": "# Specification\n\n## ADDED Requirements...",      │  │
  │  │    "dependencies": [{"id": "proposal", "path": "...", "done": true}│  │
  │  │    "unlocks": ["tasks"]                                            │  │
  │  │  }                                                                 │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                          │
  │  Step 3: Read dependencies → Create ONE artifact → Show what's unlocked  │
  └──────────────────────────────────────────────────────────────────────────┘
```

### Iteration Model

**Standard workflow** — awkward to iterate:

```
  ┌─────────┐     ┌─────────┐     ┌─────────┐
  │/proposal│ ──► │ /apply  │ ──► │/archive │
  └─────────┘     └─────────┘     └─────────┘
       │               │
       │               ├── "Wait, the design is wrong"
       │               │
       │               ├── Options:
       │               │   • Edit files manually (breaks context)
       │               │   • Abandon and start over
       │               │   • Push through and fix later
       │               │
       │               └── No official "go back" mechanism
       │
       └── Creates ALL artifacts at once
```

**OPSX** — natural iteration:

```
  /opsx:new ───► /opsx:continue ───► /opsx:apply ───► /opsx:archive
      │                │                  │
      │                │                  ├── "The design is wrong"
      │                │                  │
      │                │                  ▼
      │                │            Just edit design.md
      │                │            and continue!
      │                │                  │
      │                │                  ▼
      │                │         /opsx:apply picks up
      │                │         where you left off
      │                │
      │                └── Creates ONE artifact, shows what's unlocked
      │
      └── Scaffolds change, waits for direction
```

### Custom Schemas

Create your own workflow by adding a schema to `~/.local/share/openspec/schemas/`:

```
~/.local/share/openspec/schemas/research-first/
├── schema.yaml
└── templates/
    ├── research.md
    ├── proposal.md
    └── tasks.md

schema.yaml:
┌─────────────────────────────────────────────────────────────────┐
│  name: research-first                                           │
│  artifacts:                                                     │
│    - id: research        # Added before proposal                │
│      generates: research.md                                     │
│      requires: []                                               │
│                                                                 │
│    - id: proposal                                               │
│      generates: proposal.md                                     │
│      requires: [research]  # Now depends on research            │
│                                                                 │
│    - id: tasks                                                  │
│      generates: tasks.md                                        │
│      requires: [proposal]                                       │
└─────────────────────────────────────────────────────────────────┘

Dependency Graph:

   research ──► proposal ──► tasks
```

### Summary

| Aspect | Standard | OPSX |
|--------|----------|------|
| **Templates** | Hardcoded TypeScript | External YAML + Markdown |
| **Dependencies** | None (all at once) | DAG with topological sort |
| **State** | Phase-based mental model | Filesystem existence |
| **Customization** | Edit source, rebuild | Create schema.yaml |
| **Iteration** | Phase-locked | Fluid, edit anything |
| **Editor Support** | 18+ configurator classes | Single skills directory |

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
