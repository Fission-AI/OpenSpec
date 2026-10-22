/**
 * Verify: check an implementation against its change's tasks, specs, and
 * design, and report what is missing. Read-only.
 */
import type { SkillTemplate, CommandTemplate, SkillReference } from '../types.js';
import {
  BEFORE_YOU_START,
  withReferences,
} from './references.js';

/**
 * REMOVED and RENAMED requirements need a baseline from the main spec (or its
 * history) before there is anything to search for. Most changes only add or
 * modify, so the procedure lives in a reference.
 */
const REMOVED_AND_RENAMED_REFERENCE: SkillReference = {
  path: 'references/removed-and-renamed.md',
  content: `# Verifying REMOVED and RENAMED requirements

## REMOVED requirements

The change asks for the behavior to be gone, so invert the check:

  - A REMOVED block carries only the requirement name and any \`**Reason**\`/\`**Migration**\` notes, so the delta does not describe the behavior itself. Before searching, read the baseline requirement in the main spec at \`<planningHome.root>/openspec/specs/<capability-path>/spec.md\`, using the same capability path as the delta spec. Match it by normalized name, scanning that file's requirement headings rather than string-matching the delta's exact title. Its body and scenarios are the evidence for the behavior that must be gone; never search from the requirement name alone.
  - If that file holds no such requirement under this or a near-equivalent name - for example because an earlier sync already applied the removal - recover the baseline from the same file's history, in the planning repository rather than the current directory: \`git -C "<planningHome.root>" log -p -- openspec/specs/<capability-path>/spec.md\`, or \`git -C "<planningHome.root>" show <commit>^:./openspec/specs/<capability-path>/spec.md\` once you have identified the commit that applied the removal. Empty output means the pathspec matched nothing, not that there is no baseline: \`git log\` reports an unmatched path as success, so re-check the path before drawing any conclusion from silence.
  - A baseline that adds nothing to its own title - no body beyond a restatement of the name, no scenarios - is unusable evidence, the same as a missing one. If no usable baseline is available in either place, mark **Spec Coverage** as not verified for that entry with the reason and stop there: do not search, and never count an unsearched removal as passing.
  - Search codebase for that behavior. Matches in \`openspec/\` artifacts or docs, or in code that serves only the Migration note or an ADDED requirement, are not evidence by themselves. Report any code path that still delivers the removed behavior, including one shared with an ADDED requirement.
  - Finding no implementation is the expected result, but only once the baseline behavior was the thing you searched for. Never report a REMOVED requirement as "Requirement not found" or recommend implementing it.
  - If the behavior is still present:
    - Add CRITICAL issue: "Removed requirement still implemented: <requirement name>"
    - Recommendation: "Remove the remaining implementation at <file>:<lines>, following the requirement's Migration note if it has one"

## RENAMED requirements

For each \`FROM:\`/\`TO:\` entry the name changes but the behavior stays, so check the TO requirement for that unchanged behavior:

  - Do not report the FROM name as missing, and do not require code symbols, identifiers, or file names to be renamed.
  - If the TO name also appears under MODIFIED, its behavior is checked there against the MODIFIED text; skip it here.
  - Otherwise, read the baseline requirement in the main spec at \`<planningHome.root>/openspec/specs/<capability-path>/spec.md\`, using the same capability path as the delta spec: the requirement under the FROM name, or under the TO name only when the FROM name is absent because the main spec is already synced. Its body and scenarios are the evidence for the behavior the TO requirement keeps.
  - Search codebase for that behavior and assess if it is still implemented.
  - If it appears unimplemented:
    - Add CRITICAL issue: "Renamed requirement not found: <TO name>"
    - Recommendation: "Restore the behavior of <TO name> (renamed from <FROM name>); a rename must not change behavior"
  - If the baseline requirement cannot be found or read, mark **Spec Coverage** as not verified for that entry with the reason. Never count an unchecked rename as passing.
`,
};

/**
 * Rules for checks that cannot run cleanly. Most verifications have full
 * evidence, so these load only when a check is missing evidence or does not
 * apply.
 */
