# POC-OpenSpec-Core Analysis

---

## Design Decisions & Terminology

### Philosophy: Not a Workflow System

This system is **not** a workflow engine. It's an **artifact tracker with dependency awareness**.

| What it's NOT | What it IS |
|---------------|------------|
| Linear step-by-step progression | Exploratory, iterative planning |
| Bureaucratic checkpoints | Enablers that unlock possibilities |
| "You must complete step 1 first" | "Here's what you could create now" |
| Form-filling | Fluid document creation |

**Key insight:** Dependencies are *enablers*, not *gates*. You can't meaningfully write a design document if there's no proposal to design from - that's not bureaucracy, it's logic.

### Terminology

| Term | Definition | Example |
|------|------------|---------|
| **Change** | A unit of work being planned (feature, refactor, migration) | `openspec/changes/add-auth/` |
| **Schema** | An artifact graph definition (what artifacts exist, their dependencies) | `schemas/spec-driven.yaml` |
| **Artifact** | A node in the graph (a document to create) | `proposal`, `design`, `specs` |
| **Template** | Instructions/guidance for creating an artifact | `templates/proposal.md` |

### Hierarchy

```
Schema (defines) ──→ Artifacts (guided by) ──→ Templates
```

- **Schema** = the artifact graph (what exists, dependencies)
- **Artifact** = a document to produce
- **Template** = instructions for creating that artifact

### Schema Variations

Schemas can vary across multiple dimensions:

| Dimension | Examples |
|-----------|----------|
| Philosophy | `spec-driven`, `tdd`, `prototype-first` |
| Version | `v1`, `v2`, `v3` |
| Language | `en`, `zh`, `es` |
| Custom | `team-alpha`, `experimental` |

### Template Inheritance (2 Levels Max)

```
.openspec/
├── templates/                 # Shared (Level 1)
│   ├── proposal.md
│   ├── design.md
│   └── specs.md
│
└── schemas/
    └── tdd/
        ├── schema.yaml
        └── templates/         # Overrides (Level 2)
            └── tests.md       # TDD-specific
```

**Rules:**
- Shared templates are the default
- Schema-specific templates override OR add new
- A CLI command shows resolved paths (no guessing)
- No inheritance between schemas (copy if you need to diverge)
- Max 2 levels - no deeper inheritance chains

**Why this matters:**
- Avoids "where does this come from?" debugging
- No implicit magic that works until it doesn't
- Clear boundaries between shared and specific

---

## Executive Summary

This is an **artifact tracker with dependency awareness** that guides iterative development through a structured artifact pipeline. The core innovation is using the **filesystem as a database** - artifact completion is detected by file existence, making the system stateless and version-control friendly.

The system answers:
- "What artifacts exist for this change?"
- "What could I create next?" (not "what must I create")
- "What's blocking X?" (informational, not prescriptive)

---

## Core Components

### 1. ArtifactGraph

The dependency graph engine.

| Responsibility | Approach |
|----------------|----------|
| Model artifacts as a DAG | Artifact with `requires: string[]` |
| Track completion state | Sets for `completed`, `in_progress`, `failed` |
| Calculate build order | Kahn's algorithm (topological sort) |
| Find ready artifacts | Check if all dependencies are in `completed` set |

**Key Data Structures:**

```
Artifact {
  id: string
  generates: string        // e.g., "proposal.md" or "specs/*.md"
  description: string
  instruction: string      // path to template
  requires: string[]       // artifact IDs this depends on
}

ArtifactState {
  completed: Set<string>
  inProgress: Set<string>
  failed: Set<string>
}

ArtifactGraph {
  artifacts: Map<string, Artifact>
}
```

**Key Methods:**
- `fromYaml(path)` - Load artifact definitions from YAML
- `getNextArtifacts(state)` - Find artifacts ready to create
- `getBuildOrder()` - Topological sort of all artifacts
- `isComplete(state)` - Check if all artifacts done

---

### 2. ChangeManager

Multi-change orchestration layer. **CLI is fully deterministic** - no "active change" tracking.

| Responsibility | Approach |
|----------------|----------|
| CRUD changes | Create dirs under `openspec/changes/<name>/` |
| Template fallback | Schema-specific → Shared (2 levels max) |

**Key Paths:**

```
.openspec/schemas/         → Schema definitions (artifact graphs)
.openspec/templates/       → Shared instruction templates
openspec/changes/<name>/   → Change instances with artifacts
```

**Key Methods:**
- `isInitialized()` - Check for `.openspec/` existence
- `listChanges()` - List all changes in `openspec/changes/`
- `createChange(name, description)` - Create new change directory
- `getChangePath(name)` - Get path to a change directory
- `getSchemaPath(schemaName?)` - Find schema with fallback
- `getTemplatePath(artifactId, schemaName?)` - Find template (schema → shared)

