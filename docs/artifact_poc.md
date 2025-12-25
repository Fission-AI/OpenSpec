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
| **Schema** | An artifact graph definition (what artifacts exist, their dependencies) | `spec-driven.yaml` |
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

### Schema Resolution (XDG Standard)

Schemas follow the XDG Base Directory Specification with a 2-level resolution:

```
1. ${XDG_DATA_HOME}/openspec/schemas/<name>.yaml   # Global user override
2. <package>/schemas/<name>.yaml                    # Built-in defaults
```

**Platform-specific paths:**
- Unix/macOS: `~/.local/share/openspec/schemas/`
- Windows: `%LOCALAPPDATA%/openspec/schemas/`
- All platforms: `$XDG_DATA_HOME/openspec/schemas/` (when set)

**Why XDG?**
- Schemas are workflow definitions (data), not user preferences (config)
- Built-ins baked into package, never auto-copied
- Users customize by creating files in global data dir
- Consistent with modern CLI tooling standards

### Template Inheritance (2 Levels Max)

Templates also use 2-level resolution (to be implemented in Slice 3):

```
1. ${XDG_DATA_HOME}/openspec/schemas/<schema>/templates/<artifact>.md  # Schema-specific
2. ${XDG_DATA_HOME}/openspec/templates/<artifact>.md                   # Shared
3. <package>/templates/<artifact>.md                                    # Built-in fallback
```

**Rules:**
- Schema-specific templates override shared templates
- Shared templates override package built-ins
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

### 1. ArtifactGraph (Slice 1 - COMPLETE)

The dependency graph engine with XDG-compliant schema resolution.

| Responsibility | Approach |
|----------------|----------|
| Model artifacts as a DAG | Artifact with `requires: string[]` |
| Track completion state | `Set<string>` for completed artifacts |
| Calculate build order | Kahn's algorithm (topological sort) |
| Find ready artifacts | Check if all dependencies are in `completed` set |
| Resolve schemas | XDG global → package built-ins |

**Key Data Structures (Zod-validated):**

```typescript
// Zod schemas define types + validation
const ArtifactSchema = z.object({
  id: z.string().min(1),
  generates: z.string().min(1),      // e.g., "proposal.md" or "specs/*.md"
  description: z.string(),
  template: z.string(),              // path to template file
  requires: z.array(z.string()).default([]),
});

const SchemaYamlSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive(),
  description: z.string().optional(),
  artifacts: z.array(ArtifactSchema).min(1),
});

// Derived types
type Artifact = z.infer<typeof ArtifactSchema>;
type SchemaYaml = z.infer<typeof SchemaYamlSchema>;
```

**Key Methods:**
- `resolveSchema(name)` - Load schema with XDG fallback
- `ArtifactGraph.fromSchema(schema)` - Build graph from schema
- `detectState(graph, changeDir)` - Scan filesystem for completion
- `getNextArtifacts(graph, completed)` - Find artifacts ready to create
- `getBuildOrder(graph)` - Topological sort of all artifacts
- `getBlocked(graph, completed)` - Artifacts with unmet dependencies

---

### 2. Change Utilities (Slice 2)

Simple utility functions for programmatic change creation. No class, no abstraction layer.

| Responsibility | Approach |
|----------------|----------|
| Create changes | Create dirs under `openspec/changes/<name>/` with README |
| Name validation | Enforce kebab-case naming |

**Key Paths:**

```
openspec/changes/<name>/   → Change instances with artifacts (project-level)
```

**Key Functions** (`src/utils/change-utils.ts`):
- `createChange(projectRoot, name, description?)` - Create new change directory + README
- `validateChangeName(name)` - Validate kebab-case naming, returns `{ valid, error? }`

**Note:** Existing CLI commands (`ListCommand`, `ChangeCommand`) already handle listing, path resolution, and existence checks. No need to extract that logic - it works fine as-is.

---

### 3. InstructionLoader (Slice 3)

Template resolution and instruction enrichment.

| Responsibility | Approach |
|----------------|----------|
| Resolve templates | XDG 2-level fallback (schema-specific → shared → built-in) |
| Build dynamic context | Gather dependency status, change info |
| Enrich templates | Inject context into base templates |
| Generate status reports | Formatted markdown with progress |

**Key Class - ChangeState:**

```
ChangeState {
  changeName: string
  changeDir: string
  graph: ArtifactGraph
  completed: Set<string>

  // Methods
  getNextSteps(): string[]
  getStatus(artifactId): ArtifactStatus
  isComplete(): boolean
}
```

