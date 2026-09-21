import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { findUnreadDeltaFiles } from '../../src/utils/spec-discovery.js';
import { Validator } from '../../src/core/validation/validator.js';
import { ArchiveCommand } from '../../src/core/archive.js';
import { generateApplyInstructions } from '../../src/commands/workflow/instructions.js';
import { runCLI } from '../helpers/run-cli.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../../src/utils/interactive.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/interactive.js')>();
  return { ...actual, confirmPrompt: vi.fn() };
});

/**
 * validate and archive read a change's deltas only from
 * specs/<capability-path>/spec.md, but the spec-driven artifact graph counts
 * any specs/**.md as the specs being written. A delta written anywhere else,
 * such as specs/user-auth.md, was reported done by status and ready by apply,
 * rejected by validate as "no deltas", and then archived with exit 0 and
 * nothing merged into openspec/specs/.
 */
const DELTA = [
  '## ADDED Requirements',
  '',
  '### Requirement: Password Login',
  'The system SHALL let a user sign in with a password.',
  '',
  '#### Scenario: Valid password',
  '- **WHEN** a user submits a valid password',
  '- **THEN** a session is created',
  '',
].join('\n');

async function write(root: string, segments: string[], content: string): Promise<void> {
  const file = path.join(root, ...segments);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

const exists = (p: string) => fs.access(p).then(() => true, () => false);

describe('findUnreadDeltaFiles', () => {
  let tempDir: string;
  let specsDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-unread-deltas-'));
    specsDir = path.join(tempDir, 'specs');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('reports a delta written as specs/<capability>.md', async () => {
    await write(specsDir, ['user-auth.md'], DELTA);
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([
      { path: 'user-auth.md', expected: 'user-auth/spec.md' },
    ]);
  });

  it('reports a delta in a capability folder under another name', async () => {
    await write(specsDir, ['user-auth', 'delta.md'], DELTA);
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([
      { path: 'user-auth/delta.md', expected: 'user-auth/spec.md' },
    ]);
  });

  it('reports a stray delta beside a capability spec.md', async () => {
    await write(specsDir, ['user-auth', 'spec.md'], DELTA);
    await write(specsDir, ['user-auth', 'more.md'], DELTA);
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([
      { path: 'user-auth/more.md', expected: 'user-auth/spec.md' },
    ]);
  });

  it('reports one inside a nested area folder', async () => {
    await write(specsDir, ['platform', 'session', 'changes.md'], DELTA);
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([
      { path: 'platform/session/changes.md', expected: 'platform/session/spec.md' },
    ]);
  });

  it('reports a spec file whose name differs only in case', async () => {
    await write(specsDir, ['user-auth', 'SPEC.md'], DELTA);
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([
      { path: 'user-auth/SPEC.md', expected: 'user-auth/spec.md' },
    ]);
  });

  it('ignores the flat and nested layouts the merge path reads', async () => {
    await write(specsDir, ['user-auth', 'spec.md'], DELTA);
    await write(specsDir, ['platform', 'session', 'spec.md'], DELTA);
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([]);
  });

  it('leaves a specs/-root spec.md to its own check', async () => {
    await write(specsDir, ['spec.md'], DELTA);
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([]);
  });

  it('ignores notes with no delta section', async () => {
    await write(specsDir, ['README.md'], '# Notes\n\nWhy these specs are organized this way.\n');
    await write(specsDir, ['user-auth', 'spec.md'], DELTA);
    await write(specsDir, ['user-auth', 'notes.md'], '# Notes\n\nOpen questions for review.\n');
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([]);
  });

  it('ignores delta headers that only appear inside a code fence', async () => {
    await write(
      specsDir,
      ['guide.md'],
      '# How to write a delta\n\n```markdown\n## ADDED Requirements\n### Requirement: Example\n```\n'
    );
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([]);
  });

  it('skips dot entries and non-markdown files', async () => {
    await write(specsDir, ['.drafts', 'user-auth.md'], DELTA);
    await write(specsDir, ['.hidden.md'], DELTA);
    await write(specsDir, ['user-auth.txt'], DELTA);
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([]);
  });

  it('returns results sorted by path', async () => {
    await write(specsDir, ['zeta.md'], DELTA);
    await write(specsDir, ['alpha', 'delta.md'], DELTA);
    expect((await findUnreadDeltaFiles(specsDir)).map((file) => file.path)).toEqual([
      'alpha/delta.md',
      'zeta.md',
    ]);
  });

  it('returns nothing for a change with no specs folder', async () => {
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([]);
  });

  it.skipIf(process.platform === 'win32')('skips a dangling symlink', async () => {
    await fs.mkdir(specsDir, { recursive: true });
    await fs.symlink(path.join(tempDir, 'missing.md'), path.join(specsDir, 'ghost.md'));
    expect(await findUnreadDeltaFiles(specsDir)).toEqual([]);
  });
});

describe('validate with an unread delta file', () => {
  let tempDir: string;
  let changeDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-unread-validate-'));
    changeDir = path.join(tempDir, 'change');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('rejects specs/<capability>.md, naming the file and where it belongs', async () => {
    await write(changeDir, ['specs', 'user-auth.md'], DELTA);

    const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(false);
    const issue = report.issues.find((i) => i.path === 'user-auth.md');
    expect(issue?.level).toBe('ERROR');
    expect(issue?.message).toContain('specs/user-auth.md');
    expect(issue?.message).toContain('specs/user-auth/spec.md');
    // The precise error replaces the generic one, which would say "No deltas
    // found" about deltas sitting in the file it just named.
    expect(report.issues.some((i) => i.message.includes('No deltas found'))).toBe(false);
  });

  it('rejects a stray delta file even when the capability spec.md is valid', async () => {
    await write(changeDir, ['specs', 'user-auth', 'spec.md'], DELTA);
    await write(changeDir, ['specs', 'user-auth', 'more.md'], DELTA);

    const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(false);
    expect(report.issues.find((i) => i.path === 'user-auth/more.md')?.level).toBe('ERROR');
  });

  it('control: accepts the nested layout specs/<area>/<capability>/spec.md', async () => {
    await write(changeDir, ['specs', 'platform', 'session', 'spec.md'], DELTA);

    const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(true);
  });

  it('control: accepts notes beside a valid delta', async () => {
    await write(changeDir, ['specs', 'user-auth', 'spec.md'], DELTA);
    await write(changeDir, ['specs', 'README.md'], '# Notes\n\nPlain notes.\n');

    const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(true);
  });
});

describe('archive with an unread delta file', () => {
  let tempDir: string;
  let archiveCommand: ArchiveCommand;
  const originalCwd = process.cwd();
  const originalConsoleLog = console.log;
  const originalExitCode = process.exitCode;
  const originalXdgDataHome = process.env.XDG_DATA_HOME;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-unread-archive-'));
    process.chdir(tempDir);
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg-data');
    await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'archive'), { recursive: true });
    console.log = vi.fn();
    process.exitCode = undefined;
    archiveCommand = new ArchiveCommand();
  });

  afterEach(async () => {
    console.log = originalConsoleLog;
    process.exitCode = originalExitCode;
    if (originalXdgDataHome === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = originalXdgDataHome;
    }
    process.chdir(originalCwd);
    vi.clearAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function change(name: string, specs: Array<[string[], string]>): Promise<string> {
    const changeDir = path.join(tempDir, 'openspec', 'changes', name);
    await write(changeDir, ['tasks.md'], '- [x] Task 1\n');
    for (const [segments, content] of specs) {
      await write(changeDir, ['specs', ...segments], content);
    }
    return changeDir;
  }

  const archived = async (name: string) =>
    (await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'))).some((entry) =>
      entry.endsWith(name)
    );
  const mainSpec = () => path.join(tempDir, 'openspec', 'specs', 'user-auth', 'spec.md');

  it('refuses to archive when the only delta is specs/<capability>.md', async () => {
    const changeDir = await change('flat-delta', [[['user-auth.md'], DELTA]]);

    await archiveCommand.execute('flat-delta', { yes: true });

    expect(process.exitCode).toBe(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Validation failed'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('specs/user-auth/spec.md'));
    expect(await archived('flat-delta')).toBe(false);
    expect(await exists(changeDir)).toBe(true);
    expect(await exists(mainSpec())).toBe(false);
  });

  it('refuses to archive when a stray delta sits beside a valid spec.md', async () => {
    await change('stray-delta', [
      [['user-auth', 'spec.md'], DELTA],
      [['user-auth', 'more.md'], DELTA.replace('Password Login', 'Passkey Login')],
    ]);

    await archiveCommand.execute('stray-delta', { yes: true });

    expect(process.exitCode).toBe(1);
    expect(await archived('stray-delta')).toBe(false);
    expect(await exists(mainSpec())).toBe(false);
  });

  it('still archives with --no-validate, the documented escape hatch', async () => {
    await change('flat-no-validate', [[['user-auth.md'], DELTA]]);

    await archiveCommand.execute('flat-no-validate', { yes: true, noValidate: true });

    expect(process.exitCode).toBeUndefined();
    expect(await archived('flat-no-validate')).toBe(true);
  });

  it('control: a change with no spec files still archives', async () => {
    await change('tooling-only', []);

    await archiveCommand.execute('tooling-only', { yes: true });

    expect(process.exitCode).toBeUndefined();
    expect(await archived('tooling-only')).toBe(true);
  });

  it('control: specs/<capability>/spec.md archives and merges', async () => {
    await change('nested-delta', [[['user-auth', 'spec.md'], DELTA]]);

    await archiveCommand.execute('nested-delta', { yes: true });

    expect(process.exitCode).toBeUndefined();
    expect(await archived('nested-delta')).toBe(true);
    expect(await fs.readFile(mainSpec(), 'utf-8')).toContain('Password Login');
  });
});

describe('instructions apply with an unread delta file', () => {
  let tempDir: string;
  let changeDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-unread-apply-'));
    changeDir = path.join(tempDir, 'openspec', 'changes', 'my-change');
    await write(changeDir, ['.openspec.yaml'], 'schema: spec-driven\n');
    await write(changeDir, ['proposal.md'], '## Why\nx\n');
    await write(changeDir, ['tasks.md'], '## 1. Implementation\n- [x] 1.1 Write the code\n');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('warns about specs/<capability>.md, exactly when the validator rejects it', async () => {
    await write(changeDir, ['specs', 'user-auth.md'], DELTA);

    const instructions = await generateApplyInstructions(tempDir, 'my-change');
    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    expect(instructions.state).toBe('all_done');
    expect(instructions.warnings).toHaveLength(1);
    expect(instructions.warnings?.[0]).toContain('specs/user-auth.md');
    expect(instructions.warnings?.[0]).toContain('specs/user-auth/spec.md');
    expect(instructions.warnings?.[0]).toContain('openspec validate my-change');
    expect(report.valid).toBe(false);
  });

  it('names a stray delta beside a valid spec.md', async () => {
    await write(changeDir, ['specs', 'user-auth', 'spec.md'], DELTA);
    await write(changeDir, ['specs', 'user-auth', 'more.md'], DELTA);

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.warnings).toHaveLength(1);
    expect(instructions.warnings?.[0]).toContain('specs/user-auth/more.md');
  });

  it('control: stays quiet for specs/<capability>/spec.md', async () => {
    await write(changeDir, ['specs', 'user-auth', 'spec.md'], DELTA);

    const instructions = await generateApplyInstructions(tempDir, 'my-change');
    const report = await new Validator().validateChangeDeltaSpecs(changeDir);

    expect(instructions.warnings).toBeUndefined();
    expect(report.valid).toBe(true);
  });
});

