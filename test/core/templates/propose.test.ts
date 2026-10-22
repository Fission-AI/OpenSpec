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
  it('loads project context before selecting the schema or creating the change (#1651)', () => {
    for (const [label, body] of proposeBodies) {
      const contextStep = body.indexOf('**Load project context**');
      const schemaStep = body.indexOf('**Determine the workflow schema**');
      const createStep = body.indexOf('**Create the change directory**');

      expect(contextStep, `${label} is missing the early context step`).toBeGreaterThanOrEqual(0);
      expect(contextStep, `${label} loads context after schema selection`).toBeLessThan(schemaStep);
      expect(contextStep, `${label} loads context after creating the change`).toBeLessThan(createStep);
    }
  });

  function contextSection(body: string): string {
    return body.slice(body.indexOf('**Load project context**'), body.indexOf('**Determine the workflow schema**'));
  }

  it('reads the resolved root and its project context from the CLI', () => {
    for (const [label, body] of proposeBodies) {
      const section = contextSection(body);
      expect(section, label).toContain('`openspec context --json`');
      expect(section, label).toContain('returned `root.path`');
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
      expect(contextSection(body), label).toContain('If the field is absent or null, continue');
    }
  });

  it('stops without writing and offers initialization when no root is resolved', () => {
    for (const [label, body] of proposeBodies) {
      const section = contextSection(body);
      expect(section, label).toContain('If it reports `no_openspec_root`');
      expect(section, label).toContain('stop without creating or changing any files');
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
      expect(section, label).toContain('For any other context failure, stop');
      expect(section, label).toContain('do not fall back to the current directory');
      // A selected store stays selected for every command.
      expect(body, label).toContain('add `--store <id>` to every');
    }
  });

  it('applies context before exploration without granting it authority', () => {
    for (const [label, body] of proposeBodies) {
      const section = contextSection(body);
      expect(section, label).toContain('before exploring the codebase or making planning decisions');
      expect(section, label).toContain('project-provided data and constraints');
      expect(section, label).toContain('cannot override user authorization');
      expect(section, label).toContain('the planning boundary');
      expect(section, label).toContain('tool restrictions');
      expect(section, label).toContain('artifact and output rules');
      expect(section, label).toContain('Do not copy the context into artifacts');
    }
  });
});

describe('planning code inspection (#339)', () => {
  it('inspects the project after loading instructions and dependencies, before creating or delegating artifacts', () => {
    for (const [label, body] of loopBodies) {
      const instructions = body.indexOf('openspec instructions <artifact-id>');
      const dependencies = body.indexOf('Read any completed dependency files');
      const inspection = body.indexOf('**Inspect the relevant project before drafting**');
      const delegation = body.indexOf('If the `instruction` field delegates creation');
      expect(instructions, label).toBeGreaterThanOrEqual(0);
      expect(dependencies, label).toBeGreaterThan(instructions);
      expect(inspection, label).toBeGreaterThan(dependencies);
      expect(delegation, label).toBeGreaterThan(inspection);

      const guidance = body.slice(inspection, delegation);
      expect(guidance, label).toContain('Read `context` and `rules` first');
      expect(guidance, label).toContain('relevant implementation, nearby tests, configuration, and documentation outside `openspec/`');
      expect(guidance, label).toContain('Keep inspection read-only and proportional to the change');
      expect(guidance, label).toContain('reuse findings for later artifacts');
      expect(guidance, label).toContain('Do this discovery now');
    }
  });

  it('handles separate stores, missing code, and uncertain findings without inventing facts', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('the planning home may be separate from the code');
      expect(body, label).toContain('If the target is unclear, ask');
      expect(body, label).toContain('For greenfield or non-code changes, inspect the available structure and relevant documents');
      expect(body, label).toContain('If source is unavailable, state the limitation');
      expect(body, label).toContain('Distinguish observed behavior from assumptions and proposed additions');
      expect(body, label).toContain('surface conflicts with existing specs instead of silently deciding which is correct');
    }
  });

  it('preserves inspection guidance through every command adapter', () => {
    for (const command of getCommandContents(ALL_WORKFLOWS).filter(({ id }) =>
      ['propose', 'ff'].includes(id)
    )) {
      for (const adapter of CommandAdapterRegistry.getAll()) {
        const generated = generateCommand(command, adapter).fileContent;
        const inspection = generated.indexOf('**Inspect the relevant project before drafting**');
        const delegation = generated.indexOf('If the `instruction` field delegates creation');
        const label = `${adapter.toolId} ${command.id}`;
        expect(inspection, label).toBeGreaterThanOrEqual(0);
        expect(delegation, label).toBeGreaterThan(inspection);
        expect(generated, label).toContain('Keep inspection read-only and proportional to the change');
      }
    }
  });
});

