/**
 * Skill + command templates for the readiness pipeline — Phase 3: discover.
 *
 * The largely-automated stage: builds full context from the inputs and both
 * prior reports, cross-references code, and finalises the requirements docs.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import {
  READINESS_REPORT_FILENAME,
  REVIEW_REPORT_FILENAME,
  DISCOVERY_REPORT_FILENAME,
  PRODUCT_REQUIREMENTS_FILENAME,
  ENGINEERING_REQUIREMENTS_FILENAME,
} from '../../config.js';

const DESCRIPTION =
  'Phase 3 of the ClearSpec readiness pipeline: the largely-automated stage that builds full context, cross-references code, and finalises product-requirements.md and engineering-requirements.md. Use when the user wants to run discovery, consolidate requirements, or cross-reference requirements against the code.';

// Shared cross-cutting instructions used by every readiness-pipeline stage.
const CROSS_CUTTING = `**Cross-cutting rules for every readiness stage**

- **Resolve all paths relative to \`clearspec/\` cross-platform.** Reports live under \`clearspec/reports/\`, requirements documents under \`clearspec/requirements/\`, and repositories under \`clearspec/code/\`. Never hardcode \`/\` or \`\\\` — join folder and file names with the host OS path separator.
- **Load prior state before doing anything.** Read this stage's own prior output (if any), both prior-stage reports under \`clearspec/reports/\`, and the existing requirements documents under \`clearspec/requirements/\` into context first, then continue from the recorded state. Update documents in place — preserve prior understanding, open questions, and decisions rather than overwriting wholesale.
- **Run whether or not prior outputs exist.** If neither your own output nor the expected prior-stage reports are present, begin from scratch and gather what you can for this phase.
- **Gather inputs from any format and any source.** Inputs — including any pre-existing Product Requirements or Engineering Requirements documents — may arrive as Markdown, Confluence pages, Google Docs, PDFs, or a combination, and from any source: connected MCP servers (e.g. Confluence, Google Drive), files under \`clearspec/requirements/\` or \`clearspec/context/\`, or dropped directly into the conversation. Use whichever sources are present; do not assume inputs exist only as files under \`clearspec/\`. Degrade gracefully when an expected MCP source is unreachable — flag it rather than erroring. Treat any provided requirements docs as **inputs** and seed material, distinct from the finalised \`${PRODUCT_REQUIREMENTS_FILENAME}\`/\`${ENGINEERING_REQUIREMENTS_FILENAME}\` this stage produces.`;

const REQUIREMENTS_GUIDANCE = `**Consolidate Product Requirements before Engineering Requirements**

Work through Product Requirements **first**, then Engineering Requirements.

- **Product Requirements** describe, in product/customer/team outcome terms (not technical implementation): the current state; the desired outcome and what must change to achieve it; risks; assumptions; the number of teams involved; and dependencies. For full-stack or frontend work, mention UX designs and request them when appropriate — treat their absence as acceptable rather than blocking.
- **Engineering Requirements** cover the current architecture and what must change technically: the broad architectural approach; affected services and how they interact; data contracts between services; whether service configuration must change; the deployment and rollout process; current and required levels of testing/monitoring/alerting; the source-control and rollout strategy during development (such as feature flags); risks; upstream consumers of anything being changed; technical implementations of the business rules from the Product Requirements; and any prior design or architectural decisions and alternatives that must be upheld.
- If the Product Requirements cannot be fully completed before engineering work must continue, **record the missing product information clearly as known gaps** and carry those gaps into the validity and completeness assessment of **every** subsequent verification cycle rather than silently skipping them.`;

const VERIFICATION_CYCLES = `**Verification cycles and finalisation**

Proceed in verification cycles. After each batch of answers:

1. Re-assess the **validity, completeness, and quality** of the gathered requirements.
2. If information is still insufficient, list the outstanding questions and ask them **one at a time** (with a recommended answer), then repeat.
3. Each cycle, update \`clearspec/reports/${DISCOVERY_REPORT_FILENAME}\`, \`clearspec/requirements/${PRODUCT_REQUIREMENTS_FILENAME}\`, and \`clearspec/requirements/${ENGINEERING_REQUIREMENTS_FILENAME}\`. Each requirements document has a structured breakdown of the requirements **plus a metadata section at the top** recording status, open questions, completeness, quality, and what remains to reach a satisfactory state.

When **both** the Product and Engineering Requirements are assessed as complete and of sufficient quality, update both documents to indicate a **finalised** status.`;

const BODY = `Run **Phase 3** of the ClearSpec readiness pipeline: the largely-automated stage that builds up the whole context from the inputs and both prior reports, cross-references the code, and produces the discovery report plus the finalised requirements documents.

This phase is *largely* automated but MAY still pause to ask clarifying questions or start a discussion when it discovers an issue it cannot resolve from the available material.

${CROSS_CUTTING}

**Steps**

1. **Load prior state and seed from reports.** Read the inputs, \`clearspec/reports/${READINESS_REPORT_FILENAME}\`, \`clearspec/reports/${REVIEW_REPORT_FILENAME}\`, any existing \`clearspec/reports/${DISCOVERY_REPORT_FILENAME}\`, and the existing requirements documents. Use the two prior reports (and any Product/Engineering Requirements provided as inputs) as **seed material** for the requirements documents rather than starting from nothing. Degrade gracefully if a prior report is missing.

2. **Request and cross-reference code.** Ask for the relevant repositories to be cloned into \`clearspec/code/\`. Once code is present, cross-reference the requirements against it at the key areas to be modified and confirm the requirements line up with the code. This is the stage that brings code into the pipeline — code exploration is owned by \`discover\`, not by the earlier stages.

3. **Surface open questions and conflicts.** When cross-referencing raises open questions, raise them to the user for answering. When a question cannot be answered, or a conflict or inherent risk between the code and the requirements is found, **explicitly record it in the engineering requirements document**.

${REQUIREMENTS_GUIDANCE}

${VERIFICATION_CYCLES}

**Output**

- \`clearspec/reports/${DISCOVERY_REPORT_FILENAME}\` — the discovery report (updated every cycle).
- \`clearspec/requirements/${PRODUCT_REQUIREMENTS_FILENAME}\` and \`clearspec/requirements/${ENGINEERING_REQUIREMENTS_FILENAME}\` — the finalised requirements documents, each with a status metadata header.`;

export function getDiscoverSkillTemplate(): SkillTemplate {
  return {
    name: 'clearspec-discover',
    description: DESCRIPTION,
    instructions: BODY,
    license: 'MIT',
    compatibility: 'Requires clearspec CLI.',
    metadata: { author: 'clearpoint', version: '1.0' },
  };
}

export function getClsxDiscoverCommandTemplate(): CommandTemplate {
  return {
    name: 'CLSX: Discover',
    description: 'Phase 3: build full context, cross-reference code, and finalise the requirements docs',
    category: 'Workflow',
    tags: ['workflow', 'readiness', 'experimental'],
    content: `Run **Phase 3** of the ClearSpec readiness pipeline via \`/clsx:discover\`: the largely-automated stage that builds up the whole context from the inputs and both prior reports, cross-references the code, and produces the discovery report plus the finalised requirements documents.

This phase is *largely* automated but MAY still pause to ask clarifying questions when it discovers an issue it cannot resolve from the available material.

${CROSS_CUTTING}

**Steps**

1. **Load prior state and seed from reports.** Read the inputs, \`clearspec/reports/${READINESS_REPORT_FILENAME}\`, \`clearspec/reports/${REVIEW_REPORT_FILENAME}\`, any existing \`clearspec/reports/${DISCOVERY_REPORT_FILENAME}\`, and the existing requirements documents. Seed the requirements documents from the two prior reports and any provided requirements inputs. Degrade gracefully if a prior report is missing.

2. **Request and cross-reference code.** Ask for the relevant repositories to be cloned into \`clearspec/code/\`, then cross-reference the requirements against the code at the key areas to be modified and confirm they line up.

3. **Surface open questions and conflicts.** Raise open questions to the user; explicitly record unanswerable questions, conflicts, or inherent risks between code and requirements in the engineering requirements document.

${REQUIREMENTS_GUIDANCE}

${VERIFICATION_CYCLES}

**Output:** \`clearspec/reports/${DISCOVERY_REPORT_FILENAME}\`, \`clearspec/requirements/${PRODUCT_REQUIREMENTS_FILENAME}\`, and \`clearspec/requirements/${ENGINEERING_REQUIREMENTS_FILENAME}\` (each requirements doc with a status metadata header).`,
  };
}
