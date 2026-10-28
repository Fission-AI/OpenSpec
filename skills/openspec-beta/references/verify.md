Verify that an implementation matches the change artifacts (specs, tasks, design).

**Steps**

1. **Pick the change.** Use the name given, the one from the conversation, or the only active change. Otherwise run `openspec list --json` and ask; show all active changes returned by the list, including changes with `status: "no-tasks"`, with each one's schema, and mark those with incomplete tasks "(In Progress)". Say "Using change: <name>" and how to pick another (e.g., `/openspec-beta-verify <other>`).

2. **Check status.** `openspec status --change "<name>" --json` gives the `schemaName`, which artifacts exist, and the `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext` paths.

3. **Get planning context and load artifacts**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns the change directory, `contextFiles` (artifact ID -> array of concrete file paths), `taskTrackingConfigured`, and top-level `tasks` and `progress` aggregated from every concrete file matched by the schema's `apply.tracks` configuration that could be read. Read all available artifacts from `contextFiles`.

   Treat apply `state` and `instruction` as context, not a verification verdict. Do not implement tasks or archive the change during verification.

4. **Set up the report**: three dimensions, **Completeness** (tasks, spec coverage), **Correctness** (requirement implementation, scenario coverage), and **Coherence** (design adherence, code patterns), each with CRITICAL, WARNING, or SUGGESTION issues.

   Verification is advisory. Respect intentional omissions such as `skip_specs: true`, optional design documents, and schemas without task tracking. Do not require or invent optional or intentionally omitted artifacts to obtain a clean report. `Not verified` describes a limit of this report, not a new archive prerequisite. Archive retains its own checks and user-confirmation behavior.

   Some checks cannot run on usable evidence: the schema does not define them, the status reports an artifact skipped, only task evidence exists, or an artifact is unreadable or empty. Mark those **Not applicable** or **Not verified** exactly as `references/evidence-rules.md` describes; never score a skipped check as passing.

