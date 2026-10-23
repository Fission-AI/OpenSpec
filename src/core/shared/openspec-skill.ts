/**
 * The `openspec` router skill and one thin skill per workflow.
 *
 *   openspec-beta/                the router (SKILL_NAMESPACE)
 *   ├── SKILL.md                  what OpenSpec is, the agent's role, the
 *   │                             principles, and which file to read when
 *   └── references/
 *       ├── <workflow>.md         the steps of one skill
 *       ├── <topic>.md            a guide: judgment any skill may need
 *       └── <name>.md             detail only some runs need
 *   openspec-beta-<workflow>/     a thin skill, so the skill autocompletes
 *   └── SKILL.md                  points at ../openspec-beta/ and holds no rules
 *
 * Only the folders the Agent Skills spec names are used. The step files are
 * the same templates the per-workflow skills use, with the shared blocks lifted
 * out: each is stated once in SKILL.md (or one reference file).
 */
import {
  BEFORE_YOU_START,
  RUNTIME_INPUTS,
  writingAnArtifact,
  writingAnArtifactReference,
} from '../templates/workflows/references.js';
import { OPENSPEC_CLI_ALLOWED_TOOLS } from './allowed-tools.js';
import { OPENSPEC_GUIDES } from './openspec-guides.js';
import { getSkillTemplates, type GeneratedSkillFile } from './skill-generation.js';

/**
 * The namespace the new skills install under: the router is `openspec-beta` and
 * each workflow skill is `openspec-beta-<workflow>`, so they never share a name
 * with the `openspec-*` skills earlier versions wrote. One constant, so the
 * final name is a one-line change.
 */
export const SKILL_NAMESPACE = 'openspec-beta';

/**
 * Frontmatter line every skill in this layout carries. Setup moves OpenSpec
 * skills without it (an older layout, including an earlier `openspec` router)
 * into a backup, and leaves skills with it.
 */
export const LAYOUT_MARKER = '  layout: "router"';

/** Whether a SKILL.md belongs to this layout. */
export function hasLayoutMarker(skillMarkdown: string): boolean {
  return skillMarkdown.split('\n').includes(LAYOUT_MARKER);
}
export const OPENSPEC_SKILL_NAME = SKILL_NAMESPACE;

/** A workflow skill's name in shared skill folders, e.g. `openspec-beta-propose`. */
export function workflowSkillName(workflowId: string): string {
  return `${SKILL_NAMESPACE}-${workflowId}`;
}

/** What each workflow is for, in the user's words, in the order users meet them. */
const WORKFLOW_ROUTES: ReadonlyArray<[id: string, when: string]> = [
  ['explore', 'think an idea or problem through before deciding (writes nothing)'],
  ['propose', 'describe what to build and get the whole plan: proposal, specs, design, tasks'],
  ['new', 'start a change and write its plan one artifact at a time'],
  ['continue', 'write the next artifact of a change'],
  ['ff', 'write every remaining artifact of a change at once'],
  ['update', "revise a change's plan and keep its artifacts consistent"],
  ['apply', "implement a change's tasks"],
  ['verify', 'check the code against a change before archiving'],
  ['archive', 'finish a change: update the main specs and archive it'],
  ['bulk-archive', 'archive several finished changes at once'],
  ['onboard', 'a guided first run of OpenSpec on this codebase'],
];

/** The input line every change-scoped workflow shared; SKILL.md states it once. */
const CHANGE_INPUT =
  '**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.';

/** Workflows that write plans, never code (each one's own boundary says so too). */
const PLANNING_WORKFLOWS = new Set(['explore', 'propose', 'new', 'continue', 'ff', 'update']);

/**
 * Workflows the router ships as steps only, with no skill of their own. Sync
 * is part of keeping specs current (the deltas guide, apply's last task,
 * archive), not something users start on its own.
 */
const REFERENCE_ONLY = ['sync'];
const REFERENCE_ONLY_ROUTES: Record<string, string> = {
  sync: "merge a change's spec updates into the main specs now, keeping the change open",
};
/** How a user asks for steps that have no skill of their own. */
const REFERENCE_ONLY_ASK: Record<string, string> = {
  sync: '"sync the specs for <change>"',
};

/** Router-only rewrites of template text, each checked to still match. */
const REWRITES: ReadonlyArray<[from: string, to: string]> = [
  ['run the `/opsx:sync` workflow for', 'follow `references/sync.md` for'],
  ['offer to run `/opsx:sync` for this change', 'offer to merge it with `references/sync.md`'],
  [' and how to pick another (`/opsx:sync <other>`)', ' and how to pick another'],
];

