/**
 * Skill + command templates for the readiness pipeline — Phase 2: deep-review.
 *
 * The interactive stage: a relentless, one-question-at-a-time dialog that
 * resolves the open questions and flags raised by Phase 1.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { READINESS_REPORT_FILENAME, REVIEW_REPORT_FILENAME } from '../../config.js';

const DESCRIPTION =
  'Phase 2 of the ClearSpec readiness pipeline: a relentless, one-question-at-a-time dialog that resolves the flags and open questions from the readiness check. Use when the user wants to run the deep review, grill the requirements, or resolve open questions before discovery.';

// Shared cross-cutting instructions used by every readiness-pipeline stage.
const CROSS_CUTTING = `**Cross-cutting rules for every readiness stage**

- **Resolve all paths relative to \`clearspec/\` cross-platform.** Reports live under \`clearspec/reports/\` and requirements documents under \`clearspec/requirements/\`. Never hardcode \`/\` or \`\\\` — join folder and file names with the host OS path separator.
- **Load prior state before doing anything.** Read this stage's own prior output (if any) and any prior-stage reports under \`clearspec/reports/\` into context first, then continue from the recorded state. Update documents in place — preserve prior understanding, open questions, and decisions rather than overwriting wholesale.
- **Run whether or not prior outputs exist.** If neither your own output nor the expected prior-stage reports are present, begin from scratch and gather what you can for this phase.
- **Gather inputs from any format and any source.** Inputs — including any pre-existing Product Requirements or Engineering Requirements documents — may arrive as Markdown, Confluence pages, Google Docs, PDFs, or a combination, and from any source: connected MCP servers (e.g. Confluence, Google Drive), files under \`clearspec/requirements/\` or \`clearspec/context/\`, or dropped directly into the conversation. Use whichever sources are present; do not assume inputs exist only as files under \`clearspec/\`. Degrade gracefully when an expected MCP source is unreachable — flag it rather than erroring. Treat any provided requirements docs as **inputs**, distinct from the finalised \`product-requirements.md\`/\`engineering-requirements.md\` that \`/clsx:discover\` produces.`;

// Shared dialog-style instructions.
const DIALOG_STYLE = `**Dialog style (relentless grill-me / grilling)**

- Ask **one question at a time** and wait for the answer before asking the next. Never present multiple questions in one bewildering block.
- **Provide a recommended answer for every question**, so the user can confirm quickly or correct you.
- **Explore the available input documents before asking.** If a question can be answered from the provided material (under \`clearspec/requirements/\` and \`clearspec/context/\`, via MCP, or in the conversation, in any format), answer it yourself and only ask the user when the answer cannot be determined from that material.
- Do **not** explore or cross-reference code — code cross-referencing is deferred to \`/clsx:discover\` (Phase 3).`;

const BODY = `Run **Phase 2** of the ClearSpec readiness pipeline: a guided, interactive dialog (user + customer + agent) that resolves the open questions and flags raised by \`/clsx:check-readiness\` (Phase 1), across both product and engineering concerns.

${CROSS_CUTTING}

**Steps**

1. **Load prior state.** Read \`clearspec/reports/${READINESS_REPORT_FILENAME}\` (the Phase 1 flags and open questions) and any existing \`clearspec/reports/${REVIEW_REPORT_FILENAME}\` so you can continue from the recorded state. If the readiness report is missing, degrade gracefully: gather what inputs you can and proceed.

2. **Gather the inputs** from every available source (see the cross-cutting rules).

${DIALOG_STYLE}

3. **Run the dialog.** Work through the flags and open questions one question at a time, resolving both product and engineering concerns. Explore the inputs to self-answer wherever possible; ask only what you genuinely cannot determine.

4. **If an input file itself must change**, stop finalising: direct the user to correct the inputs and re-run \`/clsx:check-readiness\` (a return to Phase 1). Do **not** attempt to finalise the review over inputs you have judged unsound.

5. **Record findings.** Once the inputs are sound and the dialog has resolved the outstanding questions, write the additional findings, answers, and discoveries to \`clearspec/reports/${REVIEW_REPORT_FILENAME}\` plus any supporting artifacts under \`clearspec/reports/\`. Record any **outstanding questions and concerns in the report's metadata section** so they persist across sessions.

**Do NOT**

- Do **not** explore or cross-reference code — that is \`/clsx:discover\` (Phase 3).
- Do **not** produce the finalised \`product-requirements.md\`/\`engineering-requirements.md\` — those are \`/clsx:discover\`'s output.

**Next step**

When the review is complete, direct the user to \`/clsx:discover\` (Phase 3).`;

export function getDeepReviewSkillTemplate(): SkillTemplate {
  return {
    name: 'clearspec-deep-review',
    description: DESCRIPTION,
    instructions: BODY,
    license: 'MIT',
    compatibility: 'Requires clearspec CLI.',
    metadata: { author: 'clearpoint', version: '1.0' },
  };
}

export function getClsxDeepReviewCommandTemplate(): CommandTemplate {
  return {
    name: 'CLSX: Deep Review',
    description: 'Phase 2: relentless one-question-at-a-time dialog to resolve the readiness flags',
    category: 'Workflow',
    tags: ['workflow', 'readiness', 'experimental'],
    content: `Run **Phase 2** of the ClearSpec readiness pipeline via \`/clsx:deep-review\`: a guided, interactive dialog that resolves the open questions and flags raised by \`/clsx:check-readiness\` (Phase 1), across both product and engineering concerns.

${CROSS_CUTTING}

**Steps**

1. **Load prior state.** Read \`clearspec/reports/${READINESS_REPORT_FILENAME}\` and any existing \`clearspec/reports/${REVIEW_REPORT_FILENAME}\` so you can continue from the recorded state. If the readiness report is missing, degrade gracefully.

2. **Gather the inputs** from every available source (see the cross-cutting rules).

${DIALOG_STYLE}

3. **Run the dialog**, working through the flags and open questions one question at a time across product and engineering concerns. Explore the inputs to self-answer wherever possible.

4. **If an input file itself must change**, direct the user to correct the inputs and re-run \`/clsx:check-readiness\` rather than finalising over unsound inputs.

5. **Record findings** to \`clearspec/reports/${REVIEW_REPORT_FILENAME}\` plus any supporting artifacts, recording outstanding questions and concerns in the report's metadata section.

**Do NOT** explore or cross-reference code (that is \`/clsx:discover\`), and do **not** write the finalised requirements documents. When the review is complete, direct the user to \`/clsx:discover\`.`,
  };
}
