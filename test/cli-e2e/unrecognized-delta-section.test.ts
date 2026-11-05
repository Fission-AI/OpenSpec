import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';

/**
 * End to end, the exact repro from #2195: a delta with one recognized section
 * and one unrecognized `## DEPRECATED Requirements` section used to validate
 * and archive with exit 0, dropping the unrecognized section's requirement.
 */
const tempRoots: string[] = [];
afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});
const TIMEOUT = 120_000;

const DELTA = [
  '## ADDED Requirements',
  '',
  '### Requirement: Probe requirement',
  '',
  'The probe SHALL exist.',
  '',
  '#### Scenario: The probe holds',
  '',
  '- **WHEN** the probe runs',
  '- **THEN** it holds',
  '',
  '## DEPRECATED Requirements',
  '',
  '### Requirement: Ignored requirement',
  '',
  'This requirement sits under a section the CLI does not recognise.',
  '',
].join('\n');

async function probeProject() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-unrecognized-section-e2e-'));
  tempRoots.push(base);
  const home = path.join(base, 'home');
  const project = path.join(base, 'project');
  await fs.mkdir(home, { recursive: true });
  await fs.mkdir(path.join(project, 'openspec', 'changes', 'probe', 'specs', 'probe'), { recursive: true });
  await fs.writeFile(path.join(project, 'openspec', 'changes', 'probe', 'specs', 'probe', 'spec.md'), DELTA);
  const env = {
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
    XDG_DATA_HOME: path.join(home, '.local', 'share'),
    OPENSPEC_NO_ANIMATION: '1',
  };
  const cli = (args: string[]) => runCLI(args, { cwd: project, env, timeoutMs: 60_000 });
  return { project, cli };
}

describe('unrecognized requirement-bearing delta section (#2195)', () => {
  it('fails validate --all', async () => {
    const { cli } = await probeProject();
    const result = await cli(['validate', '--all']);
    expect(result.exitCode).toBe(1);
    expect(result.stdout + result.stderr).toMatch(
      /ERROR.*Requirement "Ignored requirement" is under "## DEPRECATED Requirements"/
    );
  }, TIMEOUT);

  it('refuses archive, with and without --no-validate, and changes no files', async () => {
    const { project, cli } = await probeProject();
    for (const args of [
      ['archive', 'probe', '--yes'],
      ['archive', 'probe', '--yes', '--no-validate'],
    ]) {
      const result = await cli(args);
      expect(result.exitCode).toBe(1);
      await expect(fs.access(path.join(project, 'openspec', 'specs', 'probe', 'spec.md'))).rejects.toThrow();
      await expect(fs.access(path.join(project, 'openspec', 'changes', 'probe'))).resolves.toBeUndefined();
    }
  }, TIMEOUT);
});
