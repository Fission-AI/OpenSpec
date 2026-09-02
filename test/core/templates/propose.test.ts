import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import {
  getOpsxProposeSkillTemplate,
  getOpsxProposeCommandTemplate,
  getFfChangeSkillTemplate,
  getOpsxFfCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { generateSkillContent } from '../../../src/core/shared/skill-generation.js';
import { loadSchema } from '../../../src/core/artifact-graph/schema.js';
import { CommandAdapterRegistry } from '../../../src/core/command-generation/registry.js';
import { generateCommand } from '../../../src/core/command-generation/generator.js';
import {
  formatCommandInvocation,
  getInvocationForAdapter,
} from '../../../src/core/command-generation/invocation.js';
import { getCommandContents } from '../../../src/core/shared/skill-generation.js';

const proposeSkillBody = getOpsxProposeSkillTemplate().instructions;
const proposeCommandBody = getOpsxProposeCommandTemplate().content;
const proposeBodies: Array<[string, string]> = [
  ['propose skill', generateSkillContent(getOpsxProposeSkillTemplate(), 'TEST')],
  ['propose command', getOpsxProposeCommandTemplate().content],
];

// ff runs the byte-identical artifact loop, so it carries the identical guards.
const loopBodies: Array<[string, string]> = [
  ...proposeBodies,
  ['ff skill', getFfChangeSkillTemplate().instructions],
  ['ff command', getOpsxFfCommandTemplate().content],
];

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const defaultSchema = loadSchema(path.join(repoRoot, 'schemas', 'spec-driven', 'schema.yaml'));

/** The opening list that tells the agent which artifacts propose will produce. */
function artifactPreamble(body: string): string {
  const start = body.indexOf("I'll create a change with");
  const end = body.indexOf('When the user is ready to implement');
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

describe('default task guidance', () => {
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
    expect(numberedTasks).toHaveLength(4);
    expect(numberedTasks.every(line => /\bverify\b/i.test(line))).toBe(true);
    expect(numberedTasks[0]).toContain('expected files are present');
    expect(numberedTasks[1]).toContain('package installation succeeds');
    expect(numberedTasks[2]).toContain('export test passes');
    expect(numberedTasks[3]).toContain('unit tests cover quoting and delimiters');
    expect(example).not.toMatch(/^- \[ \] \d+\.\d+ (?:verify|run (?:the )?verification)\b/im);
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
    for (const command of getCommandContents(['propose', 'ff'])) {
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
        'wait for a new user request to start the apply workflow'
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

  it('preserves both boundaries through every command adapter', () => {
    const propose = getCommandContents(['propose'])[0];
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
        'wait for a new user request to start the apply workflow'
      );
      expect(generated, adapter.toolId).toContain(
        `When you are ready, run \`${applyInvocation}\`.`
      );
      expect(generated, adapter.toolId).not.toContain('ask me to implement');
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
      expect(createSection, label).toContain(
        'If a registered store is selected, append `--store "<store-id>"` to that command and each later OpenSpec command shown below that accepts `--store`'
      );
      expect(createSection, label).not.toContain('every follow-up command');
    }
  });

  it('discovers schemas from the authoritative project or store root', () => {
    for (const [label, body] of proposeBodies) {
      const schemaStep = body.indexOf('**Determine the workflow schema**');
      const createStep = body.indexOf('**Create the change directory**');
      const schemaSection = body.slice(schemaStep, createStep);

      expect(schemaSection, label).toContain('Use the configured default schema');
      expect(schemaSection, label).toContain('Explicitly requests a specific schema by name');
      const contextCommand = schemaSection.indexOf('`openspec context --json`');
      const schemasCommand = schemaSection.indexOf('`openspec schemas --json`');
      expect(contextCommand, `${label} is missing root resolution`).toBeGreaterThanOrEqual(0);
      expect(schemasCommand, `${label} lists schemas before resolving the root`).toBeGreaterThan(
        contextCommand
      );
      expect(schemaSection, label).toContain('from the current working directory');
      expect(schemaSection, label).toContain(
        '`openspec context --json --store "<store-id>"`'
      );
      expect(schemaSection, label).toContain(
        'run `openspec schemas --json` with its working directory'
      );
      expect(schemaSection, label).toContain('returned `root.path`');
      expect(schemaSection, label).toContain('local `store:` pointer');
      expect(schemaSection, label).toContain('global `defaultStore`');
      expect(schemaSection, label).toContain(
        'append `--store "<store-id>"` to `openspec schemas --json` as well'
      );
      expect(schemaSection, label).not.toContain('`schemas` does not accept `--store`');
      expect(schemaSection, label).toContain('context reports only `no_openspec_root`');
      expect(schemaSection, label).toContain(
        'run `openspec schemas --json` from the current working directory instead'
      );
      expect(schemaSection, label).toContain(
        'Do not use this fallback for invalid or unavailable stores'
      );
      expect(schemaSection, label).toContain(
        'Otherwise, omit `--schema` to preserve the configured default'
      );
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
        'is a glob, follow `instruction` to choose the concrete file path'
      );
    }
  });
});
