# README Renewal Plan: Documentation Prompts

This file contains prompts for AI agents to write each documentation file. Each prompt is self-contained and designed to be run in a fresh context session.

---

## Documentation Cleanup Checklist

Before generating new docs, clean up the existing docs folder.

### Docs to Delete (internal/historical)

- [x] `docs/artifact_poc.md` — Internal architecture doc, design decisions implemented
- [x] `docs/experimental-release-plan.md` — Project plan with completed checkboxes, release happened
- [x] `docs/schema-workflow-gaps.md` — Implementation tracking (Phases 1-4), belongs in GitHub issues

### Docs to Merge Then Delete

- [x] `docs/schema-customization.md` → merge useful content into `docs/customization.md`, then delete
- [x] `docs/project-config-demo.md` → merge useful content into `docs/customization.md`, then delete

### Docs to Keep and Polish

- [x] `docs/opsx.md` — Core OPSX user documentation (renamed from `experimental-workflow.md`)

### User-Facing Docs to Generate/Update

- [x] `docs/getting-started.md` — See prompt below
- [x] `docs/workflows.md` — See prompt below
- [x] `docs/commands.md` — See prompt below
- [x] `docs/cli.md` — See prompt below
- [x] `docs/concepts.md` — See prompt below
- [x] `docs/multi-language.md` — Simplified multi-language guide
- [x] `docs/customization.md` — Merged from schema-customization.md and project-config-demo.md

### Final Steps

- [ ] Delete this file (`README_RENEWAL_PROMPTS.md`) after all docs are generated
- [ ] Update `README_NEW.md` links to point to new docs
- [ ] Rename `README_NEW.md` to `README.md` (replace old README)

---

## 1. Getting Started (`docs/getting-started.md`)

```
You are writing documentation for OpenSpec, a spec-driven development framework for AI coding assistants.

**Your task:** Write the Getting Started guide at `docs/getting-started.md`.

**Note:** Installation and initialization are already covered in the main README. This guide focuses on understanding how OpenSpec works after you've run `openspec init`.

**Context about OpenSpec:**
- OpenSpec helps humans and AI coding assistants agree on what to build before code is written
- It uses a folder structure: `openspec/specs/` (source of truth) and `openspec/changes/` (proposed updates)
- The primary workflow uses OPSX commands: `/opsx:new`, `/opsx:ff`, `/opsx:apply`, `/opsx:archive`

**Philosophy:**
- Fluid not rigid
- Iterative not waterfall
- Easy not complex
- Built for brownfield not just greenfield

**Target audience:** Developers who have installed OpenSpec and want to understand how it works.

**What to cover:**

1. **How It Works** - The overall flow with an ASCII diagram:
   ```
   ┌────────────────────┐
   │ Start a Change     │  /opsx:new
   └────────┬───────────┘
            │
            ▼
   ┌────────────────────┐
   │ Create Artifacts   │  /opsx:ff or /opsx:continue
   │ (proposal, specs,  │
   │  design, tasks)    │◄──── iterate as needed
   └────────┬───────────┘
            │
            ▼
   ┌────────────────────┐
   │ Implement Tasks    │  /opsx:apply
   │ (AI writes code)   │──── can update artifacts mid-flight
   └────────┬───────────┘
            │
            ▼
   ┌────────────────────┐
   │ Archive & Merge    │  /opsx:archive
   │ Specs              │
   └────────────────────┘
   ```

2. **What OpenSpec Creates** - The folder structure after init:
   ```
   openspec/
   ├── specs/              # Source of truth (your system's behavior)
   │   └── <domain>/
   │       └── spec.md
   ├── changes/            # Proposed updates (one folder per change)
   │   └── <change-name>/
   │       ├── proposal.md
   │       ├── design.md
   │       ├── tasks.md
   │       └── specs/      # Delta specs (what's changing)
   │           └── <domain>/
   │               └── spec.md
   └── config.yaml         # Project configuration (optional)
   ```

3. **Understanding Artifacts** - What each file does:
   - `proposal.md` - The "why" and "what" (intent, scope, approach)
   - `specs/` - Delta specs showing ADDED/MODIFIED/REMOVED requirements
   - `design.md` - The "how" (technical approach, architecture decisions)
   - `tasks.md` - Implementation checklist with checkboxes

4. **How Delta Specs Work** - The key concept:
   - Delta specs show changes relative to current specs
   - Use sections: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`
   - Each requirement has scenarios (Given/When/Then or similar)
   - On archive, deltas merge into main specs

