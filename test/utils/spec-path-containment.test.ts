import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertDiscoveredSpecFile,
  assertSpecFileWithin,
} from '../../src/utils/spec-path-containment.js';

const itWithSymlinks = it.skipIf(process.platform === 'win32');

/**
 * Coverage for the containment rule itself rather than for a copy of it in a
 * command. The cases run against real directories because the rule
 * canonicalizes before deciding, so a purely notional path would not exercise
 * it.
 */
describe('spec.md containment', () => {
  let tempDir: string;
  let projectDir: string;
  let specsRoot: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-containment-'));
    projectDir = path.join(tempDir, 'repo');
    specsRoot = path.join(projectDir, 'openspec', 'specs');
    await fs.mkdir(path.join(specsRoot, 'login'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function link(target: string): Promise<string> {
    const linkPath = path.join(specsRoot, 'login', 'spec.md');
    await fs.symlink(target, linkPath);
    return linkPath;
  }

  for (const [name, assert] of [
    ['assertDiscoveredSpecFile', assertDiscoveredSpecFile],
    ['assertSpecFileWithin', assertSpecFileWithin],
  ] as const) {
    describe(name, () => {
      it('accepts an ordinary spec file', async () => {
        const specFile = path.join(specsRoot, 'login', 'spec.md');
        await fs.writeFile(specFile, '# login\n');
        expect(() => assert(specsRoot, specFile)).not.toThrow();
      });

      it('rejects a path that traverses out of the specs root', () => {
        expect(() =>
          assert(specsRoot, path.join(specsRoot, '..', '..', '..', 'outside.md'))
        ).toThrow('Path is outside the allowed directory');
      });

      itWithSymlinks('accepts a link to a file elsewhere in the project', async () => {
        const docsSpec = path.join(projectDir, 'docs', 'auth', 'specs', 'login.md');
        await fs.mkdir(path.dirname(docsSpec), { recursive: true });
        await fs.writeFile(docsSpec, '# login\n');
        const linkPath = await link(path.relative(path.join(specsRoot, 'login'), docsSpec));

        expect(() => assert(specsRoot, linkPath)).not.toThrow();
      });

      itWithSymlinks('rejects a link that leaves the project', async () => {
        const outside = path.join(tempDir, 'outside.md');
        await fs.writeFile(outside, '# outside\n');
        const linkPath = await link(outside);

        expect(() => assert(specsRoot, linkPath)).toThrow(
          'Path is outside the allowed directory'
        );
      });

      itWithSymlinks('rejects a dangling link rather than assuming it is contained', async () => {
        const linkPath = await link(path.join(projectDir, 'docs', 'missing.md'));

        expect(() => assert(specsRoot, linkPath)).toThrow();
      });

      itWithSymlinks(
        'keeps a specs root with no project to name confined to itself',
        async () => {
          // A specs root reached outside an `openspec` directory (a store given
          // by path) has no project boundary to widen to.
          const bareRoot = path.join(tempDir, 'bare-specs');
          await fs.mkdir(path.join(bareRoot, 'login'), { recursive: true });
          const outside = path.join(tempDir, 'bare-outside.md');
          await fs.writeFile(outside, '# outside\n');
          const linkPath = path.join(bareRoot, 'login', 'spec.md');
          await fs.symlink(outside, linkPath);

          expect(() => assert(bareRoot, linkPath)).toThrow(
            'Path is outside the allowed directory'
          );
        }
      );
    });
  }

  itWithSymlinks(
    'assertDiscoveredSpecFile treats a linked capability directory as its own trust root',
    async () => {
      const external = path.join(tempDir, 'other-repo', 'login');
      await fs.mkdir(external, { recursive: true });
      await fs.writeFile(path.join(external, 'spec.md'), '# login\n');
      const capabilityLink = path.join(specsRoot, 'shared');
      await fs.symlink(external, capabilityLink);

      expect(() =>
        assertDiscoveredSpecFile(specsRoot, path.join(capabilityLink, 'spec.md'))
      ).not.toThrow();
    }
  );

  itWithSymlinks(
    'assertSpecFileWithin refuses a capability directory swapped for a link',
    async () => {
      // The recheck before a read or a write must not trust a directory that
      // became a link after the path was resolved.
      const external = path.join(tempDir, 'other-repo', 'login');
      await fs.mkdir(external, { recursive: true });
      await fs.writeFile(path.join(external, 'spec.md'), '# login\n');
      await fs.rm(path.join(specsRoot, 'login'), { recursive: true });
      await fs.symlink(external, path.join(specsRoot, 'login'));

      expect(() =>
        assertSpecFileWithin(specsRoot, path.join(specsRoot, 'login', 'spec.md'))
      ).toThrow('Path is outside the allowed directory');
    }
  );
});
