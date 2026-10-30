import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import {
  getOpsxProposeSkillTemplate,
  getOpsxProposeCommandTemplate,
  getFfChangeSkillTemplate,
  getOpsxFfCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillFiles } from '../../../src/core/shared/skill-generation.js';
import { loadSchema } from '../../../src/core/artifact-graph/schema.js';
import { CommandAdapterRegistry } from '../../../src/core/command-generation/registry.js';
import { generateCommand } from '../../../src/core/command-generation/generator.js';
import {
  formatCommandInvocation,
  getInvocationForAdapter,
} from '../../../src/core/command-generation/invocation.js';
import { getCommandContents } from '../../../src/core/shared/skill-generation.js';
import { MAX_CONTEXT_SIZE } from '../../../src/core/project-config.js';
import { resolveOptionalWorkflows } from '../../../src/core/templates/optional-workflow.js';
import { ALL_WORKFLOWS } from '../../../src/core/profiles.js';
import { parseTaskLines } from '../../../src/utils/task-progress.js';

// Templates carry optional-workflow conditionals; a body only means anything
// once resolved against a workflow set. Unless a test says otherwise, these are
// the bodies a profile with every workflow installed receives.
const withAll = (body: string) =>
  resolveOptionalWorkflows(body, new Set<string>(ALL_WORKFLOWS));
const withoutApply = (body: string) =>
  resolveOptionalWorkflows(
    body,
    new Set<string>(ALL_WORKFLOWS.filter((id) => id !== 'apply'))
  );

const proposeSkillBody = withAll(getOpsxProposeSkillTemplate().instructions);
const proposeCommandBody = withAll(getOpsxProposeCommandTemplate().content);
const asDeployed = <T extends { instructions: string; references?: Array<{ path: string; content: string }> }>(
  template: T
): T => ({
  ...template,
  instructions: withAll(template.instructions),
  references: template.references?.map((reference) => ({ ...reference, content: withAll(reference.content) })),
});

// SKILL.md plus its references, the way an agent can read them.
const deployedSkill = (template: ReturnType<typeof getOpsxProposeSkillTemplate>): string =>
  generateSkillFiles(asDeployed(template), 'TEST')
    .map((file) => file.content)
    .join('\n');

const proposeBodies: Array<[string, string]> = [
  ['propose skill', deployedSkill(getOpsxProposeSkillTemplate())],
  ['propose command', proposeCommandBody],
];

// ff runs the byte-identical artifact loop, so it carries the identical guards.
const loopBodies: Array<[string, string]> = [
  ...proposeBodies,
  ['ff skill', deployedSkill(getFfChangeSkillTemplate())],
  ['ff command', withAll(getOpsxFfCommandTemplate().content)],
];

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const defaultSchema = loadSchema(path.join(repoRoot, 'schemas', 'spec-driven', 'schema.yaml'));

/** The opening list that tells the agent which artifacts propose will produce. */
function artifactPreamble(body: string): string {
  const start = body.indexOf('With the default spec-driven schema');
  const end = body.indexOf('**Before you start**');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return body.slice(start, end);
}

describe('propose preamble', () => {
  // #788/#1260: the preamble advertised proposal/design/tasks only, so agents
  // treated specs as optional and produced changes with no spec at all.
  // Derived from the schema so a new artifact cannot go unadvertised.
  it('advertises every artifact the default schema defines (#788, #1260)', () => {
    const ids = defaultSchema.artifacts.map(artifact => artifact.id);
    expect(ids).toContain('specs');

    for (const [label, body] of proposeBodies) {
      const preamble = artifactPreamble(body);
      for (const id of ids) {
        expect(preamble, `${label} preamble is missing the "${id}" artifact`).toContain(id);
      }
    }
  });
});