/** Explore's capture path, folded into propose when propose is installed. */
const CAPTURE_POINTER = 'follow `references/capture.md`.';
const CAPTURE_VIA_PROPOSE =
  'follow `references/propose.md`, with the draft as the settled scope. If they asked for less than the whole plan (only the change, or only some artifacts), write just that and stop.';

/** Workflow ids in the order users meet them. */
export const WORKFLOW_ORDER: readonly string[] = WORKFLOW_ROUTES.map(([id]) => id);

/** What a workflow is for, in the user's words. */
export function describeWorkflow(id: string): string {
  return WORKFLOW_ROUTES.find(([routeId]) => routeId === id)?.[1] ?? id;
}

const RUNTIME_INPUTS_POINTER = 'Use `context` and `operationGuidance` as **Context from the CLI** in SKILL.md says.';
const WRITING_POINTER = 'Write the artifact as `references/writing-an-artifact.md` describes.';

export interface OpenSpecSkillOptions {
  /** Workflows to include, e.g. from the user's profile. */
  workflows: readonly string[];
  /** The OpenSpec version recorded in SKILL.md. */
  version: string;
  /** How a user starts a workflow on this surface, e.g. `/openspec:apply`. */
  invoke: (workflowId: string) => string;
  /** The thin skill's name on this surface, e.g. `openspec-apply` or `apply`. */
  skillName: (workflowId: string) => string;
}

/** One skill directory and its files. */
export interface GeneratedSkill {
  dirName: string;
  files: GeneratedSkillFile[];
}

