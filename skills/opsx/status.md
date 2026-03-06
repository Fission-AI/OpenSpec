Show the status of OpenSpec changes - list active changes, artifact completion, and task progress. No CLI required.

**Input**: Optionally specify a change name after `/opsx:status` (e.g., `/opsx:status add-auth`) to see details for one change. Without a name, shows all active changes.

---

## Steps

### Option A: Specific change status

If a change name is provided:

1. Read `openspec/changes/<name>/` directory
2. Read `.openspec.yaml` for schema info
3. Check which artifacts exist: `proposal.md`, `specs/`, `design.md`, `tasks.md`
4. If `tasks.md` exists, count `- [ ]` and `- [x]` lines
5. List delta specs in `specs/` subdirectory

Display:
```
## Change Status: <name>

**Schema:** spec-driven
**Location:** openspec/changes/<name>/

### Artifacts
| Artifact         | Status   |
|------------------|----------|
| proposal.md      | ✓ done   |
| specs/auth/      | ✓ done   |
| design.md        | ✓ done   |
| tasks.md         | ✓ done   |

### Task Progress
5/7 tasks complete (2 remaining)

### Pending Tasks
- [ ] 3.1 Add rate limiting
- [ ] 3.2 Write integration tests

### Next Action
Run `/opsx:apply <name>` to continue implementation.
```

Adjust artifact statuses:
- File exists → `✓ done`
- File doesn't exist but dependencies are met → `○ ready`
- File doesn't exist and dependencies missing → `· waiting`

### Option B: All changes overview

If no name is provided:

1. List `openspec/changes/` directory
2. Exclude `archive/` subdirectory
3. For each change directory found:
   - Read `.openspec.yaml`
   - Check artifact existence
   - If `tasks.md` exists, count task completion

Display:
```
## OpenSpec Changes

### Active Changes (N)

**add-auth**
  Schema: spec-driven | Artifacts: 4/4 | Tasks: 5/7
  Next: `/opsx:apply add-auth`

**fix-login-bug**
  Schema: spec-driven | Artifacts: 2/4 | Tasks: -
  Next: `/opsx:continue fix-login-bug`

**add-dark-mode**
  Schema: spec-driven | Artifacts: 0/4 | Tasks: -
  Next: `/opsx:propose add-dark-mode` (no artifacts yet)

---

### Commands
- `/opsx:propose <name>` - Generate all artifacts at once
- `/opsx:apply <name>` - Implement tasks
- `/opsx:archive <name>` - Archive completed change
- `/opsx:status <name>` - Detailed status for one change
```

### Artifact count logic

For spec-driven schema, count 4 artifacts total:
- proposal.md
- specs/ (any file inside counts as done)
- design.md
- tasks.md

### Next action suggestion

Based on state:
- 0 artifacts: "Run `/opsx:propose <name>`"
- 1-3 artifacts (no tasks): "Run `/opsx:continue <name>`"
- Has tasks.md with incomplete tasks: "Run `/opsx:apply <name>`"
- All tasks complete: "Run `/opsx:archive <name>`"

---

## Guardrails

- Only show changes in `openspec/changes/` (exclude `archive/` folder)
- If `openspec/changes/` doesn't exist, say "No changes found. Run `/opsx:propose <name>` to create your first change."
- Keep the output concise and actionable
