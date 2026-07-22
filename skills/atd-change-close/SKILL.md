---
name: atd-change-close
description: Close an ATD change: require every tracked task complete (no override), assess delta-spec sync, then archive. Step 5 of the ATD journey; use after atd-change-verify.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Close an ATD change: hard-gate on every tracked task being complete, then archive (step 5 of the ATD journey).

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`). Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check ATD schema and status**

   Run `openspec status --change "<name>" --json` and parse:
   - `schemaName`: The workflow being used
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context (used by the sync and archive steps)

   **ATD schema guard**: This workflow only acts on ATD changes. If `schemaName` is not `atd-sdlc` or `atd-sdlc-lite`, STOP — do not modify artifacts, code, specs, tasks, or archive state — and direct the developer to the generic `openspec-archive-change` workflow instead.

3. **Hard completion gate (no override)**

   Run `openspec instructions apply --change "<name>" --json` and read `state`.

   Archive is allowed ONLY when `state` is `"all_done"` — every tracked task checkbox is complete, including the ATD closure tasks (standards conformance, solution-document reconciliation, publication, Jira closure). Do not rely on any particular task-group heading; the apply state covers all tracked work.

   If `state` is anything other than `"all_done"`:
   - List every incomplete artifact and unchecked task from the response
   - Direct the developer to `atd-change-apply` to finish the work
   - STOP. There is no override: close never archives incomplete work, and never performs publication, Jira closure, or any other closure work itself.

4. **Assess delta spec sync state**

   Use `artifactPaths.specs.existingOutputPaths` from status JSON to check for delta specs. If none exist, proceed without sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at `<planningHome.root>/openspec/specs/<capability>/spec.md` (use the store-aware `planningHome.root` from step 2, not a hardcoded repo path)
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes needed: "Sync now (recommended)", "Archive without syncing"
   - If already synced: "Archive now", "Sync anyway", "Cancel"

   Route on the answer:
   - "Cancel" — stop, do not archive
   - "Archive without syncing" or "Archive now" — proceed to archive
   - "Sync now" or "Sync anyway" — sync, then verify (below)
   - Anything else — ask again rather than archiving

   To sync, perform the merge yourself, inline and synchronously: for each capability with a delta spec, apply its ADDED requirements to `<planningHome.root>/openspec/specs/<capability>/spec.md` (creating the file if needed), update MODIFIED requirements while leaving their untouched scenarios intact, delete REMOVED requirements, and move RENAMED requirements to their new names. Do not delegate the merge to a background task — step 5 would move `changeRoot` out from under a sync that is still reading it, leaving the change archived and the main specs never updated.

   Then re-run the comparison from the top of this step against every capability that has a delta spec in `artifactPaths.specs.existingOutputPaths` — not only the ones the sync reports it touched. A successful sync leaves nothing left to apply, so each capability must now read as already synced:
   - ADDED requirements present
   - MODIFIED requirements carrying the scenario and description changes named in the delta, with their other scenarios intact
   - REMOVED requirements gone
   - RENAMED requirements present under the new name and absent under the old one

   If the sync failed, or any capability does not match, report what differs and stop — do not archive. Nothing has moved and `changeRoot` is intact, so the user can fix the mismatch or re-run the sync and start the archive again.

5. **Perform the archive**

   Create an `archive` directory under `planningHome.changesDir` if it doesn't exist:
   ```bash
   mkdir -p "<planningHome.changesDir>/archive"
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move `changeRoot` to the archive directory

   ```bash
   mv "<changeRoot>" "<planningHome.changesDir>/archive/YYYY-MM-DD-<name>"
   ```

6. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Spec sync status (synced / sync skipped / no delta specs)

**Output On Success**

```markdown
## Change Closed

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** the archive path derived from `planningHome.changesDir`/YYYY-MM-DD-<name>/
**Specs:** <"✓ Synced to main specs" only if the step 4 verification passed; otherwise "No delta specs" or "Sync skipped">

All tracked tasks complete, including the ATD closure tasks.
```

**Output On Gate Failure**

```markdown
## Close Blocked

**Change:** <change-name>
**Schema:** <schema-name>

Apply state is not `all_done`. Incomplete items:
- [ ] <each missing artifact or unchecked task>

Finish these with `atd-change-apply`, then run close again. Close has no override.
```

**Guardrails**
- Always prompt for change selection if not provided
- Accept only `atd-sdlc` and `atd-sdlc-lite` changes; direct others to the generic archive workflow
- Never archive unless `openspec instructions apply --json` reports `state: "all_done"` — no override, no exceptions
- Never perform publication, Jira closure, or any other closure work here — that work lives in the apply-phase closure tasks
- Preserve .openspec.yaml when moving to archive (it moves with the directory)
- If sync is requested, perform the delta-spec merge inline (agent-driven) and verify it before archiving
- Never archive while a spec sync is still in flight — merge inline and verify the main specs before moving `changeRoot`
- If delta specs exist, always run the sync assessment and show the combined summary before prompting

**ATD journey**

This is step 5 of 5 in the ATD journey (triage → continue → apply → verify → close): `atd-change-triage` → `atd-change-continue` → `atd-change-apply` → `atd-change-verify` → `atd-change-close`.

This is the final step: a successful archive completes the journey. Incomplete work always routes back to `atd-change-apply`.