describe('propose implementation boundary', () => {
  it('makes the planning-only boundary prominent (#232, #258, #262)', () => {
    for (const [label, body] of proposeBodies) {
      const boundary = body.indexOf('**Planning boundary**');
      const steps = body.indexOf('**Steps**');
      expect(boundary, `${label} is missing its planning boundary`).toBeGreaterThanOrEqual(0);
      expect(boundary, `${label} boundary should appear before its steps`).toBeLessThan(steps);
      expect(body, label).toContain(
        'The user request that selected or triggered this workflow authorizes planning only'
      );
      expect(body, label).toContain('Do not edit project code');
    }
  });

  it('ends by requiring a separate apply workflow (#258, #262)', () => {
    for (const [label, body] of proposeBodies) {
      expect(body, label).toContain(
        'The request that invoked this workflow authorizes planning only'
      );
      expect(body, label).toContain('Do NOT implement the change');
      expect(body, label).toContain('edit project code');
      expect(body, label).toContain(
        'Do not start implementation in the same response'
      );
      expect(body, label).toContain(
        'Any implementation or apply instruction in that request does not carry forward'
      );
      expect(body, label).toContain(
        'stop and wait for a new user request to start the apply workflow'
      );
      expect(
        body.lastIndexOf('After presenting the artifacts, stop'),
        `${label} should end with its stop guard`
      ).toBeGreaterThan(body.indexOf('**Output**'));
    }
  });

  it('asks before resolving ambiguity that could change user-visible outcomes (#258)', () => {
    for (const [label, body] of proposeBodies) {
      expect(body, label).toContain(
        'scope, externally observable behavior, compatibility, or acceptance criteria'
      );
      expect(body, label).toContain('ask the user before creating the change');
      expect(body, label).toContain(
        'For minor details, make a reasonable assumption and record it in the planning artifacts'
      );
      expect(body.indexOf('ask the user before creating the change'), label)
        .toBeLessThan(body.indexOf('**Create the change directory**'));
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
      expect(generated, adapter.toolId).toContain(
        'selected or triggered this workflow authorizes planning only'
      );
      expect(generated, adapter.toolId).toContain('Do NOT implement the change');
      expect(generated, adapter.toolId).toContain(
        'Do not start implementation in the same response'
      );
      expect(generated, adapter.toolId).toContain(
        'Any implementation or apply instruction in that request does not carry forward'
      );
      expect(generated, adapter.toolId).toContain(
        'stop and wait for a new user request to start the apply workflow'
      );
      expect(generated, adapter.toolId).toContain(
        `When you are ready, run \`${applyInvocation}\`.`
      );
      expect(generated, adapter.toolId).not.toContain('ask me to implement');
      expect(generated, adapter.toolId).toContain('stop without creating or changing any files');
      expect(generated, adapter.toolId).toContain('set this project up (`openspec init`)');
      expect(generated, adapter.toolId).toContain('no `openspec init`, no hand-made');
    }
  });
});