**Key Functions:**
- `getTemplatePath(artifactId, schemaName?)` - Resolve with 2-level fallback
- `getEnrichedInstructions(artifactId, projectRoot, changeName?)` - Main entry point
- `getChangeStatus(projectRoot, changeName?)` - Formatted status report

---

### 4. CLI (Slice 4)

User interface layer. **All commands are deterministic** - require explicit `--change` parameter.

| Command | Function | Status |
|---------|----------|--------|
| `status --change <id>` | Show change progress (artifact graph) | **NEW** |
| `next --change <id>` | Show artifacts ready to create | **NEW** |
| `instructions <artifact> --change <id>` | Get enriched instructions for artifact | **NEW** |
| `list` | List all changes | EXISTS (`openspec change list`) |
| `new <name>` | Create change | **NEW** (uses `createChange()`) |
| `init` | Initialize structure | EXISTS (`openspec init`) |
| `templates --change <id>` | Show resolved template paths | **NEW** |

**Note:** Commands that operate on a change require `--change`. Missing parameter → error with list of available changes. Agent infers the change from conversation and passes it explicitly.

**Existing CLI commands** (not part of this slice):
- `openspec change list` / `openspec change show <id>` / `openspec change validate <id>`
- `openspec list --changes` / `openspec list --specs`
- `openspec view` (dashboard)
- `openspec init` / `openspec archive <change>`

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
│  │ InstructionLoader  │        │  change-utils (Slice 2)  │ │
│  │    (Slice 3)       │        │  createChange()          │ │
│  └─────────┬──────────┘        │  validateChangeName()    │ │
│            │                   └──────────────────────────┘ │
└────────────┼────────────────────────────────────────────────┘
             │ uses
             ▼
