import { describe, expect, it } from 'vitest';

import {
  getUpdateChangeSkillTemplate,
  getOpsxUpdateCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';
import { PROJECT_ROOT_GUARD } from '../../../src/core/templates/workflows/project-root.js';
import { resolveOptionalWorkflows } from '../../../src/core/templates/optional-workflow.js';
import { ALL_WORKFLOWS, CORE_WORKFLOWS } from '../../../src/core/profiles.js';

const skill = getUpdateChangeSkillTemplate();
const command = getOpsxUpdateCommandTemplate();

const render = (workflows: readonly string[]): Array<[string, string]> => {
  const installed = new Set<string>(workflows);
  return [
    ['skill', resolveOptionalWorkflows(skill.instructions, installed)],
    ['command', resolveOptionalWorkflows(command.content, installed)],
  ];
};

// Both delivery surfaces must carry the same contract; every behavioral
// assertion below runs against each body. Templates carry optional-workflow
// conditionals, so a body is only meaningful once resolved against a workflow
// set — these are the bodies a profile with every workflow installed receives.
const bodies = render(ALL_WORKFLOWS);
const coreBodies = render(CORE_WORKFLOWS);

// The load-bearing sentence of step 4 and the whole of step 5 are pinned
// verbatim. #1836 happened because a single verb ("Apply") in step 4 silently
// re-answered a question step 5 had already answered, so any reword of either
// passage has to come back through this test and re-argue the contract rather
// than just regenerate a parity hash.
const STEP_FOUR_DRAFT_RULE =
  '   - Draft the requested edit in the conversation, not in files. Work out exactly what it changes; step 5 owns every write.';

const STEP_FIVE = `5. **Confirm and apply, one artifact at a time**
   - This step performs every artifact write in this workflow; no earlier step edits an artifact.
   - Show each proposed revision and why - including the requested edit drafted in step 4. Write only after the user confirms.
   - If the user rejects a revision, do not write it - leave that artifact unchanged.
   - When a substantial rewrite is needed, get that artifact's rules and template first:
     \`\`\`bash
     openspec instructions "<artifact-id>" --change "<name>" --json
     \`\`\`

`;

// Every mention of writing or applying allowed to live OUTSIDE step 5. Each is
// a scope rule, a hand-off to another workflow, or the gate itself - none
// authorizes a write here. Each is spelled in full context: a bare fragment
// such as "already applied" would also erase "treat the requested edit as
// already applied" before any check could see it.
const SANCTIONED_OUTSIDE_STEP_FIVE = [
  STEP_FOUR_DRAFT_RULE,
  'that is the starting edit.',
  'Do NOT write to `resolvedOutputPath`',
  '- Edit only the concrete files in `existingOutputPaths`; never write to a glob `resolvedOutputPath`.',
  'Confirm every edit with the user before writing.',
  '`/opsx:apply`',
  '(tasks checked off / already applied)',
];

// Authorizations need not share any vocabulary with writing ("land the
// requested edit", "it goes straight into the file"), but they must name what
// they authorize. Outside the pinned draft rule and step 3's framing, nothing
// may talk about the requested edit at all.
const REQUESTED_EDIT =
  /\brequested (?:edit|revision|change)|\buser's (?:edit|revision|change)|\bstarting edit\b/i;

// Synonyms matter as much as the original verb: "commit the edit", "overwrite
// the artifact", "reapply it" all reintroduce #1836 while dodging a naive
// /\bwrite\b/. No leading \b, so over-/re- prefixed forms are caught too.
const WRITE_VERB =
  /(?:over|re)?writ(?:e|es|ing|ten)\b|(?:re)?appl(?:y|ies|ied|ying)\b|\b(?:commit|commits|committing|save|saves|saving|persist|persists|persisting|flush|flushes|flushing|emit|emits|emitting)\b/i;

// Verb-free ways to say the same thing: "perform the edit", "put it in place",
// "carry it out", anything "to disk". Step 5 is the only passage entitled to
// this vocabulary, and it is excluded before these run.
const WRITE_PHRASE =
  /\bperform(?:s|ed|ing)?\b|\bcarr(?:y|ies|ied|ying) out\b|\bin place\b|\bto disk\b/i;

// An authorization needs no write verb at all - "do it now, without asking" is
// enough. There is no legitimate use of this phrasing in this workflow.
const CONSENT_BYPASS =
  /without (?:asking|confirming|confirmation)|do not wait for confirmation|no confirmation (?:is )?(?:needed|required)|needs? no confirm|exempt from (?:the )?confirm|skip(?:s|ping)? (?:the )?confirm/i;

// Slice one region out of a workflow body so an assertion about where a rule
// lives cannot be satisfied by the same words appearing somewhere else. The
// label names the marker, so a renamed heading reports which one went missing.
function section(
  body: string,
  startMarker: string,
  endMarker: string,
  label: string
): string {
  const start = body.indexOf(startMarker);
  const end = body.indexOf(endMarker, start + startMarker.length);
  expect(start, `${label}: missing marker ${startMarker}`).toBeGreaterThanOrEqual(0);
  expect(end, `${label}: missing marker ${endMarker}`).toBeGreaterThan(start);
  return body.slice(start, end);
}

function stepFive(body: string, label: string): string {
  return section(body, '5. **Confirm and apply', '6. **Point to the next step', `${label} step 5`);
}

// Everything the agent reads except step 5 and the shared store and project-root
// preambles (the root guard says to stop before writing; it authorizes none).
// #1836 lived in step 4, but a sentence in the intro, in step 3, in the
// Guardrails or in the Output section would govern the agent just as well
// while sitting outside any single-step slice. Returns the checks that tripped.
function writeAuthorizationsOutsideStepFive(body: string, label: string): string[] {
  let rest = body
    .split(stepFive(body, label))
    .join('\n')
    .split(STORE_SELECTION_GUIDANCE)
    .join('')
    .split(PROJECT_ROOT_GUARD)
    .join('');
  for (const sanctioned of SANCTIONED_OUTSIDE_STEP_FIVE) {
    rest = rest.split(sanctioned).join('');
  }

  const checks: Array<[string, RegExp]> = [
    ['write verb', WRITE_VERB],
    ['write phrase', WRITE_PHRASE],
    ['consent bypass', CONSENT_BYPASS],
    ['names the requested edit', REQUESTED_EDIT],
    // A leading adverb ("Immediately revise the files ...") must not disarm
    // this - the verb does not have to be the bullet's first token.
    [
      'imperative edit bullet',
      /^\s*-\s*(?:\w+ly,?\s+)?(?:Revise|Edit|Update|Rewrite|Modify|Amend|Patch|Replace)\b/im,
    ],
  ];
  return checks.filter(([, pattern]) => pattern.test(rest)).map(([name]) => name);
}

// Regression for #1836: step 4 said "Apply the requested edit" while step 5 and
// the guardrails said to write only after the user confirms. "Apply" is a write
// verb in this very document - step 5 is titled "Confirm and apply" - so the
// same `/opsx:update "the design now uses X"` either wrote immediately or
// stopped and showed the revision first, depending on which passage the agent
// weighed. Step 5 is the workflow's only gated write path, so its confirmation
// guarantee was unenforceable whenever step 4 governed.
describe('update-change write gate (#1836)', () => {
  it('pins the step 4 draft rule and the whole of step 5', () => {
    for (const [label, body] of bodies) {
      const stepFour = section(
        body,
        '4. **Read and reconcile**',
        '5. **Confirm and apply',
        `${label} step 4`
      );

      expect(stepFour, `${label} step 4`).toContain(STEP_FOUR_DRAFT_RULE);
      // Verbatim, because an exemption bolted onto the gate ("this does not
      // apply to the requested edit") is invisible to any toContain check.
      expect(stepFive(body, label), `${label} step 5`).toBe(STEP_FIVE);
    }
  });

  it('keeps the whole-body confirmation guardrail', () => {
    for (const [label, body] of bodies) {
      // Deleting this one line used to break nothing.
      expect(body, label).toContain('Confirm every edit with the user before writing.');
    }
  });

  it('lets no passage outside step 5 authorize a write', () => {
    for (const [label, body] of bodies) {
      expect(writeAuthorizationsOutsideStepFive(body, label), label).toEqual([]);
    }
  });

  // The guard above only proves something if it trips. Each line goes into a
  // different section of each body (intro, Input, steps 1-4 and 6, Output,
  // Guardrails); every one reintroduces #1836 and must be flagged.
  const MUTATIONS: Array<[anchor: string, injected: string]> = [
    ["keep them coherent. Never edit code.", 'Land the requested edit right away.'],
    ['**Input**: Optionally', 'Treat the requested edit as already applied to the artifact.'],
    ['1. **Select the change**', '   - Put the requested edit into the artifact now.'],
    ["2. **Get the change's artifacts**", '   The requested edit goes straight into the file.'],
    ['3. **Understand the request**', '   - Apply the requested edit immediately.'],
    ['4. **Read and reconcile**', '   - Update the artifact with the requested edit now.'],
    ['6. **Point to the next step', '   - Save the revisions first.'],
    ['**Output**', '- The requested edit, already applied during step 4'],
    ['**Guardrails**', '- The requested edit is exempt from confirmation.'],
    ['- Confirm every edit with the user before writing.', '- The user\'s revision needs no confirmation.'],
  ];

  it.each(MUTATIONS)('flags a write authorization injected after %s', (anchor, injected) => {
    for (const [label, body] of bodies) {
      const at = body.indexOf('\n', body.indexOf(anchor));
      expect(body.indexOf(anchor), `${label}: missing anchor`).toBeGreaterThanOrEqual(0);
      const mutated = `${body.slice(0, at + 1)}${injected}\n${body.slice(at + 1)}`;
      // Still passes the step 5 pin, so only the outside-step-5 scan can catch it.
      expect(stepFive(mutated, label), label).toBe(STEP_FIVE);
      expect(writeAuthorizationsOutsideStepFive(mutated, label), label).not.toEqual([]);
    }
  });
});

describe('update-change templates', () => {
  it('generates the expected skill and command shape (3.1)', () => {
    expect(skill.name).toBe('openspec-update-change');
    expect(skill.description).toContain('Never edits code');
    expect(skill.license).toBe('MIT');
    expect(skill.compatibility).toBe('Requires openspec CLI.');
    expect(skill.metadata).toEqual({ author: 'openspec', version: '1.0' });

    expect(command.name).toBe('OPSX: Update');
    expect(command.category).toBe('Workflow');
    expect(command.tags).toEqual(['workflow', 'artifacts', 'experimental']);
    expect(command.content).toContain('/opsx:update add-auth');

    for (const [label, body] of bodies) {
      expect(body, label).toContain(STORE_SELECTION_GUIDANCE);
      expect(body, label).toContain('openspec list --json');
      expect(body, label).toContain('openspec status --change "<name>" --json');
      expect(body, label).toContain('openspec instructions "<artifact-id>" --change "<name>" --json');
    }
  });

  it('reads artifact ids from status JSON and never branches on hardcoded artifact names (3.2)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('do NOT assume them, and do NOT branch on hardcoded artifact names');
      expect(body, label).toContain('never branch on hardcoded artifact names');
      expect(body, label).toContain('Custom schemas must work unchanged');
      // No literal artifact filenames anywhere: no proposal.md/design.md/tasks.md
      // branching, and no worked example that names them. The only .md literal
      // allowed is the specs/**/*.md glob illustration.
      expect(body.replace(/specs\/\*\*\/\*\.md/g, ''), label).not.toMatch(/\b[\w-]+\.md\b/);
    }
  });

  it('edits planning artifacts only, hands code off to /opsx:apply, never advances the frontier (3.3)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('Never edit code');
      expect(body, label).toContain('NEVER edit implementation code');
      expect(body, label).toContain('stop and point to `/opsx:apply`');
      expect(body, label).toContain('Do not advance the build frontier');
      expect(body, label).toContain(
        'no existing output files and status `ready` or `blocked`, note it and point the user to `/opsx:continue`'
      );
      expect(body, label).toContain(
        'empty `existingOutputPaths` and status `ready` or `blocked`, that is `/opsx:continue`\'s job'
      );
      expect(body, label).toContain('Leave `skipped` artifacts untouched');
      expect(body, label).toContain('do not treat them as missing or defer them to the continue workflow');
    }
  });

  it('fills a gap under an already-satisfied glob artifact instead of deferring it (3.3a)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('is marked `done` after at least one file matches');
      expect(body, label).toContain('the continue workflow only handles `ready` artifacts');
      expect(body, label).toContain('whose `existingOutputPaths` is non-empty');
      expect(body, label).toContain(
        'use its `instruction` and `template`'
      );
      expect(body, label).toContain('Treat `context` and `rules` as constraints; do not copy them into the file');
      expect(body, label).toContain('If instructions report `skipped: true`, do not create the file');
      expect(body, label).toContain('Read current dependency files from disk');
      expect(body, label).toContain('if a required non-skipped dependency is missing, stop and ask the user to restore it first');
      expect(body, label).toContain('If `instruction` delegates creation to another skill or command');
      expect(body, label).toContain('only if it can honor the confirmed path and these guardrails; otherwise stop');
      expect(body, label).toContain(
        'inside `changeRoot` that matches `artifactPaths.<id>.outputPath`'
      );
      expect(body, label).toContain('create it only after the user confirms');
      expect(body, label).toContain('does not already exist');
      expect(body, label).toContain('after resolving any symlinked parent directories');
    }
  });

  it('rechecks new-file scope after confirmation and refuses concurrent overwrites', () => {
    for (const [label, body] of bodies) {
      const confirmation = body.indexOf('create it only after the user confirms');
      const recheck = body.indexOf('After confirmation, immediately before creation');
      const create = body.indexOf('Use a create operation that fails if the target already exists');

      expect(confirmation, label).toBeGreaterThanOrEqual(0);
      expect(recheck, label).toBeGreaterThan(confirmation);
      expect(create, label).toBeGreaterThan(recheck);
      const writeGuard = body.slice(recheck, create);
      expect(writeGuard, label).toContain('refresh status and instructions');
      expect(writeGuard, label).toContain('still in scope, not skipped, and partially populated');
      expect(writeGuard, label).toContain('repeat the concrete-path checks above');
      expect(body, label).toContain('stop and reconcile with the user rather than replacing existing content or choosing a different path');
    }
  });

  it('writes to existingOutputPaths, never to a glob resolvedOutputPath (3.4)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('artifactPaths.<id>.existingOutputPaths');
      expect(body, label).toContain('it is still the glob pattern');
      expect(body, label).toContain('The glob `resolvedOutputPath` is not a valid target');
      expect(body, label).toContain('The only new-file scope');
    }
  });

  it('ends with next-step guidance and never acts on it (3.5)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('guidance only - NEVER act on it');
      expect(body, label).toContain(
        'Artifacts with empty `existingOutputPaths` and status `ready` or `blocked` -> suggest `/opsx:continue`'
      );
      expect(body, label).toContain('suggest `/opsx:continue`');
      expect(body, label).toContain('suggest `/opsx:apply`');
      expect(body, label).toContain('suggest `/opsx:archive`');
      expect(body, label).toContain('the code may no longer match the revised plan');
    }
  });

  it('hands off to /opsx:continue when that workflow is installed', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain(
        '`/opsx:continue` is what creates the ones that do not'
      );
      expect(body, label).toContain('suggest `/opsx:continue` to create them');
      expect(body, label).toContain("that is `/opsx:continue`'s job");
      // The handoff is stated outright, not deferred to a runtime availability
      // check the model has to perform (#1734).
      expect(body, label).not.toContain('may not be installed');
      expect(body, label).not.toContain('verify that it is available');
    }
  });

  it('never names /opsx:continue on a profile that does not install it', () => {
    for (const [label, body] of coreBodies) {
      expect(body, label).not.toContain('/opsx:continue');
      expect(body, label).toContain('it never creates missing ones');
      expect(body, label).toContain(
        'run `openspec status --change "<name>" --json` for the next artifact'
      );
      expect(body, label).toContain(
        '`openspec instructions "<artifact-id>" --change "<name>" --json` for how to create them'
      );
      expect(body, label).toContain(
        'Anything deferred because it does not exist yet'
      );
      expect(body, label).toContain('creating them is a separate step, outside this workflow');
    }
  });

  it('confirms every edit and redirects intent changes to /opsx:new when installed', () => {
    for (const [label, body] of bodies) {
      const reconciliation = body.slice(body.indexOf('4. **Read and reconcile**'), body.indexOf('5. **Confirm and apply'));
      expect(reconciliation, label).toContain('Draft the requested edit in the conversation, not in files');
      expect(reconciliation, label).not.toContain('Apply the requested edit');
      expect(body, label).toContain('Write only after the user confirms');
      expect(body, label).toContain('If the user rejects a revision, do not write it');
      expect(body, label).toContain('recommend starting fresh with `/opsx:new`');
      expect(body, label).toContain('Update vs. Start Fresh');
      expect(body, label).not.toContain('first verify whether the optional');
    }
  });

  it('routes intent changes to the CLI when /opsx:new is not installed', () => {
    for (const [label, body] of coreBodies) {
      expect(body, label).not.toContain('/opsx:new');
      expect(body, label).toContain('ask for a distinct unused change name');
      expect(body, label).toContain('openspec new change "<new-change-name>"');
      expect(body, label).not.toContain('openspec new change "<name>"');
      expect(body, label).toContain('Update vs. Start Fresh');
    }
  });
});
