Implement the tasks of an OpenSpec change, one checkbox at a time.

**Input**: Optionally specify a change name (e.g., `/openspec-beta-apply add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

0. **Check it is time to build.** If this same response already wrote a plan (propose, ff, new, or continue), stop: present the plan and let the user start apply in their next message, even if the request asked for both.

1. **Pick the change.** Use the name given, the one from the conversation, or the only active change. Otherwise run `openspec list --json` and ask. Say "Using change: <name>" and how to pick another (`/openspec-beta-apply <other>`).

2. **Read the plan.**
   ```bash
   openspec status --change "<name>" --json
   openspec instructions apply --change "<name>" --json
   ```
   Status gives the `schemaName`, the `planningHome` and `changeRoot` paths, and `actionContext` (where code may be edited; for a store, where the implementation lives). The apply instructions give the `state`, the `instruction`, progress, each task with its `sourcePath` and `line`, `contextFiles` (artifact ID -> array of concrete file paths), and `missingArtifacts`. Use `context` and `operationGuidance` as **Context from the CLI** in SKILL.md says.

   - If `state: "blocked"`: show the message and pause implementation. If `missingArtifacts` is non-empty, suggest using `/openspec-beta-continue` to create them. Otherwise follow the CLI instruction to repair the tracking file. Do not assume another artifact is ready or start implementation while blocked.
   - If `state: "all_done"`: report that all tracked tasks are complete and suggest review or verification as appropriate before archiving.

3. **Read every file in `contextFiles`.** Use contextFiles from CLI output, don't assume specific file names. Show the schema, "N/M tasks complete", and what remains.

4. **Work through the tasks.** For each pending task: say which one, make the smallest change that fully does it, then mark it `- [ ]` → `- [x]` at its `sourcePath` and `line` (confirm that line still matches the task first; if not, rerun the apply instructions). Rerun the apply instructions to confirm progress moved. If building needed a decision the plan did not make, or a departure from it, update the design (and the specs, if behavior changed) to match, and say what you changed.

   **Pause and ask when:**
   - a task is unclear;
   - the work reveals a design problem (suggest updating the artifacts);
   - a task needs work beyond what the spec and tasks describe, or you are tempted to drop, narrow, defer, or accept exceptions to specified behavior to make it fit → surface the added scope and ask; do not absorb it silently;
   - an error blocks you, or the user interrupts.

5. **Report.** The tasks done this session and "N/M tasks complete". When all are done, say: "All tracked tasks are complete. Review or verify the change as appropriate before archiving." Then close it out: ask "Archive <name> now? (recommended)", and on yes run the `/openspec-beta-archive` workflow for it. If the user wants review first, leave it active. When paused, explain the issue, offer options, and wait.

**Guardrails**
- When a task needs work beyond what the spec describes, surface the added scope and pause - never silently narrow, defer, or simplify away specified behavior
- Only mark a task `- [x]` when its specified behavior is fully implemented, not when it is partially done or deferred
- Preserve CLI-controlled blocked/ready/all-done behavior and completion criteria