describe('default proposal guidance', () => {
  it('frames new capabilities as durable behavior boundaries (#1965)', () => {
    const proposal = defaultSchema.artifacts.find(artifact => artifact.id === 'proposal');
    expect(proposal).toBeDefined();
    expect(proposal!.instruction).toContain(
      'Name each capability for a durable system behavior'
    );
    expect(proposal!.instruction).toContain(
      'not the work in this change'
    );
    expect(proposal!.instruction).toContain('own related requirements as the system evolves');
    expect(proposal!.instruction).toContain('avoid broad catch-all capabilities');

    const template = fs.readFileSync(
      path.join(repoRoot, 'schemas', 'spec-driven', 'templates', 'proposal.md'),
      'utf-8'
    );
    expect(template).toMatch(
      /Name each capability for a cohesive system\s+behavior that can own related requirements as the system evolves/
    );
    expect(template).toMatch(/Do not name\s+implementation tasks or proposal sections/);
    expect(template).toContain('Avoid broad catch-all names');

    const reference = fs.readFileSync(
      path.join(repoRoot, 'docs-lab', 'reference', 'schemas', 'spec-driven', 'index.md'),
      'utf-8'
    );
    expect(reference).toMatch(
      /Name each capability for a cohesive system\s+behavior that can own related requirements as the system evolves/
    );
    expect(reference).toMatch(/Do not name\s+implementation tasks or proposal sections/);
    expect(reference).toContain('Avoid broad catch-all names');
  });
});