5. **Example: Your First Change** - Walk through a real example:
   - User asks to add dark mode
   - AI creates change folder with artifacts
   - Show what each generated file looks like
   - Implementation updates task checkboxes
   - Archive merges specs

6. **Next Steps** - Links to Workflows, Commands, Concepts, Customization

**Style guidelines:**
- Use ASCII diagrams to visualize structure and flow
- Show real file examples (like the 2FA example from old README)
- Explain concepts as you introduce them
- Keep it scannable with clear headers
- No emojis

**Read these files for context:**
- `README.md` (old README - has good examples of generated specs and deltas)
- `README_NEW.md` (new product positioning)
- `docs/opsx.md` (OPSX workflow details)

Write the complete documentation file now.
```

---

## 2. Workflows (`docs/workflows.md`)

```
You are writing documentation for OpenSpec, a spec-driven development framework for AI coding assistants.

**Your task:** Write the Workflows guide at `docs/workflows.md`.

**Context about OpenSpec:**
- OpenSpec uses an artifact-based workflow called OPSX
- Artifacts: proposal → specs → design → tasks → implementation
- Dependencies enable progress but don't lock you into phases
- You can update any artifact anytime (fluid, not rigid)
- Changes live in `openspec/changes/<name>/` folders

**OPSX Commands:**
| Command | Purpose |
|---------|---------|
| `/opsx:explore` | Think through ideas before committing |
| `/opsx:new` | Start a new change |
| `/opsx:continue` | Create the next artifact based on dependencies |
| `/opsx:ff` | Fast-forward - create all planning artifacts at once |
| `/opsx:apply` | Implement tasks, can update artifacts mid-implementation |
| `/opsx:sync` | Sync delta specs to main specs |
| `/opsx:verify` | Verify implementation matches artifacts |
| `/opsx:archive` | Archive completed change |

**Artifact flow:**
```
proposal ──→ specs ──→ design ──→ tasks ──→ implement
   ▲           ▲          ▲                    │
   └───────────┴──────────┴────────────────────┘
            update as you learn
```

**Target audience:** Users who understand the basics and want to learn effective patterns.

**What to cover:**
1. The OPSX philosophy (actions not phases, fluid iteration)
2. Common workflow patterns:
   - **Quick feature**: `/opsx:new` → `/opsx:ff` → `/opsx:apply` → `/opsx:archive`
   - **Exploratory**: `/opsx:explore` → `/opsx:new` → `/opsx:continue` (step by step)
   - **Mid-flight correction**: updating specs/design during `/opsx:apply`
   - **Parallel changes**: working on multiple changes simultaneously
3. When to use `/opsx:ff` vs `/opsx:continue`
4. When to update vs start fresh (same intent = update, different work = new change)
5. Best practices:
   - Keep changes focused
   - Use `/opsx:explore` for unclear requirements
   - Sync specs regularly
   - Verify before archiving

**Style guidelines:**
- Use diagrams (ASCII art) where helpful
- Include real-world examples
- Show the conversation flow between user and AI
- Keep sections scannable

**Read these files for context:**
- `docs/opsx.md` (full OPSX documentation)

Write the complete documentation file now.
```

---

## 3. Commands (`docs/commands.md`)

```
You are writing documentation for OpenSpec, a spec-driven development framework for AI coding assistants.

**Your task:** Write the Commands reference at `docs/commands.md`.

**Context about OpenSpec:**
- OpenSpec provides slash commands that work with AI coding assistants
- Commands are invoked in the AI chat (e.g., `/opsx:new add-dark-mode`)
- Different AI tools use different command formats (some use `:`, some use `-`)
- The OPSX workflow is the primary/recommended workflow

**OPSX Commands (primary workflow):**

| Command | What it does | Arguments |
|---------|--------------|-----------|
| `/opsx:explore` | Think through ideas, investigate problems | Optional: topic to explore |
| `/opsx:new` | Start a new change | Optional: change name, `--schema` |
| `/opsx:continue` | Create next ready artifact | Optional: change name |
| `/opsx:ff` | Fast-forward all planning artifacts | Optional: change name |
| `/opsx:apply` | Implement tasks | Optional: change name |
| `/opsx:sync` | Sync delta specs to main | Optional: change name |
| `/opsx:verify` | Verify implementation completeness | Optional: change name |
| `/opsx:archive` | Archive completed change | Optional: change name |
| `/opsx:bulk-archive` | Archive multiple changes | Required: change names |

**Legacy Commands (still supported):**
| Command | What it does |
|---------|--------------|
| `/openspec:proposal` | Create proposal (all-at-once, older workflow) |
| `/openspec:apply` | Apply change |
| `/openspec:archive` | Archive change |

