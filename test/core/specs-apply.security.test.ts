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

describe('spec apply path boundaries', () => {
  let tempDir: string;
  let changeDir: string;
  let changeSpecsDir: string;
  let mainSpecsDir: string;
  let outsideDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-apply-security-'));
    changeDir = path.join(tempDir, 'openspec', 'changes', 'test-change');
    changeSpecsDir = path.join(changeDir, 'specs');
    mainSpecsDir = path.join(tempDir, 'openspec', 'specs');
    outsideDir = path.join(tempDir, 'outside');
    await fs.mkdir(changeSpecsDir, { recursive: true });
    await fs.mkdir(mainSpecsDir, { recursive: true });
    await fs.mkdir(outsideDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeDelta(id = 'widgets'): Promise<string> {
    const deltaPath = path.join(changeSpecsDir, id, 'spec.md');
    await fs.mkdir(path.dirname(deltaPath), { recursive: true });
    await fs.writeFile(
      deltaPath,
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Safe update',
        'The system SHALL stay inside its planning root.',
        '',
        '#### Scenario: Apply',
        '- **WHEN** the change is archived',
        '- **THEN** the spec is updated',
        '',
      ].join('\n')
    );
    return deltaPath;
  }

  itWithSymlinks('rejects a delta spec symlink that leaves the change specs root', async () => {
    const outsideSpec = path.join(outsideDir, 'spec.md');
    await fs.writeFile(outsideSpec, 'outside sentinel');
    const linkedSpec = path.join(changeSpecsDir, 'widgets', 'spec.md');
    await fs.mkdir(path.dirname(linkedSpec), { recursive: true });
    await fs.symlink(outsideSpec, linkedSpec);

    await expect(findSpecUpdates(changeDir, mainSpecsDir)).rejects.toThrow(
      'Path is outside the allowed directory'
    );
    await expect(fs.readFile(outsideSpec, 'utf-8')).resolves.toBe('outside sentinel');
  });

  itWithSymlinks('supports a linked main capability directory as its trust root', async () => {
    const sharedMainDir = path.join(outsideDir, 'main');
    await fs.mkdir(sharedMainDir);
    await fs.symlink(sharedMainDir, path.join(mainSpecsDir, 'widgets'));
    await writeDelta();

    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
    const built = await buildUpdatedSpec(update, 'test-change', { silent: true });
    await writeUpdatedSpec(update, built.rebuilt, built.counts, { silent: true });

    await expect(fs.readFile(path.join(sharedMainDir, 'spec.md'), 'utf-8')).resolves.toContain(
      'Safe update'
    );
  });

  itWithSymlinks('rechecks the delta source immediately before reading it', async () => {
    const deltaPath = await writeDelta();
    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
    const outsideSpec = path.join(outsideDir, 'spec.md');
    await fs.writeFile(outsideSpec, 'outside sentinel');
    await fs.rm(deltaPath);
    await fs.symlink(outsideSpec, deltaPath);

    await expect(buildUpdatedSpec(update, 'test-change', { silent: true })).rejects.toThrow(
      'Path is outside the allowed directory'
    );
  });

  itWithSymlinks('rechecks the existing target immediately before reading it', async () => {
    await writeDelta();
    const targetPath = path.join(mainSpecsDir, 'widgets', 'spec.md');
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, 'initial main spec');
    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
    const outsideSpec = path.join(outsideDir, 'spec.md');
    await fs.writeFile(outsideSpec, 'outside sentinel');
    await fs.rm(targetPath);
    await fs.symlink(outsideSpec, targetPath);

    await expect(buildUpdatedSpec(update, 'test-change', { silent: true })).rejects.toThrow(
      'Path is outside the allowed directory'
    );
    await expect(fs.readFile(outsideSpec, 'utf-8')).resolves.toBe('outside sentinel');
  });

  itWithSymlinks('rechecks the target immediately before writing it', async () => {
    await writeDelta();
    const targetDir = path.join(mainSpecsDir, 'widgets');
    await fs.mkdir(targetDir, { recursive: true });
    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
    await fs.rm(targetDir, { recursive: true });
    await fs.symlink(outsideDir, targetDir);

    await expect(
      writeUpdatedSpec(
        update,
        '# widgets Specification\n\n## Purpose\nSafe.\n\n## Requirements\n',
        { added: 1, modified: 0, removed: 0, renamed: 0 },
        { silent: true }
      )
    ).rejects.toThrow('Path is outside the allowed directory');
    await expect(fs.readdir(outsideDir)).resolves.toEqual([]);
  });
});
