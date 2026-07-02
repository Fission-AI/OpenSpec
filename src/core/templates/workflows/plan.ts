/**
 * Skill Template Workflow Modules
 *
 * The plan skill: work above a single change. A stance, not a workflow —
 * modeled on explore mode.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';

const PLAN_BODY = `Enter plan mode. Work above a single change: start from the user's end destination, map the in-flight changes against it, and keep the two in sync.

**This is a stance, not a workflow.** No fixed steps, no required sequence, no mandatory outputs. Follow what the conversation needs.

---

## The shape you work with

A plan lives in one folder: \`openspec/plan/\` — in this repo, or in a store the team shares.

- **The destination comes first.** A \`product.md\`, \`roadmap.md\`, \`architecture.md\`, a collection of folders — whatever artifact name or convention the user already has. One file is a valid plan.
- **Numbered folders are stages, when the user wants visible order.** \`00_goal/\`, \`01_requirements/\` — the numbers are the sequence; the names and contents are theirs. Optional, never required.
- **Changes point up at the plan**, with one line in their \`.openspec.yaml\`: \`plan: local\` (this repo's plan) or \`plan: <store-id>\` (a store's plan). There is no list to maintain anywhere.

## Where you are decides what you do

Check your cwd and what exists — the folders carry the workflow, not job titles. Anyone can pick up from what is on disk.

- **At the plan folder (or repo root):** show where the effort stands. \`ls openspec/plan/\` for what exists; \`openspec list --plan --json\` (add \`--store <id>\` for a shared plan) for every change pointing at it, with live task status.
- **Inside a stage or artifact folder:** everything lower-numbered (and every unnumbered file) is upstream — read it; this folder's artifact is what you produce.
- **In \`openspec/changes/\` or a change:** that is change work — use the change skills (\`/opsx:apply\`, \`/opsx:continue\`), pulling the plan in as upstream context.

## Ways of moving

**Map in-flight changes.** When a destination exists but changes are not linked yet: run \`openspec list --changes\`, read the destination, propose which changes serve this plan, and — with the user's confirmation — add the \`plan:\` line to each one's \`.openspec.yaml\`. This mapping is the point: destination in, in-flight work mapped against it.

**Translate down.** Take the most complete artifact and help produce the next one — one altitude at a time. When you decompose into work items, make each one self-contained: someone could pick any single item up without reading the others. Surface merge/split judgment calls to the user; don't decide silently.

**Bridge to changes.** When a work item is ready, make it real:

\`\`\`bash
openspec new change <name> --plan local        # plan lives in this repo
openspec new change <name> --plan <store-id>   # plan lives in a store
\`\`\`

The \`--plan\` line is the whole link. Status flows back with no bookkeeping.

**Sync up.** Compare \`openspec list --plan\` against the destination. Update the high level to match reality; name drift plainly instead of papering over it.

**Filter input.** If the plan has a vision or goal file, weigh new input against it. Park contradicting input in a cut file (e.g. \`notes/cut.md\`) with one line of why — preserved, not lost.

## Write less

Plans die of verbosity.

- One page per artifact. Longer means cut or split.
- Prefer a table to prose, a line to a paragraph.
- No file paths or code snippets in upstream artifacts — they rot.
- Never restate another artifact; point to it.

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