const EVIDENCE_RULES_REFERENCE: SkillReference = {
  path: 'references/evidence-rules.md',
  content: `# When evidence is missing or a check does not apply

## Not applicable vs. not verified

Mark checks the schema does not define, or artifacts the status reports as intentionally skipped, as **Not applicable**. The correctness checks of a change whose readable delta specs contain REMOVED or RENAMED requirements but no ADDED or MODIFIED requirements are also **Not applicable** (see step 6). Exclude them from skipped-check counts and the archive-readiness assessment. Reserve **Not verified** for applicable checks whose evidence is missing or unusable.

If only task evidence is available for applicable checks, verify task completion only and mark the remaining applicable checks, including **Code Pattern Consistency**, as not verified with the reason "Only task evidence available".

If artifacts cannot be read or contain no usable requirements, scenarios, or design decisions, mark the affected checks as not verified with the specific reason. Continue checks supported by the remaining evidence, but a partially checked input set is not a fully verified check. Missing requirements affect Spec Coverage and Requirement Implementation Mapping; missing scenarios affect Scenario Coverage; missing design decisions affect Design Adherence.

## Task Completion edge cases

- If \`taskTrackingConfigured\` is false, report **Task Completion** as not applicable. Do not treat empty \`tasks\` as missing evidence.
- If \`unavailableTrackingFiles\` is nonempty, mark **Task Completion** as not verified and include every unavailable path and reason. Continue using any readable task evidence, but do not infer completion from the partial \`tasks\` and \`progress\` fields.
- If \`taskTrackingConfigured\` is true and \`tasks\` is empty, mark **Task Completion** as not verified and record the reason from apply \`state\` and \`instruction\`. Nonzero totals alone do not establish evaluable task descriptions.
`,
};

const REFERENCES = [
  EVIDENCE_RULES_REFERENCE,
  REMOVED_AND_RENAMED_REFERENCE,
];

