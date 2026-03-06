Implement tasks from an OpenSpec change. No CLI required.

**Input**: Optionally specify a change name after `/opsx:apply` (e.g., `/opsx:apply add-auth`). If omitted, infer from conversation context or prompt the user.

---

## Steps

### 1. Select the change

If a name is provided, use it. Otherwise:
- Infer from conversation context if the user mentioned a change recently
- List `openspec/changes/` directory to find active changes (exclude the `archive/` subdirectory)
- Auto-select if only one active change exists
- If ambiguous, use the **AskUserQuestion tool** to let the user select

Always announce: "Using change: **<name>**"

### 2. Check which artifacts exist

Read the change directory `openspec/changes/<name>/`:
- Check for `proposal.md`, `design.md`, `tasks.md`
- Check for `specs/` subdirectory
- Read `.openspec.yaml` to confirm schema

### 3. Check tasks status

Read `openspec/changes/<name>/tasks.md`.

If tasks.md does NOT exist:
```
## Cannot Apply: Missing tasks.md

Change <name> has no tasks.md yet.

Run `/opsx:propose <name>` to generate artifacts, or create tasks.md manually.
```
Stop here.

Count:
- Total tasks: lines matching `- [ ]` or `- [x]`
- Complete: lines matching `- [x]`
- Remaining: lines matching `- [ ]`

If all tasks are already complete (`- [x]` only):
```
## All Done!

**Change:** <name>
**Progress:** All tasks complete ✓

Ready to archive. Run `/opsx:archive <name>`.
```
Stop here.

### 4. Read all context files

Read these files (if they exist):
- `openspec/changes/<name>/proposal.md`
- `openspec/changes/<name>/specs/*/spec.md` (all spec files)
- `openspec/changes/<name>/design.md`
- `openspec/changes/<name>/tasks.md`

Also read `openspec/config.yaml` if it exists (for project context/constraints).

### 5. Show current progress

```
## Implementing: <name>

**Schema:** spec-driven
**Progress:** N/M tasks complete
**Remaining:** M-N tasks

### Pending Tasks
- [ ] X.Y First pending task
- [ ] X.Z Second pending task
...
```

### 6. Implement tasks (loop until done or blocked)

Use **TodoWrite tool** to track task-level progress.

For each pending task (lines with `- [ ]`):
1. Announce: "Working on task X.Y: <description>"
2. Make the code changes required - keep changes minimal and focused
3. Mark the task complete in `openspec/changes/<name>/tasks.md`: change `- [ ]` → `- [x]`
4. Show: "✓ Task X.Y complete"
5. Continue to next task

**Pause and report if:**
- Task is unclear → use **AskUserQuestion tool** to clarify, then continue
- Implementation reveals a design issue → suggest updating artifacts and wait for guidance
- Error or blocker encountered → report the issue, describe options, wait
- User interrupts

### 7. Show completion status

**On full completion:**
```
## Implementation Complete

**Change:** <name>
**Schema:** spec-driven
**Progress:** M/M tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! Run `/opsx:archive <name>` to archive this change.
```

**On pause (issue encountered):**
```
## Implementation Paused

**Change:** <name>
**Progress:** N/M tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

---

## Guardrails

- Always read context files before starting implementation
- Keep code changes minimal and scoped to each task
- Update task checkbox IMMEDIATELY after completing each task (before moving to next)
- Pause on errors, blockers, or unclear requirements - do NOT guess
- If task is ambiguous, ask before implementing
- If implementation reveals design issues, pause and suggest artifact updates (not phase-locked)
- Keep going through tasks until all done or a blocker is hit