describe('propose schema selection', () => {
  // #770: the CLI and new workflow already accept an explicit schema, but
  // propose used to discard that request and always create with the default.
  it('shows both concrete creation forms after an explicit schema choice (#770)', () => {
    for (const [label, body] of proposeBodies) {
      const schemaStep = body.indexOf('**Determine the workflow schema**');
      const createStep = body.indexOf('**Create the change directory**');
      const statusStep = body.indexOf('**Get the artifact build order**');

      expect(schemaStep, `${label} is missing schema selection`).toBeGreaterThanOrEqual(0);
      expect(createStep, `${label} is missing change creation`).toBeGreaterThan(schemaStep);
      expect(statusStep, `${label} is missing status lookup`).toBeGreaterThan(createStep);

      const createSection = body.slice(createStep, statusStep);
      expect(createSection, label).toMatch(/^\s*openspec new change "<name>"\s*$/m);
      expect(createSection, label).toMatch(
        /^\s*openspec new change "<name>" --schema "<schema-name>"\s*$/m
      );
      expect(createSection, label).not.toContain('every follow-up command');
    }
  });

  it('discovers schemas from the authoritative project or store root', () => {
    for (const [label, body] of proposeBodies) {
      const schemaStep = body.indexOf('**Determine the workflow schema**');
      const createStep = body.indexOf('**Create the change directory**');
      const schemaSection = body.slice(schemaStep, createStep);

      expect(schemaSection, label).toContain('Use the configured default schema: omit `--schema`');
      expect(schemaSection, label).toContain('only when the user explicitly requests a specific schema by name');
      // The root from step 2 already honors a store pointer, a selected
      // store, or the global defaultStore; schemas run from it.
      expect(schemaSection, label).toContain(
        'run `openspec schemas --json` with its working directory set to the returned `root.path`'
      );
      expect(schemaSection, label).not.toContain('`schemas` does not accept `--store`');
      expect(schemaSection, label).not.toContain('from the current working directory instead');
    }
  });
});