describe('end to end: a delta written as specs/<capability>.md', () => {
  const temps: string[] = [];
  afterAll(async () => {
    await Promise.all(temps.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });
  const T = 120_000;

  /** A fully planned change created through the CLI, its delta at the given path. */
  async function loginChange(deltaPath: string[]) {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-unread-e2e-'));
    temps.push(base);
    const home = path.join(base, 'home');
    const project = path.join(base, 'project');
    await fs.mkdir(home, { recursive: true });
    await fs.mkdir(project, { recursive: true });
    const env = {
      HOME: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      XDG_DATA_HOME: path.join(home, '.local', 'share'),
      OPENSPEC_NO_ANIMATION: '1',
    };
    const cli = (args: string[]) => runCLI(args, { cwd: project, env, timeoutMs: 60_000 });
    expect((await cli(['init', '--tools', 'claude'])).exitCode).toBe(0);
    expect((await cli(['new', 'change', 'add-login'])).exitCode).toBe(0);
    const dir = path.join(project, 'openspec', 'changes', 'add-login');
    await write(
      dir,
      ['proposal.md'],
      '# Add login\n\n## Why\nUsers need to sign in so that their data is private to them and auditable.\n\n## What Changes\n- **user-auth**: adds login\n'
    );
    await write(dir, ['design.md'], '# Design\n\nSession cookies.\n');
    await write(dir, ['tasks.md'], '## 1. Work\n- [x] 1.1 Implement login\n');
    await write(dir, ['specs', ...deltaPath], DELTA);
    const mainSpec = path.join(project, 'openspec', 'specs', 'user-auth', 'spec.md');
    return { cli, dir, mainSpec };
  }

  it('apply warns, validate rejects, and archive refuses instead of archiving it unmerged', async () => {
    const c = await loginChange(['user-auth.md']);

    const apply = JSON.parse(
      (await c.cli(['instructions', 'apply', '--change', 'add-login', '--json'])).stdout
    );
    expect(apply.warnings?.join('\n')).toContain('specs/user-auth/spec.md');

    const validated = await c.cli(['validate', 'add-login']);
    expect(validated.exitCode).not.toBe(0);
    expect(validated.stdout + validated.stderr).toContain('specs/user-auth.md');

    const archived = await c.cli(['archive', 'add-login', '--yes']);
    expect(archived.exitCode).not.toBe(0);
    expect(await exists(c.dir)).toBe(true);
    expect(await exists(c.mainSpec)).toBe(false);
  }, T);

  it('control: specs/<capability>/spec.md validates, archives, and merges', async () => {
    const c = await loginChange(['user-auth', 'spec.md']);

    const apply = JSON.parse(
      (await c.cli(['instructions', 'apply', '--change', 'add-login', '--json'])).stdout
    );
    expect(apply.warnings).toBeUndefined();
    expect((await c.cli(['validate', 'add-login'])).exitCode).toBe(0);
    expect((await c.cli(['archive', 'add-login', '--yes'])).exitCode).toBe(0);
    expect(await fs.readFile(c.mainSpec, 'utf-8')).toContain('Password Login');
  }, T);
});
