/**
 * The router skill: the one place to start for anything OpenSpec. It answers
 * questions about where things stand and how OpenSpec works, hands a request
 * to the workflow skill that does it, and runs several of them in order. It
 * holds no workflow steps of its own. What it needs only sometimes lives in
 * its `references/` files.
 */
import type { SkillTemplate } from '../types.js';

export const ROUTER_SKILL_NAME = 'openspec';

const WITHOUT_SKILLS = `# Doing a step without its skill

Use this when the skill for a step is not installed. Each section is the CLI path for one skill. Run the commands from the project root and read their \`--json\` output. The user can install the skill instead with \`openspec config profile\`, then \`openspec update\`.

## /opsx:explore

Exploring is a conversation, not a command. Read \`openspec list --json\`, the specs that matter, and the code, then think the problem through with the user. Write no code and no change files until they decide what to build.

## /opsx:propose, /opsx:new, /opsx:continue, /opsx:ff

1. Start the change: \`openspec new change "<name>"\`, using a short kebab-case name.
2. Run \`openspec status --change "<name>" --json\` to see which artifacts are ready.
3. For each artifact you write, run \`openspec instructions <artifact-id> --change "<name>" --json\` and follow its \`instruction\` and \`template\`. Write the file at its \`outputPath\`.
4. Repeat steps 2 and 3. Stop after one artifact for a step-by-step change; keep going until planning is complete when the user wants the whole plan.

## /opsx:update

Read the change's files, revise the ones the user asked about, then run \`openspec validate "<name>"\` and fix what it reports. Change planning files only, never code.

## /opsx:apply

Run \`openspec instructions apply --change "<name>" --json\`, read the files it lists under \`contextFiles\`, then do the unchecked tasks in order. Tick each task in \`tasks.md\` (\`- [ ]\` to \`- [x]\`) as soon as it is done.

## /opsx:verify

Read the change's tasks and specs, then check the code against each: every task done, every requirement and scenario implemented. Report what is missing. Change no files.

## /opsx:sync

No command updates the main specs and keeps the change open. Either merge each file under \`openspec/changes/<name>/specs/\` into the matching \`openspec/specs/<capability>/spec.md\` by hand and run \`openspec validate --specs\`, or archive the change, which merges them for you.

## /opsx:archive, /opsx:bulk-archive

First check the change is finished: \`openspec status --change "<name>" --json\` shows its artifacts, and \`openspec list --json\` shows \`completedTasks\` of \`totalTasks\`. If anything is unfinished, tell the user and ask before you go on. Then run \`openspec archive "<name>" --yes\`, which merges the change's spec updates into the main specs and moves the change to the archive. For several changes, do one at a time.

## /opsx:onboard

Walk the user through one small change in their own project: explore it, propose it, apply it, archive it, using the sections above.
`;

const WHERE_THINGS_STAND = `# Where things stand

Use this when the user asks where things stand or what to do next. Look before you answer:

- \`openspec list --json\` lists the changes in progress.
- \`openspec status --change "<name>" --json\` shows which parts of a change's plan exist and what comes next. \`openspec status --all --json\` does this for every change.
- \`openspec show "<name>"\` prints a change or a spec.
- If the user names a store, add \`--store <id>\` to each of these. \`openspec store list --json\` lists the stores.

Say where things stand in a sentence or two, name the next step and the skill that does it, and offer to do it. Do not start it until they say so.
`;

