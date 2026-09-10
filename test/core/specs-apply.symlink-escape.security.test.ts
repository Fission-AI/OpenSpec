import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { findSpecUpdates } from '../../src/core/specs-apply.js';

const itWithSymlinks = it.skipIf(process.platform === 'win32');

/**
 * A capability directory may deliberately be a link out of the project
 * (monorepo layout - see assertDiscoveredSpecPath), so the write is allowed.
 * What was wrong is that it was silent: `openspec archive` reported the
 * in-project path while writing somewhere else entirely, so a link swapped
 * underneath a repo left nothing on screen to notice.
 */
describe('a linked capability directory outside the project', () => {
  let tempDir: string;
  let projectDir: string;
  let changeDir: string;
  let mainSpecsDir: string;
  let outsideDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-link-escape-'));
    projectDir = path.join(tempDir, 'repo');
    changeDir = path.join(projectDir, 'openspec', 'changes', 'test-change');
    mainSpecsDir = path.join(projectDir, 'openspec', 'specs');
    outsideDir = path.join(tempDir, 'outside');
    await fs.mkdir(path.join(changeDir, 'specs', 'widgets'), { recursive: true });
    await fs.mkdir(mainSpecsDir, { recursive: true });
    await fs.mkdir(outsideDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'specs', 'widgets', 'spec.md'),
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Pwned',
        'The system SHALL be pwned.',
        '',
        '#### Scenario: Apply',
        '- **WHEN** the change is archived',
        '- **THEN** the spec is updated',
        '',
      ].join('\n')
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  itWithSymlinks('names the real destination when the link leaves the project', async () => {
    await fs.symlink(outsideDir, path.join(mainSpecsDir, 'widgets'));

    const warnings: string[] = [];
    const onWarning = (warning: Error) => warnings.push(warning.message);
    process.on('warning', onWarning);

    let update;
    try {
      [update] = await findSpecUpdates(changeDir, mainSpecsDir);
      // process.emitWarning dispatches on the next tick.
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      process.off('warning', onWarning);
    }

    const realOutside = await fs.realpath(outsideDir);
    // The write still happens - an external capability link is supported.
    expect(update.target).toBe(path.join(realOutside, 'spec.md'));
    // But it is announced, with the path actually being written.
    expect(warnings.some((message) => message.includes(realOutside))).toBe(true);
  });

  itWithSymlinks('still allows a capability directory linked within the project', async () => {
    const insideDir = path.join(projectDir, 'shared', 'widgets');
    await fs.mkdir(insideDir, { recursive: true });
    await fs.symlink(insideDir, path.join(mainSpecsDir, 'widgets'));

    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);

    expect(update.target).toBe(
      path.join(await fs.realpath(insideDir), 'spec.md')
    );
  });
});
