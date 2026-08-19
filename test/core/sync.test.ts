import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncCommand, ShipCommand } from '../../src/core/sync.js';
import { ArchiveCommand } from '../../src/core/archive.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
}));

const DELTA = `# Auth - Changes

## ADDED Requirements

### Requirement: The system SHALL support OAuth login

#### Scenario: OAuth round trip
- **WHEN** a user signs in with a provider
- **THEN** a session is established
`;

describe('SyncCommand', () => {
  let tempDir: string;
  let logs: string[];
  const originalLog = console.log;
  const originalExitCode = process.exitCode;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-sync-test-'));
    logs = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(' '));
    };
    process.exitCode = undefined;
  });

  afterEach(async () => {
    console.log = originalLog;
    process.exitCode = originalExitCode;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function scaffold(options: {
    lifecycle?: 'archive' | 'status';
    status?: 'proposed' | 'shipped';
  }): Promise<void> {
    const openspec = path.join(tempDir, 'openspec');
    await fs.mkdir(path.join(openspec, 'specs'), { recursive: true });
    const changeDir = path.join(openspec, 'changes', 'add-oauth');
    await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });

    const lifecycleLine = options.lifecycle ? `lifecycle: ${options.lifecycle}\n` : '';
    await fs.writeFile(
      path.join(openspec, 'config.yaml'),
      `schema: spec-driven\n${lifecycleLine}`
    );

    const statusLine = options.status ? `status: ${options.status}\n` : '';
    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      `schema: spec-driven\ncreated: 2026-08-11\n${statusLine}`
    );
    await fs.writeFile(path.join(changeDir, 'specs', 'auth', 'spec.md'), DELTA);
  }

  function targetSpec(): string {
    return path.join(tempDir, 'openspec', 'specs', 'auth', 'spec.md');
  }

  it('reports nothing to gate under lifecycle: archive', async () => {
    await scaffold({ lifecycle: 'archive', status: 'shipped' });
    const report = await new SyncCommand().execute(undefined, tempDir, { check: true });
    expect(report.clean).toBe(true);
    expect(report.mode).toBe('archive');
    expect(logs.join('\n')).toContain('lifecycle: archive');
  });

  it('check fails on a shipped change whose delta is not folded', async () => {
    await scaffold({ lifecycle: 'status', status: 'shipped' });
    const report = await new SyncCommand().execute(undefined, tempDir, { check: true });
    expect(report.clean).toBe(false);
    expect(logs.join('\n')).toContain('add-oauth');
    expect(logs.join('\n')).toContain('auth');
  });

  it('ignores proposed changes: their deltas stay out of specs/', async () => {
    await scaffold({ lifecycle: 'status', status: 'proposed' });
    const report = await new SyncCommand().execute(undefined, tempDir, { check: true });
    expect(report.clean).toBe(true);
    await expect(fs.access(targetSpec())).rejects.toThrow();
  });

  it('folds a shipped change, then check passes and a re-run is a no-op', async () => {
    await scaffold({ lifecycle: 'status', status: 'shipped' });

    const fold = await new SyncCommand().execute(undefined, tempDir, {});
    expect(fold.clean).toBe(true);
    const folded = await fs.readFile(targetSpec(), 'utf-8');
    expect(folded).toContain('OAuth login');

    logs = [];
    const check = await new SyncCommand().execute(undefined, tempDir, { check: true });
    expect(check.clean).toBe(true);

    await new SyncCommand().execute(undefined, tempDir, {});
    const refolded = await fs.readFile(targetSpec(), 'utf-8');
    expect(refolded).toBe(folded);
  });

  it('fails closed when the changes directory cannot be enumerated', async () => {
    await scaffold({ lifecycle: 'status', status: 'shipped' });
    // A file where changes/ should be: readable project, unreadable tree. A
    // gate that reports green here is worse than no gate.
    await fs.rm(path.join(tempDir, 'openspec', 'changes'), { recursive: true, force: true });
    await fs.writeFile(path.join(tempDir, 'openspec', 'changes'), 'not a directory\n');

    await expect(
      new SyncCommand().execute(undefined, tempDir, { check: true, silent: true })
    ).rejects.toThrow();
  });

  it('treats an absent changes directory as no changes', async () => {
    await scaffold({ lifecycle: 'status', status: 'shipped' });
    await fs.rm(path.join(tempDir, 'openspec', 'changes'), { recursive: true, force: true });

    const report = await new SyncCommand().execute(undefined, tempDir, {
      check: true,
      silent: true,
    });
    expect(report.clean).toBe(true);
    expect(report.changes).toEqual([]);
  });

  it('silent mode emits nothing and still returns the report', async () => {
    await scaffold({ lifecycle: 'status', status: 'shipped' });
    const report = await new SyncCommand().execute(undefined, tempDir, {
      check: true,
      silent: true,
    });
    expect(report.clean).toBe(false);
    expect(logs).toEqual([]);
  });

  it('reports unreadable metadata as the same conflict entry named or swept', async () => {
    await scaffold({ lifecycle: 'status', status: 'shipped' });
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'changes', 'add-oauth', '.openspec.yaml'),
      'status: [unclosed\n'
    );

    const swept = await new SyncCommand().execute(undefined, tempDir, { check: true, silent: true });
    const named = await new SyncCommand().execute('add-oauth', tempDir, { check: true, silent: true });

    for (const report of [swept, named]) {
      expect(report.clean).toBe(false);
      expect(report.changes).toHaveLength(1);
      expect(report.changes[0].state).toBe('conflict');
      expect(report.changes[0].error).toBeTruthy();
    }
  });

  it('refuses to fold an explicitly named change that is not shipped', async () => {
    await scaffold({ lifecycle: 'status', status: 'proposed' });
    await expect(
      new SyncCommand().execute('add-oauth', tempDir, {})
    ).rejects.toThrow(/only shipped changes fold/);
  });

  it('ship flips status and folds in one step; re-ship is a no-op', async () => {
    await scaffold({ lifecycle: 'status', status: 'proposed' });

    const shipped = await new ShipCommand().execute('add-oauth', tempDir, {});
    expect(shipped.clean).toBe(true);
    const metadata = await fs.readFile(
      path.join(tempDir, 'openspec', 'changes', 'add-oauth', '.openspec.yaml'),
      'utf-8'
    );
    expect(metadata).toContain('status: shipped');
    const folded = await fs.readFile(targetSpec(), 'utf-8');
    expect(folded).toContain('OAuth login');

    const reshipped = await new ShipCommand().execute('add-oauth', tempDir, {});
    expect(reshipped.clean).toBe(true);
    expect(await fs.readFile(targetSpec(), 'utf-8')).toBe(folded);
  });

  it('ship refuses under lifecycle: archive and points at the archive workflow', async () => {
    await scaffold({ lifecycle: 'archive', status: 'proposed' });
    await expect(
      new ShipCommand().execute('add-oauth', tempDir, {})
    ).rejects.toThrow(/openspec archive/);
  });
});