describe('default task guidance', () => {
  it('keeps tracked tasks within the pre-archive workflow (#1790)', () => {
    const tasks = defaultSchema.artifacts.find(artifact => artifact.id === 'tasks');
    expect(tasks).toBeDefined();
    expect(tasks!.instruction).toMatch(
      /Track implementation and verification work that can be completed before\s+archive/
    );
    expect(tasks!.instruction).toMatch(
      /preserve those steps as plain bullets in an\s+optional `## Workflow follow-up` section at the end of tasks.md/
    );

    const examples = [...tasks!.instruction.matchAll(/```\s*([\s\S]*?)```/g)];
    expect(examples).toHaveLength(2);
    const implementation = examples[0][1];
    const followUp = examples[1][1];
    expect(followUp).toContain('## Workflow follow-up');
    expect(followUp).toContain('- Verify the archived result.');
    expect(parseTaskLines(followUp)).toEqual([]);
    expect(parseTaskLines(`${implementation}\n${followUp}`)).toEqual(
      parseTaskLines(implementation)
    );
  });

  it('requires a concrete verification method in each task (#345)', () => {
    const tasks = defaultSchema.artifacts.find(artifact => artifact.id === 'tasks');
    expect(tasks).toBeDefined();
    expect(tasks!.instruction).toContain('Each task MUST state how to verify completion');
    expect(tasks!.instruction).toMatch(
      /a test, command,\s+observable behavior, or delivered artifact/
    );
    expect(tasks!.instruction).toMatch(
      /Put the verification in\s+that task's checkbox description/
    );
    expect(tasks!.instruction).toMatch(
      /Use a separate verification task only\s+when it checks broader integration or system behavior that spans\s+multiple implementation tasks/
    );

    const example = tasks!.instruction.match(/```\s*([\s\S]*?)```/)?.[1];
    expect(example).toBeDefined();
    const numberedTasks = example!.split('\n').filter(line => /^- \[ \] \d+\.\d+ /.test(line));
    expect(numberedTasks).toHaveLength(6);
    expect(numberedTasks.every(line => /\bverify\b/i.test(line))).toBe(true);
    expect(numberedTasks[0]).toContain('expected files are present');
    expect(numberedTasks[1]).toContain('package installation succeeds');
    expect(numberedTasks[2]).toContain('export test passes');
    expect(numberedTasks[3]).toContain('unit tests cover quoting and delimiters');
    expect(numberedTasks[4]).toContain('Document the export API');
    // #1968: the last group keeps the main specs current before archive.
    expect(numberedTasks[5]).toContain("Sync this change's delta specs into the main specs");
    expect(example).not.toMatch(/^- \[ \] \d+\.\d+ (?:verify|run (?:the )?verification)\b/im);
  });

  // #1952: agents parked testing and documentation in one trailing group, so a
  // failure seeded in group 1 only surfaced at the end and cascaded into rework.
  it('keeps tests and documentation inside the group that does the work (#1952)', () => {
    const tasks = defaultSchema.artifacts.find(artifact => artifact.id === 'tasks');
    expect(tasks).toBeDefined();
    expect(tasks!.instruction).toMatch(
      /Each task group MUST land the tests and documentation its own work\s+calls for/
    );
    expect(tasks!.instruction).toMatch(
      /Do NOT collect testing or documentation into a final group/
    );
    // The rule is scoped to what a group's work actually needs, so the worked
    // example's scaffolding group can carry no tests or docs without
    // contradicting it.
    expect(tasks!.instruction).toMatch(
      /A group\s+whose work calls for neither, such as scaffolding or dependency setup,\s+carries neither/
    );
    expect(tasks!.instruction).toMatch(
      /A final group is for integration checks only, not for\s+the tests and docs an earlier group owed/
    );

    // The worked example has to show a docs task inside the implementation
    // group, not a trailing "testing and documentation" group of its own.
    const example = tasks!.instruction.match(/```\s*([\s\S]*?)```/)?.[1];
    expect(example).toBeDefined();
    const headings = example!
      .split('\n')
      .filter(line => /^## /.test(line.trim()))
      .map(line => line.trim());
    // Setup, the implementation group, and the closing spec sync (#1968).
    expect(headings).toEqual(['## 1. Setup', '## 2. Core Implementation', '## 3. Update the specs']);
    expect(headings.some(heading => /\b(test|testing|documentation|docs)\b/i.test(heading))).toBe(
      false
    );

    const implementation = example!.slice(example!.indexOf(headings[1]), example!.indexOf(headings[2]));
    expect(implementation).toMatch(/^- \[ \] \d+\.\d+ Document the export API in docs\/export\.md/im);
  });
});

describe('propose project context', () => {
  it('loads project context before creating the change (#1651)', () => {
    for (const [label, body] of proposeBodies) {
      const contextStep = body.indexOf('**Load the project**');
      const createStep = body.indexOf('**Create the change**');
      expect(contextStep, `${label} is missing the early context step`).toBeGreaterThanOrEqual(0);
      expect(contextStep, `${label} loads context after creating the change`).toBeLessThan(createStep);
    }
  });

  function contextSection(body: string): string {
    return body.slice(body.indexOf('**Load the project**'), body.indexOf('**Read the related specs**'));
  }

  it('reads the resolved root and its project context from the CLI', () => {
    for (const [label, body] of proposeBodies) {
      const section = contextSection(body);
      expect(section, label).toContain('`openspec context --json`');
      expect(section, label).toContain('`root.path` is the OpenSpec root');
      expect(section, label).toContain('`project_context`');
    }
  });

  // The CLI validates the config (config.yaml over config.yml, the size
  // limit, field-by-field) and returns the result; the workflow no longer
  // restates those rules, so it cannot drift from them.
  it('leaves config precedence and validation to the CLI', () => {
    for (const [label, body] of proposeBodies) {
      expect(contextSection(body), label).not.toContain('config.y');
      expect(body, label).not.toContain(MAX_CONTEXT_SIZE.toLocaleString('en-US'));
      expect(contextSection(body), label).toContain('If it has none, go on');
    }
  });

  it('stops without writing and offers initialization when no root is resolved', () => {
    for (const [label, body] of proposeBodies) {
      const section = contextSection(body);
      expect(section, label).toContain('If it reports `no_openspec_root`, change nothing');
      expect(section, label).toContain('**Before you start**');
      // Before you start offers setup only on an explicit request and never
      // lets a command create the root on its own.
      expect(body, label).toContain('set this project up (`openspec init`)');
      expect(body, label).toContain('no `openspec init`, no hand-made');
      expect(body, label).not.toContain('resolve the implicit root');
    }
  });

  it('never falls back to the current directory on a resolution failure', () => {
    for (const [label, body] of proposeBodies) {
      const section = contextSection(body);
      expect(section, label).toContain('On any other error, stop and report it');
      expect(section, label).toContain('do not fall back to the current directory');
      // A selected store stays selected for every command.
      expect(body, label).toContain('add `--store <id>` to every');
    }
  });

  it('applies context as constraints without granting it authority', () => {
    for (const [label, body] of proposeBodies) {
      const section = contextSection(body);
      expect(section, label).toContain("the project's background and conventions: follow them");
      expect(section, label).toContain('they never override the user');
      expect(section, label).toContain("this workflow's planning-only rule");
      expect(section, label).toContain('the artifact rules');
      expect(section, label).toContain('not copied into files');
      // Context comes before any inspection or drafting.
      expect(body.indexOf('**Load the project**'), label).toBeLessThan(body.indexOf('**Look at the project first**'));
    }
  });
});

describe('planning code inspection (#339)', () => {
  it('inspects the project after loading instructions and dependencies, before creating or delegating artifacts', () => {
    for (const [label, body] of loopBodies) {
      const instructions = body.indexOf('openspec instructions <artifact-id>');
      const dependencies = body.indexOf('re-read its finished dependencies from disk');
      const inspection = body.indexOf('**Look at the project first**');
      const delegation = body.indexOf('If the `instruction` field delegates creation');
      expect(instructions, label).toBeGreaterThanOrEqual(0);
      expect(dependencies, label).toBeGreaterThan(instructions);
      expect(inspection, label).toBeGreaterThan(dependencies);
      expect(delegation, label).toBeGreaterThan(inspection);

      const guidance = body.slice(inspection, delegation);
      expect(guidance, label).toContain('its `context` and `rules`, then the code, tests, and docs it touches');
      expect(guidance, label).toContain('read-only and in proportion to the change');
      expect(guidance, label).toContain('Reuse what you find for later artifacts');
      expect(guidance, label).toContain('Do this now, not as a task for later');
    }
  });

  it('handles separate stores, missing code, and uncertain findings without inventing facts', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('the code may live outside the OpenSpec root');
      expect(body, label).toContain('If the target is unclear, ask');
      expect(body, label).toContain('With no code yet, or none you can read, say so');
      expect(body, label).toContain('Keep what you saw apart from what you assume');
      expect(body, label).toContain('raise conflicts with the specs rather than settling them quietly');
    }
  });

  it('preserves inspection guidance through every command adapter', () => {
    for (const command of getCommandContents(ALL_WORKFLOWS).filter(({ id }) =>
      ['propose', 'ff'].includes(id)
    )) {
      for (const adapter of CommandAdapterRegistry.getAll()) {
        const generated = generateCommand(command, adapter).fileContent;
        const inspection = generated.indexOf('**Look at the project first**');
        const delegation = generated.indexOf('If the `instruction` field delegates creation');
        const label = `${adapter.toolId} ${command.id}`;
        expect(inspection, label).toBeGreaterThanOrEqual(0);
        expect(delegation, label).toBeGreaterThan(inspection);
        expect(generated, label).toContain('read-only and in proportion to the change');
      }
    }
  });
});

