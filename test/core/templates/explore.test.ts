import { describe, expect, it } from 'vitest';

import {
  getExploreSkillTemplate,
  getOpsxExploreCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import {
  getSkillReferenceTransformer,
  transformCommandInvocations,
  transformToCodexCompatibleSkillReferences,
  transformToSkillReferences,
} from '../../../src/utils/command-references.js';
import { CommandAdapterRegistry } from '../../../src/core/command-generation/registry.js';
import {
  formatCommandInvocation,
  getInvocationForAdapter,
} from '../../../src/core/command-generation/invocation.js';
import { AI_TOOLS } from '../../../src/core/config.js';

const skill = getExploreSkillTemplate();
const command = getOpsxExploreCommandTemplate();

// Both delivery surfaces must carry the same contract; every behavioral
// assertion below runs against each body.
const bodies: Array<[string, string]> = [
  ['skill', skill.instructions],
  ['command', command.content],
];

function newChangeTransition(body: string, label: string): string {
  const start = body.indexOf('### When no change exists');
  const end = body.indexOf('### When a change exists');

  expect(start, label).toBeGreaterThanOrEqual(0);
  expect(end, label).toBeGreaterThan(start);

  return body.slice(start, end);
}

function occurrenceCount(body: string, value: string): number {
  return body.split(value).length - 1;
}

const NON_ASCII = /[^\x00-\x7F]/;

function fencedBlockLines(body: string): Array<[number, string]> {
  const lines: Array<[number, string]> = [];
  let inFence = false;

  body.split('\n').forEach((line, index) => {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      return;
    }
    if (inFence) {
      lines.push([index + 1, line]);
    }
  });

  return lines;
}