const ANSWERS = `# Answers to common questions

Use this when the user asks how OpenSpec works or how to set it up. Check an answer against the CLI's own help (\`openspec <command> --help\`) before you rely on a flag.

## Where things live

- \`openspec/specs/<capability>/spec.md\`: how the system behaves today, as requirements with scenarios.
- \`openspec/changes/<name>/\`: one planned change. Usually \`proposal.md\`, \`specs/\` (the spec updates), \`design.md\` (optional), and \`tasks.md\`.
- \`openspec/changes/archive/\`: finished changes.
- \`openspec/config.yaml\`: the project's schema, \`context\` lines every agent reads, and per-artifact \`rules\`.

## Checking things

- What is in progress: \`openspec list\`. The specs: \`openspec list --specs\`.
- Where one change stands: \`openspec status --change "<name>"\`.
- Read a change or a spec: \`openspec show "<name>"\`.
- Check the files are well formed: \`openspec validate "<name>"\`, or \`openspec validate --all\`.
- A dashboard of everything: \`openspec view\`.

## Setting things up

- Set up a project, or add an agent to it: \`openspec init\`.
- Choose which skills are installed: \`openspec config profile\`, then \`openspec update\` in each project.
- Refresh the skills after upgrading OpenSpec: \`openspec update\`.
- Teach agents something about this project: add a short line under \`context\` in \`openspec/config.yaml\`. Edit the file only after the user approves the wording.
- See or change the artifact workflow: \`openspec schemas\` lists the schemas, \`openspec templates\` shows where each artifact's template comes from.

## Stores

A store is a separate OpenSpec repository registered on this machine, for specs that live outside the code. \`openspec store --help\` lists its commands. Most commands accept \`--store <id>\` to work in a store instead of this project.

## Something is wrong

- Run \`openspec doctor\` and read what it reports.
- To tell the maintainers, use \`openspec feedback "<message>"\`, after the user approves the message.
`;

export function getRouterSkillTemplate(): SkillTemplate {
  return {
    name: ROUTER_SKILL_NAME,
    description: 'The starting point for anything OpenSpec. Use when the user asks for OpenSpec work without naming a skill, is unsure how to do something in OpenSpec, asks where a change stands or what to do next, or asks for several OpenSpec steps at once. Also use when the user says "openspec" and no more specific OpenSpec skill fits.',
    instructions: `OpenSpec helps people and coding agents agree on what software should do, and keeps that agreement true as the code changes. Each change is planned as an update to the specs, reviewed before code is written, and merged into them once it is built.

You are the starting point for anything OpenSpec in this project. Work out what the user needs, then do one of three things: answer their question, hand the request to the skill that does it, or run several skills in order.

**How OpenSpec fits together**

- \`openspec/specs/\` says how the system behaves today.
- \`openspec/changes/<name>/\` holds one planned change: its proposal, spec updates, design and tasks.
- A change usually goes: explore (optional), propose, apply, verify (optional), archive. Archiving updates the specs and moves the change to \`openspec/changes/archive/\`.

**When the user is unsure**

If they ask where things stand or what to do next, read \`references/where-things-stand.md\` and follow it.

If they ask how OpenSpec works or how to set something up, read \`references/answers.md\` and answer from it.

**Pick the skill**

When the user asks for work, find the row that matches, then use that skill and follow its steps.

| The user wants to | Use |
|---|---|
| think an idea or problem through before deciding what to build | \`/opsx:explore\` |
| describe what to build and get the whole plan: proposal, specs, design, tasks | \`/opsx:propose\` |
| start a change and write its plan one artifact at a time | \`/opsx:new\` |
| write the next artifact of a change | \`/opsx:continue\` |
| write every remaining artifact of a change at once | \`/opsx:ff\` |
| revise the plan of an existing change | \`/opsx:update\` |
| implement the tasks of a change | \`/opsx:apply\` |
| check the code against a change before archiving it | \`/opsx:verify\` |
| update the main specs from a change and keep the change open | \`/opsx:sync\` |
| finish a change and archive it | \`/opsx:archive\` |
| archive several finished changes at once | \`/opsx:bulk-archive\` |
| take a guided first run through OpenSpec | \`/opsx:onboard\` |

- If the request could mean more than one row, ask which, naming the choices.
- If the skill for the row is not installed, say so, then read \`references/without-skills.md\` and follow the section for that skill. Tell the user they can install it with \`openspec config profile\`, then \`openspec update\`.

**Several steps at once**

If the request asks for more than one row, such as "verify this change, then archive it", do them in order, one skill at a time. Finish each before you start the next. Each skill's own rules still apply: when one tells you to stop and wait for the user, stop there and say what comes next.

**If this project does not use OpenSpec**

If you picked this skill yourself and \`openspec list --json\` reports \`"root": null\`, set OpenSpec aside and answer the request normally. If the user asked for OpenSpec, offer to set it up with \`openspec init\`.`,
    references: {
      'without-skills.md': WITHOUT_SKILLS,
      'answers.md': ANSWERS,
      'where-things-stand.md': WHERE_THINGS_STAND,
    },
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}
