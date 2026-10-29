Merge a change's delta specs into the main specs, without archiving the change. You merge by hand, so anything the delta does not mention stays exactly as it is.

**Steps**

1. **Pick the change.** Use the name given, the one from the conversation, or the only active change. Otherwise run `openspec list --json` and ask, listing changes that have delta specs. Say "Using change: <name>" and how to pick another.

2. **Find the delta specs.** Run `openspec status --change "<name>" --json`. Main specs live under `<planningHome.root>/openspec/specs/` (the store, when one is selected). `artifactPaths.specs.existingOutputPaths` is the only source of delta spec paths. If it is missing or empty, report that there are no delta specs to sync and stop, without inferring them from other artifacts.

   Sync every listed path unless the caller narrowed the set by naming complete entries from `existingOutputPaths` (copy those absolute values verbatim; for example, the entry ending in `/specs/billing/invoices/spec.md`). Then sync only those and leave the rest untouched. Never widen a narrowed set back to the full list. If a named path is not in `existingOutputPaths`, report it and stop. If the named list is empty, report that there is nothing to sync and stop.

3. **Get the specs rules once.** Before the first main-spec write, run `openspec instructions specs --change "<name>" --json`, or reuse the snapshot a calling workflow already fetched. If the lookup exits non-zero or returns invalid JSON, report the error and stop before writing any main spec; a failure is not the same as having no rules. A valid response with no `rules` means none are configured. Apply returned `rules` only to the main specs this merge produces, never copying their text into a spec or summary.

4. **Merge each delta.** For each selected path, read the delta and its main spec at `<planningHome.root>/openspec/specs/<capability-path>/spec.md` (`<capability-path>` is the spec directory relative to `specs/`; keep the delta's full path). If the main spec does not exist yet, or removing requirements would leave it with none, follow `references/merge-rules.md`. Otherwise apply each operation in place:

   - **ADDED**: add the requirement. If it already exists, update it to match (an implicit MODIFIED).
   - **MODIFIED**: replace the requirement with the delta's version, in place. When its heading starts with an ID in brackets (`[AUTH-3]`), find the requirement with that ID even if the name was reworded, or, if none has it yet, the one whose name matches with the ID left out or written without brackets; otherwise find it by name. A MODIFIED block carries the whole requirement - body plus every scenario that survives the change. `openspec validate` and `openspec archive` both reject one that drops a scenario the main spec still has. If today's requirement says something the block does not, and this change did not set out to remove it, keep it: the main spec changed after the delta was written.
   - **REMOVED**: delete the whole requirement block.
   - **RENAMED**: find the FROM requirement and rename it to TO.
   - **`## Purpose` in the delta**: leave the main spec's Purpose alone (this is what `openspec archive` does).

   Never copy a delta file into a main spec as-is: requirements live under one `## Requirements` section, with `### Requirement:` headings and `#### Scenario:` scenarios, and no `## ADDED/MODIFIED/REMOVED/RENAMED Requirements` headers.

5. **Validate.** Run `openspec validate --specs` with the same selected-root flags used earlier. If validation fails, report the problems and do not claim the sync succeeded.

6. **Show summary**: per capability, the requirements added, modified, removed, and renamed; any spec created or retired; and any new spec left with a TBD Purpose, so it gets written now. End with: "Main specs are updated. The change remains active - archive it when implementation is complete."

**Guardrails**
- The operation is idempotent: running it twice gives the same result
- If something is unclear, ask for clarification
