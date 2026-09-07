import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SyncCommand } from '../../src/core/sync.js';
import { ArchiveCommand } from '../../src/core/archive.js';
import { readChangeStatus, writeChangeStatus } from '../../src/utils/change-metadata.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
}));

const MAIN_SPEC = `# api Specification

## Purpose
The API surface exposed to clients, and the rules requests are admitted under.

## Requirements

### Requirement: Rate limiting
The API SHALL reject requests above the configured rate.

#### Scenario: Over the limit
- **WHEN** a client exceeds the rate
- **THEN** the API responds 429
`;

const ADDED_DELTA = `## ADDED Requirements

### Requirement: Request tracing
The API SHALL attach a trace id to every response.

#### Scenario: Traced response
- **WHEN** a request is served
- **THEN** the response carries a trace id
`;

describe('SyncCommand', () => {
  let tempDir: string;
  let sync: SyncCommand;
  const originalConsoleLog = console.log;
  const originalExitCode = process.exitCode;
  const originalXdgDataHome = process.env.XDG_DATA_HOME;
  let logged: string[];

  const changesDir = (): string => path.join(tempDir, 'openspec', 'changes');
  const specsDir = (): string => path.join(tempDir, 'openspec', 'specs');
  const output = (): string => logged.join('\n');

  /** A complete, valid change with one ADDED delta against `api`. */
  async function makeChange(
    name: string,
    options: {
      status?: string;
      delta?: string;
      tasks?: string;
      metadata?: string;
    } = {}
  ): Promise<string> {
    const dir = path.join(changesDir(), name);
    await fs.mkdir(path.join(dir, 'specs', 'api'), { recursive: true });
    await fs.writeFile(
      path.join(dir, '.openspec.yaml'),
      options.metadata ??
        `schema: spec-driven\n${options.status ? `status: ${options.status}\n` : ''}`
    );
    await fs.writeFile(
      path.join(dir, 'proposal.md'),
      '## Why\nThe API needs request tracing, and today nothing correlates calls.\n\n' +
        '## What Changes\n- Add request tracing to the API surface.\n'
    );
    await fs.writeFile(
      path.join(dir, 'tasks.md'),
      options.tasks ?? '## 1. Work\n- [x] 1.1 Done\n'
    );
    await fs.writeFile(
      path.join(dir, 'specs', 'api', 'spec.md'),
      options.delta ?? ADDED_DELTA
    );
    return dir;
  }

  async function mainSpec(): Promise<string> {
    return fs.readFile(path.join(specsDir(), 'api', 'spec.md'), 'utf-8');
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-sync-test-'));
    process.chdir(tempDir);
    // Keep root resolution off any real store registry on the host.
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg-data');

    await fs.mkdir(path.join(specsDir(), 'api'), { recursive: true });
    await fs.mkdir(path.join(changesDir(), 'archive'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'openspec', 'project.md'), '# Demo\n');
    await fs.writeFile(path.join(specsDir(), 'api', 'spec.md'), MAIN_SPEC);

    logged = [];
    console.log = vi.fn((...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
    });
    process.exitCode = undefined;
    sync = new SyncCommand();
  });

  afterEach(async () => {
    console.log = originalConsoleLog;
    process.exitCode = originalExitCode;
    if (originalXdgDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = originalXdgDataHome;
    vi.clearAllMocks();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors.
    }
  });

  describe('--check is green at rest', () => {
    it('passes a proposed change without examining its deltas', async () => {
      await makeChange('add-tracing');

      await sync.execute(undefined, { check: true });

      expect(process.exitCode).toBeUndefined();
      // The whole point of #1683: an open change is the resting state, not a
      // failure, so the gate must not go red for one.
      expect(output()).toContain('nothing to check');
      expect(await mainSpec()).toBe(MAIN_SPEC);
    });

    it('passes when no change declares a status at all', async () => {
      await makeChange('a');
      await makeChange('b');

      await sync.execute(undefined, { check: true });

      expect(process.exitCode).toBeUndefined();
    });
  });

  describe('--check fails only on a real mistake', () => {
    it('reports a shipped change whose deltas are not in the main specs', async () => {
      await makeChange('add-tracing', { status: 'shipped' });

      await sync.execute(undefined, { check: true });

      expect(process.exitCode).toBe(1);
      expect(output()).toContain('add-tracing');
      expect(output()).toContain('api');
      expect(output()).toContain('openspec sync');
      // A check writes nothing, ever.
      expect(await mainSpec()).toBe(MAIN_SPEC);
    });

    it('passes the same change once it is folded', async () => {
      await makeChange('add-tracing', { status: 'shipped' });

      await sync.execute(undefined, { yes: true });
      process.exitCode = undefined;
      await sync.execute(undefined, { check: true });

      expect(process.exitCode).toBeUndefined();
      expect(await mainSpec()).toContain('Request tracing');
    });
  });

  describe('folding', () => {
    it('applies a shipped change and leaves it in changes/', async () => {
      await makeChange('add-tracing', { status: 'shipped' });

      await sync.execute(undefined, { yes: true });

      expect(await mainSpec()).toContain('### Requirement: Request tracing');
      // Unlike archive, nothing moves: the change is still open for review.
      await expect(
        fs.stat(path.join(changesDir(), 'add-tracing'))
      ).resolves.toBeTruthy();
    });

    it('is idempotent: a second run writes nothing', async () => {
      await makeChange('add-tracing', { status: 'shipped' });

      await sync.execute(undefined, { yes: true });
      const afterFirst = await mainSpec();
      logged = [];
      await sync.execute(undefined, { yes: true });

      expect(await mainSpec()).toBe(afterFirst);
      expect(output()).toContain('already in sync');
    });

    it('folds a named change regardless of its status', async () => {
      // `openspec sync <change>` is the deterministic counterpart of the
      // agent-driven `/opsx:sync` workflow, and predates any lifecycle field.
      await makeChange('add-tracing');

      await sync.execute('add-tracing', {});

      expect(await mainSpec()).toContain('Request tracing');
    });

    it('leaves archive able to run afterwards, changing nothing further', async () => {
      await makeChange('add-tracing', { status: 'shipped' });
      await sync.execute(undefined, { yes: true });
      const afterSync = await mainSpec();

      await new ArchiveCommand().execute('add-tracing', { yes: true });

      // The early-sync pattern: re-applying a folded delta is a no-op, so the
      // archive step is unchanged by having synced first.
      expect(await mainSpec()).toBe(afterSync);
      await expect(
        fs.stat(path.join(changesDir(), 'archive'))
      ).resolves.toBeTruthy();
    });

    it('stops checking a change once it is archived', async () => {
      await makeChange('add-tracing', { status: 'shipped' });
      await sync.execute(undefined, { yes: true });
      await new ArchiveCommand().execute('add-tracing', { yes: true });

      logged = [];
      process.exitCode = undefined;
      await sync.execute(undefined, { check: true });

      // Archived deltas are history: re-applying them on top of everything
      // that came later is a merge conflict, not a drift check.
      expect(process.exitCode).toBeUndefined();
      expect(output()).toContain('nothing to check');
    });
  });

  describe('guards', () => {
    it('refuses a change with incomplete tasks', async () => {
      await makeChange('add-tracing', {
        status: 'shipped',
        tasks: '## 1. Work\n- [ ] 1.1 Not done\n',
      });

      await expect(sync.execute('add-tracing', {})).rejects.toThrow(
        /incomplete task/i
      );
      expect(await mainSpec()).toBe(MAIN_SPEC);
    });

    it('proceeds past incomplete tasks with --yes', async () => {
      await makeChange('add-tracing', {
        status: 'shipped',
        tasks: '## 1. Work\n- [ ] 1.1 Not done\n',
      });

      await sync.execute('add-tracing', { yes: true });

      expect(await mainSpec()).toContain('Request tracing');
    });

    it('refuses a delta that fails validation, writing nothing', async () => {
      await makeChange('add-tracing', {
        status: 'shipped',
        // An ADDED requirement with no scenario is what validate rejects.
        delta:
          '## ADDED Requirements\n\n### Requirement: Request tracing\n' +
          'The API SHALL attach a trace id.\n',
      });

      await expect(sync.execute('add-tracing', { yes: true })).rejects.toThrow(
        /Validation failed/
      );
      expect(await mainSpec()).toBe(MAIN_SPEC);
    });

    it('never deletes a spec: a retirement is handed to archive', async () => {
      await makeChange('retire-limits', {
        status: 'shipped',
        delta:
          '## REMOVED Requirements\n\n### Requirement: Rate limiting\n' +
          '**Reason**: Moved to the gateway.\n**Migration**: Configure the gateway.\n',
      });

      await expect(sync.execute('retire-limits', { yes: true })).rejects.toThrow(
        /openspec archive/
      );
      // The one irreversible operation in the system stays behind archive's
      // authorization marker and its rollback-safe deletion.
      await expect(
        fs.stat(path.join(specsDir(), 'api', 'spec.md'))
      ).resolves.toBeTruthy();
    });

    it('reports a retirement in --check without offering sync as the fix', async () => {
      await makeChange('retire-limits', {
        status: 'shipped',
        delta:
          '## REMOVED Requirements\n\n### Requirement: Rate limiting\n' +
          '**Reason**: Moved to the gateway.\n**Migration**: Configure the gateway.\n',
      });

      await sync.execute(undefined, { check: true });

      expect(process.exitCode).toBe(1);
      expect(output()).toContain('openspec archive');
      expect(output()).not.toContain('Run openspec sync to fold them');
    });
  });

  describe('undetermined status fails closed', () => {
    it('reports a change whose status value is not a known state', async () => {
      await makeChange('add-tracing', {
        metadata: 'schema: spec-driven\nstatus: shiped\n',
      });

      await sync.execute(undefined, { check: true });

      // Rounding this to `proposed` is the fail-open direction: a change that
      // declared itself shipped and then had its metadata broken would
      // silently stop being checked.
      expect(process.exitCode).toBe(1);
      expect(output()).toContain('add-tracing');
      expect(output()).toContain('lifecycle status');
    });

    it('reports a change whose metadata is not valid YAML but names status', async () => {
      await makeChange('add-tracing', {
        metadata: 'schema: spec-driven\nstatus: [unclosed\n',
      });

      await sync.execute(undefined, { check: true });

      expect(process.exitCode).toBe(1);
      expect(output()).toContain('not valid YAML');
    });

    it('ignores broken metadata that never mentions status', async () => {
      await makeChange('add-tracing', { metadata: 'schema: [unclosed\n' });

      await sync.execute(undefined, { check: true });

      // Not this gate's problem to report; `openspec status` and `validate`
      // already fail on it, and claiming it here would be noise.
      expect(process.exitCode).toBeUndefined();
    });
  });

  describe('--ship', () => {
    it('sets the field and folds in one run', async () => {
      const dir = await makeChange('add-tracing');

      await sync.execute('add-tracing', { ship: true });

      expect(readChangeStatus(dir).status).toBe('shipped');
      expect(await mainSpec()).toContain('Request tracing');
    });

    it('is refused alongside --check', async () => {
      await makeChange('add-tracing');

      await expect(
        sync.execute('add-tracing', { ship: true, check: true })
      ).rejects.toThrow(/one or the other/);
    });

    it('is refused without a change name', async () => {
      await makeChange('add-tracing');

      await expect(sync.execute(undefined, { ship: true })).rejects.toThrow(
        /needs the change/
      );
    });
  });

  describe('JSON output', () => {
    it('reports a clean check and exits 0', async () => {
      await makeChange('add-tracing', { status: 'shipped' });
      await sync.execute(undefined, { yes: true });
      logged = [];
      process.exitCode = undefined;

      await sync.execute(undefined, { check: true, json: true });

      const payload = JSON.parse(output());
      expect(payload.sync.clean).toBe(true);
      expect(payload.sync.checked).toBe(true);
      expect(payload.sync.changes[0].change).toBe('add-tracing');
      expect(process.exitCode).toBeUndefined();
    });

    it('reports a dirty check and exits 1', async () => {
      await makeChange('add-tracing', { status: 'shipped' });

      await sync.execute(undefined, { check: true, json: true });

      const payload = JSON.parse(output());
      expect(payload.sync.clean).toBe(false);
      expect(payload.sync.changes[0].specs[0].counts.added).toBe(1);
      expect(process.exitCode).toBe(1);
    });

    it('emits one status document for a blocked run', async () => {
      await makeChange('add-tracing', {
        status: 'shipped',
        tasks: '## 1. Work\n- [ ] 1.1 Not done\n',
      });

      await sync.execute('add-tracing', { json: true });

      const payload = JSON.parse(output());
      expect(payload.sync).toBeNull();
      expect(payload.status[0].code).toBe('sync_tasks_incomplete');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('errors', () => {
    it('names the available changes when the change does not exist', async () => {
      await makeChange('add-tracing');

      await expect(sync.execute('nope', {})).rejects.toThrow(/add-tracing/);
    });
  });
});

describe('readChangeStatus / writeChangeStatus', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-status-test-'));
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'c'), {
      recursive: true,
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors.
    }
  });

  const changeDir = (): string => path.join(tempDir, 'openspec', 'changes', 'c');

  it('reads an absent metadata file as proposed and undeclared', () => {
    const marker = readChangeStatus(changeDir());
    expect(marker).toEqual({ status: 'proposed', declared: false });
  });

  it('reads an absent status field as proposed and undeclared', async () => {
    await fs.writeFile(
      path.join(changeDir(), '.openspec.yaml'),
      'schema: spec-driven\n'
    );
    expect(readChangeStatus(changeDir())).toEqual({
      status: 'proposed',
      declared: false,
    });
  });

  it('preserves comments and key order when setting status', async () => {
    const original =
      '# hand-authored\nschema: spec-driven\ncreated: 2026-09-07\n';
    await fs.writeFile(path.join(changeDir(), '.openspec.yaml'), original);

    writeChangeStatus(changeDir(), 'shipped');

    const written = await fs.readFile(
      path.join(changeDir(), '.openspec.yaml'),
      'utf-8'
    );
    expect(written).toContain('# hand-authored');
    expect(written.indexOf('schema:')).toBeLessThan(written.indexOf('created:'));
    expect(readChangeStatus(changeDir()).status).toBe('shipped');
  });

  it('refuses to stamp a change with no metadata file', () => {
    expect(() => writeChangeStatus(changeDir(), 'shipped')).toThrow(
      /nothing to set status on/
    );
  });
});