describe('propose implementation boundary', () => {
  it('makes the planning-only boundary prominent (#232, #258, #262)', () => {
    for (const [label, body] of proposeBodies) {
      const boundary = body.indexOf('**Planning only.**');
      const steps = body.indexOf('**Steps**');
      expect(boundary, `${label} is missing its planning boundary`).toBeGreaterThanOrEqual(0);
      expect(boundary, `${label} boundary should appear before its steps`).toBeLessThan(steps);
      expect(body, label).toContain('even when the request also asks to build or fix something');
      expect(body, label).toContain('do not edit project code or start implementing');
    }
  });

  it('ends by requiring a separate request to implement (#258, #262)', () => {
    for (const [label, body] of proposeBodies) {
      expect(body, label).toContain('implementation starts from a new request');
      const stop = body.lastIndexOf('This response ends here, even if the request asked to build it');
      expect(stop, `${label} should end with its stop guard`).toBeGreaterThan(body.indexOf('**Show the plan, then stop**'));
    }
  });

  it('asks before resolving ambiguity that could change user-visible outcomes (#258)', () => {
    for (const [label, body] of proposeBodies) {
      expect(body, label).toContain('scope, observable behavior, compatibility, or what counts as done');
      expect(body, label).toContain('Ask before creating the change');
      expect(body, label).toContain('For smaller details, assume, and write the assumption into the plan');
      expect(body.indexOf('Ask before creating the change'), label).toBeLessThan(body.indexOf('**Create the change**'));
    }
  });

  it('hands command-only tools to apply instead of advertising direct coding (#258)', () => {
    expect(proposeCommandBody).toContain('When you are ready, run `/opsx:apply`.');
    expect(proposeCommandBody).not.toContain('ask me to implement');
    expect(proposeCommandBody).not.toContain('ask me to apply this change');

    expect(proposeSkillBody).toContain(
      'run `/opsx:apply` or ask me to apply this change'
    );
    expect(proposeSkillBody).not.toContain('ask me to implement');
  });

  // The same boundary has to hold when `apply` is not installed: the command
  // surface may name the CLI, never a conversational handoff (#1734).
  it('keeps command-only tools off direct coding when apply is not installed', () => {
    const command = withoutApply(getOpsxProposeCommandTemplate().content);
    const skill = withoutApply(getOpsxProposeSkillTemplate().instructions);
    const ffCommand = withoutApply(getOpsxFfCommandTemplate().content);

    for (const body of [command, skill, ffCommand]) {
      expect(body).not.toContain('/opsx:apply');
    }

    expect(command).toContain(
      'run `openspec instructions apply --change "<name>" --json` to get the tasks'
    );
    expect(command).not.toContain('ask me to implement');
    expect(command).not.toContain('ask me to apply this change');

    expect(ffCommand).toContain(
      'Run `openspec instructions apply --change "<name>" --json` to get the task list'
    );
    expect(ffCommand).not.toContain('ask me to implement');

    expect(skill).toContain('ask me to apply this change');
    expect(skill).not.toContain('ask me to implement');
  });

  it('preserves planning and initialization boundaries through every command adapter', () => {
    // Resolve against every workflow: this asserts the apply handoff, which
    // is only emitted when `apply` is installed.
    const propose = getCommandContents(ALL_WORKFLOWS).find(({ id }) => id === 'propose');
    expect(propose?.id).toBe('propose');

    for (const adapter of CommandAdapterRegistry.getAll()) {
      const generated = generateCommand(propose, adapter).fileContent;
      const applyInvocation = formatCommandInvocation(
        getInvocationForAdapter(adapter),
        'apply'
      );
      expect(generated, adapter.toolId).toContain('**Planning only.**');
      expect(generated, adapter.toolId).toContain('do not edit project code or start implementing');
      expect(generated, adapter.toolId).toContain('implementation starts from a new request');
      expect(generated, adapter.toolId).toContain('This response ends here, even if the request asked to build it');
      expect(generated, adapter.toolId).toContain(
        `When you are ready, run \`${applyInvocation}\`.`
      );
      expect(generated, adapter.toolId).not.toContain('ask me to implement');
      expect(generated, adapter.toolId).toContain('If it reports `no_openspec_root`, change nothing');
      expect(generated, adapter.toolId).toContain('set this project up (`openspec init`)');
      expect(generated, adapter.toolId).toContain('no `openspec init`, no hand-made');
    }
  });
});

