import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { parseDeltaSpec } from '../../../src/core/parsers/requirement-blocks.js';
import { buildUpdatedSpec, findSpecUpdates } from '../../../src/core/specs-apply.js';
import { Validator } from '../../../src/core/validation/validator.js';

/**
 * A canonical `### Requirement:` block written outside every delta section is
 * ignored by the reader. It used to be ignored in complete silence, which is
 * inconsistent with the adjacent mistake: a non-canonical `###` header INSIDE a
 * delta section has been reported as INFO since #498. The well-formed block in
 * the wrong place - the costlier error, because it reads exactly like one that
 * would apply - said nothing at all.
 */
describe('parseDeltaSpec (requirements outside delta sections)', () => {
  it('reports a requirement under an unrecognised section', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '### Requirement: Applied',
        'a',
        '',
        '## Notes',
        '### Requirement: Ignored',
        'b',
      ].join('\n')
    );

    expect(plan.added.map((b) => b.name)).toEqual(['Applied']);
    expect(plan.orphanedRequirements).toEqual([
      { name: 'Ignored', section: 'Notes', line: 6 },
    ]);
  });

  it('reports a requirement written above the first section', () => {
    const plan = parseDeltaSpec(
      ['### Requirement: Stray', 'a', '', '## ADDED Requirements', '### Requirement: Applied', 'b'].join(
        '\n'
      )
    );

    expect(plan.added.map((b) => b.name)).toEqual(['Applied']);
    expect(plan.orphanedRequirements).toEqual([
      { name: 'Stray', section: null, line: 1 },
    ]);
  });

  it('reports a requirement under a misspelled delta header', () => {
    const plan = parseDeltaSpec(
      ['## Add Requirements', '### Requirement: Typo Section', 'a'].join('\n')
    );

    expect(plan.added).toEqual([]);
    expect(plan.orphanedRequirements).toEqual([
      { name: 'Typo Section', section: 'Add Requirements', line: 2 },
    ]);
  });

  it('reports several orphans in document order', () => {
    const plan = parseDeltaSpec(
      [
        '## Notes',
        '### Requirement: One',
        '## ADDED Requirements',
        '### Requirement: Applied',
        '## Context',
        '### Requirement: Two',
      ].join('\n')
    );

    expect(plan.orphanedRequirements.map((o) => [o.name, o.line])).toEqual([
      ['One', 2],
      ['Two', 6],
    ]);
  });

  it('reports nothing when every requirement sits in a delta section', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '### Requirement: A',
        'a',
        '## MODIFIED Requirements',
        '### Requirement: B',
        'b',
        '## REMOVED Requirements',
        '### Requirement: C',
        '## RENAMED Requirements',
        '- FROM: `### Requirement: D`',
        '- TO: `### Requirement: E`',
      ].join('\n')
    );

    expect(plan.orphanedRequirements).toEqual([]);
  });

  it('accepts every casing of the delta headers without reporting', () => {
    const plan = parseDeltaSpec(
      ['## added requirements', '### Requirement: A', '## Modified Requirements', '### Requirement: B'].join(
        '\n'
      )
    );
    expect(plan.orphanedRequirements).toEqual([]);
  });

  it('does not report a requirement shown inside a code fence', () => {
    const plan = parseDeltaSpec(
      [
        '## Notes',
        'An example of the format:',
        '',
        '```markdown',
        '### Requirement: Just An Example',
        '```',
      ].join('\n')
    );

    expect(plan.orphanedRequirements).toEqual([]);
  });

  it('does not report a delta section that legitimately has a Purpose above it', () => {
    const plan = parseDeltaSpec(
      [
        '## Purpose',
        'Describes a brand new capability.',
        '',
        '## ADDED Requirements',
        '### Requirement: A',
        'a',
      ].join('\n')
    );

    expect(plan.orphanedRequirements).toEqual([]);
  });
});

describe('buildUpdatedSpec (requirements outside delta sections)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-orphan-req-'));
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const MAIN_SPEC = [
    '# billing Specification',
    '',
    '## Purpose',
    'Defines how billing behaves for customers and operators.',
    '',
    '## Requirements',
    '### Requirement: Invoice Generation',
    'The system SHALL generate an invoice for every completed billing period.',
    '',
    '#### Scenario: Period closes',
    '- **WHEN** a billing period closes',
    '- **THEN** an invoice is generated',
    '',
  ].join('\n');

  async function build(deltaBody: string) {
    const specsRoot = path.join(tempDir, 'openspec', 'specs');
    const specsDir = path.join(specsRoot, 'billing');
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'spec.md'), MAIN_SPEC);
    await fs.writeFile(path.join(changeDir, 'specs', 'billing', 'spec.md'), deltaBody);
    const [update] = await findSpecUpdates(changeDir, specsRoot);
    return buildUpdatedSpec(update, 'c', { silent: true });
  }

  it('warns rather than silently dropping the requirement', async () => {
    const built = await build(
      [
        '## ADDED Requirements',
        '### Requirement: Dunning Notices',
        'The system SHALL send a dunning notice when an invoice is 7 days overdue.',
        '',
        '#### Scenario: Invoice overdue',
        '- **WHEN** a',
        '- **THEN** b',
        '',
        '## Notes',
        '### Requirement: Credit Notes',
        'The system SHALL issue a credit note when an invoice is voided.',
      ].join('\n')
    );

    expect(built.warnings.some((w) => w.includes('Credit Notes'))).toBe(true);
    expect(built.warnings.some((w) => w.includes('## Notes'))).toBe(true);
    // Behaviour is unchanged: the orphan is still not applied, only reported.
    expect(built.rebuilt).not.toContain('### Requirement: Credit Notes');
    expect(built.rebuilt).toContain('### Requirement: Dunning Notices');
  });

  it('emits no such warning for a well-formed delta', async () => {
    const built = await build(
      [
        '## ADDED Requirements',
        '### Requirement: Dunning Notices',
        'The system SHALL send a dunning notice.',
        '',
        '#### Scenario: Invoice overdue',
        '- **WHEN** a',
        '- **THEN** b',
      ].join('\n')
    );

    expect(built.warnings.filter((w) => w.includes('not a delta section'))).toEqual([]);
  });
});

describe('validate <change> (requirements outside delta sections)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-orphan-validate-'));
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function validateDelta(deltaBody: string) {
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
    await fs.writeFile(path.join(changeDir, 'specs', 'billing', 'spec.md'), deltaBody);
    return new Validator().validateChangeDeltaSpecs(changeDir);
  }

  it('reports the orphan as a warning without failing the change', async () => {
    const report = await validateDelta(
      [
        '## ADDED Requirements',
        '### Requirement: Applied',
        'The system SHALL do a thing.',
        '',
        '#### Scenario: S',
        '- **WHEN** a',
        '- **THEN** b',
        '',
        '## Notes',
        '### Requirement: Ignored',
        'The system SHALL do another thing.',
      ].join('\n')
    );

    const warnings = report.issues.filter((issue) => issue.level === 'WARNING');
    expect(warnings.some((issue) => /Requirement "Ignored" is under "## Notes"/.test(issue.message))).toBe(
      true
    );
    // A warning must not change the verdict.
    expect(report.issues.filter((i) => i.level === 'ERROR')).toEqual([]);
  });
});
