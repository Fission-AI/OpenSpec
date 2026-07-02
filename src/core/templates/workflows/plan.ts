/**
 * Skill Template Workflow Modules
 *
 * The plan skill: work above a single change. A stance, not a workflow —
 * modeled on explore mode.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';

const PLAN_BODY = `Enter plan mode. Work above a single change: help turn high-level intent into changes, and show where the whole effort stands.

**This is a stance, not a workflow.** No fixed steps, no required sequence, no mandatory outputs. Follow what the conversation needs.

---

## The shape you work with

A plan lives in one folder: \`openspec/plan/\` — in this repo, or in a store the team shares.

- **Numbered folders are stages, in order.** \`00_goal/\`, \`01_requirements/\`, \`02_changes/\` — the numbers are the sequence; the names and contents are the user's own. Any artifact goes: a roadmap, a PRD, personas, decisions, a feature table.
- **Unnumbered files and folders are ambient context.** Vision, meeting notes, glossary — always worth reading, never a stage.
- **Changes point up at the plan**, with one line in their \`.openspec.yaml\`: \`plan: local\` (this repo's plan) or \`plan: <store-id>\` (a store's plan). There is no list to maintain anywhere.

## Orient first

Read the folders, not job titles — anyone can pick up from what is on disk.

- \`ls openspec/plan/\` — which stages exist and which are still empty tells you where the effort stands.
- \`openspec list --plan --json\` (add \`--store <id>\` for a shared plan) — every change pointing at the plan, with live task status.

## Ways of moving

**Translate down.** Take the most complete stage and help produce the next one — one altitude at a time. When you decompose into work items, make each one self-contained: someone could pick any single item up without reading the others. Surface merge/split judgment calls to the user; don't decide silently.

**Bridge to changes.** The last stage is where the plan meets execution. When a work item is ready, make it real:

\`\`\`bash
openspec new change <name> --plan local        # plan lives in this repo
openspec new change <name> --plan <store-id>   # plan lives in a store
\`\`\`

The \`--plan\` line is the whole link. Status flows back with no bookkeeping.

**Sync up.** Compare \`openspec list --plan\` against the upstream stages. Update the high level to match reality; name drift plainly instead of papering over it.

**Filter input.** If the plan has a vision or goal file, weigh new input against it. Park contradicting input in a cut file (e.g. \`notes/cut.md\`) with one line of why — preserved, not lost.

## Write less

Plans die of verbosity.

- One page per artifact. Longer means cut or split.
- Prefer a table to prose, a line to a paragraph.
- No file paths or code snippets in upstream artifacts — they rot.
- Never restate another stage; point to it.

## Stay above the code

Reading code to ground the plan is fine. Writing code is not plan work — that belongs to a change (\`/opsx:apply\`).

---

${STORE_SELECTION_GUIDANCE}`;

export function getPlanSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-plan',
    description:
      'Enter plan mode - work above a single change. Use when turning high-level intent (a roadmap, PRD, vision) into changes, or when asked where the whole effort stands.',
    instructions: PLAN_BODY,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxPlanCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Plan',
    description:
      'Enter plan mode - turn high-level intent into changes and see where the effort stands',
    category: 'Workflow',
    tags: ['workflow', 'planning', 'experimental'],
    content: PLAN_BODY,
  };
}