describe('propose schema selection', () => {
  // #770: the CLI and new workflow already accept an explicit schema, but
  // propose used to discard that request and always create with the default.
  it('creates with the default schema, or the one the user named (#770)', () => {
    for (const [label, body] of proposeBodies) {
      const createStep = body.indexOf('**Create the change**');
      const findStep = body.indexOf('**Find the artifacts to write**');
      expect(createStep, `${label} is missing change creation`).toBeGreaterThanOrEqual(0);
      expect(findStep, `${label} is missing status lookup`).toBeGreaterThan(createStep);

      const createSection = body.slice(createStep, findStep);
      expect(createSection, label).toContain('Run `openspec new change "<name>"`');
      expect(createSection, label).toContain('Add `--schema "<schema-name>"` only when the user named a schema');
    }
  });

  it('discovers schemas from the authoritative project or store root', () => {
    for (const [label, body] of proposeBodies) {
      const createSection = body.slice(body.indexOf('**Create the change**'), body.indexOf('**Find the artifacts to write**'));
      // The root from step 2 already honors a store pointer, a selected
      // store, or the global defaultStore; schemas run from it.
      expect(createSection, label).toContain('run `openspec schemas --json` from `root.path`');
      expect(createSection, label).not.toContain('`schemas` does not accept `--store`');
    }
  });
});

