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
      expect(body, label).toContain(
        'Leave an artifact with no existing output files and status `ready` or `blocked` for `/opsx:continue`'
      );
      expect(body, label).toContain(
        'leave artifacts with empty `existingOutputPaths` and status `ready` or `blocked` for `/opsx:continue`'
      );
      expect(body, label).toContain('Leave `skipped` artifacts untouched');
      expect(body, label).toContain('do not treat them as missing or send them to `/opsx:continue`');
    }
  });

  it('fills a gap under an already-satisfied glob artifact instead of deferring it (3.3a)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('is marked `done` after at least one file matches');
      expect(body, label).toContain('`/opsx:continue` only handles `ready` artifacts');
      expect(body, label).toContain('whose `existingOutputPaths` is non-empty');
      expect(body, label).toContain(
        'use its `instruction` and `template`'
      );
      expect(body, label).toContain('Apply `context` and `rules` as constraints; do not copy them into the file');
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
      expect(body, label).toContain('stop and reconcile with the user instead of overwriting or choosing a different path');
    }
  });

  it('writes to existingOutputPaths, never to a glob resolvedOutputPath (3.4)', () => {
    for (const [label, body] of bodies) {
      expect(body, label).toContain('artifactPaths.<id>.existingOutputPaths');
      expect(body, label).toContain('`resolvedOutputPath` is still a pattern');
      expect(body, label).toContain('Never write to the glob `resolvedOutputPath`');
      expect(body, label).toContain('The only new-file exception');
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
      const reconciliation = body.slice(body.indexOf('4. **Read and reconcile**'), body.indexOf('5. **Confirm and apply'));
      expect(reconciliation, label).toContain('Draft the requested edit without writing');
      expect(reconciliation, label).not.toContain('Apply the requested edit');
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
