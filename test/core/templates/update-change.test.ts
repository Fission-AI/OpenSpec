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

  // Regression for #1836: step 4 said "Apply the requested edit" while step 5
  // said "Write only after the user confirms". "Apply" reads as a write verb in
  // this document - step 5 is itself titled "Confirm and apply" - so the same
  // request either wrote immediately or showed the revision first, depending on
  // which passage the agent weighed. Step 5 is the only write path; step 4
  // drafts.
  it('keeps step 4 non-writing so step 5 owns the only write (#1836)', () => {
    for (const [label, body] of bodies) {
      const start = body.indexOf('4. **Read and reconcile**');
      const end = body.indexOf('5. **Confirm and apply, one artifact at a time**');

      expect(start, label).toBeGreaterThanOrEqual(0);
      expect(end, label).toBeGreaterThan(start);

      const step = body.slice(start, end);
      expect(step, label).toContain('Draft the requested edit.');
      expect(step, label).not.toContain('Apply the requested edit');
    }
  });

  it('orders the draft before the confirmed write (#1836)', () => {
    for (const [label, body] of bodies) {
      const draft = body.indexOf('Draft the requested edit.');
      const confirmedWrite = body.indexOf('Write only after the user confirms.');

      expect(draft, label).toBeGreaterThanOrEqual(0);
      expect(confirmedWrite, label).toBeGreaterThan(draft);
    }
  });
});
