import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import {
  getOpsxProposeSkillTemplate,
  getOpsxProposeCommandTemplate,
  getFfChangeSkillTemplate,
  getOpsxFfCommandTemplate,
} from '../../../../src/core/templates/beta/skill-templates.js';
import { generateSkillFiles } from '../../../../src/core/shared/beta-skill-generation.js';
import { OPENSPEC_GUIDES } from '../../../../src/core/shared/openspec-guides.js';
import { loadSchema } from '../../../../src/core/artifact-graph/schema.js';
import { CommandAdapterRegistry } from '../../../../src/core/command-generation/registry.js';
import { generateCommand } from '../../../../src/core/command-generation/generator.js';
import {
  formatCommandInvocation,
  getInvocationForAdapter,
} from '../../../../src/core/command-generation/invocation.js';
import { getBetaCommandContents } from '../../../../src/core/shared/beta-skill-generation.js';
import { MAX_CONTEXT_SIZE } from '../../../../src/core/project-config.js';
import { resolveOptionalWorkflows } from '../../../../src/core/templates/optional-workflow.js';
import { ALL_WORKFLOWS } from '../../../../src/core/profiles.js';
import { parseTaskLines } from '../../../../src/utils/task-progress.js';

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

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..');
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

  // The released CLI returns the root but not the project's context, so the
  // context comes from that root's config, the way today's propose reads it.
  it('reads the resolved root from the CLI and its context from that root', () => {
    for (const [label, body] of proposeBodies) {
      const section = contextSection(body);
      expect(section, label).toContain('`openspec context --json`');
      expect(section, label).toContain('`root.path` is the OpenSpec root');
      expect(section, label).toContain('`<root.path>/openspec/config.yaml`');
      expect(section, label).not.toContain('project_context');
    }
  });

  it('reads config.yaml before config.yml, and goes on without either', () => {
    for (const [label, body] of proposeBodies) {
      expect(contextSection(body), label).toContain('`config.yml` only when that file is missing');
      expect(contextSection(body), label).toContain('If there is no such file or field, go on');
      expect(body, label).not.toContain(MAX_CONTEXT_SIZE.toLocaleString('en-US'));
    }
  });

  it('stops without writing and offers initialization when no root is resolved', () => {
    for (const [label, body] of proposeBodies) {
      const section = contextSection(body);
      // The status code differs for a store user (`no_root_with_registered_stores`),
      // so the step keys off `root` being null instead of one code name.
      expect(section, label).toContain('is `null`');
      expect(section, label).toContain('change nothing');
      expect(section, label).toContain('no_root_with_registered_stores');
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
      expect(section, label).toContain('read it now, before planning, and follow it');
      expect(section, label).toContain('it never overrides the user');
      expect(section, label).toContain("this workflow's planning-only rule");
      expect(section, label).toContain('the artifact rules');
      expect(section, label).toContain('it is not copied into files');
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
    for (const command of getBetaCommandContents(ALL_WORKFLOWS).filter(({ id }) =>
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
    const propose = getBetaCommandContents(ALL_WORKFLOWS).find(({ id }) => id === 'propose');
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
      // Keyed off `root` being null, since a store user gets a different code.
      expect(generated, adapter.toolId).toContain('is `null`');
      expect(generated, adapter.toolId).toContain('change nothing');
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

  // An artifact other than specs is skippable only on its own instruction:
  // spec-driven's design says "create only if any apply", specs says nothing of
  // the kind (#1399). Specs themselves are a judgment, named here so propose
  // makes the call apply makes (#2170) instead of inventing a requirement for a
  // refactor. Both directions are pinned: `skip_specs` is the only way to skip
  // them, and a request's own wording never decides it.
  it('permits skipping only artifacts their own instruction marks optional', () => {
    for (const [label, body] of loopBodies) {
      // The agent has to fetch the instruction before skipping, or a
      // momentum-driven agent skips specs without checking.
      expect(body, label).toContain('Skip any other only when its own `instruction`, read with `openspec instructions`, marks it optional');
      expect(body, label).toContain('**Specs are the one judgment call.**');
      expect(body, label).toContain('declares `skip_specs: true` in its `.openspec.yaml` and writes no spec files');
      expect(body, label).toContain('anything else needs its deltas, whatever the request calls it');
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

// The beta carries its own spec guidance rather than editing the default
// schema, which every OpenSpec user reads through `openspec instructions`.
describe('beta spec guidance (Loft review)', () => {
  const guide = (file: string) => OPENSPEC_GUIDES.find((entry) => entry.path === `references/${file}`)!.content;

  it('asks for one obligation per requirement', () => {
    expect(guide('specs.md')).toContain('**One promise each.** One SHALL in the statement.');
  });

  // A blind judge preferred plans with a scenario per failure mode; telling
  // the agent to hold back produced thinner specs.
  it('asks for a scenario for each way the behavior can fail', () => {
    expect(guide('specs.md')).toContain('add a scenario for each way the behavior can fail');
    expect(guide('specs.md')).toContain('one test per scenario');
  });

  it('keeps internals out of requirements', () => {
    expect(guide('specs.md')).toContain('**Not in a requirement:** file or symbol names');
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
// scenario values.
describe('beta guidance favors compatible changes and concrete scenarios', () => {
  it('asks for compatible changes and concrete example values', () => {
    const guide = (file: string) => OPENSPEC_GUIDES.find((entry) => entry.path === `references/${file}`)!.content;
    expect(guide('decisions.md')).toContain('Prefer the option that keeps existing behavior, data shapes, and tests working');
    expect(guide('specs.md')).toContain('use concrete values');
    // On a real project, plans invented new failure handling (rejecting input
    // that works today) when told to cover failures.
    expect(guide('specs.md')).toContain('do not add validation, errors, or limits the request did not ask for');
  });
});

describe('propose plans only the gap', () => {
  it('checks what the code already does before planning', () => {
    for (const [label, body] of proposeBodies) {
      expect(body, label).toContain('If the code already does part of the request, say so and plan only the gap');
    }
  });
});

