# OpenSpec Experimental Release Plan

This document outlines the plan to release the experimental artifact workflow system for user testing.

## Overview

The goal is to allow users to test the new artifact-driven workflow system alongside the existing OpenSpec commands. This experimental system (`opsx`) provides a more granular, step-by-step approach to creating change artifacts.

## Three Workflow Modes

### 1. Old Workflow (Current Production)
- **Commands**: `/openspec:proposal`, `/openspec:apply`, `/openspec:archive`
- **Behavior**: Hardcoded slash commands that generate all artifacts in one command
- **Status**: Production, unchanged

### 2. New Artifact System - Batch Mode (Future)
- **Commands**: Refactored `/openspec:proposal` using schemas
- **Behavior**: Schema-driven but generates all artifacts at once (like legacy)
- **Status**: Not in scope for this experimental release
- **Note**: This is a future refactor to unify the old system with schemas

### 3. New Artifact System - Granular Mode (Experimental)
- **Commands**: `/opsx:new`, `/opsx:continue`
- **Behavior**: One artifact at a time, dependency-driven, iterative
- **Status**: Target for this experimental release

---

## Work Items

### 1. Rename AWF to OPSX

**Current State:**
- Commands: `/awf:start`, `/awf:continue`
- Files: `.claude/commands/awf/start.md`, `.claude/commands/awf/continue.md`

**Target State:**
- Commands: `/opsx:new`, `/opsx:continue`
- Files: `.claude/commands/opsx/new.md`, `.claude/commands/opsx/continue.md`

**Tasks:**
- [x] Create `.claude/commands/opsx/` directory
- [x] Rename `start.md` → `new.md` and update content
- [x] Copy `continue.md` with updated references
- [x] Update all references from "awf" to "opsx" in command content
- [x] Update frontmatter (name, description) to use "opsx" naming
- [x] Remove `.claude/commands/awf/` directory

**CLI Commands:**
The underlying CLI commands (`openspec status`, `openspec instructions`, etc.) remain unchanged. Only the slash command names change.

---

### 2. Remove WF Skill Files

**Current State:**
- `.claude/commands/wf/start.md` - References non-existent `openspec wf` commands
- `.claude/commands/wf/continue.md` - References non-existent `openspec wf` commands

**Target State:**
- Directory and files removed

**Tasks:**
- [x] Delete `.claude/commands/wf/start.md`
- [x] Delete `.claude/commands/wf/continue.md`
- [x] Delete `.claude/commands/wf/` directory

---

### 3. Add Agent Skills for Experimental Workflow

