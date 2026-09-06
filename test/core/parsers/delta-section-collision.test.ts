import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { parseDeltaSpec } from '../../../src/core/parsers/requirement-blocks.js';
import { buildUpdatedSpec, findSpecUpdates } from '../../../src/core/specs-apply.js';

/**
 * A delta file may write the same delta header more than once, and may spell it
 * with different casing. Sections used to be collected into a title-keyed
 * record, so a repeat overwrote the earlier body (last wins) and a case variant
 * was skipped by the first-match lookup (first wins). Either way the discarded
 * requirements were gone before validation or the merge could see them, so
 * `validate` passed and `archive` reported success having applied less than the
 * author wrote.
 */
describe('parseDeltaSpec (repeated delta section headers)', () => {
  it('applies both ADDED sections when the header is repeated', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '### Requirement: First',
        'The system SHALL do the first thing.',
        '',
        '#### Scenario: One',
        '- **WHEN** a',
        '- **THEN** b',
        '',
        '## ADDED Requirements',
        '### Requirement: Second',
        'The system SHALL do the second thing.',
        '',
        '#### Scenario: Two',
        '- **WHEN** c',
        '- **THEN** d',
      ].join('\n')
    );

    expect(plan.added.map((block) => block.name)).toEqual(['First', 'Second']);
  });

  it('applies both ADDED sections when the two headers differ only in case', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '### Requirement: First',
        'The system SHALL do the first thing.',
        '',
        '## Added Requirements',
        '### Requirement: Second',
        'The system SHALL do the second thing.',
      ].join('\n')
    );

    expect(plan.added.map((block) => block.name)).toEqual(['First', 'Second']);
  });

  it('applies every copy when the header appears three times', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '### Requirement: First',
        'a',
        '## ADDED REQUIREMENTS',
        '### Requirement: Second',
        'b',
        '## added requirements',
        '### Requirement: Third',
        'c',
      ].join('\n')
    );

    expect(plan.added.map((block) => block.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('applies copies that are separated by an unrelated section', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '### Requirement: First',
        'a',
        '## MODIFIED Requirements',
        '### Requirement: Existing',
        'b',
        '## ADDED Requirements',
        '### Requirement: Second',
        'c',
      ].join('\n')
    );

    expect(plan.added.map((block) => block.name)).toEqual(['First', 'Second']);
    expect(plan.modified.map((block) => block.name)).toEqual(['Existing']);
  });

  it('collects REMOVED names from every copy of the header', () => {
    const plan = parseDeltaSpec(
      [
        '## REMOVED Requirements',
        '### Requirement: First',
        '**Reason**: gone',
        '',
        '## REMOVED Requirements',
        '### Requirement: Second',
        '**Reason**: also gone',
      ].join('\n')
    );

    expect(plan.removed).toEqual(['First', 'Second']);
    expect(plan.removedBlocks.map((block) => block.name)).toEqual(['First', 'Second']);
  });

  it('collects RENAMED pairs from every copy of the header', () => {
    const plan = parseDeltaSpec(
      [
        '## RENAMED Requirements',
        '',
        '- FROM: `### Requirement: A`',
        '- TO: `### Requirement: B`',
        '',
        '## RENAMED Requirements',
        '',
        '- FROM: `### Requirement: C`',
        '- TO: `### Requirement: D`',
      ].join('\n')
    );

    expect(plan.renamed).toEqual([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ]);
  });

  it('never pairs a FROM in one section with a TO in another', () => {
    const plan = parseDeltaSpec(
      [
        '## RENAMED Requirements',
        '',
        '- FROM: `### Requirement: A`',
        '',
        '## RENAMED Requirements',
        '',
        '- TO: `### Requirement: B`',
      ].join('\n')
    );

    // Each section is read on its own, so a dangling FROM cannot silently
    // capture an unrelated TO written under a different header.
    expect(plan.renamed).toEqual([]);
  });

  it('reports skipped headers with the line number of the copy they came from', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements', // 1
        '### Requirement: First', // 2
        'a', // 3
        '', // 4
        '## ADDED Requirements', // 5
        '### Notes go here', // 6
        '### Requirement: Second', // 7
        'b', // 8
      ].join('\n')
    );

    expect(plan.added.map((block) => block.name)).toEqual(['First', 'Second']);
    expect(plan.skippedHeaders).toHaveLength(1);
    expect(plan.skippedHeaders[0].header).toBe('Notes go here');
    expect(plan.skippedHeaders[0].line).toBe(6);
  });

  it('still ignores a delta header that only appears inside a code fence', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '### Requirement: Only One',
        'The system SHALL document the delta format.',
        '',
        '#### Scenario: Example',
        '- **THEN** it reads:',
        '',
        '```markdown',
        '## ADDED Requirements',
        '### Requirement: Not Real',
        '```',
      ].join('\n')
    );

    expect(plan.added.map((block) => block.name)).toEqual(['Only One']);
  });

  it('leaves a single section of each kind behaving exactly as before', () => {
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

    expect(plan.added.map((b) => b.name)).toEqual(['A']);
    expect(plan.modified.map((b) => b.name)).toEqual(['B']);
    expect(plan.removed).toEqual(['C']);
    expect(plan.renamed).toEqual([{ from: 'D', to: 'E' }]);
    expect(plan.sectionPresence).toEqual({
      added: true,
      modified: true,
      removed: true,
      renamed: true,
    });
  });

  it('reports section presence for a header written only as a second copy', () => {
    const plan = parseDeltaSpec(
      ['## ADDED Requirements', '### Requirement: A', 'a'].join('\n')
    );
    expect(plan.sectionPresence.removed).toBe(false);
  });
});