5. **Verify Completeness**

   **Task Completion**:
   - Use the top-level `tasks` and `progress` fields. They already aggregate every readable concrete file matched by `apply.tracks`, regardless of the tracked artifact's ID; do not infer tracking from a `contextFiles` key.
   - When task tracking is not configured, a tracking file is unavailable, or `tasks` is empty, follow the Task Completion rules in `references/evidence-rules.md`.
   - Report complete vs total tasks from `progress`.
   - If `progress.remaining` is greater than 0:
     - Add CRITICAL issue for each listed incomplete task. If the remaining count exceeds the listed incomplete tasks, also report the incomplete checkboxes without descriptions and recommend adding descriptions and completing them. Do not infer completion from the listed tasks alone.
     - Recommendation: "Complete task: <description>" or "Mark as done if already implemented"

   **Spec Coverage**:
   - If status marks the spec artifact skipped by `skip_specs: true`, or the schema defines no spec artifact (no artifact whose `artifactPaths.<id>.outputPath` is under `specs/`), report the spec-dependent checks as not applicable.
   - Otherwise, `contextFiles` is keyed by artifact id, and artifact ids come from the active schema, so do not assume an id such as `specs`. The spec artifacts are those whose `artifactPaths.<id>.outputPath` is under `specs/`; read their files from `contextFiles.<id>`. If those spec files are absent or empty, mark **Spec Coverage**, **Requirement Implementation Mapping**, and **Scenario Coverage** as not verified; do not treat any of them as clean.
   - If delta specs exist in those spec files:
     - Extract all requirements (marked with "### Requirement:", or listed as `FROM:`/`TO:` pairs under `## RENAMED Requirements`) and note the delta section each one sits under: `## ADDED`, `## MODIFIED`, `## REMOVED`, or `## RENAMED Requirements`. The section decides what the check looks for.
     - For each ADDED or MODIFIED requirement, search the code for it (for MODIFIED, the delta's text, not the old wording). If it appears unimplemented:
       - Add CRITICAL issue: "Requirement not found: <requirement name>"
       - Recommendation: "Implement requirement X: <description>"
     - For each REMOVED or RENAMED requirement, follow `references/removed-and-renamed.md`. Never report a REMOVED requirement as "Requirement not found", and never count an unchecked removal or rename as passing.

6. **Verify Correctness**

   If the delta specs are readable and contain at least one REMOVED or RENAMED requirement but no ADDED or MODIFIED requirements (the change only removes or renames requirements), report **Requirement Implementation Mapping** and **Scenario Coverage** as **Not applicable**. The REMOVED and RENAMED checks under Spec Coverage are the evidence for such a change (each REMOVED and RENAMED entry with a usable baseline is checked there against its baseline behavior, and an entry already marked not verified there stays not verified), so do not mark these two checks as not verified. A delta spec with no parseable requirements at all is unusable evidence, not a removal-only change: mark these checks as not verified.

   **Requirement Implementation Mapping**:
   - For each ADDED or MODIFIED requirement from delta specs (REMOVED entries, and RENAMED entries without a MODIFIED block, were settled under Spec Coverage):
     - Find the code that implements it (note file paths and line ranges) and check it matches the requirement's intent. If it diverges, add WARNING: "Implementation may diverge from spec: <details>", recommending "Review <file>:<lines> against requirement X".

   **Scenario Coverage**:
   - For each scenario under an ADDED or MODIFIED requirement in delta specs (marked with "#### Scenario:"):
     - Check the code handles it and a test covers it. If not, add WARNING: "Scenario not covered: <scenario name>", recommending "Add test or implementation for scenario: <description>".
     - Where you can run it without changing project files or data, such as the test that covers it or a read-only command, do, and report what you saw. A scenario you ran and saw fail means its requirement is not implemented (CRITICAL).
   - Skip scenarios under a REMOVED requirement; that behavior is meant to be gone.

7. **Verify Coherence**

   **Design Adherence**:
   - If the schema defines no design artifact (no artifact with id `design`, and none whose `artifactPaths.<id>.outputPath` is or ends in `design.md`), report **Design Adherence** as not applicable.
   - If the design artifact's `contextFiles.<id>` file exists:
     - Check the code follows its key decisions (sections like "Decision:", "Approach:", "Architecture:"). If one is contradicted, add WARNING: "Design decision not followed: <decision>", recommending "Update implementation or revise design.md to match reality".
   - Otherwise, if the design artifact's `contextFiles.<id>` file is absent or empty: mark **Design Adherence** as not verified. With other supporting artifacts, **Code Pattern Consistency** still runs; the task-only case remains limited to task completion.

   **Code Pattern Consistency**:
   - If implementation changes cannot be identified, mark **Code Pattern Consistency** as not verified and explain the missing evidence.
   - Otherwise, check the new code follows the project's file naming, structure, and style. For a significant deviation, add SUGGESTION: "Code pattern deviation: <details>", recommending "Consider following project pattern: <example>".

8. **Generate Verification Report**

   **Summary Scorecard**:
   ```markdown
   ## Verification Report: <change-name>

   ### Summary
   | Dimension    | Status           |
   |--------------|------------------|
   | Completeness | X/Y tasks, N reqs|
   | Correctness  | M/N reqs covered |
   | Coherence    | Followed/Issues  |
   ```

   In each Status cell, report the results of checks that ran and `Not verified (<reason>)` for every skipped check. If all checks in a dimension were skipped, start the cell with `Not verified`. Never score a skipped check as passing. Treat every not verified or partially verified check as skipped in the final assessment. Count only ADDED and MODIFIED requirements in N, and report REMOVED and RENAMED requirements separately (for example, "1 removal confirmed, 1 rename verified", or "1 removal not verified (baseline unavailable)"). For a change that only removes or renames requirements, the Correctness cell reads `Not applicable (no ADDED or MODIFIED requirements)`.

   **Issues by Priority**, each with a specific recommendation:

   | Priority | Means | For |
   |---|---|---|
   | **CRITICAL** | must fix before archive | incomplete tasks; missing requirement implementations; removed requirements still implemented; renamed requirements whose behavior is no longer implemented |
   | **WARNING** | should fix | spec or design divergences; missing scenario coverage |
   | **SUGGESTION** | nice to fix | pattern inconsistencies; minor improvements |

   **Final Assessment**:
   - If CRITICAL issues: "X critical issue(s) found. Fix before archiving." If any check was skipped, also name every skipped check and its reason.
   - If no CRITICAL issues, one or more warnings, and no checks were skipped: "No critical issues. Y warning(s) to consider. Ready for archive (with noted improvements)."
   - If only suggestions and no checks were skipped: "No critical issues or warnings. Z suggestion(s) to consider. Ready for archive (with noted improvements)."
   - If no issues and no checks were skipped: "All checks passed. Ready for archive."
   - If any check was skipped and there are no CRITICAL issues: do not claim readiness. Say "No critical issues found in the checks that ran. <check(s)> not verified: <reason>." Include the warning count when nonzero.
   - Include the suggestion count when nonzero in every final assessment.
   - If there are CRITICAL issues, offer to add each one as an unchecked task in the change's tasks file, so apply picks them up. Write nothing unless the user agrees.

**How to judge**: rely on checkboxes and requirement lists for completeness, and on keyword search and reasonable inference for correctness, without demanding certainty. Say which scenarios you ran and which you inferred from the code. If this session also wrote the code, say so: a session that did not build it reads the specs without the builder's assumptions. When unsure, choose the lower severity. Every issue gets a specific recommendation with a `file.ts:123` reference where one applies; never a vague "consider reviewing".