**Supported AI Tools:**
- Claude Code: `/opsx:new`, `/openspec:proposal`
- Cursor: `/opsx-new`, `/openspec-proposal`
- Windsurf: `/opsx-new`, `/openspec-proposal`
- GitHub Copilot: `/openspec-proposal`
- And 15+ more tools

**Target audience:** Users looking up specific command syntax and options.

**What to cover:**
1. Quick reference table of all commands
2. Detailed documentation for each OPSX command:
   - Syntax
   - Arguments and options
   - What it creates/modifies
   - Example usage
   - Tips
3. Command format by AI tool (table showing syntax variations)
4. Legacy commands (brief, point to OPSX as recommended)
5. Troubleshooting common command issues

**Style guidelines:**
- Reference documentation style (scannable, searchable)
- Consistent format for each command
- Include example invocations
- Note tool-specific variations

Write the complete documentation file now.
```

---

## 4. CLI (`docs/cli.md`)

```
You are writing documentation for OpenSpec, a spec-driven development framework for AI coding assistants.

**Your task:** Write the CLI reference at `docs/cli.md`.

**Context about OpenSpec:**
- OpenSpec has a terminal CLI (`openspec`) separate from the AI slash commands
- CLI is used for setup, validation, viewing status, and management
- Install with: `npm install -g @fission-ai/openspec@latest`

**CLI Commands:**

```
openspec init [path]           # Initialize OpenSpec in project
openspec update [path]         # Update instruction files after upgrade
openspec list [--specs]        # List changes (or specs with --specs)
openspec view                  # Interactive dashboard
openspec show <item>           # Show change or spec details
openspec validate <item>       # Validate change or spec
openspec archive <change>      # Archive completed change
openspec status --change <n>   # Show artifact completion status
openspec instructions <art>    # Get enriched instructions for artifact
openspec schemas               # List available workflow schemas
openspec schema init <name>    # Create new custom schema
openspec schema fork <from>    # Fork existing schema
openspec schema validate <n>   # Validate schema structure
openspec config                # View/modify global config
openspec feedback <message>    # Submit feedback
openspec completion            # Shell completions
```

**Target audience:** Users who need CLI reference for terminal operations.

**What to cover:**
1. Installation and verification
2. Core commands (init, update, list, view, show)
3. Validation commands (validate)
4. Archive commands (archive)
5. Status and debugging (status, instructions, templates)
6. Schema management (schemas, schema init/fork/validate/which)
7. Configuration (config)
8. Utility commands (feedback, completion)
9. Global options (--no-color, --help, --version)
10. Exit codes and error handling

**Style guidelines:**
- Man page style reference documentation
- Consistent format: syntax, description, options, examples
- Include common flags and their effects
- Show expected output where helpful

**To get accurate CLI info, run:**
```bash
openspec --help
openspec <command> --help
```

Write the complete documentation file now.
```

---

## 5. Concepts (`docs/concepts.md`)

```
You are writing documentation for OpenSpec, a spec-driven development framework for AI coding assistants.

**Your task:** Write the Concepts guide at `docs/concepts.md`.

**Context about OpenSpec:**

**Philosophy:**
- Fluid not rigid (no phase gates)
- Iterative not waterfall (update as you learn)
- Easy not complex (lightweight setup)
- Brownfield-first (works with existing codebases, not just 0→1)

**Core Concepts:**

1. **Specs** (`openspec/specs/`)
   - Source of truth for your system's behavior
   - Organized by domain (e.g., `specs/auth/`, `specs/payments/`)
   - Use structured format: Requirements → Scenarios

2. **Changes** (`openspec/changes/`)
   - Proposed modifications to specs
   - Each change is a folder with artifacts
   - Contains "delta specs" showing what's added/modified/removed

3. **Artifacts** (within a change)
   - `proposal.md` - Why and what (intent, scope, approach)
   - `specs/` - Delta specs (ADDED/MODIFIED/REMOVED requirements)
   - `design.md` - Technical approach
   - `tasks.md` - Implementation checklist

4. **Delta Specs**
   - Show changes relative to current specs
   - Sections: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`
   - Merged into main specs on archive

5. **Schemas**
   - Define artifact types and dependencies
   - Default: `spec-driven` (proposal → specs → design → tasks)
   - Alternative: `tdd` (tests → implementation → docs)
   - Custom schemas supported

6. **Archive**
   - When change is complete, archive merges delta specs into main specs
   - Change folder moves to `openspec/changes/archive/`
   - Creates audit trail of all changes

**The Flow:**
```
Intent → Proposal → Specs → Design → Tasks → Implementation → Archive
         (agree)   (what)  (how)   (steps)    (code)        (merge)
