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

  // Regression for #1828: the #1715 write-confirmation rule named
  // `openspec new change` as something that needs a separate yes/no, while
  // the capture branch told the agent to transition "seamlessly" into
  // running it. Both readings were defensible, so the same request either
  // wrote files immediately or stopped and asked. The rule now resolves the
  // conflict in one direction: an explicit capture request IS the
  // confirmation, for the scope that request names.
  it('treats an explicit capture request as the write confirmation (#1828)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'An explicit request from the user to capture the exploration as a new change is itself that confirmation'
      );
      // Scoped to change artifacts, so the carve-out cannot reach the
      // workflow configuration #1715 reported an agent editing.
      expect(body, label).toContain(
        'covering the change and the change artifacts that request names'
      );
    }
  });

  it('keeps the strict rule for a capture the agent proposed itself (#1828)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'That rule governs `openspec new change` whenever you are the one proposing the capture'
      );
      // The guardrail points at the capture transition rather than restating
      // the contract a third time, so the three sites cannot drift apart.
      expect(body, label).toContain(
        "the user's own capture request is the exception, handled in the capture transition above"
      );
    }
  });

  it('states the carve-out at the head of the capture branch, before the scaffold step (#1828)', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);
      const carveOut = transition.indexOf(
        'that request is the confirmation required above'
      );
      const scaffold = transition.indexOf('1. Run `openspec new change "<name>"`');

      expect(carveOut, label).toBeGreaterThanOrEqual(0);
      expect(scaffold, label).toBeGreaterThan(carveOut);
      expect(transition, label).toContain(
        'creating the change artifacts the request names, and nothing else'
      );
    }
  });

  // A yes to an offer the agent made looks identical to a user-initiated
  // capture request at the point the decision is made, so the discriminator
  // has to live in the branch, not only in the guardrail 190 lines below it.
  it('carries the agent-proposed discriminator in the branch itself (#1828)', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);

      expect(transition, label).toContain(
        'This holds only when the request is theirs'
      );
      expect(transition, label).toContain(
        'a yes to an offer you made confirms only the scope your offer itself named'
      );
    }
  });

  // "Do not ask for a second confirmation" would have contradicted step 2,
  // nine lines below it, which requires asking before expanding the capture.
  // Narrow the licence to re-asking for what was already asked for.
  it('does not license skipping the asks the capture steps still require (#1828)', () => {
    for (const [label, body] of bodies) {
      const transition = newChangeTransition(body, label);

      expect(transition, label).toContain(
        "Don't re-ask for what they already asked for; do ask before anything beyond it"
      );
      expect(transition, label).not.toContain('Do not ask for a second confirmation');
      expect(transition, label).toContain('ask before expanding the capture');
      expect(transition, label).toContain(
        'Do not create an unrequested prerequisite unless the user approves'
      );
    }
  });

  // The carve-out must not become a blanket write permit: #1715's guarantee
  // survives only if everything outside the requested scope still stops.
  it('keeps the carve-out scoped to what the request named (#1828, #1715)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        'Confirmation covers only the scope you described; ask again before expanding it'
      );
      expect(body, label).toContain(
        'Answering design or clarifying questions is never consent to write'
      );
      expect(body, label).toContain(
        'Accepting an answer or a batch of recommendations is not permission to write'
      );
      expect(body, label).toContain(
        'creating or editing schemas, templates, or `openspec/config.yaml` is a change'
      );
    }
  });

  // #1828 was not a missing sentence. It was a second, contradictory sentence
  // elsewhere in the same body, and no `toContain` assertion can see one of
  // those: every pinned string stays present while the new sentence reverses
  // it. So invert the check. Collect EVERY sentence that couples consent
  // language to the capture topic and require each to be one the resolution
  // sanctions, which surfaces a gate added anywhere in the body - Guardrails,
  // "Planning a Change", either capture branch.
  //
  // Limits worth knowing: this is lexical. A sentence that reverses the
  // resolution without using any consent word - redefining what counts as
  // "requested", or suspending the carve-out on a condition - is invisible
  // here and stays a review responsibility.
  const CONSENT_WORDS =
    /\b(confirm(?:ation|s|ed)?|yes\/no|approv(?:al|es|ed)|permission|consent)\b/i;
  const CAPTURE_WORDS = /(openspec new change|scaffold|captur|write-capable|first write)/i;

  const SANCTIONED_CONSENT = [
    // The stance paragraph: the rule, then the carve-out.
    /You MAY create or update OpenSpec change artifacts .* within a confirmed scope/,
    /Before the first write-capable action, name the artifacts or files you would change/,
    /An explicit request from the user to capture the exploration as a new change is itself that confirmation/,
    // The capture branch: the carve-out and both of its fences.
    /that request is the confirmation required above/,
    /This holds only when the request is theirs/,
    /a yes to an offer you made confirms only the scope your offer itself named/,
    /Don't re-ask for what they already asked for/,
    /Do not create an unrequested prerequisite unless the user approves/,
    // The guardrail: the rule, and a pointer back to the branch.
    /Before the first write-capable action—including `openspec new change`/,
    /That rule governs `openspec new change` whenever you are the one proposing the capture/,
  ];

  // The `--store` reminder repeats on five steps and says "confirmed" only to
  // mean "the store id you already resolved", which is not a consent rule.
  const STORE_REMINDER =
    /\(append the confirmed `--store "<id>"` only for a registered standalone store\)/g;

  function consentSentences(body: string, requireCaptureTopic: boolean): string[] {
    return body
      .replace(STORE_REMINDER, '')
      .split(/(?<=[.:;])\s+/)
      .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
      .filter(
        (sentence) =>
          CONSENT_WORDS.test(sentence) &&
          (!requireCaptureTopic || CAPTURE_WORDS.test(sentence))
      );
  }

  it('couples consent to capture only where the resolution sanctions it (#1828)', () => {
    for (const [label, body] of bodies) {
      const unsanctioned = consentSentences(body, true).filter(
        (sentence) => !SANCTIONED_CONSENT.some((allowed) => allowed.test(sentence))
      );

      expect(unsanctioned, `${label} must add no unsanctioned consent rule`).toEqual([]);
    }
  });

  // Inside the capture branch, drop the topic filter entirely: a gate written
  // there is about the capture whether or not it says so. Without this, a bare
  // "get a fresh yes/no before running anything" inserted above step 1 reads as
  // off-topic and reinstates #1828 with the suite green.
  it('adds no confirmation gate of its own inside the capture branch (#1828)', () => {
    for (const [label, body] of bodies) {
      const unsanctioned = consentSentences(
        newChangeTransition(body, label),
        false
      ).filter((sentence) => !SANCTIONED_CONSENT.some((allowed) => allowed.test(sentence)));

      expect(unsanctioned, `${label} capture branch must carry no gate`).toEqual([]);
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