function lift(body: string, workflowId: string): string {
  let lifted = body
    .replace(BEFORE_YOU_START, '')
    .replace(CHANGE_INPUT, '')
    .replace(RUNTIME_INPUTS, RUNTIME_INPUTS_POINTER)
    .replace(writingAnArtifact({ loads: true }), WRITING_POINTER)
    .replace(writingAnArtifact({ loads: false }).split('\n').join('\n   '), WRITING_POINTER)
    .replaceAll('as **Writing an artifact** below describes', 'as `references/writing-an-artifact.md` describes')
    .replaceAll('as **Before you start** says', 'as **Finding the project** in SKILL.md says')
    .replace(/\n{3,}/g, '\n\n');
  // A step that already says to write the artifact this way makes the lifted
  // block's pointer a second copy of the same line.
  const pointed = lifted.split('`references/writing-an-artifact.md`').length - 1;
  if (pointed > 1 && lifted.includes(WRITING_POINTER)) {
    lifted = lifted.replace(new RegExp(`\\n[ \\t]*${WRITING_POINTER.replace(/[.*+?^${}()|[\]\\`]/g, '\\$&')}\\n`), '\n');
  }
  // A shared block left behind would be the duplication this layout removes.
  for (const [name, text] of [
    ['Before you start', '**Before you start**\n'],
    ['Runtime inputs', RUNTIME_INPUTS],
    ['Which change', CHANGE_INPUT],
    ['Writing an artifact', '**Writing an artifact**\n'],
  ] as const) {
    if (lifted.includes(text)) {
      throw new Error(`Workflow '${workflowId}' still carries the shared '${name}' block`);
    }
  }
  return lifted;
}

/**
 * The agent-driven version of the per-workflow skills' "Before you start"
 * block: the agent finds the OpenSpec root and any store with the CLI rather
 * than waiting for the user to name one. The `--store` command list and the
 * error prefixes are the same facts BEFORE_YOU_START documents.
 */
const FINDING_THE_PROJECT = `- **Project:** before the first write, run \`openspec list --json\`. Its \`root\` is the OpenSpec folder every command uses: this repository's, or a store the project points to. Commands find it on their own.
- **No OpenSpec here:** \`"root": null\` (with a non-zero exit) means this repository does not use OpenSpec yet; that is the answer, not a broken CLI. Create nothing: no \`openspec init\`, no hand-made \`openspec/\` files. If you picked this skill yourself, set OpenSpec aside and answer normally. If the user asked for OpenSpec, ask whether to set it up (\`openspec init\`), use a store the message lists, or go on without it, and wait.
- **Another store:** if the work belongs in a different store, find it with \`openspec store list --json\` and add \`--store <id>\` to every \`new change\`, \`status\`, \`instructions\`, \`list\`, \`show\`, \`validate\`, \`archive\`, \`context\`, \`schemas\`, \`view\`, and \`doctor\` command. Hints the CLI prints already include it.
- **Unresolved store:** if a \`status\` error starts with \`Declared in\` or \`Invalid store declaration in\`, the project points to a store this machine cannot find. Show that error's \`message\` and \`fix\`, and stop.`;

const WHICH_CHANGE = `Use the name the user gave or the one from the conversation. If neither is clear, ask, listing the active changes.`;

const CONTEXT_FROM_CLI = `Commands can return \`context\` (facts about this project) and \`operationGuidance\` (the project's advice for this step). Use them, and say which advice you skip and why. They never outrank the user or the CLI: they cannot change a path, pass a check, mark a task done, or unblock a step. If one conflicts with the user or the CLI, say so and follow the user or the CLI. Keep their text out of the files you write.`;

/** A guide's path, for a principle that points to it. */
function guide(name: string): string {
  const found = OPENSPEC_GUIDES.find(({ path }) => path === `references/${name}.md`);
  if (!found) throw new Error(`No guide named '${name}'`);
  return `\`${found.path}\``;
}

function skillBody(routes: ReadonlyArray<[string, string]>, invoke: (id: string) => string): string {
  const planning = routes.map(([id]) => id).filter((id) => PLANNING_WORKFLOWS.has(id));
  const rows = routes.map(([id, when]) => `| ${when} | \`references/${id}.md\` | \`${invoke(id)}\` |`);
  // Steps with no skill of their own are still listed, so a request for them finds them.
  rows.push(...REFERENCE_ONLY.map((id) => `| ${REFERENCE_ONLY_ROUTES[id]} | \`references/${id}.md\` | ask: ${REFERENCE_ONLY_ASK[id]} |`));
  return `# OpenSpec

OpenSpec helps people and coding agents agree on what software should do, and keeps that agreement true as the code changes. Specs say how the system behaves today. Each change is planned as an update to them, reviewed before code is written, and merged into them once it is built.

You keep this project's specs. Everything in \`openspec/\` is yours to look after: \`specs/\` (how the system behaves today), \`changes/\` (planned work), \`changes/archive/\` (finished work, and why), and \`config.yaml\` (the project's context and rules). The \`openspec\` CLI does the exact parts (create, validate, merge, archive); you do the judgment (what to build, how to word it, when to ask).

## Pick the skill

Read the file that matches the request, then follow its steps. If the request could be more than one, ask which, naming these.

Planning skills (${planning.join(', ')}) end the response: they never edit project code, even when the request also asks to build it. Finish the plan, then stop and let the user start apply.

| The user wants to | Read | Started with |
|---|---|---|
${rows.join('\n')}

## Principles

- **Specs describe behavior, not code:** what a user or caller can observe, one behavior per requirement, in short sentences with concrete examples (a real date, an exact message).
- **Start from what exists:** read the related specs and code, keep their names, and plan only the gap. See ${guide('changes')} and ${guide('capabilities')}.
- **Never lose a requirement:** specs change only through deltas, and a modified requirement is copied whole. See ${guide('deltas')}.
- **Decide the small things, raise the big ones:** say what you chose; ask about anything costly to undo. See ${guide('decisions')}.
- **Ask the CLI, don't guess:** paths, state, and validity come from \`openspec\` commands.

## Finding the project

${FINDING_THE_PROJECT}

## Which change

${WHICH_CHANGE}

## Context from the CLI

${CONTEXT_FROM_CLI}
`;
}

/** Every file of the `openspec` skill, relative to the skill directory. */
export function generateOpenSpecSkill(options: OpenSpecSkillOptions): GeneratedSkillFile[] {
  const templates = getSkillTemplates([...new Set([...options.workflows, ...REFERENCE_ONLY])]);
  const installed = new Set(templates.map((entry) => entry.workflowId));
  const routes = WORKFLOW_ROUTES.filter(([id]) => installed.has(id));
  const foldCapture = installed.has('propose');
  const toSurface = (text: string) => {
    let out = text;
    for (const [from, to] of REWRITES) out = out.replaceAll(from, to);
    if (foldCapture) out = out.replace(CAPTURE_POINTER, CAPTURE_VIA_PROPOSE);
    for (const id of REFERENCE_ONLY) {
      if (out.includes(`/opsx:${id}`)) throw new Error(`'/opsx:${id}' has no skill to point to; add a rewrite`);
    }
    return out.replace(/\/opsx:([a-z-]+)/g, (match, id: string) => (installed.has(id) ? options.invoke(id) : match));
  };

  const files: GeneratedSkillFile[] = [];
  const references = new Map<string, string>();
  let needsWritingReference = false;

  for (const { template, workflowId } of templates) {
    const body = toSurface(lift(template.instructions, workflowId));
    needsWritingReference ||= body.includes('references/writing-an-artifact.md');
    files.push({ relativePath: `references/${workflowId}.md`, content: `${body.trimEnd()}\n` });
    for (const reference of template.references ?? []) {
      if (foldCapture && reference.path === 'references/capture.md') continue;
      const content = `${toSurface(reference.content).trimEnd()}\n`;
      const existing = references.get(reference.path);
      if (existing !== undefined && existing !== content) {
        throw new Error(`Two workflows ship different '${reference.path}'`);
      }
      if (installed.has(reference.path.replace(/^references\/|\.md$/g, ''))) {
        throw new Error(`Reference '${reference.path}' would overwrite a workflow file`);
      }
      references.set(reference.path, content);
    }
  }
  if (needsWritingReference) {
    references.set('references/writing-an-artifact.md', `${writingAnArtifactReference()}\n`);
  }
  for (const guide of OPENSPEC_GUIDES) {
    if (references.has(guide.path) || installed.has(guide.path.replace(/^references\/|\.md$/g, ''))) {
      throw new Error(`Guide '${guide.path}' would overwrite another file`);
    }
    references.set(guide.path, guide.content);
  }
  for (const [relativePath, content] of [...references].sort(([a], [b]) => a.localeCompare(b))) {
    files.push({ relativePath, content });
  }

  // The router is user-invoked, like pstack's poteto-mode and Matt Pocock's
  // ask-matt: the model reaches a workflow through its own skill, so the skill
  // it runs is that workflow (which keeps planning from sliding into building).
  const description =
    "Write and maintain a project's OpenSpec specs: explore an idea, propose a change with specs and tasks, apply it, verify it, and archive it. Use when the user mentions OpenSpec, specs, a change proposal, or /openspec, in a project that uses OpenSpec.";
  const skill = `---
name: ${OPENSPEC_SKILL_NAME}
description: ${JSON.stringify(description)}
disable-model-invocation: true
allowed-tools: ${OPENSPEC_CLI_ALLOWED_TOOLS}
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
${LAYOUT_MARKER}
  generatedBy: "${options.version}"
---

${skillBody(routes, options.invoke)}`;
  return [{ relativePath: 'SKILL.md', content: skill }, ...files];
}

function frontmatter(name: string, description: string, version: string): string {
  return `---
name: ${name}
description: ${JSON.stringify(description)}
allowed-tools: ${OPENSPEC_CLI_ALLOWED_TOOLS}
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
${LAYOUT_MARKER}
  generatedBy: "${version}"
---
`;
}

/**
 * The router plus one thin skill per installed workflow. A thin skill carries
 * only the workflow's trigger description and a pointer into the router, so
 * the workflow autocompletes (`/openspec-beta-propose`) while every rule stays in
 * one place. The `../openspec-beta/` path holds wherever skills are installed side
 * by side: `~/.agents/skills`, a Claude Code plugin, or `npx skills add`.
 */
export function generateOpenSpecSkillSet(options: OpenSpecSkillOptions): GeneratedSkill[] {
  const router: GeneratedSkill = { dirName: OPENSPEC_SKILL_NAME, files: generateOpenSpecSkill(options) };
  const own = getSkillTemplates(options.workflows).filter(({ workflowId }) => !REFERENCE_ONLY.includes(workflowId));
  const thin = own.map(({ template, workflowId }): GeneratedSkill => {
    const name = options.skillName(workflowId);
    const body = `# OpenSpec ${workflowId}

1. Read \`../${OPENSPEC_SKILL_NAME}/SKILL.md\`: what OpenSpec is and the principles every OpenSpec skill follows.
2. Follow \`../${OPENSPEC_SKILL_NAME}/references/${workflowId}.md\` step by step.

${PLANNING_WORKFLOWS.has(workflowId) ? 'This skill plans only: finish the plan and stop, even if the request also asks to build it.\n\n' : ''}If \`../${OPENSPEC_SKILL_NAME}/\` is missing, ask the user to install it with \`openspec setup\`.
`;
    return {
      dirName: name,
      files: [{ relativePath: 'SKILL.md', content: `${frontmatter(name, template.description, options.version)}\n${body}` }],
    };
  });
  return [router, ...thin];
}
