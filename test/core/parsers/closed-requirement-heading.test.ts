import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  extractRequirementsSection,
  normalizeRequirementName,
  parseDeltaSpec,
} from '../../../src/core/parsers/requirement-blocks.js';
import { findMainSpecStructureIssues } from '../../../src/core/parsers/spec-structure.js';
import { buildUpdatedSpec, findSpecUpdates } from '../../../src/core/specs-apply.js';

const NBSP = String.fromCharCode(0xa0);

/**
 * CommonMark lets an ATX heading end in a closing run of `#`s, so
 * `### Requirement: Late Fees ###` renders as the same heading as
 * `### Requirement: Late Fees`. Requirement names kept the run, so a REMOVED
 * written that way looked for "Late Fees ###", missed the requirement, and
 * archive skipped the removal with a false "treating it as already removed"
 * warning. Scenario names already dropped the run; requirement names now do too.
 */
describe('requirement names with a CommonMark closing sequence', () => {
  describe('normalizeRequirementName', () => {
    it.each([
      ['Late Fees ###', 'Late Fees'],
      ['Late Fees #', 'Late Fees'],
      ['Late Fees \t##  ', 'Late Fees'],
      ['  Late Fees  ', 'Late Fees'],
    ])('strips the closing run from %j', (input, expected) => {
      expect(normalizeRequirementName(input)).toBe(expected);
    });

    it.each([
      // Not a closing sequence: the run must be preceded by a space or tab.
      ['C#', 'C#'],
      ['Foo##', 'Foo##'],
      // Not a closing sequence: the run must end the line.
      ['Priority #1', 'Priority #1'],
      // CommonMark does not treat NBSP as the separator, so the run stays.
      [`Late Fees${NBSP}###`, `Late Fees${NBSP}###`],
    ])('keeps %j unchanged', (input, expected) => {
      expect(normalizeRequirementName(input)).toBe(expected);
    });
  });

  describe('readers', () => {
    it('names a closed main-spec heading by its rendered text', () => {
      const parts = extractRequirementsSection(
        ['## Requirements', '### Requirement: Late Fees ###', 'The system SHALL charge late fees.', ''].join('\n')
      );
      expect(parts.bodyBlocks.map((b) => b.name)).toEqual(['Late Fees']);
    });

    it('reads every delta section header form without the closing run', () => {
      const plan = parseDeltaSpec(
        [
          '## ADDED Requirements',
          '### Requirement: Credit Notes ##',
          'The system SHALL issue credit notes.',
          '',
          '## MODIFIED Requirements',
          '### Requirement: Invoice Generation ###',
          'The system SHALL generate invoices.',
          '',
          '## REMOVED Requirements',
          '### Requirement: Late Fees ###',
          '- `### Requirement: Grace Period ###`',
          '',
          '## RENAMED Requirements',
          '- FROM: `### Requirement: Refunds ###`',
          '- TO: `### Requirement: Credit Refunds ###`',
          '',
        ].join('\n')
      );
      expect(plan.added.map((b) => b.name)).toEqual(['Credit Notes']);
      expect(plan.modified.map((b) => b.name)).toEqual(['Invoice Generation']);
      expect(plan.removed).toEqual(['Late Fees', 'Grace Period']);
      expect(plan.renamed).toEqual([{ from: 'Refunds', to: 'Credit Refunds' }]);
    });

    it('reports a closed and an open heading of one requirement as duplicates', () => {
      const issues = findMainSpecStructureIssues(
        [
          '## Requirements',
          '### Requirement: Late Fees',
          'The system SHALL charge late fees.',
          '',
          '### Requirement: Late Fees ###',
          'The system SHALL charge late fees again.',
          '',
        ].join('\n')
      );
      expect(issues.map((issue) => issue.kind)).toEqual(['duplicate-requirement']);
    });

    it('does not report distinct names as duplicates (control)', () => {
      const issues = findMainSpecStructureIssues(
        ['## Requirements', '### Requirement: C', 'x', '', '### Requirement: C#', 'y', ''].join('\n')
      );
      expect(issues).toEqual([]);
    });
  });

  describe('buildUpdatedSpec', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-closed-heading-'));
    });
    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    const mainSpec = (lateFeesHeader = '### Requirement: Late Fees') =>
      [
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
        lateFeesHeader,
        'The system SHALL apply a late fee to invoices overdue by 30 days.',
        '',
        '#### Scenario: Thirty days overdue',
        '- **WHEN** an invoice is 30 days overdue',
        '- **THEN** a late fee is applied',
        '',
      ].join('\n');

    async function build(deltaBody: string, main = mainSpec()) {
      const specsRoot = path.join(tempDir, 'openspec', 'specs');
      const specsDir = path.join(specsRoot, 'billing');
      const changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
      await fs.mkdir(specsDir, { recursive: true });
      await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
      await fs.writeFile(path.join(specsDir, 'spec.md'), main);
      await fs.writeFile(path.join(changeDir, 'specs', 'billing', 'spec.md'), deltaBody);
      const [update] = await findSpecUpdates(changeDir, specsRoot);
      return buildUpdatedSpec(update, 'c', { silent: true });
    }

    const headers = (spec: string) => spec.split('\n').filter((line) => line.startsWith('### Requirement:'));

    const modifiedLateFees = (header: string) =>
      [
        '## MODIFIED Requirements',
        header,
        'The system SHALL apply a late fee to invoices overdue by 45 days.',
        '',
        '#### Scenario: Thirty days overdue',
        '- **WHEN** an invoice is 45 days overdue',
        '- **THEN** a late fee is applied',
        '',
      ].join('\n');

    it('removes a requirement named by a closed REMOVED heading', async () => {
      const result = await build(
        ['## REMOVED Requirements', '### Requirement: Late Fees ###', '**Reason**: no longer charged', ''].join('\n')
      );
      expect(headers(result.rebuilt)).toEqual(['### Requirement: Invoice Generation']);
      expect(result.counts.removed).toBe(1);
      expect(JSON.stringify(result.warnings)).not.toMatch(/already removed/);
    });

    it('removes a requirement named by a closed REMOVED bullet', async () => {
      const result = await build(['## REMOVED Requirements', '- `### Requirement: Late Fees ###`', ''].join('\n'));
      expect(headers(result.rebuilt)).toEqual(['### Requirement: Invoice Generation']);
      expect(result.counts.removed).toBe(1);
    });

    it('removes a requirement whose main-spec heading is closed, named plainly in the delta', async () => {
      const result = await build(
        ['## REMOVED Requirements', '### Requirement: Late Fees', '**Reason**: no longer charged', ''].join('\n'),
        mainSpec('### Requirement: Late Fees ###')
      );
      expect(headers(result.rebuilt)).toEqual(['### Requirement: Invoice Generation']);
      expect(result.counts.removed).toBe(1);
    });

    it('modifies a plain main-spec requirement from a closed MODIFIED heading', async () => {
      const result = await build(modifiedLateFees('### Requirement: Late Fees ###'));
      expect(result.counts.modified).toBe(1);
      expect(result.rebuilt).toContain('overdue by 45 days');
      expect(result.rebuilt).not.toContain('overdue by 30 days');
    });

    it('modifies a closed main-spec requirement from a plain MODIFIED heading', async () => {
      const result = await build(
        modifiedLateFees('### Requirement: Late Fees'),
        mainSpec('### Requirement: Late Fees ###')
      );
      expect(result.counts.modified).toBe(1);
      expect(result.rebuilt).toContain('overdue by 45 days');
    });

    it('renames from and to closed headings, writing the rendered name', async () => {
      const result = await build(
        [
          '## RENAMED Requirements',
          '- FROM: `### Requirement: Late Fees ###`',
          '- TO: `### Requirement: Overdue Fees ##`',
          '',
        ].join('\n')
      );
      expect(headers(result.rebuilt)).toEqual([
        '### Requirement: Invoice Generation',
        '### Requirement: Overdue Fees',
      ]);
    });

    it('treats a closed ADDED heading of an existing requirement as that requirement', async () => {
      await expect(
        build(
          [
            '## ADDED Requirements',
            '### Requirement: Late Fees ###',
            'The system SHALL apply a late fee to invoices overdue by 15 days.',
            '',
            '#### Scenario: Fifteen days overdue',
            '- **WHEN** an invoice is 15 days overdue',
            '- **THEN** a late fee is applied',
            '',
          ].join('\n')
        )
      ).rejects.toThrow('billing ADDED failed for header "### Requirement: Late Fees" - already exists');
    });

    it('keeps a trailing # that is part of the name (control)', async () => {
      const result = await build(
        [
          '## ADDED Requirements',
          '### Requirement: C#',
          'The system SHALL support C# clients.',
          '',
          '#### Scenario: Client connects',
          '- **WHEN** a C# client connects',
          '- **THEN** it is served',
          '',
        ].join('\n')
      );
      expect(headers(result.rebuilt)).toContain('### Requirement: C#');
      expect(result.counts.added).toBe(1);
    });
  });
});