describe('buildUpdatedSpec (repeated delta section headers)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-dupsection-'));
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
    '### Requirement: Late Fees',
    'The system SHALL apply a late fee to invoices overdue by 30 days.',
    '',
    '#### Scenario: Thirty days overdue',
    '- **WHEN** an invoice is 30 days overdue',
    '- **THEN** a late fee is applied',
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

  it('applies both ADDED sections when the header is repeated', async () => {
    const built = await build(
      [
        '## ADDED Requirements',
        '### Requirement: Dunning Notices',
        'The system SHALL send a dunning notice when an invoice is 7 days overdue.',
        '',
        '#### Scenario: Invoice overdue',
        '- **WHEN** an invoice is 7 days overdue',
        '- **THEN** a dunning notice is sent',
        '',
        '## ADDED Requirements',
        '### Requirement: Credit Notes',
        'The system SHALL issue a credit note when an invoice is voided.',
        '',
        '#### Scenario: Invoice voided',
        '- **WHEN** an invoice is voided',
        '- **THEN** a credit note is issued',
      ].join('\n')
    );

    expect(built.rebuilt).toContain('### Requirement: Dunning Notices');
    expect(built.rebuilt).toContain('### Requirement: Credit Notes');
    expect(built.counts.added).toBe(2);
  });

  it('applies both MODIFIED sections when the header is repeated', async () => {
    const built = await build(
      [
        '## MODIFIED Requirements',
        '### Requirement: Invoice Generation',
        'The system SHALL generate an invoice for every completed billing period AND email it.',
        '',
        '#### Scenario: Period closes',
        '- **WHEN** a billing period closes',
        '- **THEN** an invoice is generated and emailed',
        '',
        '## MODIFIED Requirements',
        '### Requirement: Late Fees',
        'The system SHALL apply a late fee of 5 percent to invoices overdue by 30 days.',
        '',
        '#### Scenario: Thirty days overdue',
        '- **WHEN** an invoice is 30 days overdue',
        '- **THEN** a 5 percent late fee is applied',
      ].join('\n')
    );

    expect(built.rebuilt).toContain('and emailed');
    expect(built.rebuilt).toContain('5 percent late fee');
    expect(built.counts.modified).toBe(2);
  });

  it('applies both REMOVED sections when the header is repeated', async () => {
    const built = await build(
      [
        '## REMOVED Requirements',
        '### Requirement: Invoice Generation',
        '**Reason**: replaced by the ledger',
        '',
        '## REMOVED Requirements',
        '### Requirement: Late Fees',
        '**Reason**: no longer charged',
      ].join('\n')
    );

    expect(built.rebuilt).not.toContain('### Requirement: Invoice Generation');
    expect(built.rebuilt).not.toContain('### Requirement: Late Fees');
    expect(built.counts.removed).toBe(2);
  });

  it('still rejects the same requirement added twice across two copies', async () => {
    await expect(
      build(
        [
          '## ADDED Requirements',
          '### Requirement: Dunning Notices',
          'The system SHALL send a dunning notice.',
          '',
          '#### Scenario: Overdue',
          '- **WHEN** a',
          '- **THEN** b',
          '',
          '## ADDED Requirements',
          '### Requirement: Dunning Notices',
          'The system SHALL send a different dunning notice.',
          '',
          '#### Scenario: Overdue',
          '- **WHEN** c',
          '- **THEN** d',
        ].join('\n')
      )
    ).rejects.toThrow(/duplicate requirement in ADDED/i);
  });
});
