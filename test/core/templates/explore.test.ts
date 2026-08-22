import { describe, expect, it } from 'vitest';

import {
  getExploreSkillTemplate,
  getOpsxExploreCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

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

// East Asian "Ambiguous Width" glyphs: box drawing, block elements,
// geometric shapes, arrows, bullets, and the check/cross dingbats. Many
// terminals render these two columns wide.
const AMBIGUOUS_WIDTH = /[\u2022\u2190-\u21FF\u2500-\u25FF\u2713-\u2718]/;

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
        .filter(([, line]) => AMBIGUOUS_WIDTH.test(line.normalize('NFC')))
        .map(([lineNumber, line]) => `${lineNumber}: ${line}`);

      expect(offenders, `${label} fenced examples must be pure ASCII`).toEqual([]);
    }
  });

  it('tells the agent to draw with ASCII and says why (#983)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('**Draw with plain ASCII only**');
      expect(body, label).toContain('Ambiguous Width');
      expect(body, label).toContain('two columns wide');
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
