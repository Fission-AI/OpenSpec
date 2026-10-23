Archive several completed changes in one confirmed batch. The CLI archives each change: it merges the change's delta specs, validates them, and moves it, or refuses and changes nothing. Your part is deciding, from the codebase, whose specs win when two changes touch the same capability.

**Input**: None required (prompts for selection)

**Steps**

1. **List and choose.** Run `openspec list --json`; if there are no active changes, say "No active changes found. Create a new change to get started." and stop. Ask the user to choose changes (multi-select). Show each change name and task status from the list output, and include an "All changes" option. **IMPORTANT**: Do NOT auto-select. Always let the user choose.

   Then run `openspec instructions archive --change "<selected-change>" --json` once for one selected change. Use `context` and `operationGuidance` as **Context from the CLI** in SKILL.md says. This lookup is advisory: if it fails or returns invalid JSON, continue with neither.

2. **Check each change.** From the `openspec list --json` output (with the same selected-root flags), find the entry in `changes` whose `name` exactly matches each change, and require nonnegative integer `totalTasks` and `completedTasks`, with `completedTasks <= totalTasks`. Incomplete tasks = `totalTasks - completedTasks`. If a change is missing, duplicated, or miscounted, report it and stop. The CLI counts only `x`/`X` checkbox markers as complete; other markers remain incomplete. Never infer completion from artifact status or the absence of a `tasks.md`.

   Run `openspec status --change "<name>" --json` for each and note its `schemaName`, any artifact neither `done` nor `skipped`, and its delta specs: `artifactPaths.specs.existingOutputPaths` is the only source; never infer them from other artifacts. Note each delta's `<capability-path>` (the spec directory relative to `specs/`) and its requirement names.

3. **Resolve conflicts.** Build a map keyed by `<capability-path>`, the exact path relative to `specs/`:

   ```text
   identity/user-auth -> [change-a, change-b]  <- CONFLICT (2+ changes)
   billing/user-auth  -> [change-c]            <- OK (different full path)
   ```

   A conflict exists when 2+ selected changes have delta specs for the exact same `<capability-path>`. Read each conflicting delta and search the code and tests for what is implemented:
   - Only one is implemented: apply that delta and exclude the other.
   - Both are implemented: apply both in chronological order (older first). `openspec archive` refuses an ADDED requirement that already exists, so when the later change ADDs a requirement the earlier one already added, send that later delta through sync, like a partly excluded change below.
   - Neither is implemented: exclude both and warn.

   Record an inclusion or exclusion decision for every delta spec, keyed by change and `<capability-path>`, with the evidence you found. A single change can have both included and excluded delta specs. A change whose deltas are all excluded is archived with `--skip-specs`. If a change has both included and excluded deltas, follow `references/sync.md` for that change with only its included delta paths. Archive it with `--skip-specs` only once sync reports every included path merged; otherwise record the change as failed and leave it active.

4. **Confirm once.** Show one table:

   ```markdown
   | Change            | Artifacts | Tasks | Specs   | Conflicts              | Status |
   |-------------------|-----------|-------|---------|------------------------|--------|
   | schema-management | Done      | 5/5   | 2 delta | None                   | Ready  |
   | add-oauth         | Done      | 4/4   | 1 delta | identity/user-auth (!) | Ready* |
   | add-verify-skill  | 1 left    | 2/5   | None    | None                   | Warn   |
   ```

   Under it, each conflict's resolution (for example, "identity/user-auth spec: Will apply add-oauth then add-jwt (both implemented, chronological order)") and each warning. Ask one question: "Archive all N changes", "Archive only the N ready changes (skip incomplete)", or "Cancel".

   Route on the answer by intent, not by exact label:
   - "Cancel" — stop, do not archive. Report that nothing was archived and skip the remaining steps.
   - The archive-everything option — continue with every selected change.
   - The ready-only option — continue with only the changes the status table marks `Ready` or `Ready*`, and record the rest as Skipped. If a skipped change was a conflict partner, re-derive that conflict using only the changes being archived.
   - Anything else — ask again rather than archiving.

5. **Archive each change, in resolved order.**
   ```bash
   openspec archive "<name>" --json --yes
   ```
   Add `--skip-specs` when all of its deltas are excluded. Never pass `--no-validate`. The confirmation in step 4 is what `--yes` stands for. An `archive` object means it was archived. Otherwise the CLI refused and changed nothing for that change: record it as Failed with each `status` message (for example `archive_target_exists`), and continue with the rest of the batch. If a failed change was the earlier half of a conflict, re-derive that conflict before archiving its partner.

6. **Summarize.**

   ```markdown
   ## Bulk Archive Complete

   Archived 2 changes:
   - schema-management -> archive/2026-01-19-schema-management/
   - add-oauth -> archive/2026-01-19-add-oauth/

   Skipped 1 change:
   - add-verify-skill (user chose not to archive incomplete)

   Spec sync summary:
   - 3 delta specs merged into main specs
   - 1 delta spec sync skipped (add-jwt, identity/user-auth: implementation not found)
   - 1 conflict resolved (identity/user-auth: synced add-oauth, skipped add-jwt)
   ```

   List any Failed change with its reason.

**Guardrails**
- Never archive after the user cancels the confirmation — a cancelled batch archives nothing
- Let `openspec archive` merge, validate, and move each change. Do not edit main specs or move change directories by hand
- Report every excluded delta as `sync skipped` with its change, `<capability-path>`, and reason; that is distinct from skipping the archive
- A failed change never stops the rest of the batch
