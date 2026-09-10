import { describe, expect, it } from 'vitest';

import {
  getUpdateChangeSkillTemplate,
  getOpsxUpdateCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';

const skill = getUpdateChangeSkillTemplate();
const command = getOpsxUpdateCommandTemplate();

// Both delivery surfaces must carry the same contract; every behavioral
// assertion below runs against each body.
const bodies: Array<[string, string]> = [
  ['skill', skill.instructions],
  ['command', command.content],
];

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
// authorizes a write here.
const SANCTIONED_OUTSIDE_STEP_FIVE = [
  'step 5 owns every write',
  'Do NOT write to `resolvedOutputPath`',
  '- Edit only the concrete files in `existingOutputPaths`; never write to a glob `resolvedOutputPath`.',
  'Confirm every edit with the user before writing.',
  '`/opsx:apply`',
  'already applied',
];

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
  /without (?:asking|confirming|confirmation)|do not wait for confirmation|no confirmation (?:is )?(?:needed|required)/i;

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
      // Everything the agent reads except step 5 and the shared store preamble.
      // #1836 lived in step 4, but a sentence in the intro, in step 3, in the
      // Guardrails or in the Output section would govern the agent just as well
      // while sitting outside any single-step slice.
      let rest = body
        .split(stepFive(body, label))
        .join('\n')
        .split(STORE_SELECTION_GUIDANCE)
        .join('');
      for (const sanctioned of SANCTIONED_OUTSIDE_STEP_FIVE) {
        rest = rest.split(sanctioned).join('');
      }

      expect(rest, `${label}: only step 5 may instruct a write`).not.toMatch(WRITE_VERB);
      expect(rest, `${label}: only step 5 may instruct a write`).not.toMatch(WRITE_PHRASE);
      expect(rest, `${label}: nothing may waive the confirmation`).not.toMatch(CONSENT_BYPASS);
      // A leading adverb ("Immediately revise the files ...") must not disarm
      // this - the verb does not have to be the bullet's first token.
      expect(rest, `${label}: no imperative edit bullet outside step 5`).not.toMatch(
        /^\s*-\s*(?:\w+ly,?\s+)?(?:Revise|Edit|Update|Rewrite)\b/im
      );
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
      expect(body, label).toContain('Do NOT create artifacts that don\'t exist yet');
    }
  });

  it('writes to existingOutputPaths, never to a glob resolvedOutputPath (3.4)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('artifactPaths.<id>.existingOutputPaths');
      expect(body, label).toContain('Do NOT write to `resolvedOutputPath`');
      expect(body, label).toContain('still the glob pattern, not a real file');
    }
  });

  it('ends with next-step guidance and never acts on it (3.5)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('guidance only - NEVER act on it');
      expect(body, label).toContain('suggest `/opsx:continue`');
      expect(body, label).toContain('suggest `/opsx:apply`');
      expect(body, label).toContain('suggest `/opsx:archive`');
      expect(body, label).toContain('the code may no longer match the revised plan');
    }
  });

  it('explains the optional continue workflow before suggesting it', () => {
    for (const [label, body] of bodies) {
      const availabilityGuidance = body.indexOf(
        '`/opsx:continue` is an optional workflow and may not be installed'
      );
      const firstSuggestion = body.indexOf(
        '`/opsx:continue`',
        availabilityGuidance + '`/opsx:continue`'.length
      );

      expect(availabilityGuidance, label).toBeGreaterThanOrEqual(0);
      expect(body.indexOf('`/opsx:continue`'), label).toBe(availabilityGuidance);
      expect(firstSuggestion, label).toBeGreaterThan(availabilityGuidance);
      expect(body, label).toContain(
        'If it is unavailable, `openspec status --change "<name>" --json` shows the next artifact'
      );
      expect(body, label).toContain(
        '`openspec instructions "<artifact-id>" --change "<name>" --json` explains how to create it'
      );
    }
  });

  it('confirms every edit and redirects intent changes to /opsx:new', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('Write only after the user confirms');
      expect(body, label).toContain('If the user rejects a revision, do not write it');
      expect(body, label).toContain('recommend starting fresh with `/opsx:new`');
      expect(body, label).toContain('Update vs. Start Fresh');
      expect(body, label).toContain('ask for a distinct unused change name');
      expect(body, label).toContain('openspec new change "<new-change-name>"');
      expect(body, label).not.toContain('openspec new change "<name>"');

      const newAvailabilityCheck = body.indexOf(
        'first verify whether the optional `/opsx:new` workflow is available'
      );
      const newRecommendation = body.indexOf('recommend starting fresh with `/opsx:new`');
      expect(newAvailabilityCheck, label).toBeGreaterThanOrEqual(0);
      expect(body.slice(0, newAvailabilityCheck), label).not.toContain('`/opsx:new`');
      expect(newRecommendation, label).toBeGreaterThan(newAvailabilityCheck);
    }
  });
});