function getVerifyInstructions(input: string): string {
  return `Verify that an implementation matches the change artifacts (specs, tasks, design).

${BEFORE_YOU_START}

**Input**: ${input}

**Steps**

1. **Pick the change.** Use the name given, the one from the conversation, or the only active change. Otherwise run \`openspec list --json\` and ask; show all active changes returned by the list, including changes with \`status: "no-tasks"\`, with each one's schema, and mark those with incomplete tasks "(In Progress)". Say "Using change: <name>" and how to pick another (e.g., \`/opsx:verify <other>\`).

2. **Check status.** \`openspec status --change "<name>" --json\` gives the \`schemaName\`, which artifacts exist, and the \`planningHome\`, \`changeRoot\`, \`artifactPaths\`, and \`actionContext\` paths.

3. **Get planning context and load artifacts**

   \`\`\`bash
   openspec instructions apply --change "<name>" --json
   \`\`\`

   This returns the change directory, \`contextFiles\` (artifact ID -> array of concrete file paths), \`taskTrackingConfigured\`, and top-level \`tasks\` and \`progress\` aggregated from every concrete file matched by the schema's \`apply.tracks\` configuration that could be read. Read all available artifacts from \`contextFiles\`.

   Treat apply \`state\` and \`instruction\` as context, not a verification verdict. Do not implement tasks or archive the change during verification.

4. **Set up the report**: three dimensions, **Completeness** (tasks, spec coverage), **Correctness** (requirement implementation, scenario coverage), and **Coherence** (design adherence, code patterns), each with CRITICAL, WARNING, or SUGGESTION issues.

   Verification is advisory. Respect intentional omissions such as \`skip_specs: true\`, optional design documents, and schemas without task tracking. Do not require or invent optional or intentionally omitted artifacts to obtain a clean report. \`Not verified\` describes a limit of this report, not a new archive prerequisite. Archive retains its own checks and user-confirmation behavior.

   Some checks cannot run on usable evidence: the schema does not define them, the status reports an artifact skipped, only task evidence exists, or an artifact is unreadable or empty. Mark those **Not applicable** or **Not verified** exactly as \`references/evidence-rules.md\` describes; never score a skipped check as passing.

5. **Verify Completeness**

   **Task Completion**:
   - Use the top-level \`tasks\` and \`progress\` fields. They already aggregate every readable concrete file matched by \`apply.tracks\`, regardless of the tracked artifact's ID; do not infer tracking from a \`contextFiles\` key.
   - When task tracking is not configured, a tracking file is unavailable, or \`tasks\` is empty, follow the Task Completion rules in \`references/evidence-rules.md\`.
   - Report complete vs total tasks from \`progress\`.
   - If \`progress.remaining\` is greater than 0:
     - Add CRITICAL issue for each listed incomplete task. If the remaining count exceeds the listed incomplete tasks, also report the incomplete checkboxes without descriptions and recommend adding descriptions and completing them. Do not infer completion from the listed tasks alone.
     - Recommendation: "Complete task: <description>" or "Mark as done if already implemented"

   **Spec Coverage**:
   - If status marks the spec artifact skipped by \`skip_specs: true\`, or the schema defines no spec artifact (no artifact whose \`artifactPaths.<id>.outputPath\` is under \`specs/\`), report the spec-dependent checks as not applicable.
   - Otherwise, \`contextFiles\` is keyed by artifact id, and artifact ids come from the active schema, so do not assume an id such as \`specs\`. The spec artifacts are those whose \`artifactPaths.<id>.outputPath\` is under \`specs/\`; read their files from \`contextFiles.<id>\`. If those spec files are absent or empty, mark **Spec Coverage**, **Requirement Implementation Mapping**, and **Scenario Coverage** as not verified; do not treat any of them as clean.
   - If delta specs exist in those spec files:
     - Extract all requirements (marked with "### Requirement:", or listed as \`FROM:\`/\`TO:\` pairs under \`## RENAMED Requirements\`) and note the delta section each one sits under: \`## ADDED\`, \`## MODIFIED\`, \`## REMOVED\`, or \`## RENAMED Requirements\`. The section decides what the check looks for.
     - For each ADDED or MODIFIED requirement (for MODIFIED, check the text in the delta, not the old wording):
       - Search codebase for keywords related to the requirement
       - Assess if implementation likely exists
     - If ADDED or MODIFIED requirements appear unimplemented:
       - Add CRITICAL issue: "Requirement not found: <requirement name>"
       - Recommendation: "Implement requirement X: <description>"
     - For each REMOVED or RENAMED requirement, follow \`references/removed-and-renamed.md\`. Never report a REMOVED requirement as "Requirement not found", and never count an unchecked removal or rename as passing.

6. **Verify Correctness**

   If the delta specs are readable and contain at least one REMOVED or RENAMED requirement but no ADDED or MODIFIED requirements (the change only removes or renames requirements), report **Requirement Implementation Mapping** and **Scenario Coverage** as **Not applicable**. The REMOVED and RENAMED checks under Spec Coverage are the evidence for such a change (each REMOVED and RENAMED entry with a usable baseline is checked there against its baseline behavior, and an entry already marked not verified there stays not verified), so do not mark these two checks as not verified. A delta spec with no parseable requirements at all is unusable evidence, not a removal-only change: mark these checks as not verified.

   **Requirement Implementation Mapping**:
   - For each ADDED or MODIFIED requirement from delta specs (REMOVED entries, and RENAMED entries without a MODIFIED block, were settled under Spec Coverage):
     - Search codebase for implementation evidence
     - If found, note file paths and line ranges
     - Assess if implementation matches requirement intent
     - If divergence detected:
       - Add WARNING: "Implementation may diverge from spec: <details>"
       - Recommendation: "Review <file>:<lines> against requirement X"

   **Scenario Coverage**:
   - For each scenario under an ADDED or MODIFIED requirement in delta specs (marked with "#### Scenario:"):
     - Check if conditions are handled in code
     - Check if tests exist covering the scenario
     - If scenario appears uncovered:
       - Add WARNING: "Scenario not covered: <scenario name>"
       - Recommendation: "Add test or implementation for scenario: <description>"
   - Skip scenarios under a REMOVED requirement; that behavior is meant to be gone.

7. **Verify Coherence**

   **Design Adherence**:
   - If the schema defines no design artifact (no artifact with id \`design\`, and none whose \`artifactPaths.<id>.outputPath\` is or ends in \`design.md\`), report **Design Adherence** as not applicable.
   - If the design artifact's \`contextFiles.<id>\` file exists:
     - Extract key decisions (look for sections like "Decision:", "Approach:", "Architecture:")
     - Verify implementation follows those decisions
     - If contradiction detected:
       - Add WARNING: "Design decision not followed: <decision>"
       - Recommendation: "Update implementation or revise design.md to match reality"
   - Otherwise, if the design artifact's \`contextFiles.<id>\` file is absent or empty: mark **Design Adherence** as not verified. With other supporting artifacts, **Code Pattern Consistency** still runs; the task-only case remains limited to task completion.

   **Code Pattern Consistency**:
   - If implementation changes cannot be identified, mark **Code Pattern Consistency** as not verified and explain the missing evidence.
   - Otherwise, review new code for consistency with project patterns
   - Check file naming, directory structure, coding style
   - If significant deviations found:
     - Add SUGGESTION: "Code pattern deviation: <details>"
     - Recommendation: "Consider following project pattern: <example>"

8. **Generate Verification Report**

   **Summary Scorecard**:
   \`\`\`markdown
   ## Verification Report: <change-name>

   ### Summary
   | Dimension    | Status           |
   |--------------|------------------|
   | Completeness | X/Y tasks, N reqs|
   | Correctness  | M/N reqs covered |
   | Coherence    | Followed/Issues  |
   \`\`\`

   In each Status cell, report the results of checks that ran and \`Not verified (<reason>)\` for every skipped check. If all checks in a dimension were skipped, start the cell with \`Not verified\`. Never score a skipped check as passing. Treat every not verified or partially verified check as skipped in the final assessment. Count only ADDED and MODIFIED requirements in N, and report REMOVED and RENAMED requirements separately (for example, "1 removal confirmed, 1 rename verified", or "1 removal not verified (baseline unavailable)"). For a change that only removes or renames requirements, the Correctness cell reads \`Not applicable (no ADDED or MODIFIED requirements)\`.

   **Issues by Priority**:

   1. **CRITICAL** (Must fix before archive):
      - Incomplete tasks
      - Missing requirement implementations
      - Removed requirements still implemented
      - Renamed requirements whose behavior is no longer implemented
      - Each with specific, actionable recommendation

   2. **WARNING** (Should fix):
      - Spec/design divergences
      - Missing scenario coverage
      - Each with specific recommendation

   3. **SUGGESTION** (Nice to fix):
      - Pattern inconsistencies
      - Minor improvements
      - Each with specific recommendation

   **Final Assessment**:
   - If CRITICAL issues: "X critical issue(s) found. Fix before archiving." If any check was skipped, also name every skipped check and its reason.
   - If no CRITICAL issues, one or more warnings, and no checks were skipped: "No critical issues. Y warning(s) to consider. Ready for archive (with noted improvements)."
   - If only suggestions and no checks were skipped: "No critical issues or warnings. Z suggestion(s) to consider. Ready for archive (with noted improvements)."
   - If no issues and no checks were skipped: "All checks passed. Ready for archive."
   - If any check was skipped and there are no CRITICAL issues: do not claim readiness. Say "No critical issues found in the checks that ran. <check(s)> not verified: <reason>." Include the warning count when nonzero.
   - Include the suggestion count when nonzero in every final assessment.

**How to judge**: rely on checkboxes and requirement lists for completeness, and on keyword search and reasonable inference for correctness, without demanding certainty. When unsure, choose the lower severity. Every issue gets a specific recommendation with a \`file.ts:123\` reference where one applies; never a vague "consider reviewing".`;
}

export function getVerifyChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-verify-change',
    description: 'Verify implementation matches OpenSpec change artifacts. Use when the user wants to validate that implementation is complete, correct, and coherent before archiving. Also use when the user says "openspec verify" or "opsx verify".',
    instructions: getVerifyInstructions(
      'Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.'
    ),
    references: REFERENCES,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxVerifyCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Verify',
    description: 'Verify implementation matches change artifacts before archiving',
    category: 'Workflow',
    tags: ['workflow', 'verify', 'experimental'],
    content: withReferences(
      getVerifyInstructions(
        'Optionally specify a change name after `/opsx:verify` (e.g., `/opsx:verify add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.'
      ),
      REFERENCES
    ),
  };
}
