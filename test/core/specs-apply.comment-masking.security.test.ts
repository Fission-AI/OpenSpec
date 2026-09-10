import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';

/**
 * `## Purpose` extraction masked HTML comments with `/<!--[\s\S]*?--!?>/g`,
 * which re-scans to end of file from every `<!--`. A delta spec dense in
 * comment openers therefore made `openspec archive` quadratic in the size of
 * the document, and masking runs once per document. The `--!>` terminator and the
 * "unterminated comment runs to EOF" rule (#1413) stay covered by the archive
 * suite; this only bounds the work.
 */
describe('spec comment masking is linear', () => {
  let tempDir: string;
  let changeDir: string;
  let mainSpecsDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-mask-comments-'));
    changeDir = path.join(tempDir, 'openspec', 'changes', 'test-change');
    mainSpecsDir = path.join(tempDir, 'openspec', 'specs');
    await fs.mkdir(path.join(changeDir, 'specs', 'widgets'), { recursive: true });
    await fs.mkdir(mainSpecsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('applies a delta dense in comment openers quickly', async () => {
    await fs.writeFile(
      path.join(changeDir, 'specs', 'widgets', 'spec.md'),
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Bounded work',
        'The system SHALL stay linear in the size of the delta.',
        '',
        '#### Scenario: Apply',
        '- **WHEN** the change is archived',
        '- **THEN** the spec is updated',
        '',
        // 391 KB of comment openers. Sized so a reverted (quadratic) masking
        // pass lands an order of magnitude over the bound below rather than
        // the ~2.5x a half-size input gave; the linear scan is unaffected.
        '<!--'.repeat(100_000),
        '',
      ].join('\n')
    );

    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
    const start = Date.now();
    const built = await buildUpdatedSpec(update, 'test-change', { silent: true });
    const elapsed = Date.now() - start;

    expect(built.rebuilt).toContain('Bounded work');
    expect(elapsed).toBeLessThan(800);
  });
});