**Note:** No `getActiveChange()`, `setActiveChange()`, or `resolveChange()` - the agent infers which change from conversation context and passes it explicitly to CLI commands.

---

### 3. InstructionLoader

State detection and instruction enrichment.

| Responsibility | Approach |
|----------------|----------|
| Detect artifact completion | Scan filesystem, support glob patterns |
| Build dynamic context | Gather dependency status, change info |
| Enrich templates | Inject context into base templates |
| Generate status reports | Formatted markdown with progress |

**Key Class - ChangeState:**

```
ChangeState {
  changeName: string
  changeDir: string
  graph: ArtifactGraph
  state: ArtifactState

  // Methods
  getNextSteps(): string[]
  getStatus(artifactId): ArtifactStatus
  isComplete(): boolean
}
```

**Key Functions:**
- `getEnrichedInstructions(artifactId, projectRoot, changeName?)` - Main entry point
- `getChangeStatus(projectRoot, changeName?)` - Formatted status report
- `resolveTemplatePath(artifactId, schemaName?)` - 2-level fallback

---

### 4. CLI

User interface layer. **All commands are deterministic** - require explicit `--change` parameter.

| Command | Function |
|---------|----------|
| `status --change <id>` | Show change progress |
| `next --change <id>` | Show artifacts ready to create |
| `instructions <artifact> --change <id>` | Get enriched instructions for artifact |
| `list` | List all changes |
| `new <name>` | Create change |
| `init` | Initialize structure |
| `templates --change <id>` | Show resolved template paths |

**Note:** Commands that operate on a change require `--change`. Missing parameter → error with list of available changes. Agent infers the change from conversation and passes it explicitly.

---

### 5. Claude Commands

Integration layer for Claude Code. **Operational commands only** - artifact creation via natural language.

| Command | Purpose |
|---------|---------|
| `/status` | Show change progress |
| `/next` | Show what's ready to create |
| `/run [artifact]` | Execute a specific step (power users) |
| `/list` | List all changes |
| `/new <name>` | Create a new change |
| `/init` | Initialize structure |

**Artifact creation:** Users say "create the proposal" or "write the tests" in natural language. The agent:
1. Infers change from conversation (confirms if uncertain)
2. Infers artifact from request
3. Calls CLI with explicit `--change` parameter
4. Creates artifact following instructions

This works for ANY artifact in ANY schema - no new slash commands needed when schemas change.

**Note:** Legacy commands (`/openspec-proposal`, `/openspec-apply`, `/openspec-archive`) exist in the main project for backward compatibility but are separate from this architecture.

---

## Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌──────────────┐                    ┌────────────────────┐ │
│  │     CLI      │ ←─shell exec───────│ Claude Commands    │ │
│  └──────┬───────┘                    └────────────────────┘ │
└─────────┼───────────────────────────────────────────────────┘
          │ imports
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                       │
│  ┌────────────────────┐        ┌──────────────────────────┐ │
│  │ InstructionLoader  │───────▶│    ChangeManager         │ │
│  │                    │ uses   │                          │ │
│  └─────────┬──────────┘        └──────────────────────────┘ │
└────────────┼────────────────────────────────────────────────┘
             │ uses
             ▼
