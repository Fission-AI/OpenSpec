/**
 * The `openspec` router skill and one thin skill per workflow.
 *
 *   openspec-beta/                the router (SKILL_NAMESPACE)
 *   ├── SKILL.md                  what OpenSpec is, which workflow to read, and
 *   │                             the rules every workflow shares (once)
 *   └── references/
 *       ├── <workflow>.md         the steps of one workflow
 *       └── <name>.md             detail only some runs need
 *   openspec-beta-<workflow>/     a thin skill, so the workflow autocompletes
 *   └── SKILL.md                  points at ../openspec-beta/ and holds no rules
 *
 * Only the folders the Agent Skills spec names are used. The workflow bodies are
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
  ['sync', "copy a change's spec updates into the main specs, keeping the change open"],
  ['archive', 'finish a change: update the main specs and archive it'],
  ['bulk-archive', 'archive several finished changes at once'],
  ['onboard', 'a guided first run of OpenSpec on this codebase'],
];

/** The input line every change-scoped workflow shared; SKILL.md states it once. */
const CHANGE_INPUT =
  '**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.';

/** Workflows that write plans, never code (each one's own boundary says so too). */
const PLANNING_WORKFLOWS = new Set(['explore', 'propose', 'new', 'continue', 'ff', 'update']);

/** Workflow ids in the order users meet them. */
export const WORKFLOW_ORDER: readonly string[] = WORKFLOW_ROUTES.map(([id]) => id);

/** What a workflow is for, in the user's words. */
export function describeWorkflow(id: string): string {
  return WORKFLOW_ROUTES.find(([routeId]) => routeId === id)?.[1] ?? id;
}

const RUNTIME_INPUTS_POINTER = 'Treat `context` and `operationGuidance` as **Runtime inputs** in SKILL.md describes.';
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
  const lifted = body
    .replace(BEFORE_YOU_START, '')
    .replace(CHANGE_INPUT, '')
    .replace(RUNTIME_INPUTS, RUNTIME_INPUTS_POINTER)
    .replace(writingAnArtifact({ loads: true }), WRITING_POINTER)
    .replace(writingAnArtifact({ loads: false }).split('\n').join('\n   '), WRITING_POINTER)
    .replaceAll('as **Writing an artifact** below describes', 'as `references/writing-an-artifact.md` describes')
    .replaceAll('as **Before you start** says', 'as **Before you start** in SKILL.md says')
    .replace(/\n{3,}/g, '\n\n');
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

function skillBody(routes: ReadonlyArray<[string, string]>, invoke: (id: string) => string): string {
  const planning = routes.map(([id]) => id).filter((id) => PLANNING_WORKFLOWS.has(id));
  const rows = routes.map(([id, when]) => `| ${when} | \`references/${id}.md\` | \`${invoke(id)}\` |`);
  return `# OpenSpec

OpenSpec keeps a project's specs (what the system does today) in \`openspec/specs/\`, and planned work as changes in \`openspec/changes/<name>/\`. The \`openspec\` CLI does the exact parts: it creates, validates, merges, and archives. You do the judgment: what to build, how to word it, when to ask.

## Pick the workflow

Read the one file that matches the request, then follow it step by step. If the request could be more than one, ask which, naming these.

Planning workflows (${planning.join(', ')}) end the response: they never edit project code, even when the request also asks to build it. Finish the plan, then stop and let the user start apply.

| The user wants to | Read | Started with |
|---|---|---|
${rows.join('\n')}

## Which change

When a workflow works on an existing change, use the name the user gave or the one from the conversation. If neither is clear, ask, listing the active changes (\`openspec list --json\`).

## Before you start
${BEFORE_YOU_START.replace('**Before you start**\n', '')}

## Runtime inputs

${RUNTIME_INPUTS}
`;
}

/** Every file of the `openspec` skill, relative to the skill directory. */
export function generateOpenSpecSkill(options: OpenSpecSkillOptions): GeneratedSkillFile[] {
  const templates = getSkillTemplates(options.workflows);
  const installed = new Set(templates.map((entry) => entry.workflowId));
  const routes = WORKFLOW_ROUTES.filter(([id]) => installed.has(id));
  const toSurface = (text: string) =>
    text.replace(/\/opsx:([a-z-]+)/g, (match, id: string) => (installed.has(id) ? options.invoke(id) : match));

  const files: GeneratedSkillFile[] = [];
  const references = new Map<string, string>();
  let needsWritingReference = false;

  for (const { template, workflowId } of templates) {
    const body = toSurface(lift(template.instructions, workflowId));
    needsWritingReference ||= body.includes('references/writing-an-artifact.md');
    files.push({ relativePath: `references/${workflowId}.md`, content: `${body.trimEnd()}\n` });
    for (const reference of template.references ?? []) {
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
  for (const [relativePath, content] of [...references].sort(([a], [b]) => a.localeCompare(b))) {
    files.push({ relativePath, content });
  }

  // The router is user-invoked, like pstack's poteto-mode and Matt Pocock's
  // ask-matt: the model reaches a workflow through its own skill, so the skill
  // it runs is that workflow (which keeps planning from sliding into building).
  const description =
    'Plan and build changes with OpenSpec: explore an idea, propose a change with specs and tasks, apply it, verify it, and archive it. Use when the user mentions OpenSpec, specs, a change proposal, or /openspec, in a project that uses OpenSpec.';
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
  const thin = getSkillTemplates(options.workflows).map(({ template, workflowId }): GeneratedSkill => {
    const name = options.skillName(workflowId);
    const body = `# OpenSpec ${workflowId}

1. Read \`../${OPENSPEC_SKILL_NAME}/SKILL.md\`: the rules every OpenSpec workflow follows.
2. Follow \`../${OPENSPEC_SKILL_NAME}/references/${workflowId}.md\` step by step.

${PLANNING_WORKFLOWS.has(workflowId) ? 'This workflow plans only: finish the plan and stop, even if the request also asks to build it.\n\n' : ''}If \`../${OPENSPEC_SKILL_NAME}/\` is missing, ask the user to install it with \`openspec setup\`.
`;
    return {
      dirName: name,
      files: [{ relativePath: 'SKILL.md', content: `${frontmatter(name, template.description, options.version)}\n${body}` }],
    };
  });
  return [router, ...thin];
}