┌─────────────────────────────────────────────────────────────┐
│                      CORE LAYER                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               ArtifactGraph (Slice 1)                │   │
│  │                                                      │   │
│  │  Schema Resolution (XDG) ──→ Graph ──→ State Detection│   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
             ▲
             │ reads from
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   PERSISTENCE LAYER                          │
│  ┌──────────────────┐   ┌────────────────────────────────┐  │
│  │  XDG Schemas     │   │  Project Artifacts             │  │
│  │  ~/.local/share/ │   │  openspec/changes/<name>/      │  │
│  │  openspec/       │   │  - proposal.md, design.md      │  │
│  │  schemas/        │   │  - specs/*.md, tasks.md        │  │
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

### 3. XDG-Compliant Schema Resolution

```
${XDG_DATA_HOME}/openspec/schemas/<name>.yaml   # User override
    ↓ (not found)
<package>/schemas/<name>.yaml                    # Built-in
    ↓ (not found)
Error (schema not found)
```

### 4. Two-Level Template Fallback (Slice 3)

```
${XDG_DATA_HOME}/openspec/schemas/<schema>/templates/<artifact>.md  # Schema-specific
    ↓ (not found)
${XDG_DATA_HOME}/openspec/templates/<artifact>.md                   # Shared
    ↓ (not found)
<package>/templates/<artifact>.md                                    # Built-in
    ↓ (not found)
Error (no silent fallback to avoid confusion)
```

### 5. Glob Pattern Support

`specs/*.md` allows multiple files to satisfy a single artifact:

```
if (artifact.generates.includes("*")) {
  const parentDir = changeDir / patternParts[0]
  if (exists(parentDir) && hasFiles(parentDir)) {
    completed.add(artifactId)
  }
}
```

### 6. Stateless State Detection

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

### Slice 1: "What's Ready?" (Core Query) ✅ COMPLETE

**Delivers:** Types + Graph + State Detection + Schema Resolution

**Implementation:** `src/core/artifact-graph/`
- `types.ts` - Zod schemas and derived TypeScript types
- `schema.ts` - YAML parsing with Zod validation
- `graph.ts` - ArtifactGraph class with topological sort
- `state.ts` - Filesystem-based state detection
- `resolver.ts` - XDG-compliant schema resolution
- `builtin-schemas.ts` - Package-bundled default schemas

**Key decisions made:**
- Zod for schema validation (consistent with project)
- XDG for global schema overrides
- `Set<string>` for completion state (immutable, functional)
- `inProgress` and `failed` states deferred (require external tracking)

---

### Slice 2: "Change Creation Utilities"

**Delivers:** Utility functions for programmatic change creation

**Scope:**
- `createChange(projectRoot, name, description?)` → creates directory + README
- `validateChangeName(name)` → kebab-case pattern enforcement

**Not in scope (already exists in CLI commands):**
- `listChanges()` → exists in `ListCommand` and `ChangeCommand.getActiveChanges()`
- `getChangePath()` → simple `path.join()` inline
- `changeExists()` → simple `fs.access()` inline
- `isInitialized()` → simple directory check inline

**Why simplified:** Extracting existing CLI logic into a class would require similar refactoring of `SpecCommand` for consistency. The existing code works fine (~15 lines each). Only truly new functionality is `createChange()` + name validation.

---

### Slice 3: "Get Instructions" (Enrichment)

**Delivers:** Template resolution + context injection

**Testable behaviors:**
- Template fallback: schema-specific → shared → built-in → error
- Context injection: completed deps show ✓, missing show ✗
- Output path shown correctly based on change directory

---

### Slice 4: "CLI + Integration"

**Delivers:** New artifact graph commands (builds on existing CLI)

**New commands:**
- `status --change <id>` - Show artifact completion state
- `next --change <id>` - Show ready-to-create artifacts
- `instructions <artifact> --change <id>` - Get enriched template
- `templates --change <id>` - Show resolved paths
- `new <name>` - Create change (wrapper for `createChange()`)

**Already exists (not in scope):**
- `openspec change list/show/validate` - change management
- `openspec list --changes/--specs` - listing
- `openspec view` - dashboard
- `openspec init` - initialization

**Testable behaviors:**
- Each new command produces expected output
- Commands compose correctly (status → next → instructions flow)
- Error handling for missing changes, invalid artifacts, etc.

---

## Directory Structure

```
# Global (XDG paths - user overrides)
~/.local/share/openspec/           # Unix/macOS ($XDG_DATA_HOME/openspec/)
%LOCALAPPDATA%/openspec/           # Windows
├── schemas/                       # Schema overrides
│   └── custom-workflow.yaml       # User-defined schema
└── templates/                     # Template overrides (Slice 3)
    └── proposal.md                # Custom proposal template

# Package (built-in defaults)
<package>/
├── schemas/                       # Built-in schema definitions
│   ├── spec-driven.yaml           # Default: proposal → specs → design → tasks
│   └── tdd.yaml                   # TDD: tests → implementation → docs
└── templates/                     # Built-in templates (Slice 3)
    ├── proposal.md
    ├── design.md
    ├── specs.md
    └── tasks.md

# Project (change instances)
openspec/
└── changes/                       # Change instances
    ├── add-auth/
    │   ├── README.md              # Auto-generated on creation
    │   ├── proposal.md            # Created artifacts
    │   ├── design.md
    │   └── specs/
    │       └── *.md
    ├── refactor-db/
    │   └── ...
    └── archive/                   # Completed changes
        └── 2025-01-01-add-auth/

.claude/
├── settings.local.json            # Permissions
└── commands/                      # Slash commands
    └── *.md
```

---

## Schema YAML Format

```yaml
# Built-in: <package>/schemas/spec-driven.yaml
# Or user override: ~/.local/share/openspec/schemas/spec-driven.yaml
name: spec-driven
version: 1
description: Specification-driven development

artifacts:
  - id: proposal
    generates: "proposal.md"
    description: "Create project proposal document"
    template: "proposal.md"          # resolves via 2-level fallback (Slice 3)
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

| Layer | Component | Responsibility | Status |
|-------|-----------|----------------|--------|
| Core | ArtifactGraph | Pure dependency logic + XDG schema resolution | ✅ Slice 1 COMPLETE |
| Utils | change-utils | Change creation + name validation only | Slice 2 (new functionality only) |
| Core | InstructionLoader | Template resolution + enrichment | Slice 3 (all new) |
| Presentation | CLI | New artifact graph commands | Slice 4 (new commands only) |
| Integration | Claude Commands | AI assistant glue | Slice 4 |

**What already exists (not in this proposal):**
- `getActiveChangeIds()` in `src/utils/item-discovery.ts` - list changes
- `ChangeCommand.list/show/validate()` in `src/commands/change.ts`
- `ListCommand.execute()` in `src/core/list.ts`
- `ViewCommand.execute()` in `src/core/view.ts` - dashboard
- `src/core/init.ts` - initialization
- `src/core/archive.ts` - archiving

**Key Principles:**
- **Filesystem IS the database** - stateless, version-control friendly
- **Dependencies are enablers** - show what's possible, don't force order
- **Deterministic CLI, inferring agent** - CLI requires explicit `--change`, agent infers from context
- **XDG-compliant paths** - schemas and templates use standard user data directories
- **2-level inheritance** - user override → package built-in (no deeper)
- **Schemas are versioned** - support variations by philosophy, version, language
