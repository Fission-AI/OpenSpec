import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildUpdatedSpec,
  findSpecUpdates,
  writeUpdatedSpec,
} from '../../src/core/specs-apply.js';

const itWithSymlinks = it.skipIf(process.platform === 'win32');

/**
 * A project may keep its main specs beside the product documentation they
 * belong to and link `openspec/specs/<capability>/spec.md` to them, so the
 * docs and OpenSpec read and write the same bytes (#2100). The merge has to
 * write through such a link, and still refuse one that leaves the project.
 */
describe('a spec.md linked to a file elsewhere in the project', () => {
  let tempDir: string;
  let projectDir: string;
  let changeDir: string;
  let mainSpecsDir: string;
  let docsSpec: string;
  let linkedSpec: string;

  const DELTA = [
    '## ADDED Requirements',
    '',
    '### Requirement: Second factor',
    'The system SHALL require a second factor.',
    '',
    '#### Scenario: Prompted',
    '- **WHEN** a user signs in',
    '- **THEN** a second factor is requested',
    '',
  ].join('\n');

  const MAIN_SPEC = [
    '# login Specification',
    '',
    '## Purpose',
    'Users sign in with their credentials to reach their account.',
    '',
    '## Requirements',
    '',
    '### Requirement: Sign in',
    'The system SHALL let a user sign in with valid credentials.',
    '',
    '#### Scenario: Valid credentials',
    '- **WHEN** the user submits valid credentials',
    '- **THEN** the user is signed in',
    '',
  ].join('\n');

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-project-linked-spec-'));
    projectDir = path.join(tempDir, 'repo');
    changeDir = path.join(projectDir, 'openspec', 'changes', 'add-mfa');
    mainSpecsDir = path.join(projectDir, 'openspec', 'specs');
    docsSpec = path.join(projectDir, 'docs', 'auth', 'specs', 'login.md');
    linkedSpec = path.join(mainSpecsDir, 'login', 'spec.md');

    await fs.mkdir(path.join(changeDir, 'specs', 'login'), { recursive: true });
    await fs.writeFile(path.join(changeDir, 'specs', 'login', 'spec.md'), DELTA);
    await fs.mkdir(path.dirname(docsSpec), { recursive: true });
    await fs.writeFile(docsSpec, MAIN_SPEC);
    await fs.mkdir(path.dirname(linkedSpec), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  itWithSymlinks('merges through the link and leaves the link in place', async () => {
    await fs.symlink(path.relative(path.dirname(linkedSpec), docsSpec), linkedSpec);

    const warnings: string[] = [];
    const onWarning = (warning: Error) => warnings.push(warning.message);
    process.on('warning', onWarning);
    let updates;
    try {
      updates = await findSpecUpdates(changeDir, mainSpecsDir);
      // process.emitWarning dispatches on the next tick.
      await new Promise((resolve) => setImmediate(resolve));
    } finally {
      process.off('warning', onWarning);
    }

    expect(updates).toHaveLength(1);
    const [update] = updates;
    // The link path is what the CLI reports, and the write goes through it.
    // Rebased onto the canonical specs root, so /var and /private/var agree.
    const canonicalLinkedSpec = path.join(
      await fs.realpath(path.dirname(linkedSpec)),
      'spec.md'
    );
    expect(update.target).toBe(canonicalLinkedSpec);
    expect(update.exists).toBe(true);
    // Nothing leaves the project, so there is nothing to announce.
    expect(warnings).toEqual([]);

    const built = await buildUpdatedSpec(update, 'add-mfa', { silent: true });
    await writeUpdatedSpec(update, built.rebuilt, built.counts, { silent: true });

    // The file the docs own received the merge, and kept what it already had.
    const merged = await fs.readFile(docsSpec, 'utf-8');
    expect(merged).toContain('Second factor');
    expect(merged).toContain('Sign in');
    expect((await fs.lstat(linkedSpec)).isSymbolicLink()).toBe(true);
  });

  itWithSymlinks('refuses a link that leaves the project', async () => {
    const outsideSpec = path.join(tempDir, 'outside.md');
    await fs.writeFile(outsideSpec, MAIN_SPEC);
    await fs.symlink(outsideSpec, linkedSpec);

    await expect(findSpecUpdates(changeDir, mainSpecsDir)).rejects.toThrow(
      'Path is outside the allowed directory'
    );
    await expect(fs.readFile(outsideSpec, 'utf-8')).resolves.toBe(MAIN_SPEC);
  });

  itWithSymlinks(
    'refuses a link repointed out of the project between resolve and write',
    async () => {
      await fs.symlink(path.relative(path.dirname(linkedSpec), docsSpec), linkedSpec);
      const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
      const built = await buildUpdatedSpec(update, 'add-mfa', { silent: true });

      // The link now points out of the project, after the path was resolved and
      // the merge was built. The recheck before the write has to catch it.
      const outsideSpec = path.join(tempDir, 'outside.md');
      await fs.writeFile(outsideSpec, 'outside sentinel');
      await fs.rm(linkedSpec);
      await fs.symlink(outsideSpec, linkedSpec);

      await expect(
        writeUpdatedSpec(update, built.rebuilt, built.counts, { silent: true })
      ).rejects.toThrow('Path is outside the allowed directory');
      await expect(fs.readFile(outsideSpec, 'utf-8')).resolves.toBe('outside sentinel');
    }
  );

  itWithSymlinks(
    'refuses a link repointed out of the project between resolve and read',
    async () => {
      await fs.symlink(path.relative(path.dirname(linkedSpec), docsSpec), linkedSpec);
      const [update] = await findSpecUpdates(changeDir, mainSpecsDir);

      const outsideSpec = path.join(tempDir, 'outside.md');
      await fs.writeFile(outsideSpec, 'outside sentinel');
      await fs.rm(linkedSpec);
      await fs.symlink(outsideSpec, linkedSpec);

      await expect(buildUpdatedSpec(update, 'add-mfa', { silent: true })).rejects.toThrow(
        'Path is outside the allowed directory'
      );
    }
  );

  itWithSymlinks('merges through a linked delta spec inside the project', async () => {
    await fs.symlink(path.relative(path.dirname(linkedSpec), docsSpec), linkedSpec);
    const sharedDelta = path.join(projectDir, 'docs', 'auth', 'deltas', 'login.md');
    await fs.mkdir(path.dirname(sharedDelta), { recursive: true });
    await fs.writeFile(sharedDelta, DELTA);
    const deltaPath = path.join(changeDir, 'specs', 'login', 'spec.md');
    await fs.rm(deltaPath);
    await fs.symlink(path.relative(path.dirname(deltaPath), sharedDelta), deltaPath);

    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
    const built = await buildUpdatedSpec(update, 'add-mfa', { silent: true });

    expect(built.rebuilt).toContain('Second factor');
  });
});
