import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { parseDeltaSpec } from '../../../src/core/parsers/requirement-blocks.js';
import { buildUpdatedSpec, findSpecUpdates } from '../../../src/core/specs-apply.js';
import { Validator } from '../../../src/core/validation/validator.js';

/**
 * The RENAMED reader used to carry one mutable `{ from, to }` and drop whatever
 * did not fit, with nothing recording the loss: a requested rename could
 * silently not happen, and interleaved FROM/TO lines could rename a requirement
 * the delta never named, under a name written for a different one. Every
 * unpaired line is now reported, and the merge refuses rather than guessing.
 */
describe('parseDeltaSpec (RENAMED pairing)', () => {
  const renamed = (...lines: string[]) =>
    parseDeltaSpec(['## RENAMED Requirements', '', ...lines].join('\n'));

  it('pairs FROM/TO written in the documented order', () => {
    const plan = renamed(
      '- FROM: `### Requirement: Late Fees`',
      '- TO: `### Requirement: Overdue Penalties`'
    );
    expect(plan.renamed).toEqual([{ from: 'Late Fees', to: 'Overdue Penalties' }]);
    expect(plan.unpairedRenames).toEqual([]);
  });

  it('pairs several consecutive renames', () => {
    const plan = renamed(
      '- FROM: `### Requirement: A`',
      '- TO: `### Requirement: B`',
      '- FROM: `### Requirement: C`',
      '- TO: `### Requirement: D`'
    );
    expect(plan.renamed).toEqual([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ]);
    expect(plan.unpairedRenames).toEqual([]);
  });

  it('reports a TO written before its FROM instead of dropping the rename', () => {
    const plan = renamed(
      '- TO: `### Requirement: Overdue Penalties`',
      '- FROM: `### Requirement: Late Fees`'
    );
    expect(plan.renamed).toEqual([]);
    expect(plan.unpairedRenames).toEqual([
      { side: 'TO', name: 'Overdue Penalties', line: 3 },
      { side: 'FROM', name: 'Late Fees', line: 4 },
    ]);
  });

  it('reports the FROM that a second FROM displaced', () => {
    const plan = renamed(
      '- FROM: `### Requirement: Invoice Generation`',
      '- FROM: `### Requirement: Late Fees`',
      '- TO: `### Requirement: Overdue Penalties`'
    );
    expect(plan.renamed).toEqual([{ from: 'Late Fees', to: 'Overdue Penalties' }]);
    expect(plan.unpairedRenames).toEqual([
      { side: 'FROM', name: 'Invoice Generation', line: 3 },
    ]);
  });

  it('reports a trailing FROM that never receives a TO', () => {
    const plan = renamed(
      '- FROM: `### Requirement: Late Fees`',
      '- TO: `### Requirement: Overdue Penalties`',
      '- FROM: `### Requirement: Invoice Generation`'
    );
    expect(plan.renamed).toEqual([{ from: 'Late Fees', to: 'Overdue Penalties' }]);
    expect(plan.unpairedRenames).toEqual([
      { side: 'FROM', name: 'Invoice Generation', line: 5 },
    ]);
  });

  it('reports both stragglers when FROM/TO lines interleave', () => {
    const plan = renamed(
      '- FROM: `### Requirement: Late Fees`',
      '- FROM: `### Requirement: Invoice Generation`',
      '- TO: `### Requirement: Overdue Penalties`',
      '- TO: `### Requirement: Invoice Creation`'
    );
    expect(plan.unpairedRenames).toEqual([
      { side: 'FROM', name: 'Late Fees', line: 3 },
      { side: 'TO', name: 'Invoice Creation', line: 6 },
    ]);
  });

  it('ignores FROM/TO lines inside a code fence', () => {
    const plan = renamed(
      '```markdown',
      '- FROM: `### Requirement: Example`',
      '- TO: `### Requirement: Other`',
      '```'
    );
    expect(plan.renamed).toEqual([]);
    expect(plan.unpairedRenames).toEqual([]);
  });

  it('reports nothing for a RENAMED section with no FROM/TO lines', () => {
    const plan = renamed('Nothing to rename yet.');
    expect(plan.renamed).toEqual([]);
    expect(plan.unpairedRenames).toEqual([]);
  });

  it('reports nothing when there is no RENAMED section at all', () => {
    const plan = parseDeltaSpec(
      ['## ADDED Requirements', '### Requirement: A', 'a'].join('\n')
    );
    expect(plan.unpairedRenames).toEqual([]);
  });
});

describe('buildUpdatedSpec (RENAMED pairing)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-renamed-'));
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

  it('still applies a well-formed rename', async () => {
    const built = await build(
      [
        '## RENAMED Requirements',
        '',
        '- FROM: `### Requirement: Late Fees`',
        '- TO: `### Requirement: Overdue Penalties`',
      ].join('\n')
    );
    expect(built.counts.renamed).toBe(1);
    expect(built.rebuilt).toContain('### Requirement: Overdue Penalties');
    expect(built.rebuilt).toContain('### Requirement: Invoice Generation');
    expect(built.rebuilt).not.toContain('### Requirement: Late Fees');
  });

  it('refuses interleaved FROM/TO lines instead of renaming the wrong requirement', async () => {
    await expect(
      build(
        [
          '## RENAMED Requirements',
          '',
          '- FROM: `### Requirement: Late Fees`',
          '- FROM: `### Requirement: Invoice Generation`',
          '- TO: `### Requirement: Overdue Penalties`',
          '- TO: `### Requirement: Invoice Creation`',
        ].join('\n')
      )
    ).rejects.toThrow(/RENAMED entry on line 3 has no matching TO:/);
  });

  it('refuses a rename whose TO is written before its FROM', async () => {
    await expect(
      build(
        [
          '## RENAMED Requirements',
          '',
          '- TO: `### Requirement: Overdue Penalties`',
          '- FROM: `### Requirement: Late Fees`',
        ].join('\n')
      )
    ).rejects.toThrow(/RENAMED entry on line 3 has no matching FROM:/);
  });

  it('refuses a trailing FROM with no TO', async () => {
    await expect(
      build(
        [
          '## RENAMED Requirements',
          '',
          '- FROM: `### Requirement: Late Fees`',
          '- TO: `### Requirement: Overdue Penalties`',
          '- FROM: `### Requirement: Invoice Generation`',
        ].join('\n')
      )
    ).rejects.toThrow(/RENAMED entry on line 5 has no matching TO:/);
  });
});

describe('validate <change> (RENAMED pairing)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-renamed-validate-'));
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

  it('reports an unpaired FROM as an error', async () => {
    const report = await validateDelta(
      [
        '## RENAMED Requirements',
        '',
        '- FROM: `### Requirement: Late Fees`',
        '- FROM: `### Requirement: Invoice Generation`',
        '- TO: `### Requirement: Overdue Penalties`',
      ].join('\n')
    );

    const errors = report.issues.filter((issue) => issue.level === 'ERROR');
    expect(errors.some((issue) => /RENAMED FROM: "Late Fees" has no matching TO:/.test(issue.message))).toBe(
      true
    );
    expect(report.valid).toBe(false);
  });

  it('leaves a well-formed rename valid', async () => {
    const report = await validateDelta(
      [
        '## RENAMED Requirements',
        '',
        '- FROM: `### Requirement: Late Fees`',
        '- TO: `### Requirement: Overdue Penalties`',
      ].join('\n')
    );

    expect(
      report.issues.filter((issue) => issue.level === 'ERROR' && /RENAMED/.test(issue.message))
    ).toEqual([]);
  });
});