describe('explore templates', () => {
  it('guides planning without forcing an interview on open-ended exploration (#1017)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('When the user is planning a change');
      expect(body, label).toContain('For open-ended discussion, follow the conversation');
      expect(body, label).toContain('Stop asking when the user has enough clarity');
      expect(body, label).toContain('Let them pause, pivot, or defer a decision');
      expect(body, label).not.toContain('Relentless Interview Mode');
    }
  });

  it('investigates repository facts before asking while acknowledging missing evidence (#1017)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('Before asking a factual question, follow the context discovery below');
      expect(body, label).toContain('relevant OpenSpec artifacts, source, tests, docs, and configuration');
      expect(body, label).toContain('Do not ask the user to repeat facts you can verify');
      expect(body, label).toContain('If evidence is missing, conflicting, or inaccessible');
      expect(body, label).toContain('ask only for the clarification needed to proceed');
    }
  });

  it('resolves blocking decisions first and revisits dependent assumptions (#1017)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('Resolve the next blocking decision before its dependent details');
      expect(body, label).toContain('Revisit downstream assumptions when an earlier answer changes');
      expect(body, label).toContain('Skip branches that do not matter to this goal');
    }
  });

  it('asks one focused question and recommends only when evidence supports a choice (#1017)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('Ask one focused question at a time');
      expect(body, label).toContain('Batch questions only if the user asks for a batch');
      expect(body, label).toContain('explain why it matters and which decision it unlocks');
      expect(body, label).toContain('When evidence supports a recommendation');
      expect(body, label).toContain('Do not invent intent, priorities, or external constraints');
    }
  });

  it('keeps decisions in the conversation without accepting defaults or authorizing writes (#1017)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('Track decisions in the conversation');
      expect(body, label).toContain('Separate confirmed decisions from proposed defaults and unresolved questions');
      expect(body, label).toContain('Silence is not acceptance');
      expect(body, label).toContain('Accepting an answer or a batch of recommendations is not permission to write');
      expect(body, label).toContain('Keep file-write confirmation separate from discovery questions');
    }
  });

  it('delivers the same planning guidance exactly once in both templates (#1017)', () => {
    const sections = bodies.map(([label, body]) => {
      const heading = '## Planning a Change';
      expect(occurrenceCount(body, heading), label).toBe(1);
      const start = body.indexOf(heading);
      const end = body.indexOf('\n---', start);
      expect(end, label).toBeGreaterThan(start);
      return body.slice(start, end);
    });

    expect(sections[0]).toBe(sections[1]);
  });

  // Regression for #696: explore never loaded the project's declared
  // context, so it reasoned without the tech stack, conventions, and
  // rules every artifact-creating workflow already receives.
  it('loads project context from the OpenSpec config at startup (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('openspec/config.yaml');
      expect(body, label).toContain('`context`: project background');
      expect(body, label).toContain('`rules`: keyed by artifact id');
    }
  });

  it('resolves the config through the reported root rather than assuming a repo-local path (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('openspec list --json');
      expect(body, label).toContain('<root.path>/openspec/config.yaml');
      expect(body, label).toContain('root.path');
    }
  });

  // resolveConfigFilePath() probes config.yaml then config.yml, and
  // `openspec init` leaves a .yml project on .yml forever - naming only
  // .yaml would silently skip context for those projects.
  it('accepts config.yml as well as config.yaml (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('config.yml');
      expect(body, label).toContain('skip this if neither file exists');
    }
  });

  // `rules` is Record<artifactId, string[]>; explore holds no artifact at
  // startup, so the guidance must not invite blanket application.
  it('scopes rules to the artifact they are keyed to (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'the entries for an artifact apply only when you write that artifact'
      );
    }
  });

  // House style across instructions.ts and the sibling workflow templates
  // forbids leaking context/rules into the artifact, not just the chat.
  it('treats project context as constraints that must not leak into output (#696)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('constraints for you to follow');
      expect(body, label).toContain(
        'do NOT copy them into the conversation or into any artifact you create'
      );
    }
  });

  it('requires separate confirmation before any file-writing action (#1715)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'Before the first write-capable action'
      );
      expect(body, label).toContain('name the artifacts or files you would change');
      expect(body, label).toContain('ask a direct yes/no question');
      expect(body, label).toContain("wait for the user's confirmation in a separate message");
      expect(body, label).toContain(
        'Answering design or clarifying questions is never consent to write'
      );
      expect(body, label).toContain('run read-only commands or tools without confirmation');
      expect(body, label).toContain(
        'Confirmation covers only the scope you described; ask again before expanding it'
      );
    }
  });

  it('treats workflow configuration and write-capable commands as changes (#1715)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'creating or editing schemas, templates, or `openspec/config.yaml` is a change'
      );
      expect(body, label).toContain(
        'including `openspec new change` or another command that writes files'
      );
      expect(body, label).toContain(
        'Creating or updating OpenSpec change artifacts within the confirmed scope is fine, writing anything else is not'
      );
    }
  });

  it('scaffolds a new change before capturing exploration artifacts (#668, #720)', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);

      expect(transition, label).toContain('openspec new change "<name>"');
      expect(transition, label).toContain(
        'Never create a new change directory under `openspec/changes/` by hand'
      );
      expect(transition, label).toContain('`.openspec.yaml`');
      expect(transition, label).not.toContain(
        'Never create files or directories directly under `openspec/changes/`'
      );
    }
  });

  it('retains the selected store throughout the capture transition (#668, #720)', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);
      const scaffold = transition.indexOf('1. Run `openspec new change "<name>"`');
      const retainStore = transition.indexOf(
        'Keep the selected `--store <id>` on every applicable follow-up `status` and `instructions` command'
      );
      const initialStatus = transition.indexOf(
        '2. Run `openspec status --change "<name>" --json`'
      );

      expect(retainStore, label).toBeGreaterThan(scaffold);
      expect(initialStatus, label).toBeGreaterThan(retainStore);
      expect(
        occurrenceCount(
          transition,
          '(append the confirmed `--store "<id>"` only for a registered standalone store)'
        ),
        label
      ).toBe(5);
    }
  });

  it('continues an accepted transition through the requested artifact (#668)', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);

      expect(transition, label).toContain('openspec status --change "<name>" --json');
      expect(transition, label).toContain(
        'openspec instructions "<artifact-id>" --change "<name>" --json'
      );
      expect(transition, label).toContain('Capture the artifact(s) the user requested');
      expect(transition, label).toContain(
        'without asking them to invoke another workflow command'
      );
      expect(transition, label).toContain(
        'process the requested artifacts in dependency order'
      );
      expect(transition, label).toContain(
        'After creating each artifact, re-run `openspec status --change "<name>" --json`'
      );
      expect(transition, label).toContain(
        'If the instruction delegates creation to a specific skill or command'
      );
      expect(transition, label).toContain(
        'Verify that the selected concrete output exists'
      );
    }
  });

  it('keeps the seamless capture steps ordered (#668, #720)', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);
      const scaffold = transition.indexOf('1. Run `openspec new change "<name>"`');
      const initialStatus = transition.indexOf(
        '2. Run `openspec status --change "<name>" --json`'
      );
      const readyInstructions = transition.indexOf(
        'For each requested artifact that is `ready`, run `openspec instructions'
      );
      const verifyOutput = transition.indexOf(
        'Verify that the selected concrete output exists'
      );
      const refreshStatus = transition.indexOf(
        'After creating each artifact, re-run `openspec status'
      );

      expect(scaffold, label).toBeGreaterThanOrEqual(0);
      expect(initialStatus, label).toBeGreaterThan(scaffold);
      expect(readyInstructions, label).toBeGreaterThan(initialStatus);
      expect(verifyOutput, label).toBeGreaterThan(readyInstructions);
      expect(refreshStatus, label).toBeGreaterThan(verifyOutput);
      expect(occurrenceCount(transition, 'openspec new change "<name>"'), label).toBe(1);
      expect(
        occurrenceCount(transition, 'openspec status --change "<name>" --json'),
        label
      ).toBe(2);
      expect(
        occurrenceCount(transition, 'openspec instructions "<artifact-id>"'),
        label
      ).toBe(2);
      expect(
        occurrenceCount(transition, 'openspec instructions "<prerequisite-id>"'),
        label
      ).toBe(1);
      expect(
        occurrenceCount(transition, 'Verify that the selected concrete output exists'),
        label
      ).toBe(1);
      expect(
        occurrenceCount(transition, 'After creating each artifact, re-run `openspec status'),
        label
      ).toBe(1);
    }
  });

  // Regression for #983: the worked examples drew boxes and tables with
  // Unicode box-drawing, arrow, and marker glyphs. Agents copy those
  // examples verbatim, and on terminals that render the glyphs
  // double-width the right border of every padded box drifted loose.
  it('draws every fenced example with plain ASCII only (#983)', () => {
    for (const [label, body] of bodies) {
      const offenders = fencedBlockLines(body)
        .filter(([, line]) => NON_ASCII.test(line))
        .map(([lineNumber, line]) => `${lineNumber}: ${line}`);

      expect(offenders, `${label} fenced examples must be pure ASCII`).toEqual([]);
    }
  });

  it('tells the agent to draw with ASCII and says why (#983)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('**Draw with plain ASCII only**');
      expect(body, label).toContain('render at different widths');
      expect(body, label).toContain('Keep every diagram character ASCII');
    }
  });

  it('stops after scaffolding when the user requests only a new change (#668)', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);
      expect(transition, label).toContain(
        'If they asked only to start a change, stop after scaffolding and show its status'
      );
    }
  });

  it('uses dependency context and artifact constraints during capture (#668)', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);

      expect(transition, label).toContain(
        'Read completed dependency files listed in `dependencies`'
      );
      expect(transition, label).toContain('apply `context` and `rules` as constraints');
      expect(transition, label).toContain('without copying them into the artifact');
    }
  });

  it('handles conditional prerequisites without deadlocking capture (#668)', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);
      const requestedInstructions = transition.indexOf(
        'For each requested artifact that is `ready`, run `openspec instructions'
      );
      const evaluateRequestedCondition = transition.indexOf(
        'Before creating a requested artifact, evaluate any condition in its own `instruction`'
      );
      const inspectPrerequisite = transition.indexOf(
        'run `openspec instructions "<prerequisite-id>"'
      );
      const evaluateCondition = transition.indexOf(
        'evaluate that condition against the explored change'
      );
      const recordSkip = transition.indexOf(
        'record a deliberate skip only when the condition does not apply'
      );
      const requireExpansion = transition.indexOf(
        'If the condition applies, or the prerequisite is not conditional'
      );
      const approvalGuard = transition.indexOf(
        'Do not create an unrequested prerequisite unless the user approves'
      );

      expect(transition, label).toContain(
        'run `openspec instructions "<prerequisite-id>" --change "<name>" --json` (append the confirmed `--store "<id>"` only for a registered standalone store) for that prerequisite whether it is `ready` or `blocked`'
      );
      expect(transition, label).toContain(
        'record a deliberate skip instead when the condition does not apply'
      );
      expect(transition, label).toContain(
        'record a deliberate skip only when the condition does not apply'
      );
      expect(transition, label).toContain(
        'If the condition applies, or the prerequisite is not conditional, treat it as a normal prerequisite'
      );
      expect(transition, label).toContain('Do not create an unrequested prerequisite');
      expect(transition, label).toContain(
        'deliberately skipped because its own `instruction` stated a condition that did not apply'
      );
      expect(transition, label).toContain('remember it, and do not reconsider it');
      expect(transition, label).toContain('Dependencies are enablers, not gates');
      expect(transition, label).toContain(
        'run `openspec instructions "<artifact-id>" --change "<name>" --json` (append the confirmed `--store "<id>"` only for a registered standalone store) despite the blocked status'
      );
      expect(transition, label).toContain(
        'only when those recorded conditional skips are its sole missing dependencies'
      );
      expect(transition, label).toContain('cannot be conditionally skipped');
      expect(requestedInstructions, label).toBeGreaterThanOrEqual(0);
      expect(evaluateRequestedCondition, label).toBeGreaterThan(requestedInstructions);
      expect(inspectPrerequisite, label).toBeGreaterThan(evaluateRequestedCondition);
      expect(evaluateCondition, label).toBeGreaterThan(inspectPrerequisite);
      expect(recordSkip, label).toBeGreaterThan(evaluateCondition);
      expect(requireExpansion, label).toBeGreaterThan(recordSkip);
      expect(approvalGuard, label).toBeGreaterThan(requireExpansion);
    }
  });
});

