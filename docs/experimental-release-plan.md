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
The underlying CLI commands (`openspec status`, `openspec next`, `openspec instructions`, etc.) remain unchanged. Only the slash command names change.

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
└── openspec-continue-change/
    └── SKILL.md          # name, description, instructions
```

**CLI Interface:**
```bash
openspec artifact-experimental-setup

# Output:
# 🧪 Experimental Artifact Workflow Setup
#
# Created .claude/skills/openspec-new-change/SKILL.md
# Created .claude/skills/openspec-continue-change/SKILL.md
#
# ✅ Skills are now available in:
#   - Claude Code (auto-detected)
#   - Cursor (enable in Settings → Rules → Import Settings)
#   - Windsurf (auto-imported from .claude directory)
#
# 📖 To use:
#   Ask Claude naturally:
#   • "I want to start a new OpenSpec change to add <feature>"
#   • "Continue working on this change"
#
#   Claude will automatically use the appropriate skill.
#
# 💡 This is an experimental feature. Feedback welcome at:
#    https://github.com/Fission-AI/OpenSpec/issues
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
4. Ask Claude: "I want to start a new OpenSpec change to add feature X"
5. Verify Claude invokes the `openspec-new-change` skill
6. Verify change directory created at `openspec/changes/add-feature-x/`
7. Verify proposal template shown
8. Ask Claude: "Continue working on this change"
9. Verify Claude invokes the `openspec-continue-change` skill
10. Verify `proposal.md` created with content
11. Ask Claude: "Continue" (create specs)
12. Verify `specs/*.md` created
13. Ask Claude: "Continue" (create design)
14. Verify `design.md` created
15. Ask Claude: "Continue" (create tasks)
16. Verify `tasks.md` created
17. Verify status shows 4/4 complete
18. Implement the feature based on tasks
19. Run `/openspec:archive` to archive the change

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

1. `openspec-new-change` and `openspec-continue-change` skills work end-to-end
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
   - Current: `openspec status`, `openspec next` (no namespace)
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

## Next Steps

1. Review this plan and confirm scope
2. Create tasks/issues for each work item
3. Execute in dependency order
4. Conduct E2E testing
5. Write user docs
6. Release to test users
