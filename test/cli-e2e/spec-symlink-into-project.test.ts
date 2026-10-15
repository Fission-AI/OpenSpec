import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

/**
 * The layout reported in #2100: a project keeps its main specs beside the
 * product documentation they belong to and links
 * `openspec/specs/<capability>/spec.md` to them, so OpenSpec and the docs read
 * and write the same bytes.
 *
 * Driven through the real CLI on purpose. The regression this guards against
 * was introduced by a containment check several layers down, and the unit
 * tests of the day could not see it because their fixtures placed "outside the
 * specs root" and "outside the project" at the same path. Exercising the
 * commands a user actually runs does not care which layer the boundary moves
 * in: it fails if any of them stops accepting the link, or starts accepting a
 * link that leaves the project.
 */
const describeWithSymlinks = describe.skipIf(process.platform === 'win32');

describeWithSymlinks('a main spec that is a symlink into the project (#2100)', () => {
  let base: string;
  let projectDir: string;
  let docsSpec: string;
  let linkedSpec: string;

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

  const write = async (relative: string, content: string) => {
    const file = path.join(projectDir, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  };

  beforeEach(async () => {
    // The project sits one level below the temp root, so a link written to the
    // temp root genuinely leaves the project.
    base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-spec-symlink-e2e-'));
    projectDir = path.join(base, 'repo');
    docsSpec = path.join(projectDir, 'docs', 'auth', 'specs', 'login.md');
    linkedSpec = path.join(projectDir, 'openspec', 'specs', 'login', 'spec.md');

    await write(path.join('docs', 'auth', 'specs', 'login.md'), MAIN_SPEC);
    await write(path.join('openspec', 'changes', 'add-mfa', 'proposal.md'),
      '# Add MFA\n\n## Why\nAccounts need a second factor.\n\n## What Changes\n- Require a second factor\n');
    await write(path.join('openspec', 'changes', 'add-mfa', 'tasks.md'), '## 1. Work\n- [x] 1.1 Ship it\n');
    await write(path.join('openspec', 'changes', 'add-mfa', 'specs', 'login', 'spec.md'), DELTA);
    await fs.mkdir(path.dirname(linkedSpec), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(base, { recursive: true, force: true });
  });

  const linkInto = (target: string) =>
    fs.symlink(path.relative(path.dirname(linkedSpec), target), linkedSpec);

  describe('when the link stays inside the project', () => {
    beforeEach(async () => {
      await linkInto(docsSpec);
    });

    it('lists the capability', async () => {
      const result = await runCLI(['list', '--specs'], { cwd: projectDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('login');
    });

    it('shows the linked file as the spec', async () => {
      const result = await runCLI(['show', 'login', '--type', 'spec'], { cwd: projectDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Users sign in with their credentials');
    });

    it('validates the capability, by id and as part of --specs', async () => {
      const byId = await runCLI(['validate', 'login', '--type', 'spec'], { cwd: projectDir });
      expect(byId.exitCode).toBe(0);

      const all = await runCLI(['validate', '--specs'], { cwd: projectDir });
      expect(all.exitCode).toBe(0);
      expect(`${all.stdout}${all.stderr}`).not.toContain('outside the allowed directory');
    });

    it('archives through the link, leaving the link and the docs file in place', async () => {
      const result = await runCLI(['archive', 'add-mfa', '--yes'], { cwd: projectDir });
      expect(result.exitCode).toBe(0);

      // The merge landed in the file the docs own, and kept what was there.
      const merged = await fs.readFile(docsSpec, 'utf-8');
      expect(merged).toContain('Second factor');
      expect(merged).toContain('Sign in');
      // ...by writing through the link rather than replacing it.
      expect((await fs.lstat(linkedSpec)).isSymbolicLink()).toBe(true);
    });
  });

  describe('when the link leaves the project', () => {
    let outside: string;

    beforeEach(async () => {
      outside = path.join(base, 'outside.md');
      await fs.writeFile(outside, MAIN_SPEC);
      await linkInto(outside);
    });

    it.each([
      ['list', ['list', '--specs']],
      ['show', ['show', 'login', '--type', 'spec']],
      ['validate by id', ['validate', 'login', '--type', 'spec']],
      ['validate --specs', ['validate', '--specs']],
    ])('refuses it in %s', async (_label, args) => {
      const result = await runCLI(args, { cwd: projectDir });
      expect(result.exitCode).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain('outside the allowed directory');
    });

    it('refuses to archive, and writes nothing', async () => {
      const result = await runCLI(['archive', 'add-mfa', '--yes'], { cwd: projectDir });
      expect(result.exitCode).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain('outside the allowed directory');
      await expect(fs.readFile(outside, 'utf-8')).resolves.toBe(MAIN_SPEC);
      // The change is still there to retry once the link is corrected.
      await expect(
        fs.access(path.join(projectDir, 'openspec', 'changes', 'add-mfa'))
      ).resolves.toBeUndefined();
    });
  });
});