```

**Key Differentiators:**
- vs. spec-kit (GitHub): Lighter, no phase gates
- vs. Kiro (AWS): Tool-agnostic, not locked to one IDE
- vs. nothing: Predictability without ceremony

**Target audience:** Users who want to understand the "why" behind OpenSpec's design.

**What to cover:**
1. Philosophy and design principles
2. Specs: what they are, structure, organization
3. Changes: the change folder structure
4. Artifacts: each type and its purpose
5. Delta specs: format and merge behavior
6. Schemas: what they are, built-in vs custom
7. The archive process
8. Glossary of terms

**Style guidelines:**
- Explain the "why" not just the "what"
- Use diagrams to show relationships
- Include examples of each concept
- Build understanding progressively

Write the complete documentation file now.
```

---

## 6. Multi-Language (`docs/multi-language.md`)

**COMPLETED** — Created simplified multi-language guide based on PR #534. Covers configuring
OpenSpec to output artifacts in different languages via the `context` field in config.yaml.

---

## 7. Customization (`docs/customization.md`)

```
You are writing documentation for OpenSpec, a spec-driven development framework for AI coding assistants.

**Your task:** Write the Customization guide at `docs/customization.md`.

**Context about OpenSpec:**
- OpenSpec is designed to be hackable and customizable
- Users can create custom schemas (artifact types + dependencies)
- Templates are plain Markdown files you can edit
- Project config injects context into all artifacts

**Customization Points:**

1. **Project Config** (`openspec/config.yaml`)
   ```yaml
   schema: spec-driven
   context: |
     Tech stack: TypeScript, React, Node.js
     Testing: Vitest, Playwright
   rules:
     proposal:
       - Include rollback plan
     specs:
       - Use Given/When/Then format
   ```

2. **Custom Schemas** (`openspec/schemas/<name>/`)
   - `schema.yaml` - defines artifacts and dependencies
   - `templates/*.md` - instruction templates for each artifact

   Example schema.yaml:
   ```yaml
   name: research-first
   artifacts:
     - id: research
       generates: research.md
       requires: []
     - id: proposal
       generates: proposal.md
       requires: [research]
     - id: tasks
       generates: tasks.md
       requires: [proposal]
   ```

3. **Schema Commands:**
   ```bash
   openspec schema init <name>      # Create new schema interactively
   openspec schema fork <from> <to> # Fork existing schema
   openspec schema validate <name>  # Validate schema structure
   openspec schema which <name>     # See where schema resolves from
   ```

4. **Template Customization:**
   - Edit templates in `openspec/schemas/<name>/templates/`
   - Templates are Markdown with placeholders
   - Changes take effect immediately (no rebuild)

5. **Schema Precedence:**
   1. CLI flag (`--schema tdd`)
   2. Change metadata (`.openspec.yaml` in change dir)
   3. Project config (`openspec/config.yaml`)
   4. Default (`spec-driven`)

**Built-in Schemas:**
- `spec-driven` (default): proposal → specs → design → tasks
- `tdd`: spec → tests → implementation → docs

**Target audience:** Power users who want to adapt OpenSpec to their workflow.

**What to cover:**
1. Project configuration (config.yaml)
   - Schema selection
   - Context injection
   - Per-artifact rules
2. Custom schemas
   - When to create one
   - Schema structure
   - Creating with `schema init`
   - Forking with `schema fork`
3. Template customization
   - Template format
   - Available placeholders
   - Best practices
4. Schema resolution and precedence
5. Validation and troubleshooting
6. Examples:
   - Research-first workflow
   - TDD workflow
   - Documentation-heavy workflow

**Style guidelines:**
- Include complete, working examples
- Show before/after for customizations
- Explain what each customization affects
- Include troubleshooting tips

**Read these files for context:**
- `docs/opsx.md` (has config and schema details)

Write the complete documentation file now.
```

---

## Usage Instructions

1. Copy each prompt (everything between the triple backticks) into a fresh AI session
2. Provide the relevant files when the prompt asks to read them
3. Review and edit the generated documentation
4. Update the links in `README_NEW.md` to point to the new doc files

## Post-Generation Checklist

- [ ] Review each doc for accuracy against current codebase
- [ ] Ensure consistent terminology across all docs
- [ ] Add cross-references between related docs
- [ ] Update `README_NEW.md` with correct doc links
- [ ] Test all code examples and commands
- [ ] Get team review before publishing
