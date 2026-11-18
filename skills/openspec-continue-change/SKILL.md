---
name: openspec-continue-change
description: Continue working on an OpenSpec change by creating the next artifact. Use when the user wants to progress their change, create the next artifact, or continue their workflow. Also use when the user says "openspec continue" or "opsx continue".
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Continue working on a change by creating the next artifact.

**Stores:** If the user names a store, or the work lives in one, read `../openspec/references/stores.md` before your first command and follow it.

**Project check:** Before the first step that writes anything, run `openspec list --json` and read `root`. If `root` is `null`, or a `status` error starts with `Declared in` or `Invalid store declaration in`, read `../openspec/references/project-check.md` and follow it before you do anything else.

## Gotchas

- **Change a promise where it lives.** If an existing requirement already promises the behavior, or the opposite of it, change that requirement with MODIFIED. Never add a second requirement that repeats or contradicts it. Only a promise no requirement makes gets its own ADDED requirement.
- **One SHALL per requirement.** Do not add a SHALL to a requirement that has one. If a requirement you modify already makes several promises, keep one and move each other into its own ADDED requirement, scenarios included, so no promise is stated twice.
- **Every task says how to check it.** Keep tasks small, and give each one the test or command that shows it is done, with the scenario's exact values. Add tests only for behavior the change makes or restores, and plan the update of any existing test the change will break.
- **Make the last message easy to take in at a glance.** Lead with what was done and where. Put each decision, assumption or problem the user should check on its own line. Leave out what the files already say and checks that found nothing. End with the next step.
- **A fix that brings the code back to what a spec already promises changes no spec.** Write no delta for it: add `skip_specs: true` to the change's `.openspec.yaml`, and name in the proposal the requirement the fix restores.
- **Specs say what is true afterward.** Write each delta as current behavior, never as history ("no longer", "as before"). To retire a scenario, replace its requirement: REMOVED under the old name, ADDED under a new name. Run `openspec validate "<name>" --strict` before you show the plan, and fix what it reports.
- **Read the plan back before you show it.** Reread every artifact together and fix four things: places where the proposal, specs, design and tasks disagree; anything the request did not ask for; scenarios a test could not check as written (give exact values, outputs and errors); and any case the request covers that the plan leaves out.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes sorted by most recently modified, and ask the user to select one

   When prompting, present the top 3-4 most recently modified changes as options, showing:
   - Change name
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from `lastModified` field)

   Mark the most recently modified change as "(Recommended)" since it's likely what the user wants to continue.

   Always announce: "Using change: <name>" and how to override (e.g., `openspec-continue-change <other>`).

2. **Check current status**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand current state. The response includes:
   - `schemaName`: The workflow schema being used (e.g., "spec-driven")
   - `artifacts`: Array of artifacts with their status ("done", "skipped", "ready", "blocked")
   - `isPlanningComplete`: Boolean indicating if all planning artifacts are complete. Older CLI versions expose the same value as `isComplete`.
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context. Use these instead of assuming repo-local paths.

3. **Act based on status**:

   ---

   **Before anything else, finish a partly written artifact**:
   - An artifact whose output is a glob pattern (e.g. `specs/**/*.md`) reads `done` as soon as one matching file exists, so a run interrupted while writing its files leaves it `done` with some still missing
   - For each such `done` artifact, first get its instructions and read any completed dependencies needed to determine the expected files. Then compare those files with `artifactPaths.<id>.existingOutputPaths`. For spec-driven's `specs`, read the proposal and check for one `specs/<capability-path>/spec.md` per capability it lists; resolve each expected path against `changeRoot` before comparing path identity, and verify each one remains inside `changeRoot` after resolving symlinks, both in its parent directories and in the file itself if it already exists
   - Never write an expected path that fails that check; stop and tell the user. If any are missing, write only the missing files, each at its checked path - when the `instruction` field delegates creation to a skill or command, invoke it only if it can write each file to its checked path; otherwise stop and tell the user - and STOP - that counts as this invocation's ONE artifact. If you cannot tell whether a file was left out on purpose, ask the user

   ---

   **If all planning artifacts are complete (`isPlanningComplete: true`, or legacy `isComplete: true`)**:
   - Congratulate the user
   - Show final status including the schema used
   - Suggest: "Planning is complete! Review the plan before starting implementation."
   - STOP

   ---

   **If artifacts are ready to create** (status shows artifacts with `status: "ready"`):
   - Pick the FIRST artifact with `status: "ready"` from the status output
   - Get its instructions:
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```
   - Parse the JSON. The key fields are:
     - `context`: Project background (constraints for you - do NOT include in output)
     - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
     - `template`: The structure to use for your output file
     - `instruction`: Schema-specific guidance
     - `resolvedOutputPath`: Resolved path or pattern to write the artifact
     - `dependencies`: Completed artifacts to read for context (entries with `skipped: true` have no files - do not look for them)
     - `skipped`/`warning`: present when the change declares skip_specs and this artifact must NOT be created - pick another artifact
   - **Create the artifact file**:
     - Read any completed dependency files for context - always re-read them from disk, even if you saw them earlier in the conversation (the user may have edited them)
     - Choose the output path before creating anything. If the `resolvedOutputPath` specified in instructions is a glob pattern, choose a concrete path inside `changeRoot` using the schema instruction and the change's context, and verify it remains inside `changeRoot` after resolving symlinks, both in its parent directories and in the file itself if it already exists; if it does not, stop and tell the user. Otherwise the output path is `resolvedOutputPath`
     - If the `instruction` field delegates creation to a specific skill or command, invoke it only if it can write the artifact to that output path; otherwise stop and tell the user
     - Otherwise, write it yourself:
       - Use `template` as the structure - fill in its sections
       - Apply `context` and `rules` as constraints when writing - but do NOT copy them into the file
       - Write the file to that output path
     - Either way, verify the artifact file exists at that output path
   - Show what was created and what's now unlocked
   - STOP after creating ONE artifact

   ---

   **If no artifacts are ready (all blocked)**:
   - This shouldn't happen with a valid schema
   - Show status and suggest checking for issues

4. **After creating an artifact, show progress**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After each invocation, show:
- Which artifact was created
- Schema workflow being used
- Current progress (N/M complete)
- What artifacts are now unlocked
- Prompt: "Want to continue? Just ask me to continue or tell me what to do next."

**Artifact Creation Guidelines**

The artifact types and their purpose depend on the schema. The `instruction` field from the instructions output is the authoritative guidance for each artifact - follow it even when the artifact has a familiar name (proposal.md, tasks.md, etc.), since custom schemas may define different content or a different process for the same file names.

If the `instruction` field directs you to use a specific skill or command to create the artifact, invoke it instead of writing the artifact directly - but only once you have chosen and checked the output path, and only if it can write there.

**Guardrails**
- Create ONE artifact per invocation
- Always read dependency artifacts before creating a new one - re-read from disk, not from conversation memory (files may have changed since you last saw them)
- Never skip artifacts or create out of order
- If context is unclear, ask the user before creating
- Verify the artifact file exists after writing before marking progress
- Use the schema's artifact sequence, don't assume specific artifact names
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output