// Regression for #869: explore refused to implement and told the agent to
// "create a change proposal" without ever naming the workflow that does it.
// With no named exit, agents answered the discovery questions and then went
// straight to writing code - the failure two reporters hit through Copilot.
describe('explore handoff to the propose workflow (#869)', () => {
  it('names the propose workflow when the user asks for implementation', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'point them at `/opsx:propose`, which turns the discussion into a change'
      );
      expect(body, label).toContain('The work happens from that change, never from explore mode');
      expect(body, label).not.toContain(
        'remind them to exit explore mode first and create a change proposal'
      );
    }
  });

  it('names the propose workflow where discovery ends', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        '**Flow into a proposal**: "Ready to start? Run `/opsx:propose` and this becomes a change."'
      );
      expect(body, label).not.toContain('I can create a change proposal');
    }
  });

  it('pairs the do-not-implement guardrail with the handoff', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'When the user is ready to build, name the handoff rather than starting: `/opsx:propose` turns the discussion into a change, and the work happens there'
      );
    }
  });

  it('offers the handoff as a next step in the closing summary', () => {
    expect(skill.instructions).toContain('- Turn this into a change: `/opsx:propose`');
    expect(skill.instructions).not.toContain('- Create a change proposal');
  });

  // The reference has to be the canonical `/opsx:<id>` form of a known
  // command id, or the per-tool transformers leave it as written and the
  // skill advertises an invocation no tool registers (#727, #1307).
  it('writes the reference so per-tool rendering rewrites it', () => {
    for (const [label, body] of bodies) {
      const rendered = transformToSkillReferences(body);
      expect(rendered, label).toContain('/openspec-propose');
      expect(rendered, label).not.toContain('/opsx:propose');
    }
  });
});

