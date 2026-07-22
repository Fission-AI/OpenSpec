/**
 * ATD change-triage workflow templates (skill + slash command).
 *
 * Entry point for the ATD two-schema model: classifies a Jira ticket against
 * the lite-eligibility decision table and creates the change with the
 * confirmed schema (atd-sdlc or atd-sdlc-lite).
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';

const TRIAGE_INSTRUCTIONS = `Classify a Jira ticket as lite or full and create the change with the confirmed schema.

${STORE_SELECTION_GUIDANCE}

**Input**: A Jira ticket key or URL (e.g. \`ABC-1234\`). If none was provided, ask for it.

**Steps**

1. **Read the ticket**

   Pull the Jira issue (and linked Confluence pages) via the Atlassian MCP.
   If the MCP is unavailable, ask the developer to paste the ticket content.
   Do NOT run the full intake/grilling here — that is the ticket artifact's job
   after the change exists.

2. **Bounded codebase preflight (mandatory before recommending lite)**

   Scoped to the ticket, lighter than an analysis document — only enough to
   classify safely:
   - Locate the owning component.
   - Inspect the relevant entry points and call path.
   - Identify existing tests or specifications covering the behavior.
   - Check for API contract, data, security, dependency, integration, and
     deployment impact.

3. **Evaluate the eligibility decision table** (canonical list below; the fork
   also maintains it in \`docs/atd/lite-eligibility.md\`)

   Eligibility conditions — ALL must pass for lite:
   1. Single repository and single component
   2. Small, localized file impact
   3. Restores existing intended behavior (no new behavior)
   4. Existing acceptance criteria, specification, or test already defines the behavior
   5. No API contract change
   6. No database/schema/data migration
   7. No authentication, authorization, security, privacy, or compliance impact
   8. No cross-service integration behavior change
   9. No new dependency
   10. No deployment or infrastructure change
   11. Straightforward automated regression test exists or is easy to add
   12. Trivial rollback
   13. No new functional or technical documentation needed (localized corrections to existing docs stay lite-eligible)

   Rules:
   - Any condition that fails OR cannot be confidently evaluated from the
     ticket or the inspected code → **full**. Uncertainty is never lite.
   - Risk, never line count: a one-line change to an authorization condition,
     SQL WHERE clause, or financial calculation routes **full** regardless of
     size.

4. **Present the recommendation and confirm (monotonic)**

   Show the recommendation WITH the specific condition evaluations that drove
   it (quote failed/uncertain conditions verbatim).
   - Recommendation is **lite**: the developer may confirm lite or strengthen
     to full.
   - Recommendation is **full**: full is mandatory. If the developer asks for
     lite, decline and quote the failed or uncertain conditions.

5. **Create the change and write the triage record**

   \`\`\`bash
   openspec new change <ticket-key>-<short-slug> --schema <chosen> --json
   \`\`\`

   Change names are kebab-case: LOWERCASE the Jira key in the change name
   (\`ABC-1234\` → \`abc-1234-fix-export\`). Keep the uppercase form only for
   Jira display and lookups.

   Parse the JSON output and take \`change.path\` from it — NEVER assume the
   change lives under the current repository's \`openspec/changes/\` (the CLI
   can resolve another planning root or store).

   Write \`triage.md\` under that returned path containing: the recommendation,
   each condition's evaluation, and the developer's confirmed choice.

   **NEVER create or modify \`ticket.md\`** — artifact completion is determined
   by output-file existence; a partial ticket.md would mark the ticket artifact
   complete and silently skip intake, completeness checking, grilling, and
   write-back. The ticket artifact reads triage.md and folds the routing record
   in when it runs.

6. **Hand off**

   Tell the developer the change was created with schema \`<chosen>\` and that
   the next step is the \`ticket\` artifact (e.g. via the continue/apply
   workflow).

**triage.md format**

\`\`\`markdown
# Triage: <ticket-key>

**Recommendation:** atd-sdlc-lite | atd-sdlc
**Confirmed choice:** atd-sdlc-lite | atd-sdlc (developer: <name/date>)

## Condition evaluations

| Condition | Result | Evidence |
|-----------|--------|----------|
| Single repo/component | pass | <owning component, from preflight> |
| ... | pass / FAIL / UNCERTAIN | ... |

## Escalations

<!-- Appended by the lite workflow if a full-workflow trigger is found later:
     trigger, previous schema, new schema, reason. -->
\`\`\`

**Guardrails**

- Uncertainty always routes full. Never guess a condition to pass.
- Never weaken full → lite through confirmation; strengthening lite → full is allowed.
- Never write ticket.md or any artifact output file.
- Always write triage.md under the \`--json\`-returned change path.
- Quote condition evaluations — the record must let a reviewer audit the routing.`;

export function getAtdTriageSkillTemplate(): SkillTemplate {
  return {
    name: 'atd-change-triage',
    description:
      'Classify a Jira ticket against the ATD lite-eligibility table and create the change with the confirmed schema (atd-sdlc or atd-sdlc-lite). Use when starting work on a Jira ticket.',
    instructions: TRIAGE_INSTRUCTIONS,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxAtdTriageCommandTemplate(): CommandTemplate {
  return {
    name: 'atd-triage',
    description: 'Triage a Jira ticket to the lite or full ATD schema and create the change',
    category: 'Workflow',
    tags: ['workflow', 'atd', 'triage'],
    content: TRIAGE_INSTRUCTIONS,
  };
}