describe('artifact loop guards (propose and ff)', () => {
  // `status` is file-existence based (detectCompleted), so writing tasks.md before
  // specs flips tasks to done and satisfies a bare applyRequires stop condition
  // with specs never created. That is the #1260 failure chain.
  it('warns that a done artifact does not imply its deps exist (#788, #1260)', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('status only checks that files exist');
      expect(body, label).toContain('a `done` artifact can still depend on a missing one');
    }
  });

  // Scoped to the applyRequires closure, not to every `ready` artifact: a custom
  // schema may define artifacts outside it (e.g. a post-implementation retro)
  // that propose has no business creating.
  it('scopes the set to the applyRequires dependency closure', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('`applyRequires` plus every artifact those reach through `requires` edges');
      expect(body, label).toContain('Leave artifacts outside the set alone');
    }
  });

  // alfred's PR #1412 blocker: `status --json` must carry the `requires` edges,
  // and the loop must derive the set from those edges rather than from `status`.
  it('builds the set from requires edges, not from status (#1412 review)', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('Follow the edges, not `status`');
    }
  });

  it('writes every artifact in the set and re-checks for cascades', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('Track the set in a todo list');
      expect(body, label).toContain('re-run status: one artifact can unblock others');
    }
  });

  // specs must not be skippable on the agent's own judgment. The artifact's own
  // instruction is the signal: spec-driven's design says "create only if any
  // apply", specs says nothing of the kind. The one legitimate way to skip specs
  // is the `skipped` status the CLI reports for a change declaring `skip_specs`
  // (#1399) — a decision the tool makes, never the agent.
  it('permits skipping only artifacts their own instruction marks optional', () => {
    for (const [label, body] of loopBodies) {
      // The agent has to fetch the instruction before skipping, or a
      // momentum-driven agent skips specs without checking.
      expect(body, label).toContain('Skip any other only when its own `instruction`, read with `openspec instructions`, marks it optional');
      expect(body, label).toContain('never skip specs by your own judgment');
      expect(body, label).toContain('do not revisit it');
    }
  });

  // An artifact the CLI already reports as `skipped` is satisfied and must never
  // be written, or `openspec validate` rejects the change (#1399).
  it('treats a `skipped` status as satisfied and never creates it (#1399)', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('`skipped` (the change declares `skip_specs`, so its files must not exist)');
    }
  });

  // Without this the loop deadlocks: skipping design leaves tasks blocked
  // forever, no artifact is ready, and the stop condition can never be met.
  it('keeps going past a skipped dependency', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('a skipped dependency does not block what comes after it');
    }
  });

  // The stop condition must cover the whole set. A bare "stop when
  // applyRequires is done" is the lenient rule #1260 blames.
  it('stops on the whole set, not on applyRequires alone', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('Stop when every artifact in the set is finished');
      expect(body, label).not.toContain('Stop when all `applyRequires` artifacts are done');
      expect(body, label).not.toContain('Create artifacts in sequence until apply-ready');
    }
  });

  // specs `generates` a glob (specs/**/*.md), so an agent told only to "write it
  // to resolvedOutputPath" would create a directory literally named `**`.
  it('tells the agent how to resolve a glob output path', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'is a glob, follow `instruction` to choose a concrete path'
      );
    }
  });
});