┌─────────────────────────────────────────────────────────────┐
│                      CORE LAYER                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               ArtifactGraph                          │   │
│  │                                                      │   │
│  │  Artifact ←────── ArtifactState                      │   │
│  │  (data)           (runtime state)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
             ▲
             │ reads from
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   PERSISTENCE LAYER                          │
│  ┌──────────────────┐   ┌────────────────────────────────┐  │
│  │  YAML Config     │   │  Filesystem Artifacts          │  │
│  │  - config.yaml   │   │  - proposal.md, design.md      │  │
│  │  - schema.yaml   │   │  - specs/*.md, tasks.md        │  │
│  └──────────────────┘   └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Design Patterns

### 1. Filesystem as Database

No SQLite, no JSON state files. The existence of `proposal.md` means proposal is complete.

```
// State detection is just file existence checking
if (exists(artifactPath)) {
  completed.add(artifactId)
}
```

### 2. Deterministic CLI, Inferring Agent

**CLI layer:** Always deterministic - requires explicit `--change` parameter.

```
openspec status --change add-auth     # explicit, works
openspec status                        # error: "No change specified"
```

**Agent layer:** Infers from conversation, confirms if uncertain, passes explicit `--change`.

This separation means:
- CLI is pure, testable, no state to corrupt
- Agent handles all "smartness"
- No config.yaml tracking of "active change"

### 3. Two-Level Template Fallback

```
schema-specific/templates/proposal.md
    ↓ (not found)
.openspec/templates/proposal.md (shared)
    ↓ (not found)
Error (no silent fallback to avoid confusion)
```

### 4. Glob Pattern Support

`specs/*.md` allows multiple files to satisfy a single artifact:

```
if (artifact.generates.includes("*")) {
  const parentDir = changeDir / patternParts[0]
  if (exists(parentDir) && hasFiles(parentDir)) {
    completed.add(artifactId)
  }
}
```

### 5. Stateless State Detection

Every command re-scans the filesystem. No cached state to corrupt.

---

## Artifact Pipeline (Default Schema)

The default `spec-driven` schema:

```
┌──────────┐
│ proposal │  (no dependencies)
└────┬─────┘
     │
     ▼
┌──────────┐
│  specs   │  (requires: proposal)
└────┬─────┘
     │
     ├──────────────┐
     ▼              ▼
┌──────────┐   ┌──────────┐
│  design  │   │          │
│          │◄──┤ proposal │
└────┬─────┘   └──────────┘
     │         (requires: proposal, specs)
     ▼
┌──────────┐
│  tasks   │  (requires: design)
└──────────┘
```

Other schemas (TDD, prototype-first) would have different graphs.

---

## Implementation Order

Structured as **vertical slices** - each slice is independently testable.

---

### Slice 1: "What's Ready?" (Core Query)

**Combines:** Types + Graph + State Detection

```
Input:  schema YAML path + change directory
Output: {
  completed: ['proposal'],
  ready: ['specs'],
  blocked: ['design', 'tasks'],
  buildOrder: ['proposal', 'specs', 'design', 'tasks']
}
```

**Testable behaviors:**
- Parse schema YAML → returns correct artifact graph
- Compute build order (topological sort) → correct ordering
- Empty directory → only root artifacts (no dependencies) are ready
- Directory with `proposal.md` → `specs` becomes ready
- Directory with `specs/foo.md` → glob pattern detected as complete
- All artifacts present → `isComplete()` returns true

---

### Slice 2: "Multi-Change Management"

**Delivers:** CRUD for changes, path resolution

**Testable behaviors:**
- `createChange('add-auth')` → creates directory + README
- `listChanges()` → returns directory names
- `getChangePath('add-auth')` → returns correct path
- Missing change → clear error message

---

### Slice 3: "Get Instructions" (Enrichment)

**Delivers:** Template resolution + context injection

**Testable behaviors:**
- Template fallback: schema-specific → shared → error
- Context injection: completed deps show ✓, missing show ✗
- Output path shown correctly based on change directory

---

### Slice 4: "CLI + Integration"

**Delivers:** Full command interface

**Testable behaviors:**
- Each command produces expected output
- Commands compose correctly (status → next → instructions flow)
- Error handling for missing changes, invalid artifacts, etc.

---

## Directory Structure

```
.openspec/
├── schemas/                       # Schema definitions
│   ├── spec-driven.yaml           # Default: proposal → specs → design → tasks
│   ├── spec-driven-v2.yaml        # Version 2
│   ├── tdd.yaml                   # TDD: tests → implementation → docs
│   └── tdd/
│       └── templates/             # TDD-specific template overrides
│           └── tests.md
│
└── templates/                     # Shared instruction templates
    ├── proposal.md
    ├── design.md
    ├── specs.md
    └── tasks.md

openspec/
└── changes/                       # Change instances
    ├── add-auth/
    │   ├── README.md
    │   ├── proposal.md            # Created artifacts
    │   ├── design.md
    │   └── specs/
    │       └── *.md
    │
    └── refactor-db/
        └── ...

.claude/
├── settings.local.json            # Permissions
└── commands/                      # Slash commands
    └── *.md
```

---

## Schema YAML Format

```yaml
# .openspec/schemas/spec-driven.yaml
name: spec-driven
version: 1
description: Specification-driven development

artifacts:
  - id: proposal
    generates: "proposal.md"
    description: "Create project proposal document"
    template: "proposal.md"          # resolves via 2-level fallback
    requires: []

  - id: specs
    generates: "specs/*.md"          # glob pattern
    description: "Create technical specification documents"
    template: "specs.md"
    requires:
      - proposal

  - id: design
    generates: "design.md"
    description: "Create design document"
    template: "design.md"
    requires:
      - proposal
      - specs

  - id: tasks
    generates: "tasks.md"
    description: "Create tasks breakdown document"
    template: "tasks.md"
    requires:
      - design
```

---

## Summary

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| Core | ArtifactGraph | Pure dependency logic (no I/O) |
| Core | ChangeManager | Multi-change orchestration |
| Core | InstructionLoader | State detection + enrichment |
| Presentation | CLI | Thin command wrapper |
| Integration | Claude Commands | AI assistant glue |

**Key Principles:**
- **Filesystem IS the database** - stateless, version-control friendly
- **Dependencies are enablers** - show what's possible, don't force order
- **Deterministic CLI, inferring agent** - CLI requires explicit `--change`, agent infers from context
- **2-level template inheritance** - shared + override, no deeper
- **Schemas are versioned** - support variations by philosophy, version, language
