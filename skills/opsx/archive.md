Archive a completed OpenSpec change. No CLI required.

**Input**: Optionally specify a change name after `/opsx:archive` (e.g., `/opsx:archive add-auth`). If omitted, prompt for selection.

---

## Steps

### 1. Select the change

If no name provided:
- List `openspec/changes/` directory (exclude `archive/` subdirectory)
- Show the active changes list
- Use **AskUserQuestion tool** to let the user select

**IMPORTANT**: Do NOT guess or auto-select. Always let the user choose if name not provided.

### 2. Check artifact completion

Read `openspec/changes/<name>/` directory listing.
Check which expected artifacts exist: `proposal.md`, `specs/`, `design.md`, `tasks.md`

Read `.openspec.yaml` to get the schema name.

If any expected artifacts are missing:
- Display warning: "Warning: The following artifacts are missing: <list>"
- Use **AskUserQuestion tool** to confirm: "Proceed with archive anyway?"
- Proceed only if user confirms

### 3. Check task completion

Read `openspec/changes/<name>/tasks.md` (if it exists).

Count:
- Incomplete: lines matching `- [ ]`
- Complete: lines matching `- [x]`

If incomplete tasks found:
- Display warning: "Warning: <N> tasks are still incomplete"
- Use **AskUserQuestion tool** to confirm: "Archive with incomplete tasks?"
- Proceed only if user confirms

If no tasks.md: skip this check silently.

### 4. Assess delta spec sync state

Check if `openspec/changes/<name>/specs/` directory exists and has files.

If NO delta specs: skip to step 5 (no sync needed).

If delta specs exist:
- For each delta spec at `openspec/changes/<name>/specs/<capability>/spec.md`:
  - Read the delta spec
  - Read the corresponding main spec at `openspec/specs/<capability>/spec.md` (may not exist)
  - Determine what would be applied (what's added/modified/removed)
  - Build a combined summary of all changes across all capabilities

Show the combined sync summary, then use **AskUserQuestion tool**:
- If changes are needed: options = ["Sync now (recommended)", "Archive without syncing"]
- If already in sync: options = ["Archive now", "Sync anyway and archive", "Cancel"]

If user chooses sync:
- Use the **Agent tool** (`subagent_type: "general-purpose"`) with prompt:
  ```
  Use the Skill tool to invoke the opsx:sync skill for change '<name>'.
  Delta spec analysis: <include the analyzed delta spec summary here>
  ```
- Then proceed to archive regardless

### 5. Perform the archive

Generate the archive target name: `YYYY-MM-DD-<change-name>` (use today's date).

Check if `openspec/changes/archive/YYYY-MM-DD-<name>/` already exists.

If target already exists:
```
## Archive Failed

**Change:** <name>
**Target:** openspec/changes/archive/YYYY-MM-DD-<name>/

Target archive directory already exists.

**Options:**
1. Rename the existing archive first
2. Delete the existing archive if it's a duplicate
3. Try archiving on a different date
```
Stop here.

If target does NOT exist:
```bash
mkdir -p openspec/changes/archive
mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
```

### 6. Display summary

```
## Archive Complete

**Change:** <name>
**Schema:** <schema from .openspec.yaml>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs
```

Adjust the **Specs** line based on what happened:
- Synced: `✓ Synced to main specs`
- No delta specs: `No delta specs`
- Sync skipped: `Sync skipped (user chose to skip)`

If there were warnings (incomplete artifacts/tasks):
```
**Warnings:**
- Archived with N incomplete artifacts
- Archived with N incomplete tasks
```

---

## Guardrails

- Always prompt for change selection if name not provided
- Do NOT block archive on warnings - just inform and confirm
- The `.openspec.yaml` moves with the directory (no special handling needed)
- Show a clear summary of everything that happened
- If delta specs exist, ALWAYS assess sync state and show summary before prompting
- Proceed to archive regardless of sync choice (sync is optional)