// An audit of 55 real proposal sessions found 56% never opened the existing
// specs, and that reading them improved 23 of 24 proposals. Reading is a step
// of its own, before the change exists, in both workflows that draft one.
describe('reads the existing specs before drafting', () => {
  it.each(loopBodies)(
    '%s reads specs before creating the change',
    (label, body) => {
      const read = body.indexOf('**Read the related specs**');
      const create = body.search(/\*\*Create the change( directory)?\*\*/);
      expect(read, `${label}: no spec-reading step`).toBeGreaterThanOrEqual(0);
      expect(read, `${label}: reads specs after creating the change`).toBeLessThan(create);
      const step = body.slice(read, create);
      expect(step, label).toContain('openspec list --specs --json');
      expect(step, label).toContain('openspec show "<spec-id>" --type spec');
      expect(step, label).toContain("reuse an existing capability's exact path");
      expect(step, label).toContain('call out any conflict with a current requirement');
    }
  );
});

describe('spec-driven requirement guidance (Loft review)', () => {
  const specs = defaultSchema.artifacts.find((artifact) => artifact.id === 'specs')!;

  it('asks for one obligation per requirement, outside the length rule', () => {
    expect(specs.instruction).toContain(
      'State one behavior per requirement: a single SHALL or MUST obligation, with no "and also".'
    );
  });

  // A blind judge preferred plans with a scenario per failure mode; telling
  // the agent to hold back produced thinner specs.
  it('asks for a scenario for each way the behavior can fail', () => {
    expect(specs.instruction).toContain('add a scenario for each way the behavior can fail');
    expect(specs.instruction).toContain('one test per scenario');
    // The worked example shows one, so the agent has a model of it.
    expect(specs.instruction).toContain('#### Scenario: Nothing to export');
    const template = fs.readFileSync(
      path.join(repoRoot, 'schemas', 'spec-driven', 'templates', 'spec.md'),
      'utf-8'
    );
    expect(template).toContain('a failure or edge case, when the behavior can fail');
  });

  it('keeps internals out of requirements unless they are the public contract', () => {
    expect(specs.instruction).toContain(
      'no internal function or class names, file paths, or private APIs in requirement text'
    );
    expect(specs.instruction).toContain('unless they are themselves the public contract');
  });
});

describe('propose starts from a settled scope', () => {
  it('builds the plan from an explore draft and states the scope before creating the change', () => {
    for (const [label, body] of proposeBodies) {
      expect(body, label).toContain('**Settle the scope**');
      expect(body, label).toContain('If the conversation has an explore draft, build from it');
      expect(body, label).toContain('do not re-ask what it settled');
      expect(body, label).toContain('State the scope in two or three lines');
      expect(body, label).toContain('keep the plan to it');
    }
  });
});

// A blind judge preferred plans that kept existing item shapes and used concrete
// scenario values; both rules live in the shared schema guidance.
describe('spec guidance favors compatible changes and concrete scenarios', () => {
  it('asks for compatible changes and concrete example values', () => {
    const proposal = defaultSchema.artifacts.find((artifact) => artifact.id === 'proposal')!;
    const specs = defaultSchema.artifacts.find((artifact) => artifact.id === 'specs')!;
    expect(proposal.instruction).toContain('Prefer the change that keeps existing behavior, data shapes, and tests working');
    expect(specs.instruction).toContain('use concrete example values');
    // On a real project, plans invented new failure handling (rejecting input
    // that works today) when told to cover failures.
    expect(specs.instruction).toContain('do not add validation, errors, or limits the request did not ask for');
  });
});

describe('propose plans only the gap', () => {
  it('checks what the code already does before planning', () => {
    for (const [label, body] of proposeBodies) {
      expect(body, label).toContain('If the code already does part of the request, say so and plan only the gap');
    }
  });
});