// The handoff is only useful if every tool renders it as an invocation that
// tool actually registers. These assertions walk the real registries rather
// than a hand-picked few, so a new adapter or a changed invocation shape
// cannot quietly leave explore advertising a command nobody answers to
// (the #727 / #1307 failure mode).
describe('explore handoff renders for every delivery surface (#869)', () => {
  // Both workflows explore hands off to. Each is a `CORE_WORKFLOWS` member,
  // so naming them does not advertise anything the default profile omits.
  const HANDOFF_IDS = ['propose', 'apply'] as const;

  function canonicalCount(body: string, commandId: string): number {
    return occurrenceCount(body, `/opsx:${commandId}`);
  }

  it('names both handoff workflows in both bodies before any rendering', () => {
    for (const [label, body] of bodies) {
      for (const commandId of HANDOFF_IDS) {
        expect(canonicalCount(body, commandId), `${label} ${commandId}`).toBeGreaterThan(0);
      }
    }
  });

  it('rewrites every reference for each registered command adapter', () => {
    const adapters = CommandAdapterRegistry.getAll();
    expect(adapters.length).toBeGreaterThan(0);

    for (const adapter of adapters) {
      const invocation = getInvocationForAdapter(adapter);

      for (const [label, body] of bodies) {
        const rendered = transformCommandInvocations(body, invocation);

        for (const commandId of HANDOFF_IDS) {
          const expected = formatCommandInvocation(invocation, commandId);
          const where = `${adapter.toolId} ${label} ${commandId}`;

          // Every canonical reference became this tool's spelling. Counting
          // rather than substring-matching catches a partial rewrite, and it
          // holds for the namespaced tools whose spelling is the canonical one.
          expect(occurrenceCount(rendered, expected), where).toBe(
            canonicalCount(body, commandId)
          );
        }
      }
    }
  });

  it('rewrites every reference for each skills-only tool', () => {
    for (const tool of AI_TOOLS) {
      const transform = getSkillReferenceTransformer(tool.value);

      for (const [label, body] of bodies) {
        const rendered = transform(body);

        expect(rendered, `${tool.value} ${label}`).not.toContain('/opsx:');
        expect(occurrenceCount(rendered, 'openspec-propose'), `${tool.value} ${label}`).toBe(
          canonicalCount(body, 'propose')
        );
        expect(
          occurrenceCount(rendered, 'openspec-apply-change'),
          `${tool.value} ${label}`
        ).toBe(canonicalCount(body, 'apply'));
      }
    }
  });

  it('keeps the handoff readable on the shared .agents tree Codex writes', () => {
    for (const [label, body] of bodies) {
      const rendered = transformToCodexCompatibleSkillReferences(body);

      expect(rendered, label).not.toContain('/opsx:');
      expect(
        occurrenceCount(rendered, '$openspec-propose (Codex) or /openspec-propose (other agents)'),
        label
      ).toBe(canonicalCount(body, 'propose'));
      expect(
        occurrenceCount(
          rendered,
          '$openspec-apply-change (Codex) or /openspec-apply-change (other agents)'
        ),
        label
      ).toBe(canonicalCount(body, 'apply'));
    }
  });
});

// Regression for #869: the seamless capture path let explore scaffold a
// change and write artifacts, then said nothing about what came next. An
// agent holding a fresh proposal inside explore mode has an obvious wrong
// next move, which is the one the issue reported.
describe('explore capture path names where the work continues (#869)', () => {
  it('ends the capture by naming propose and apply', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);

      expect(transition, label).toContain(
        'When the requested capture is done, stop there and name where the work continues'
      );
      expect(transition, label).toContain('`/opsx:propose` writes the remaining planning artifacts');
      expect(transition, label).toContain('`/opsx:apply` implements the change once tasks exist');
    }
  });

  it('says that capturing artifacts is not permission to implement them', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);
      expect(transition, label).toContain(
        'Capturing artifacts is never permission to implement them'
      );
    }
  });
});
