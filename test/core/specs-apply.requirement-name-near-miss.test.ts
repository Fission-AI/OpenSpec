import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';

/**
 * Two requirement names that differ only in case or interior whitespace are
 * one requirement written twice (foldRequirementName). REMOVED and the RENAMED
 * source already refused such a near-miss, but ADDED and the RENAMED target
 * compared names exactly: archive wrote `late fees` next to `Late Fees`, two
 * contradicting copies of one requirement, and `validate` accepted the result.
 */
describe('buildUpdatedSpec (requirement name near-misses)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-near-miss-'));
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
   * Write the main spec and a delta into a temp project, then run the merge
   * without touching any real project.
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

  /** One ADDED requirement, by default contradicting the seeded `Late Fees`. */
  const added = (
    name: string,
    body = 'The system SHALL apply a late fee of 10 percent to invoices overdue by 15 days.'
  ) =>
    [
      `### Requirement: ${name}`,
      body,
      '',
      '#### Scenario: Overdue',
      '- **WHEN** an invoice is overdue',
      '- **THEN** a late fee is applied',
      '',
    ].join('\n');

  const renamed = (from: string, to: string) =>
    ['## RENAMED Requirements', `- FROM: \`### Requirement: ${from}\``, `- TO: \`### Requirement: ${to}\``, ''].join(
      '\n'
    );

  const headers = (spec: string) =>
    spec
      .split('\n')
      .filter((line) => line.startsWith('### Requirement:'))
      .map((line) => line.slice('### Requirement:'.length).trim());

  const ADDED_NEAR_MISS = (name: string, existing: string) =>
    `billing ADDED failed for header "### Requirement: ${name}" - "### Requirement: ${existing}" already exists and differs only in case or spacing`;
  const RENAMED_NEAR_MISS = (name: string, existing: string) =>
    `billing RENAMED failed for header "### Requirement: ${name}" - "### Requirement: ${existing}" already exists and differs only in case or spacing`;

  describe('ADDED', () => {
    it('adds a requirement whose name is distinct (control)', async () => {
      const result = await build(['## ADDED Requirements', added('Credit Notes')].join('\n'));
      expect(headers(result.rebuilt)).toEqual(['Invoice Generation', 'Late Fees', 'Credit Notes']);
      expect(result.counts.added).toBe(1);
    });

    it('still refuses an exact duplicate name with different content (control)', async () => {
      await expect(build(['## ADDED Requirements', added('Late Fees')].join('\n'))).rejects.toThrow(
        'billing ADDED failed for header "### Requirement: Late Fees" - already exists'
      );
    });

    it('refuses a name that differs only in case from an existing requirement', async () => {
      await expect(build(['## ADDED Requirements', added('late fees')].join('\n'))).rejects.toThrow(
        ADDED_NEAR_MISS('late fees', 'Late Fees')
      );
    });

    it('refuses a name that differs only in interior whitespace', async () => {
      await expect(build(['## ADDED Requirements', added('Late  Fees')].join('\n'))).rejects.toThrow(
        ADDED_NEAR_MISS('Late  Fees', 'Late Fees')
      );
    });

    it('refuses a case variant even when its body matches the existing requirement', async () => {
      // Identical content is the early-sync no-op only for the exact header; a
      // case variant would still write a second header.
      const sameBody = added('LATE FEES', 'The system SHALL apply a late fee to invoices overdue by 30 days.');
      await expect(build(['## ADDED Requirements', sameBody].join('\n'))).rejects.toThrow(
        ADDED_NEAR_MISS('LATE FEES', 'Late Fees')
      );
    });

    it('refuses two ADDED requirements in one delta that differ only in case', async () => {
      await expect(
        build(['## ADDED Requirements', added('Credit Notes'), added('credit notes')].join('\n'))
      ).rejects.toThrow(ADDED_NEAR_MISS('credit notes', 'Credit Notes'));
    });

    it('allows a case variant of a requirement the same delta removes', async () => {
      // Operations apply RENAMED -> REMOVED -> MODIFIED -> ADDED, and ADDED is
      // checked against the spec as it stands after the earlier operations, the
      // same order the exact-name check already uses. The old spelling is gone
      // by then, so the result holds one requirement, not two.
      const result = await build(
        [
          '## REMOVED Requirements',
          '### Requirement: Late Fees',
          '**Reason**: replaced by the stricter policy below',
          '',
          '## ADDED Requirements',
          added('late fees'),
        ].join('\n')
      );
      expect(headers(result.rebuilt)).toEqual(['Invoice Generation', 'late fees']);
      expect(result.counts).toMatchObject({ removed: 1, added: 1 });
    });

    it('allows a case variant of a requirement the same delta renames away', async () => {
      const result = await build(
        [renamed('Late Fees', 'Overdue Fees'), '## ADDED Requirements', added('late fees')].join('\n')
      );
      expect(headers(result.rebuilt)).toEqual(['Invoice Generation', 'Overdue Fees', 'late fees']);
    });
  });

  describe('RENAMED', () => {
    it('still refuses a target that exists exactly (control)', async () => {
      await expect(build(renamed('Invoice Generation', 'Late Fees'))).rejects.toThrow(
        'billing RENAMED failed for header "### Requirement: Late Fees" - target already exists'
      );
    });

    it('refuses a target that differs only in case from another requirement', async () => {
      await expect(build(renamed('Invoice Generation', 'LATE FEES'))).rejects.toThrow(
        RENAMED_NEAR_MISS('LATE FEES', 'Late Fees')
      );
    });

    it('refuses a target that differs only in interior whitespace from another requirement', async () => {
      await expect(build(renamed('Invoice Generation', 'Late   Fees'))).rejects.toThrow(
        RENAMED_NEAR_MISS('Late   Fees', 'Late Fees')
      );
    });

    it('still allows a case-only rename of a requirement to its own name', async () => {
      const result = await build(renamed('Late Fees', 'LATE FEES'));
      expect(headers(result.rebuilt)).toEqual(['Invoice Generation', 'LATE FEES']);
      expect(result.rebuilt).toContain('overdue by 30 days');
      expect(result.counts.renamed).toBe(1);
    });

    it('refuses a target that collides with a requirement the same delta removes, as an exact target does', async () => {
      // RENAMED runs before REMOVED, so the removed requirement still exists
      // when the target is checked. That was already true for an exact target.
      const removeLateFees = ['## REMOVED Requirements', '### Requirement: Late Fees', '**Reason**: gone', ''].join('\n');
      await expect(build([renamed('Invoice Generation', 'Late Fees'), removeLateFees].join('\n'))).rejects.toThrow(
        'target already exists'
      );
      await expect(build([renamed('Invoice Generation', 'late fees'), removeLateFees].join('\n'))).rejects.toThrow(
        RENAMED_NEAR_MISS('late fees', 'Late Fees')
      );
    });
  });

  describe('MODIFIED', () => {
    it('still refuses a header that matches an existing requirement only by case', async () => {
      // Unchanged: MODIFIED already refused this, as "not found".
      await expect(
        build(
          [
            '## MODIFIED Requirements',
            '### Requirement: late fees',
            'The system SHALL apply a late fee to invoices overdue by 45 days.',
            '',
            '#### Scenario: Thirty days overdue',
            '- **WHEN** an invoice is 45 days overdue',
            '- **THEN** a late fee is applied',
            '',
          ].join('\n')
        )
      ).rejects.toThrow('billing MODIFIED failed for header "### Requirement: late fees" - not found');
    });
  });
});
