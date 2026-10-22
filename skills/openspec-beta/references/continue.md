Continue working on a change: create its next artifact, one per invocation.

**Steps**

1. **Pick the change.** Use the name given, the one from the conversation, or the only active change. Otherwise run `openspec list --json` to get available changes sorted by most recently modified, and ask the user to select one.

   When prompting, present the top 3-4 most recently modified changes as options, showing:
   - Change name
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from `lastModified` field)

   Mark the most recently modified change as "(Recommended)" since it's likely what the user wants to continue. Say "Using change: <name>" and how to pick another (`/openspec-beta-continue <other>`).

2. **Check status.**
   ```bash
   openspec status --change "<name>" --json
   ```
   Note `schemaName`, each artifact's `status` ("done", "skipped", "ready", "blocked"), `isPlanningComplete` (older CLI versions call it `isComplete`), and the `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext` paths. Use these instead of assuming repo-local paths.

3. **Act on the status.**

   **Before anything else, finish a partly written artifact**:
   - An artifact whose output is a glob pattern (e.g. `specs/**/*.md`) reads `done` as soon as one matching file exists, so a run interrupted while writing its files leaves it `done` with some still missing
   - For each such `done` artifact, first get its instructions and read any completed dependencies needed to determine the expected files. Then compare those files with `artifactPaths.<id>.existingOutputPaths`. For spec-driven's `specs`, read the proposal and check for one `specs/<capability-path>/spec.md` per capability it lists; resolve each expected path against `changeRoot` before comparing path identity, and verify each one remains inside `changeRoot` after resolving symlinks, both in its parent directories and in the file itself if it already exists
   - Never write an expected path that fails that check; stop and tell the user. If any are missing, write only the missing files, each at its checked path - when the `instruction` field delegates creation to a skill or command, invoke it only if it can write each file to its checked path; otherwise stop and tell the user - and STOP - that counts as this invocation's ONE artifact. If you cannot tell whether a file was left out on purpose, ask the user

   **If all planning artifacts are complete (`isPlanningComplete: true`, or legacy `isComplete: true`)**: say "Planning is complete! You can now implement this change. Once implementation and any tracked work are complete, archive it.", show the final status with the schema, and STOP.

   **If artifacts are ready to create**: pick the FIRST artifact with `status: "ready"`, write it as `references/writing-an-artifact.md` describes (pick another if its instructions say `skipped`), show what is now unlocked, and STOP after creating ONE artifact.

   **If no artifacts are ready (all blocked)**: this shouldn't happen with a valid schema. Show the status and suggest checking for issues.

4. **Show progress**: `openspec status --change "<name>"`, which artifact was created, and "Want to continue? Just ask me to continue or tell me what to do next."

Write the artifact as `references/writing-an-artifact.md` describes.

**Guardrails**
- Create ONE artifact per invocation, in the schema's order
- If context is unclear, ask the user before creating