describe('ArchiveCommand under lifecycle: status', () => {
  let tempDir: string;
  const originalExitCode = process.exitCode;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-sync-archive-test-'));
    const openspec = path.join(tempDir, 'openspec');
    await fs.mkdir(path.join(openspec, 'specs'), { recursive: true });
    await fs.mkdir(path.join(openspec, 'changes', 'add-oauth'), { recursive: true });
    await fs.writeFile(
      path.join(openspec, 'config.yaml'),
      'schema: spec-driven\nlifecycle: status\n'
    );
    await fs.writeFile(
      path.join(openspec, 'changes', 'add-oauth', '.openspec.yaml'),
      'schema: spec-driven\nstatus: shipped\n'
    );
  });

  afterEach(async () => {
    process.exitCode = originalExitCode;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('refuses to archive and points at the status workflow', async () => {
    const cwd = process.cwd();
    process.chdir(tempDir);
    try {
      await expect(
        new ArchiveCommand().execute('add-oauth', { yes: true })
      ).rejects.toThrow(/lifecycle: status/);
    } finally {
      process.chdir(cwd);
    }
  });

  it('refuses in JSON mode with a diagnostic and leaves the change in place', async () => {
    const cwd = process.cwd();
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(' '));
    };
    process.chdir(tempDir);
    process.exitCode = undefined;
    try {
      await new ArchiveCommand().execute('add-oauth', { yes: true, json: true });
    } finally {
      console.log = originalLog;
      process.chdir(cwd);
    }

    const payload = JSON.parse(logs.join('\n'));
    expect(payload.archive).toBeNull();
    expect(payload.status?.[0]?.code).toBe('lifecycle_status_mode');
    expect(process.exitCode).toBe(1);
    await expect(
      fs.access(path.join(tempDir, 'openspec', 'changes', 'add-oauth'))
    ).resolves.not.toThrow();
  });
});
