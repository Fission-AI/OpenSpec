/**
 * Skill + command templates for the readiness pipeline — Phase 1: check-readiness.
 *
 * A quick, mechanical assessment of whether the project inputs are in good
 * enough shape to proceed to the deeper review (Phase 2) and discovery (Phase 3).
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import {
  READINESS_REPORT_FILENAME,
  REVIEW_REPORT_FILENAME,
  DISCOVERY_REPORT_FILENAME,
} from '../../config.js';

const DESCRIPTION =
  'Phase 1 of the ClearSpec readiness pipeline: a quick, mechanical check that project inputs are in good enough shape to proceed. Use when the user wants to assess project readiness, verify inputs are sufficient, or gate before a deep review.';

// Shared cross-cutting instructions used by every readiness-pipeline stage.
const CROSS_CUTTING = `**Cross-cutting rules for every readiness stage**

- **Resolve all paths relative to \`clearspec/\` cross-platform.** Reports live under \`clearspec/reports/\` and requirements documents under \`clearspec/requirements/\`. Never hardcode \`/\` or \`\\\` — join folder and file names with the host OS path separator.
- **Load prior state before doing anything.** Read this stage's own prior output (if any) and any prior-stage reports under \`clearspec/reports/\` into context first, then continue from the recorded state. Update documents in place — preserve prior understanding, open questions, and decisions rather than overwriting wholesale.
- **Run whether or not prior outputs exist.** If neither your own output nor the expected prior-stage reports are present, begin from scratch and gather what you can for this phase.
- **Gather inputs from any format and any source.** Inputs — including any pre-existing Product Requirements or Engineering Requirements documents — may arrive as Markdown, Confluence pages, Google Docs, PDFs, or a combination, and from any source: connected MCP servers (e.g. Confluence, Google Drive), files under \`clearspec/requirements/\` or \`clearspec/context/\`, or dropped directly into the conversation. Use whichever sources are present; do not assume inputs exist only as files under \`clearspec/\`. Degrade gracefully when an expected MCP source is unreachable — flag it rather than erroring. Treat any provided requirements docs as **inputs**, distinct from the finalised \`product-requirements.md\`/\`engineering-requirements.md\` that \`/clsx:discover\` produces.`;

const BODY = `Run **Phase 1** of the ClearSpec readiness pipeline: a quick, mechanical assessment of whether the project inputs are in good enough shape to proceed to a deeper review.

This is a cheap gate on input quality. It runs **before** the more expensive dialog in \`/clsx:deep-review\` (Phase 2) and the automated context build in \`/clsx:discover\` (Phase 3).

${CROSS_CUTTING}

**Steps**

1. **Load prior state.** Read \`clearspec/reports/${READINESS_REPORT_FILENAME}\` if it already exists so you can update it in place rather than recreating it. (The later stages own \`clearspec/reports/${REVIEW_REPORT_FILENAME}\` and \`clearspec/reports/${DISCOVERY_REPORT_FILENAME}\` — you do not write those.)

2. **Gather the inputs.** Collect the supplied input documents from every available source (see the cross-cutting rules): supporting documents under \`clearspec/requirements/\` and \`clearspec/context/\`, anything reachable via connected MCPs, and anything provided directly in the conversation.

3. **Mechanically assess presence and sufficiency.** For each input, judge whether it is present and whether it is substantial enough to support the Product and Engineering requirements that Phases 2 and 3 will build. Do **not** inspect, explore, or cross-reference code — code is a \`/clsx:discover\` (Phase 3) concern.

4. **Flag missing or insufficient inputs as correctable issues.** Where an expected input is absent or too thin, record it as a flagged issue the user can fix — never silently treat a gap as acceptable.

5. **Capture assumptions and risks.** Where you can infer an assumption or identify a risk from the available inputs, record it.

6. **Write or update the readiness report.** Write/update \`clearspec/reports/${READINESS_REPORT_FILENAME}\` with a metadata header at the top recording: **status**, **flagged issues**, **assumptions**, **risks**, **input completeness**, and **what is still missing**. Update in place, preserving prior recorded understanding.

**Do NOT**

- Do **not** run the deep, one-question-at-a-time interview — that is \`/clsx:deep-review\` (Phase 2).
- Do **not** inspect or cross-reference code — that is \`/clsx:discover\` (Phase 3).

**Re-running**

Re-running after the user corrects or adds inputs is an explicit, supported loop: re-assess the inputs and update \`${READINESS_REPORT_FILENAME}\` in place to reflect the corrected inputs.

**Next step**

When inputs are in good enough shape, direct the user to \`/clsx:deep-review\` (Phase 2).`;

export function getCheckReadinessSkillTemplate(): SkillTemplate {
  return {
    name: 'clearspec-check-readiness',
    description: DESCRIPTION,
    instructions: BODY,
    license: 'MIT',
    compatibility: 'Requires clearspec CLI.',
    metadata: { author: 'clearpoint', version: '1.0' },
  };
}

export function getClsxCheckReadinessCommandTemplate(): CommandTemplate {
  return {
    name: 'CLSX: Check Readiness',
    description: 'Phase 1: quick, mechanical check that project inputs are ready for a deeper review',
    category: 'Workflow',
    tags: ['workflow', 'readiness', 'experimental'],
    content: `Run **Phase 1** of the ClearSpec readiness pipeline via \`/clsx:check-readiness\`: a quick, mechanical assessment of whether the project inputs are in good enough shape to proceed to a deeper review.

This is a cheap gate on input quality. It runs **before** the more expensive dialog in \`/clsx:deep-review\` (Phase 2) and the automated context build in \`/clsx:discover\` (Phase 3).

${CROSS_CUTTING}

**Steps**

1. **Load prior state.** Read \`clearspec/reports/${READINESS_REPORT_FILENAME}\` if it already exists so you can update it in place rather than recreating it.

2. **Gather the inputs.** Collect the supplied input documents from every available source (see the cross-cutting rules): supporting documents under \`clearspec/requirements/\` and \`clearspec/context/\`, anything reachable via connected MCPs, and anything provided directly in the conversation.

3. **Mechanically assess presence and sufficiency.** Judge whether each input is present and substantial enough to support the Product and Engineering requirements that Phases 2 and 3 will build. Do **not** inspect or cross-reference code.

4. **Flag missing or insufficient inputs as correctable issues.** Never silently treat a gap as acceptable.

5. **Capture assumptions and risks** you can infer from the available inputs.

6. **Write or update the readiness report** at \`clearspec/reports/${READINESS_REPORT_FILENAME}\` with a metadata header recording status, flagged issues, assumptions, risks, input completeness, and what is still missing. Update in place.

**Do NOT** run the deep interview (that is \`/clsx:deep-review\`) and do **not** inspect code (that is \`/clsx:discover\`).

**Re-running** after the user corrects inputs is supported: re-assess and update the report in place. When inputs are in good enough shape, direct the user to \`/clsx:deep-review\`.`,
  };
}
