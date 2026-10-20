import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SpecCommand } from '../../../src/commands/spec.js';

describe('SpecCommand path boundaries', () => {
  let tempDir: string;
  let projectDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-command-security-'));
    // A spec file may link to another file in the same project, so the escape
    // these cases guard against is one that leaves the project entirely.
    projectDir = path.join(tempDir, 'repo');
    await fs.mkdir(path.join(projectDir, 'openspec', 'specs'), { recursive: true });
    process.chdir(projectDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('rejects a traversing legacy spec id', async () => {
    const outsideSpec = path.join(tempDir, 'outside', 'spec.md');
    await fs.mkdir(path.dirname(outsideSpec), { recursive: true });
    await fs.writeFile(outsideSpec, '# Outside sentinel');

    await expect(
      new SpecCommand().show(path.join('..', '..', 'outside'))
    ).rejects.toThrow('Path is outside the allowed directory');
  });

  it.skipIf(process.platform === 'win32')(
    'rejects a spec file symlink that leaves the project',
    async () => {
      const outsideSpec = path.join(tempDir, 'outside.md');
      const linkedSpec = path.join(projectDir, 'openspec', 'specs', 'linked', 'spec.md');
      await fs.writeFile(outsideSpec, '# Outside sentinel');
      await fs.mkdir(path.dirname(linkedSpec), { recursive: true });
      await fs.symlink(outsideSpec, linkedSpec);

      await expect(new SpecCommand().show('linked')).rejects.toThrow(
        'Path is outside the allowed directory'
      );
    }
  );

  it.skipIf(process.platform === 'win32')(
    'shows a spec.md linked to a file elsewhere in the project',
    async () => {
      // The reported layout (#2100): the spec lives beside the product docs it
      // belongs to and openspec/specs/<capability>/spec.md links to it.
      const docsSpec = path.join(projectDir, 'docs', 'auth', 'specs', 'login.md');
      await fs.mkdir(path.dirname(docsSpec), { recursive: true });
      await fs.writeFile(
        docsSpec,
        '# login\n\n## Purpose\n\nUsers sign in.\n\n## Requirements\n'
      );
      const linkedSpec = path.join(projectDir, 'openspec', 'specs', 'login', 'spec.md');
      await fs.mkdir(path.dirname(linkedSpec), { recursive: true });
      await fs.symlink(
        path.relative(path.dirname(linkedSpec), docsSpec),
        linkedSpec
      );

      await expect(new SpecCommand().show('login')).resolves.toBeUndefined();
    }
  );

  it.skipIf(process.platform === 'win32')(
    'allows a linked capability directory as its own trust root',
    async () => {
      const sharedCapability = path.join(tempDir, 'shared-capability');
      await fs.mkdir(sharedCapability);
      await fs.writeFile(
        path.join(sharedCapability, 'spec.md'),
        '# Shared\n\n## Purpose\n\nShared safely.\n\n## Requirements\n'
      );
      await fs.symlink(
        sharedCapability,
        path.join(projectDir, 'openspec', 'specs', 'shared')
      );

      await expect(new SpecCommand().show('shared')).resolves.toBeUndefined();
    }
  );

  it.skipIf(process.platform === 'win32')(
    'allows a spec file symlink elsewhere in the specs root',
    async () => {
      const specsDir = path.join(projectDir, 'openspec', 'specs');
      const sharedSpec = path.join(specsDir, 'shared.md');
      const linkedSpec = path.join(specsDir, 'linked', 'spec.md');
      await fs.writeFile(
        sharedSpec,
        '# Shared\n\n## Purpose\n\nShared safely.\n\n## Requirements\n'
      );
      await fs.mkdir(path.dirname(linkedSpec), { recursive: true });
      await fs.symlink(sharedSpec, linkedSpec);

      await expect(new SpecCommand().show('linked')).resolves.toBeUndefined();
    }
  );
});