**Purpose:**
Generate experimental workflow skills using the [Agent Skills](https://agentskills.io/specification) open standard.

**Why Skills Instead of Slash Commands:**
- **Cross-editor compatibility**: Skills work in Claude Code, Cursor, Windsurf, and other compatible editors automatically
- **Simpler implementation**: Single directory (`.claude/skills/`) instead of 18+ editor-specific configurators
- **Standard format**: Open standard with simple YAML frontmatter + markdown
- **User invocation**: Users explicitly invoke skills when they want to use them

**Behavior:**
1. Create `.claude/skills/` directory if it doesn't exist
2. Generate two skills using the Agent Skills specification:
   - `openspec-new-change/SKILL.md` - Start a new change with artifact workflow
   - `openspec-continue-change/SKILL.md` - Continue working on a change (create next artifact)
3. Skills are added **alongside** existing `/openspec:*` commands (not replacing)

**Supported Editors:**
- Claude Code (native support)
- Cursor (native support via Settings → Rules → Import Settings)
- Windsurf (imports `.claude` configs)
- Cline, Codex, and other Agent Skills-compatible editors

**Tasks:**
- [x] Create skill template content for `openspec-new-change` (based on current opsx:new)
- [x] Create skill template content for `openspec-continue-change` (based on current opsx:continue)
- [x] Add temporary `artifact-experimental-setup` command to CLI
- [x] Implement skill file generation (YAML frontmatter + markdown body)
- [x] Add success message with usage instructions

**Note:** The `artifact-experimental-setup` command is temporary and will be merged into `openspec init` once the experimental workflow is promoted to stable.

**Skill Format:**
Each skill is a directory with a `SKILL.md` file:
```
.claude/skills/
├── openspec-new-change/
│   └── SKILL.md          # name, description, instructions
├── openspec-continue-change/
│   └── SKILL.md          # name, description, instructions
└── openspec-apply-change/
    └── SKILL.md          # name, description, instructions
```

**CLI Interface:**
```bash
openspec artifact-experimental-setup

# Output:
# 🧪 Experimental Artifact Workflow Skills Created
#
#   ✓ .claude/skills/openspec-new-change/SKILL.md
#   ✓ .claude/skills/openspec-continue-change/SKILL.md
#   ✓ .claude/skills/openspec-apply-change/SKILL.md
#
# 📖 Usage:
#
#   Skills work automatically in compatible editors:
#   • Claude Code - Auto-detected, ready to use
#   • Cursor - Enable in Settings → Rules → Import Settings
#   • Windsurf - Auto-imports from .claude directory
#
#   Ask Claude naturally:
#   • "I want to start a new OpenSpec change to add <feature>"
#   • "Continue working on this change"
#
#   Claude will automatically use the appropriate skill.
#
# 💡 This is an experimental feature.
#    Feedback welcome at: https://github.com/Fission-AI/OpenSpec/issues
```

**Implementation Notes:**
- Simple file writing: Create directories and write templated `SKILL.md` files (no complex logic)
- Use existing `FileSystemUtils.writeFile()` pattern like slash command configurators
- Template structure: YAML frontmatter + markdown body
- Keep existing `/opsx:*` slash commands for now (manual cleanup later)
- Skills use invocation model (user explicitly asks Claude to use them)
- Skill `description` field guides when Claude suggests using the skill
- Each `SKILL.md` has required fields: `name` (matches directory) and `description`

---

### 4. Update `/opsx:new` Command Content

**Current Behavior (awf:start):**
1. Ask user what they want to build (if no input)
2. Create change directory
3. Show artifact status
4. Show what's ready
5. Get instructions for proposal
6. STOP and wait

**New Behavior (opsx:new):**
Same flow but with updated naming:
- References to "awf" → "opsx"
- References to `/awf:continue` → `/opsx:continue`
- Update frontmatter name/description

**Tasks:**
- [x] Update all "awf" references to "opsx"
- [x] Update command references in prompt text
- [x] Verify CLI commands still work (they use `openspec`, not `awf`)

---

### 5. Update `/opsx:continue` Command Content

**Current Behavior (awf:continue):**
1. Prompt for change selection (if not provided)
2. Check current status
3. Create ONE artifact based on what's ready
4. Show progress and what's unlocked
5. STOP

**New Behavior (opsx:continue):**
Same flow with updated naming.

**Tasks:**
- [x] Update all "awf" references to "opsx"
- [x] Update command references in prompt text

---

### 6. End-to-End Testing

**Objective:**
Run through a complete workflow with Claude using the new skills to create a real feature, validating the entire flow works.

**Test Scenario:**
Use a real OpenSpec feature as the test case (dog-fooding).

**Test Flow:**
1. Run `openspec artifact-experimental-setup` to create skills
2. Verify `.claude/skills/openspec-new-change/SKILL.md` created
3. Verify `.claude/skills/openspec-continue-change/SKILL.md` created
4. Verify `.claude/skills/openspec-apply-change/SKILL.md` created
5. Ask Claude: "I want to start a new OpenSpec change to add feature X"
6. Verify Claude invokes the `openspec-new-change` skill
7. Verify change directory created at `openspec/changes/add-feature-x/`
8. Verify proposal template shown
9. Ask Claude: "Continue working on this change"
10. Verify Claude invokes the `openspec-continue-change` skill
11. Verify `proposal.md` created with content
12. Ask Claude: "Continue" (create specs)
13. Verify `specs/*.md` created
14. Ask Claude: "Continue" (create design)
15. Verify `design.md` created
16. Ask Claude: "Continue" (create tasks)
17. Verify `tasks.md` created
18. Verify status shows 4/4 complete
19. Implement the feature based on tasks
20. Run `/openspec:archive` to archive the change

**Validation Checklist:**
- [ ] `openspec artifact-experimental-setup` creates correct directory structure
- [ ] Skills are auto-detected in Claude Code
- [ ] Skill descriptions trigger appropriate invocations
- [ ] Skills create change directory and show proposal template
- [ ] Skills correctly identify ready artifacts
- [ ] Skills create artifacts with meaningful content
- [ ] Dependency detection works (specs requires proposal, etc.)
- [ ] Progress tracking is accurate
- [ ] Template content is useful and well-structured
- [ ] Error handling works (invalid names, missing changes, etc.)
- [ ] Works with different schemas (spec-driven, tdd)
- [ ] Test in Cursor (Settings → Rules → Import Settings)

**Document Results:**
- Create test log documenting what worked and what didn't
- Note any friction points or confusing UX
- Identify bugs or improvements needed before user release

---

### 7. Documentation for Users

**Create user-facing documentation explaining:**

1. **What is the experimental workflow?**
   - A new way to create OpenSpec changes step-by-step using Agent Skills
   - One artifact at a time with dependency tracking
   - More interactive and iterative than the batch approach
   - Works across Claude Code, Cursor, Windsurf, and other compatible editors

2. **How to set up experimental workflow**
   ```bash
   openspec artifact-experimental-setup
   ```

   Note: This is a temporary command that will be integrated into `openspec init` once promoted to stable.

3. **Available skills**
   - `openspec-new-change` - Start a new change with artifact workflow
   - `openspec-continue-change` - Continue working (create next artifact)

4. **How to use**
   - **Claude Code**: Skills are auto-detected, just ask Claude naturally
     - "I want to start a new OpenSpec change to add X"
     - "Continue working on this change"
   - **Cursor**: Enable in Settings → Rules → Import Settings
   - **Windsurf**: Auto-imports `.claude` directory

5. **Example workflow**
   - Step-by-step walkthrough with natural language interactions
   - Show how Claude invokes skills based on user requests

6. **Feedback mechanism**
   - GitHub issue template for feedback
   - What to report (bugs, UX issues, suggestions)

**Tasks:**
- [ ] Create `docs/experimental-workflow.md` user guide
- [ ] Add GitHub issue template for experimental feedback
- [ ] Update README with mention of experimental features

---

## Dependency Graph

```
1. Remove WF skill files
   └── (no dependencies)

2. Rename AWF to OPSX
   └── (no dependencies)

3. Add Agent Skills
   └── Depends on: Rename AWF to OPSX (uses opsx content as templates)

4. Update opsx:new content
   └── Depends on: Rename AWF to OPSX

5. Update opsx:continue content
   └── Depends on: Rename AWF to OPSX

6. E2E Testing
   └── Depends on: Add Agent Skills (tests the skills workflow)

7. User Documentation
   └── Depends on: E2E Testing (need to know final behavior)
```

---

## Out of Scope

The following are explicitly NOT part of this experimental release:

1. **Batch mode refactor** - Making legacy `/openspec:proposal` use schemas
2. **New schemas** - Only shipping with existing `spec-driven` and `tdd`
3. **Schema customization UI** - No `openspec schema list` or similar
4. **Multiple editor support in CLI** - Skills work cross-editor automatically via `.claude/skills/`
5. **Replacing existing commands** - Skills are additive, not replacing `/openspec:*` or `/opsx:*`

---

## Success Criteria

The experimental release is ready when:

1. `openspec-new-change`, `openspec-continue-change`, and `openspec-apply-change` skills work end-to-end
2. `openspec artifact-experimental-setup` creates skills in `.claude/skills/`
3. Skills work in Claude Code and are compatible with Cursor/Windsurf
4. At least one complete workflow has been tested manually
5. User documentation exists explaining how to generate and use skills
6. Feedback mechanism is in place
7. WF skill files are removed
8. No references to "awf" remain in user-facing content

---

## Open Questions

1. **Schema selection** - Should `opsx:new` allow selecting a schema, or always use `spec-driven`?
   - Current: Always uses `spec-driven` as default
   - Consider: Add `--schema tdd` option or prompt

2. **Namespace in CLI** - Should experimental CLI commands be namespaced?
   - Current: `openspec status`, `openspec instructions` (no namespace)
   - Alternative: `openspec opsx status` (explicit experimental namespace)
   - Recommendation: Keep current, less typing for users

3. **Deprecation path** - If opsx becomes the default, how do we migrate?
   - Not needed for experimental release
   - Document that command names may change

---

## Estimated Work Breakdown

| Item | Complexity | Notes |
|------|------------|-------|
| Remove WF files | Trivial | Just delete 2 files + directory |
| Rename AWF → OPSX | Low | File renames + content updates |
| Add Agent Skills | **Low** | **Simple: 3-4 files, single output directory, standard format** |
| Update opsx:new content | Low | Text replacements |
| Update opsx:continue content | Low | Text replacements |
| E2E Testing | Medium | Manual testing, documenting results |
| User Documentation | Medium | New docs, issue template |

**Key Improvement:** Switching to Agent Skills reduces complexity significantly:
- **Before:** 20+ files (type definitions, 18+ editor configurators, editor selection UI)
- **After:** 3-4 files (skill templates, simple CLI command)
- **Cross-editor:** Works automatically in Claude Code, Cursor, Windsurf without extra code

---

## User Feedback from E2E Testing

### What Worked Well

1. **Clear dependency graph** ⭐ HIGH PRIORITY - KEEP
   - The status command showing blocked/unblocked artifacts was intuitive:
     ```
     [x] proposal
     [ ] design
     [-] tasks (blocked by: design, specs)
     ```
   - Users always knew what they could work on next
   - **Relevance**: Core UX strength to preserve

2. **Structured instructions output** ⭐ HIGH PRIORITY - KEEP
   - `openspec instructions <artifact>` gave templates, output paths, and context in one call
   - Very helpful for understanding what to create
   - **Relevance**: Essential for agent-driven workflow

3. **Simple scaffolding** ✅ WORKS WELL
   - `openspec new change "name"` just worked - created directory structure without fuss
   - **Relevance**: Good baseline, room for improvement (see pain points)

---

### Pain Points & Confusion

1. **Redundant CLI calls** ⚠️ MEDIUM PRIORITY
   - Users called both `status` AND `next` every time, but they overlap significantly
   - `status` already shows what's blocked
   - **Recommendation**: Consider merging or making `next` give actionable guidance beyond just listing names
   - **Relevance**: Reduces friction in iterative workflow

2. **Specs directory structure was ambiguous** 🔥 HIGH PRIORITY - FIX
   - Instructions said: `Write to: .../specs/**/*.md`
   - Users had to guess: `specs/spec.md`? `specs/game/spec.md`? `specs/tic-tac-toe/spec.md`?
   - Users ended up doing manual `mkdir -p .../specs/tic-tac-toe` then writing `spec.md` inside
   - **Recommendation**: CLI should scaffold this directory structure automatically
   - **Relevance**: Critical agent UX - ambiguous paths cause workflow friction

3. **Repetitive --change flag** ⚠️ MEDIUM PRIORITY
   - Every command needed `--change "tic-tac-toe-game"`
   - After 10+ calls, this felt verbose
   - **Recommendation**: `openspec use "tic-tac-toe-game"` to set context, then subsequent commands assume that change
   - **Relevance**: Quality of life improvement for iterative sessions

4. **No validation feedback** 🔥 HIGH PRIORITY - ADD
   - After writing each artifact, users just ran `status` hoping it would show `[x]`
   - Questions raised:
     - How did it know the artifact was "done"? File existence?
     - What if spec format was wrong (e.g., wrong heading levels)?
   - **Recommendation**: Add `openspec validate --change "name"` to check content quality
   - **Relevance**: Critical for user confidence and catching errors early

5. **Query-heavy, action-light CLI** 🔥 HIGH PRIORITY - ENHANCE
   - Most commands retrieve info. The only "action" is `new change`
   - Artifact creation is manual Write to guessed paths
   - **Recommendation**: `openspec create proposal --change "name"` could scaffold the file with template pre-filled, then user just edits
   - **Relevance**: Directly impacts agent productivity - reduce manual file writing

6. **Instructions output was verbose** ⚠️ LOW PRIORITY
   - XML-style output (`<artifact>`, `<template>`, `<instruction>`) was parseable but long
   - Key info (output path, template) was buried in ~50 lines
   - **Recommendation**: Add compact mode or structured JSON output for agents
   - **Relevance**: Nice-to-have for agent parsing efficiency

---

### Workflow Friction

1. **Mandatory "STOP and wait" after showing proposal template** ⚠️ MEDIUM PRIORITY
   - The skill said "STOP and wait" after showing the proposal template
   - This felt overly cautious when user had already provided enough context (e.g., "tic tac toe, single player vs AI, minimal aesthetics")
   - **Recommendation**: Make the pause optional or conditional based on context clarity
   - **Relevance**: Reduces unnecessary round-trips in agent conversations

2. **No connection to implementation** 🔥 HIGH PRIORITY - ROADMAP ITEM
   - After 4/4 artifacts complete, then what? The workflow ends at planning
   - No `openspec apply` or guidance on how to execute the tasks
   - User asked "would you like me to implement?" but that's outside OpenSpec's scope currently
   - **Recommendation**: Add implementation bridge - either:
     - `openspec apply` command to start execution phase
     - Clear handoff to existing `/openspec:apply` workflow
     - Documentation on next steps after planning completes
   - **Relevance**: Critical missing piece - users expect end-to-end workflow

---

### Priority Summary

**MUST FIX (High Priority):**
1. Specs directory structure ambiguity (#2)
2. Add validation feedback (#4)
3. Make CLI more action-oriented (#5)
4. Bridge to implementation phase (#2 in Workflow Friction)
5. Keep clear dependency graph (#1 in What Worked)
6. Keep structured instructions (#2 in What Worked)

**SHOULD FIX (Medium Priority):**
1. Reduce redundant CLI calls (#1)
2. Repetitive `--change` flag (#3)
3. Mandatory STOP behavior (#1 in Workflow Friction)

**NICE TO HAVE (Low Priority):**
1. Compact instructions output mode (#6)

---

## Design Decisions (from E2E Testing Feedback)

Based on dev testing and analysis of agent workflow friction, we identified three blockers for experimental release and made the following decisions.

### Blockers Identified

From the pain points in E2E testing, three issues are blocking the experimental release:

1. **Specs directory ambiguity** - Agents don't know where to write spec files or how to name capabilities
2. **CLI is query-heavy** - Most commands retrieve info, artifact creation is manual
3. **Apply integration missing** - After 4/4 artifacts complete, no guidance on implementation phase

### Decision 1: Capability Discovery in Proposal (RESOLVED)

**Problem:** The specs artifact instruction says "Create one spec file per capability in `specs/<name>/spec.md`" but:
- Agent doesn't know what `<name>` should be
- Capability identification requires research (existing specs, codebase)
- Proposal template asks for "Affected specs" but doesn't structure it
- Research happens implicitly, output isn't captured

**Decision:** Enrich the proposal template to explicitly capture capability discovery.

**Current proposal template:**
```markdown
## Why
## What Changes
## Impact
- Affected specs: List capabilities...  ← vague, easy to skip
- Affected code: ...
```

**New proposal template:**
```markdown
## Why
## What Changes
## Capabilities

### New Capabilities
<!-- Capabilities being introduced (will create new specs/<name>/spec.md) -->
- `<name>`: <brief description of what this capability covers>

### Modified Capabilities
<!-- Existing capabilities being changed (will update existing specs) -->
- `<existing-name>`: <what's changing>

## Impact
<!-- Affected code, APIs, dependencies, systems -->
```

**Rationale:**
- Proposal already asks for capabilities (just poorly) - this makes it explicit
- Captured output is reviewable (vs implicit research that can't be verified)
- Creates clear contract between proposal and specs phases
- Distinguishes NEW vs MODIFIED upfront (critical for specs phase)
- Agent can't skip research - it's part of the deliverable

**Implementation:**
- Update `schemas/spec-driven/templates/proposal.md`
- Update proposal instruction in `schemas/spec-driven/schema.yaml`
- Update skill instructions to guide capability discovery

### Decision 2: CLI Action Commands (IN PROGRESS)

**Problem:** CLI is mostly query-oriented. Agents run `openspec status`, `openspec next`, `openspec instructions` but then must manually write files.

#### Decision 2a: Remove `openspec next` command (RESOLVED)

**Problem:** The `next` command is redundant. It only shows which artifacts are ready, but `status` already shows this information (artifacts with status "ready" vs "blocked" vs "done").

**Current behavior:**
```bash
openspec status --change "X"  # Shows: proposal (done), specs (ready), design (blocked), tasks (blocked)
openspec next --change "X"    # Shows: ["specs"]  ← redundant
```

**Decision:** Remove the `next` command. Agents should use `status` which provides the same info plus more context.

**Implementation:**
- Remove `next` command from CLI
- Update skill instructions to use `status` instead of `next`
- Update AGENTS.md references

#### Decision 2b: CLI Scaffolding (RESOLVED - NO)

**Problem:** After getting instructions, agents manually write files. Should CLI scaffold artifacts instead?

**Options considered:**
- Add `openspec create <artifact>` commands that scaffold files with templates
- Keep current approach where agent writes files directly from instructions
- Hybrid: CLI can scaffold, agent can also write directly

**Decision:** Keep current flow. No scaffolding commands.

**Rationale (from agent ergonomics perspective):**
- One Write is better than multiple Edits - agent composes full content atomically
- `instructions` already provides template in context - scaffolding just moves it to a file
- Fewer tool calls: `instructions` + Write (2) vs `create` + `instructions` + Read + Edit×N (4+)
- Scaffolding doesn't solve the real problem (not knowing WHAT to write)
- Real problem solved by proposal template change (capability discovery)

**For multi-file artifacts (specs):** Scaffolding can't help because CLI doesn't know capability names until proposal is complete. The capability discovery in proposal solves this.

### Decision 3: Apply Integration (RESOLVED)

**Original problem:** After planning completes (4/4 artifacts), the experimental workflow ends. No guidance on implementation.

**Key insight: No phases, just actions.**

Through discussion, we realized phases (planning → implementation → archive) are an artificial constraint. Work is fluid:
- You might start implementing, realize the design is wrong → update design.md
- You're halfway through tasks, discover a new requirement → update specs
- You bounce between "planning" and "implementing" constantly

**The better model: Actions on a Change**

A change is a thing (with artifacts). Actions are verbs you perform on a change. Actions aren't phases - they're fluid operations you can perform anytime.

| Action | What it does | Skill | CLI Command |
|--------|--------------|-------|-------------|
| `new` | Create a change (scaffold directory) | `opsx:new` | `openspec new change` |
| `continue` | Create next artifact (dependency-aware) | `opsx:continue` | `openspec instructions` |
| `apply` | Implement tasks (execute, check off) | `opsx:apply` (NEW) | TBD |
| `update` | Refresh/update artifacts based on learnings | `opsx:update` (NEW) | TBD |
| `explore` | Research, ask questions, understand | `opsx:explore` (NEW) | TBD |
| `validate` | Check artifacts are correct/complete | TBD | `openspec validate` |
| `archive` | Finalize and move to archive | existing | `openspec archive` |

**Key principles:**
- Actions are modeled as skills (primary interface for agents)
- Some skills have matching CLI commands for convenience
- Skills and CLI commands are decoupled - not everything needs both
- Actions can be performed in any order (with soft prerequisites)
- No linear phase gates

**What the schema defines:**
- Artifacts (what they are, where they go)
- Dependencies (what must exist first)
- Required vs optional
- Templates + instructions

**What the schema does NOT define:**
- Phases
- When you can modify things
- Linear workflow

**Progress tracking:**
- tasks.md checkboxes = implementation progress
- Artifact existence = planning progress
- Archive readiness = user decides (or all tasks done)

**For experimental release:**
- Create `opsx:apply` skill (guidance for implementing tasks)
- Document the "actions on a change" model
- Other actions (update, explore) can come later

---

### Design: `openspec-apply-change` Skill

#### Overview

The apply skill guides agents through implementing tasks from a completed (or in-progress) change. Unlike the old `/openspec:apply` command, this skill:
- Is **fluid** - can be invoked anytime, not just after all artifacts are done
- Allows **artifact updates** - if implementation reveals issues, update design/specs
- Works **until done** - keeps going through tasks until complete or blocked
- Tracks **progress via checkboxes** - tasks.md is the source of truth

#### Skill Metadata

```yaml
name: openspec-apply-change
description: Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.
```

#### When to Invoke

The skill should be invoked when:
- User says "implement this change" or "start implementing"
- User says "work on the tasks" or "do the next task"
- User says "apply this change"
- All artifacts are complete and user wants to proceed
- User wants to continue implementation after a break

#### Input

- Optionally: change name
- Optionally: specific task number to work on
- If omitted: prompt for change selection (same pattern as continue-change)

#### Steps

```markdown
**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use **AskUserQuestion** to let user select.

   Show changes that have tasks.md (implementation-ready).
   Mark changes with incomplete tasks as "(In Progress)".

2. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - Context file paths (proposal, specs, design, tasks)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If blocked (missing artifacts): show message, suggest `openspec-continue-change`
   - If all done: congratulate, suggest archive
   - Otherwise: proceed to implementation

3. **Read context files**

   Read the files listed in the instructions:
   - `proposal.md` - why and what
   - `specs/*.md` - requirements and scenarios
   - `design.md` - technical approach (if exists)
   - `tasks.md` - the implementation checklist

4. **Show current progress**

   Display:
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

5. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on
   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete in tasks.md: `- [ ]` → `- [x]`
   - Continue to next task

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

6. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - If all done: suggest archive
   - If paused: explain why and wait for guidance
```

#### Output Format

**During implementation:**
```
## Implementing: add-user-auth

Working on task 3/7: Create UserAuth service class
[...implementation happening...]
✓ Task complete

Working on task 4/7: Add login endpoint to AuthController
[...implementation happening...]
✓ Task complete

Working on task 5/7: Add JWT token generation
[...implementation happening...]
```

**On completion:**
```
## Implementation Complete

**Change:** add-user-auth
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Create UserAuth service class
- [x] Add login endpoint to AuthController
- [x] Add JWT token generation
- [x] Add logout endpoint
- [x] Add auth middleware
- [x] Write unit tests
- [x] Update API documentation

All tasks complete! Ready to archive this change.
```

**On pause (issue encountered):**
```
## Implementation Paused

**Change:** add-user-auth
**Progress:** 4/7 tasks complete

### Issue Encountered
Task 5 "Add JWT token generation" - the design specifies using RS256 but
the existing auth library only supports HS256.

**Options:**
1. Update design.md to use HS256 instead
2. Add a new JWT library that supports RS256
3. Other approach

What would you like to do?
```

#### Guardrails

- Keep going through tasks until done or blocked
- Always read context before starting (specs, design)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess

#### Fluid Workflow Integration

The apply skill supports the "actions on a change" model:

**Can be invoked anytime:**
- Before all artifacts are done (if tasks.md exists)
- After partial implementation
- Interleaved with other actions (update, continue)

**Allows artifact updates:**
- If implementation reveals design issues → suggest `opsx:update` or manual edit
- If requirements need clarification → suggest updating specs
- Not phase-locked - work fluidly

**Example fluid workflow:**
```
User: "Implement add-user-auth"
→ openspec-apply-change: implements tasks 1, 2, 3, 4...
→ Pauses at task 5: "Design says RS256 but library only supports HS256"

User: "Let's use HS256 instead, update the design"
→ User edits design.md (or uses opsx:update in future)

User: "Continue implementing"
→ openspec-apply-change: implements tasks 5, 6, 7
→ "All tasks complete! Ready to archive."
```

#### CLI Commands Used

```bash
openspec list --json                        # List changes for selection
openspec status --change "<name>"           # Check artifact completion
openspec instructions apply --change "<name>" # Get apply instructions (NEW)
# File reads via Read tool for proposal, specs, design, tasks
# File edits via Edit tool for checking off tasks
```

#### New CLI Command: `openspec instructions apply`

For consistency with artifact instructions.

**Usage:**
```bash
openspec instructions apply --change "<name>" [--json]
```

**Output (Markdown format):**
```markdown
## Apply: add-user-auth

### Context Files
- proposal: openspec/changes/add-user-auth/proposal.md
- specs: openspec/changes/add-user-auth/specs/**/*.md
- design: openspec/changes/add-user-auth/design.md
- tasks: openspec/changes/add-user-auth/tasks.md

### Progress
2/7 complete

### Tasks
- [x] Create UserAuth service class
- [x] Add login endpoint
- [ ] Add JWT token generation
- [ ] Add logout endpoint
- [ ] Add auth middleware
- [ ] Write unit tests
- [ ] Update API documentation

### Instruction
Read context files, work through pending tasks, mark complete as you go.
Pause if you hit blockers or need clarification.
```

**Benefits of CLI command:**
- **Consistency** - same pattern as `openspec instructions <artifact>`
- **Structured output** - progress, tasks, context paths in one call
- **Clean format** - markdown is readable and compact (vs verbose XML)
- **Extensibility** - can add more sections later if needed
- **JSON option** - `--json` flag available for programmatic use

#### Differences from Old `/openspec:apply`

| Aspect | Old `/openspec:apply` | New `openspec-apply-change` |
|--------|----------------------|----------------------------|
| Invocation | After all artifacts done | Anytime (if tasks.md exists) |
| Granularity | All tasks at once | All tasks, but pauses on issues |
| Artifact updates | Not mentioned | Encouraged when needed |
| Progress tracking | Update all at end | Update after each task |
| Flow control | Push through everything | Pause on blockers, resume after |
| Context loading | Read once at start | Read context, reference as needed |
| Issue handling | Not specified | Pause, present options, wait for guidance |

#### Implementation Notes

1. **Add CLI command**: Add `openspec instructions apply` to artifact-workflow.ts
   - Parse tasks.md for progress (count done/pending)
   - Return context paths, progress, task list, simple instruction
2. **Add to skill-templates.ts**: Create `getApplyChangeSkillTemplate()` function
3. **Update artifact-experimental-setup**: Generate this skill alongside new/continue
4. **Update skills list**: Add to `.claude/skills/` directory
5. **Test the flow**: Verify it works with existing changes that have tasks.md

---

## Next Steps

1. ~~Review this plan and confirm scope~~ (Done - blockers identified)
2. ~~Design decisions~~ (Done - all 3 blockers resolved)
3. ~~Design apply skill~~ (Done - documented above)
4. ~~Implement proposal template change (Decision 1 - capability discovery)~~ (Done)
5. ~~Remove `openspec next` command (Decision 2a)~~ (Done)
6. ~~Add `openspec instructions apply` CLI command~~ (Done)
7. ~~Create `openspec-apply-change` skill~~ (Done)
8. Conduct E2E testing with updated workflow
9. Write user docs (document "actions on a change" model)
10. Release to test users
