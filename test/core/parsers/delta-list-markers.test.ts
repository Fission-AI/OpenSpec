import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { parseDeltaSpec } from '../../../src/core/parsers/requirement-blocks.js';
import { buildUpdatedSpec, findSpecUpdates } from '../../../src/core/specs-apply.js';

/**
 * CommonMark bullet lists may open with `-`, `*` or `+`. The REMOVED bullet form
 * and the RENAMED FROM:/TO: form used to match only `-`, so a removal or rename
 * written with either of the other two markers matched nothing: the operation
 * silently never happened while `validate` passed and `archive` exited 0
 * reporting success. The project already accepts more than one marker elsewhere
 * (`TASK_LINE_PATTERN` in utils/task-progress.ts allows `-` and `*`).
 */
const MARKERS = ['-', '*', '+'] as const;

describe('parseDeltaSpec (REMOVED list markers)', () => {
  for (const marker of MARKERS) {
    it(`accepts the "${marker}" marker`, () => {
      const plan = parseDeltaSpec(
        ['## REMOVED Requirements', '', `${marker} \`### Requirement: Late Fees\``].join('\n')
      );
      expect(plan.removed).toEqual(['Late Fees']);
    });

    it(`accepts the "${marker}" marker without backticks`, () => {
      const plan = parseDeltaSpec(
        ['## REMOVED Requirements', '', `${marker} ### Requirement: Late Fees`].join('\n')
      );
      expect(plan.removed).toEqual(['Late Fees']);
    });

    it(`accepts the "${marker}" marker when the entry is indented`, () => {
      const plan = parseDeltaSpec(
        ['## REMOVED Requirements', '', `   ${marker} \`### Requirement: Late Fees\``].join('\n')
      );
      expect(plan.removed).toEqual(['Late Fees']);
    });
  }

  it('still reads the plain header form', () => {
    const plan = parseDeltaSpec(
      ['## REMOVED Requirements', '', '### Requirement: Late Fees', '**Reason**: gone'].join('\n')
    );
    expect(plan.removed).toEqual(['Late Fees']);
  });

  it('still ignores bullets inside a code fence', () => {
    const plan = parseDeltaSpec(
      [
        '## REMOVED Requirements',
        '',
        '```markdown',
        '* `### Requirement: Example`',
        '```',
        '',
        '- `### Requirement: Real One`',
      ].join('\n')
    );
    expect(plan.removed).toEqual(['Real One']);
  });

  it('does not treat an emphasised line as a bullet', () => {
    const plan = parseDeltaSpec(
      ['## REMOVED Requirements', '', '**Reason**: `### Requirement: Not A Bullet`'].join('\n')
    );
    expect(plan.removed).toEqual([]);
  });
});

describe('parseDeltaSpec (RENAMED list markers)', () => {
  for (const marker of MARKERS) {
    it(`accepts the "${marker}" marker`, () => {
      const plan = parseDeltaSpec(
        [
          '## RENAMED Requirements',
          '',
          `${marker} FROM: \`### Requirement: Late Fees\``,
          `${marker} TO: \`### Requirement: Overdue Penalties\``,
        ].join('\n')
      );
      expect(plan.renamed).toEqual([{ from: 'Late Fees', to: 'Overdue Penalties' }]);
    });
  }

  it('accepts a mix of markers across the two lines', () => {
    const plan = parseDeltaSpec(
      [
        '## RENAMED Requirements',
        '',
        '* FROM: `### Requirement: Late Fees`',
        '+ TO: `### Requirement: Overdue Penalties`',
      ].join('\n')
    );
    expect(plan.renamed).toEqual([{ from: 'Late Fees', to: 'Overdue Penalties' }]);
  });

  it('still accepts FROM/TO with no bullet at all', () => {
    const plan = parseDeltaSpec(
      [
        '## RENAMED Requirements',
        '',
        'FROM: `### Requirement: Late Fees`',
        'TO: `### Requirement: Overdue Penalties`',
      ].join('\n')
    );
    expect(plan.renamed).toEqual([{ from: 'Late Fees', to: 'Overdue Penalties' }]);
  });

  it('still ignores FROM/TO inside a code fence', () => {
    const plan = parseDeltaSpec(
      [
        '## RENAMED Requirements',
        '',
        '```markdown',
        '* FROM: `### Requirement: Example`',
        '* TO: `### Requirement: Other`',
        '```',
      ].join('\n')
    );
    expect(plan.renamed).toEqual([]);
  });
});

describe('buildUpdatedSpec (delta list markers)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-markers-'));
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

  /**
   * Write a main spec and a delta into a temp project, then run the merge and
   * return its result without touching any real project.
   */
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

  for (const marker of MARKERS) {
    it(`removes a requirement listed with "${marker}"`, async () => {
      const built = await build(
        ['## REMOVED Requirements', '', `${marker} \`### Requirement: Late Fees\``].join('\n')
      );
      expect(built.counts.removed).toBe(1);
      expect(built.rebuilt).not.toContain('### Requirement: Late Fees');
      expect(built.rebuilt).toContain('### Requirement: Invoice Generation');
    });

    it(`renames a requirement listed with "${marker}"`, async () => {
      const built = await build(
        [
          '## RENAMED Requirements',
          '',
          `${marker} FROM: \`### Requirement: Late Fees\``,
          `${marker} TO: \`### Requirement: Overdue Penalties\``,
        ].join('\n')
      );
      expect(built.counts.renamed).toBe(1);
      expect(built.rebuilt).toContain('### Requirement: Overdue Penalties');
      expect(built.rebuilt).not.toContain('### Requirement: Late Fees');
    });
  }
});