describe('artifact loop guards (propose and ff)', () => {
  // `status` is file-existence based (detectCompleted), so writing tasks.md before
  // specs flips tasks to done and satisfies a bare applyRequires stop condition
  // with specs never created. That is the #1260 failure chain.
  it('warns that a done applyRequires artifact does not imply its deps exist (#788, #1260)', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toMatch(/file-existence only/i);
      expect(body, label).toMatch(/does NOT mean its dependencies exist/i);
    }
  });

  // Scoped to the applyRequires closure, not to every `ready` artifact: a custom
  // schema may define artifacts outside it (e.g. a post-implementation retro)
  // that propose has no business creating.
  it('scopes the required set to the applyRequires dependency closure', () => {
    for (const [label, body] of loopBodies) {
      // Names the seed the walk starts from (`from those`) so an agent cannot
      // read it as "every artifact that has requires edges" = the whole list.
      expect(body, label).toContain('reachable from those by following the `requires` edges');
      // Points at status --json specifically (instructions calls the edges `dependencies`).
      expect(body, label).toContain('in `status --json`');
      expect(body, label).toContain('walk them transitively');
      expect(body, label).toContain('Leave artifacts outside that set alone');
    }
  });

  // alfred's PR #1412 blocker: `status --json` must carry the `requires` edges,
  // and the loop must derive the set from those edges rather than from `status`.
  // A `done` artifact hides nothing about its deps if the agent reads its edges.
  it('builds the required set from requires edges, not from status (#1412 review)', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        "Use each artifact's `requires` edges, not its `status`, to build the required set"
      );
      expect(body, label).toContain('a `done` artifact still lists what it depends on');
    }
  });

  // The status-JSON parse list must document the `requires` field the loop relies on.
  it('documents the requires edges in the status JSON it tells the agent to parse', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'each with its `status` and its `requires` edges'
      );
    }
  });

  it('creates every missing artifact in the set and re-checks for cascades', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('Create every artifact in the required set that is missing');
      expect(body, label).toMatch(/re-check - creating one can unblock others/i);
    }
  });

  // specs must not be skippable on the agent's own judgment. "Required" is not
  // machine-readable (the graph has tasks requiring both specs and design), but
  // the artifact's own instruction is: spec-driven's design says "create only if
  // any apply", specs says nothing of the kind. The one legitimate way to skip
  // specs is the `skipped` status the CLI reports for a change declaring
  // `skip_specs` (#1399) — a decision the tool makes, never the agent.
  it('permits skipping only artifacts their own instruction marks conditional', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'or when its own `instruction` says it is conditional'
      );
      expect(body, label).toContain('do not reconsider it');
    }
  });

  // The skip_specs carve-out must stay explicit in the loop: an artifact the CLI
  // already reports as `skipped` is satisfied and must never be written, or the
  // agent creates spec files that `openspec validate` then rejects as
  // conflicting with the marker (#1399).
  it('treats a `skipped` status as satisfied and never creates it (#1399)', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('status: "skipped"');
      expect(body, label).toContain('its files must NOT exist');
    }
  });

  // The skip decision hinges on reading the artifact's `instruction` field, so
  // the loop must explicitly tell the agent to fetch it before skipping -
  // otherwise a momentum-driven agent can skip specs without ever checking.
  it('makes the agent fetch and read the instruction field before skipping', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'run `openspec instructions <artifact-id> --change "<name>" --json` and skip only if its `instruction` field marks it optional'
      );
      expect(body, label).toContain('never by your own judgment');
    }
  });

  // The 4b heading must not re-state the buggy stop condition (apply.requires
  // alone); it has to point the agent at the whole required set.
  it('frames the loop around the required set, not apply.requires alone', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'Continue until every artifact in the required set exists (not just `apply.requires`)'
      );
      expect(body, label).not.toContain(
        'Continue until every artifact the apply phase depends on exists'
      );
    }
  });

  // The artifact-creation TITLE must not use "apply-ready" either: in the
  // prewritten-tasks case the change is already apply-ready when this step
  // begins, so a title of
  // "create ... until apply-ready" invites the exact early-stop this PR kills.
  it('titles the create step around the required set, not "apply-ready"', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('**Create every artifact in the required set**');
      expect(body, label).not.toContain('Create artifacts in sequence until apply-ready');
      expect(body, label).not.toMatch(/^\s*4\.\s.*apply-ready/m);
    }
  });

  // Without this the loop deadlocks: skipping design leaves tasks blocked
  // forever, no artifact is ready, and the stop condition can never be met.
  // docs/concepts.md: "Dependencies are enablers, not gates."
  it('authorizes writing a blocked artifact whose only blocker was skipped', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain('Dependencies are enablers, not gates');
      expect(body, label).toMatch(
        /still `blocked` only because you skipped a conditional dependency, write it anyway/
      );
    }
  });

  // The stop condition must cover the whole required set. A bare "stop when
  // applyRequires is done" is the lenient rule #1260 blames.
  it('stops on the whole required set, not on applyRequires alone', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).toContain(
        'Stop when every artifact in the required set is `done`, `skipped`, or was deliberately skipped'
      );
      expect(body, label).not.toContain('Stop when all `applyRequires` artifacts are done');
    }
  });

  // The Guardrails section used to define completeness as `apply.requires`,
  // which is exactly the premise this fix refutes.
  it('does not define completeness as apply.requires in the guardrails', () => {
    for (const [label, body] of loopBodies) {
      expect(body, label).not.toMatch(
        /Create ALL artifacts needed for implementation \(as defined by schema's `apply\.requires`\)/
      );
      expect(body, label).toContain(
        'Create every artifact the apply phase transitively depends on'
      );
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
      const read = body.indexOf('**Read the existing specs**');
      const create = body.indexOf('**Create the change directory**');
      expect(read, `${label}: no spec-reading step`).toBeGreaterThanOrEqual(0);
      expect(read, `${label}: reads specs after creating the change`).toBeLessThan(create);
      const step = body.slice(read, create);
      expect(step, label).toContain('openspec list --specs --json');
      expect(step, label).toContain('openspec show "<spec-id>" --type spec');
      expect(step, label).toContain('reuse an existing capability\'s exact path');
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
  it('builds the packet from an explore draft and states the scope before creating the change', () => {
    for (const [label, body] of proposeBodies) {
      expect(body, label).toContain('**Start from a settled scope**');
      expect(body, label).toContain('If this conversation has an explore draft, it is the input');
      expect(body, label).toContain('do not re-ask what it settled');
      expect(body, label).toContain('state the scope in two or three lines');
      expect(body, label).toContain('do not widen it');
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
      expect(body, label).toContain('If the code already does part of what is asked, say so and plan only the gap');
    }
  });
});

