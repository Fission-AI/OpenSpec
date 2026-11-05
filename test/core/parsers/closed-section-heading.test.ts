import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MarkdownParser } from '../../../src/core/parsers/markdown-parser.js';
import { parseDeltaSpec } from '../../../src/core/parsers/requirement-blocks.js';
import { findMainSpecStructureIssues } from '../../../src/core/parsers/spec-structure.js';
import { findPurposePlaceholderIssue } from '../../../src/core/validation/purpose-placeholder.js';
import { Validator } from '../../../src/core/validation/validator.js';

/**
 * Issue #2145: CommonMark lets an ATX heading end in a closing run of `#`s, so
 * `## Purpose ##` is the same heading as `## Purpose`. Section titles kept the
 * run, so validate/show/list/view could not find a closed Purpose, Why, What
 * Changes, Requirements or delta section.
 */
const ISSUE_SPEC = [
  '# Fees',
  '',
  '## Purpose ##',
  'Late fee rules for overdue invoices.',
  '',
  '## Requirements',
  '',
  '### Requirement: Late Fees',
  'The system SHALL charge late fees.',
  '',
  '#### Scenario: Overdue',
  '- **WHEN** an invoice is overdue',
  '- **THEN** a late fee is charged',
  '',
].join('\n');

const specWithPurposeHeading = (heading: string) => ISSUE_SPEC.replace('## Purpose ##', heading);

describe('section headings with a CommonMark closing sequence (#2145)', () => {
  it('validates the spec from the issue', async () => {
    const report = await new Validator().validateSpecContent('fees', ISSUE_SPEC);
    expect(report.issues.filter((i) => i.level === 'ERROR')).toEqual([]);
    expect(report.valid).toBe(true);
  });

  it.each([
    ['## Purpose #'],
    ['## Purpose ###   '],
    ['## Purpose\t##\t'],
    ['##  Purpose  ##'],
  ])('reads %j as the Purpose heading', (heading) => {
    const spec = new MarkdownParser(specWithPurposeHeading(heading)).parseSpec('fees');
    expect(spec.overview).toBe('Late fee rules for overdue invoices.');
  });

  it('reads a fully closed spec with CRLF line endings', () => {
    const content = ISSUE_SPEC.replace('## Requirements', '## Requirements ##')
      .replace('### Requirement: Late Fees', '### Requirement: Late Fees ###')
      .replace('#### Scenario: Overdue', '#### Scenario: Overdue ####')
      .replace(/\n/g, '\r\n');
    const spec = new MarkdownParser(content).parseSpec('fees');
    expect(spec.overview).toBe('Late fee rules for overdue invoices.');
    expect(spec.requirements.map((r) => r.name)).toEqual(['Late Fees']);
    expect(spec.requirements[0].scenarios.map((s) => s.name)).toEqual(['Overdue']);
  });

  it.each([
    // No space or tab before the run: CommonMark keeps it in the title.
    ['## Purpose#'],
    ['## Purpose##'],
    // An escaped `#` is literal text, not a closing run.
    ['## Purpose \\#'],
    // A run must end the line to close it.
    ['## Purpose ## notes'],
  ])('does not treat %j as the Purpose heading', (heading) => {
    expect(() => new MarkdownParser(specWithPurposeHeading(heading)).parseSpec('fees')).toThrow(
      'Spec must have a Purpose section'
    );
  });

  it('flags a placeholder under a closed Purpose heading', () => {
    const content = ISSUE_SPEC.replace('Late fee rules for overdue invoices.', 'TBD');
    expect(findPurposePlaceholderIssue('TBD', content)).toEqual({ line: 4 });
  });

  it('reads a delta whose section headings are closed', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements ##',
        '### Requirement: Grace Period',
        'The system SHALL allow a grace period.',
        '',
        '#### Scenario: Paid late',
        '- **WHEN** an invoice is paid within the grace period',
        '- **THEN** no late fee is charged',
        '',
        '## REMOVED Requirements #',
        '- `### Requirement: Late Fees`',
        '',
      ].join('\n')
    );
    expect(plan.added.map((b) => b.name)).toEqual(['Grace Period']);
    expect(plan.removed).toEqual(['Late Fees']);
    expect(plan.orphanedRequirements).toEqual([]);
  });

  it('still flags a closed delta header written into a main spec', () => {
    const issues = findMainSpecStructureIssues(ISSUE_SPEC.replace('## Requirements', '## ADDED Requirements ##'));
    expect(issues.map((i) => i.kind)).toContain('delta-header');
  });

  describe('change validation', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-closed-heading-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('validates a change whose proposal and delta headings are closed', async () => {
      const changeDir = path.join(tempDir, 'changes', 'add-grace');
      await fs.mkdir(path.join(changeDir, 'specs', 'fees'), { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        [
          '## Why ##',
          'Customers who pay a day late should not be charged a fee.',
          '',
          '## What Changes ##',
          '- **fees:** Add a grace period',
          '',
        ].join('\n')
      );
      await fs.writeFile(
        path.join(changeDir, 'specs', 'fees', 'spec.md'),
        [
          '## ADDED Requirements ##',
          '### Requirement: Grace Period ###',
          'The system SHALL allow a grace period.',
          '',
          '#### Scenario: Paid late ####',
          '- **WHEN** an invoice is paid within the grace period',
          '- **THEN** no late fee is charged',
          '',
        ].join('\n')
      );

      const validator = new Validator(true);
      const proposal = await validator.validateChange(path.join(changeDir, 'proposal.md'));
      expect(proposal.issues.filter((i) => i.level === 'ERROR')).toEqual([]);

      const deltas = await validator.validateChangeDeltaSpecs(changeDir);
      expect(deltas.issues).toEqual([]);
      expect(deltas.valid).toBe(true);
    });
  });
});
