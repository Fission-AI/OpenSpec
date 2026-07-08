/**
 * Skill Template Workflow Modules
 *
 * The initiatives skill: work above a single change. Routed by what is on
 * disk; every move ends in a short numbered menu of real next actions.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';

const INITIATIVES_BODY = `Work above a single change: keep the evergreen truths current, run initiatives to completion, and keep the in-flight changes mapped against both.

**Route by what is on disk — look before asking.** The folders carry the workflow, not job titles; anyone can pick up from what exists.

---

## The shape you work with

The planning layer lives in one folder: \`openspec/initiatives/\` — in this repo, or in a store the team shares.

- **Unnumbered top-level files are evergreen artifacts** — the standing truths every initiative serves: \`product.md\`, \`roadmap.md\`, \`architecture.md\`, whatever names the user already uses. They are maintained forever, the way specs are.
- **Each subfolder is one initiative** — a finite piece of work above a single change. Contents are freeform. Numbered folders inside an initiative are ordered stages, and their names are the team's own workflow: \`00_product/ 01_engineering/\` for one team, \`00_analysis/ 01_product/ 02_design/ 03_engineering/\` for another. Everything lower-numbered is upstream. Any document works at any stage — a ProductSpec file, a PRD, an RFC, design notes; position carries the meaning, not the format.
- **Changes point up** with one line in their \`.openspec.yaml\`: \`initiative: <name>\` (this root) or \`initiative: <store-id>/<name>\` (a store's initiative). There is no list to maintain anywhere.

The same loop runs at both altitudes: work flows down (an initiative decomposes into changes), truth flows up (finishing work updates the evergreen artifacts, the way archiving a change updates specs), and status flows back live through \`openspec list --initiatives\`.

## Start from state

Run \`openspec list --initiatives --json\` (add \`--store <id>\` for a shared portfolio) before saying anything, then route:

- **No initiatives folder yet** → offer to capture the conversation (below). Do not lecture about the feature first.
- **A portfolio exists, no initiative named** → open with where everything stands, in a few lines, from live status — then the menu.
- **Working one initiative** → the moves below, with everything upstream (evergreen files, lower-numbered stages) read first.
- **In \`openspec/changes/\` or a change** → that is change work — use the change skills (\`/opsx:apply\`, \`/opsx:continue\`), pulling the initiative in as upstream context.

What drives your reactions must be structured facts from disk — a task checked off, a change archived, a change pointing at an initiative — never your memory of prose. Read state fresh; propose what to do about it.

## The moves

**Capture the conversation.** When the intent lives in the chat and no artifact exists yet, synthesize what you already know into one — do NOT re-interview the user. One page, their words. Standing truths go in an evergreen file; a finite effort becomes \`openspec/initiatives/<name>/\` (create the folder yourself — \`mkdir\` is the whole ceremony).

**Advance the workflow.** The transition rule is one sentence: read everything upstream of where you stand (evergreen files, lower-numbered stages), then produce what your stage owes the next one. Never re-interview for what an upstream artifact already answers — cite it; when upstream is silent on something you need, say so and ask once. This one rule is why no persona needs its own skill: a PM filling \`00_product/\`, a designer filling \`01_design/\`, and an engineer decomposing the last stage into changes are all making the same move from different positions.

**Ideate from what exists.** Read the evergreen artifacts, the initiative's files, and live change status; propose directions grounded in them — each with a one-line basis pointing at what it serves. Name what you are NOT proposing and why, in one line each.

**Push back — twice, then move on.** When a goal is vague ("improve UX"), a metric can only go up, or a problem is stated as a feature, ask one sharper question using the user's own words. One question per message; offer numbered options when they scaffold the answer. After two rounds, capture what you have and note what is worth revisiting — planning is iterative.

**Decompose and bridge.** Cut the initiative into tracer-bullet slices: each end-to-end and demoable alone, so anyone could pick one up without reading the others. Each slice should trace to something upstream — an acceptance criterion, a requirement, a decision; a slice that serves nothing upstream gets questioned out loud. Surface merge/split judgment calls; don't decide silently. When a slice is ready, make it real:

\`\`\`bash
openspec new change <name> --initiative <name>              # initiative in this root
openspec new change <name> --initiative <store-id>/<name>   # initiative in a store
\`\`\`

The change IS the handoff: born linked, self-contained, ready for whoever — or whatever agent — picks it up next. Status flows back with no bookkeeping.

**Sync up.** Compare \`openspec list --initiatives\` against the evergreen artifacts. When an initiative's changes are complete, that is the trigger to update the truths it served — and to say plainly what drifted instead of papering over it.

**Filter input.** Weigh new input against the evergreen artifacts. Park what contradicts them in a cut file (e.g. \`notes/cut.md\`) with one line of why — preserved, not lost.

## End every move in a menu

Close with 2–4 numbered options computed from what is actually on disk — never a paragraph of suggestions. Exactly one option is marked **(recommended)**. Every option is a real next action: a command to run, a change to start, an artifact to write. Examples of state-driven options: no changes linked yet → "map the in-flight changes"; all changes complete → "sync the evergreen artifacts"; a slice is ready → "start the change". The user should mostly answer with a number.

## Write less

Plans die of verbosity.

- One page per artifact. Longer means cut or split.
- Prefer a table to prose, a line to a paragraph.
- No file paths or code snippets in upstream artifacts — they rot.
- Never restate another artifact; point to it.

## Stay above the code

Reading code to ground the work is fine. Writing code is not initiative work — that belongs to a change (\`/opsx:apply\`).

---

${STORE_SELECTION_GUIDANCE}`;

export function getInitiativesSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-initiatives',
    description:
      'Work above a single change. Use when turning high-level intent (a roadmap, PRD, vision) into changes, when asked where the whole effort stands, or when finished work should update the roadmap.',
    instructions: INITIATIVES_BODY,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxInitiativesCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Initiatives',
    description:
      'Work above a single change - turn high-level intent into changes and see where the effort stands',
    category: 'Workflow',
    tags: ['workflow', 'planning', 'experimental'],
    content: INITIATIVES_BODY,
  };
}
