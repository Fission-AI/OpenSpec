import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';

/**
 * End to end: a REMOVED heading written with a CommonMark closing run
 * (`### Requirement: Late Fees ###`) must remove the requirement, instead of
 * archiving as a no-op behind a false "treating it as already removed" warning.
 */
const tempRoots: string[] = [];
afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});
const TIMEOUT = 120_000;

const PROPOSAL = [
  '# Edit billing',
  '',
  '## Why',
  'We need to keep the billing contract accurate for operators and customers over time.',
  '',
  '## What Changes',
  '- **billing**: updates billing requirements',
  '',
].join('\n');

const SEED = [
  '## ADDED Requirements',
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
 * A project whose main billing spec was written by archiving a seed change,
 * plus an open `edit` change waiting for a delta.
 */
async function seededProject() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-closed-heading-e2e-'));
  tempRoots.push(base);
  const home = path.join(base, 'home');
  const project = path.join(base, 'project');
  await fs.mkdir(home, { recursive: true });
  await fs.mkdir(project, { recursive: true });
  const env = {
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
    XDG_DATA_HOME: path.join(home, '.local', 'share'),
    OPENSPEC_NO_ANIMATION: '1',
  };
  const cli = (args: string[]) => runCLI(args, { cwd: project, env, timeoutMs: 60_000 });

  expect((await cli(['init', '--tools', 'claude'])).exitCode).toBe(0);
  expect((await cli(['new', 'change', 'seed'])).exitCode).toBe(0);
  const seedDir = path.join(project, 'openspec', 'changes', 'seed');
  await fs.mkdir(path.join(seedDir, 'specs', 'billing'), { recursive: true });
  await fs.writeFile(path.join(seedDir, 'proposal.md'), PROPOSAL);
  await fs.writeFile(path.join(seedDir, 'tasks.md'), '## 1. Work\n- [x] 1.1 Done\n');
  await fs.writeFile(path.join(seedDir, 'specs', 'billing', 'spec.md'), SEED);
  expect((await cli(['archive', 'seed', '--yes'])).exitCode).toBe(0);

  expect((await cli(['new', 'change', 'edit'])).exitCode).toBe(0);
  const editDir = path.join(project, 'openspec', 'changes', 'edit');
  await fs.mkdir(path.join(editDir, 'specs', 'billing'), { recursive: true });
  await fs.writeFile(path.join(editDir, 'proposal.md'), PROPOSAL);
  await fs.writeFile(path.join(editDir, 'tasks.md'), '## 1. Work\n- [x] 1.1 Done\n');

  const mainSpec = path.join(project, 'openspec', 'specs', 'billing', 'spec.md');
  return {
    cli,
    writeDelta: (body: string) => fs.writeFile(path.join(editDir, 'specs', 'billing', 'spec.md'), body),
    headers: async () =>
      (await fs.readFile(mainSpec, 'utf-8'))
        .split('\n')
        .filter((line) => line.startsWith('### Requirement:'))
        .map((line) => line.slice('### Requirement:'.length).trim()),
  };
}

describe('archive with a closed REMOVED heading', () => {
  it('removes the requirement for a plain REMOVED heading (control)', async () => {
    const p = await seededProject();
    await p.writeDelta('## REMOVED Requirements\n### Requirement: Late Fees\n**Reason**: no longer charged\n');
    const result = await p.cli(['archive', 'edit', '--yes']);
    expect(result.exitCode).toBe(0);
    expect(await p.headers()).toEqual(['Invoice Generation']);
  }, TIMEOUT);

  it('removes the requirement for a REMOVED heading with a closing # run', async () => {
    const p = await seededProject();
    await p.writeDelta('## REMOVED Requirements\n### Requirement: Late Fees ###\n**Reason**: no longer charged\n');
    const result = await p.cli(['archive', 'edit', '--yes']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout + result.stderr).not.toContain('treating it as already removed');
    expect(await p.headers()).toEqual(['Invoice Generation']);
  }, TIMEOUT);
});
