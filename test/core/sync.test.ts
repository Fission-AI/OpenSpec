import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SyncCommand } from '../../src/core/sync.js';
import { ArchiveCommand } from '../../src/core/archive.js';
import { readChangeStatus, writeChangeStatus } from '../../src/utils/change-metadata.js';
import {
  writeStoreMetadataState,
  writeStoreRegistryState,
} from '../../src/core/store/foundation.js';

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
  const originalCwd = process.cwd();
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
      /** Capability id relative to `specs/`, e.g. `platform/session-layout`. */
      capability?: string;
    } = {}
  ): Promise<string> {
    const dir = path.join(changesDir(), name);
    const capability = options.capability ?? 'api';
    await fs.mkdir(path.join(dir, 'specs', ...capability.split('/')), {
      recursive: true,
    });
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
      path.join(dir, 'specs', ...capability.split('/'), 'spec.md'),
      options.delta ?? ADDED_DELTA
    );
    return dir;
  }

  async function mainSpec(): Promise<string> {
    return fs.readFile(path.join(specsDir(), 'api', 'spec.md'), 'utf-8');
  }

  beforeEach(async () => {
    // realpath'd: a Windows runner can hand back an 8.3 short path while the
    // CLI canonicalizes to the long form, and macOS /var resolves to
    // /private/var - both make a root read as outside itself.
    tempDir = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-sync-test-'))
    );
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
    // Before the rm: Windows locks the process working directory, so removing
    // a tree we are standing inside fails and leaks it, leaving the next
    // describe running from a deleted path.
    process.chdir(originalCwd);
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

    it('folds a nested capability into the same nested path', async () => {
      const nested = path.join(specsDir(), 'platform', 'session-layout');
      await fs.mkdir(nested, { recursive: true });
      await fs.writeFile(
        path.join(nested, 'spec.md'),
        '# session-layout Specification\n\n## Purpose\n' +
          'How sessions are laid out across the platform surface.\n\n' +
          '## Requirements\n\n### Requirement: Session store\n' +
          'The platform SHALL persist sessions.\n\n' +
          '#### Scenario: Persisted\n- **WHEN** a session is created\n- **THEN** it is persisted\n'
      );
      await makeChange('evict-sessions', {
        status: 'shipped',
        capability: 'platform/session-layout',
        delta:
          '## ADDED Requirements\n\n### Requirement: Session eviction\n' +
          'The platform SHALL evict idle sessions.\n\n#### Scenario: Idle session\n' +
          '- **WHEN** a session idles out\n- **THEN** it is evicted\n',
      });

      await sync.execute(undefined, { yes: true });

      expect(await fs.readFile(path.join(nested, 'spec.md'), 'utf-8')).toContain(
        'Session eviction'
      );
      expect(await mainSpec()).toBe(MAIN_SPEC);
    });

    it('folds a MODIFIED delta and reports folded afterwards', async () => {
      await makeChange('retry-after', {
        status: 'shipped',
        delta:
          '## MODIFIED Requirements\n\n### Requirement: Rate limiting\n' +
          'The API SHALL reject requests above the configured rate, with a Retry-After header.\n\n' +
          '#### Scenario: Over the limit\n- **WHEN** a client exceeds the rate\n' +
          '- **THEN** the API responds 429 with Retry-After\n',
      });

      await sync.execute(undefined, { yes: true });
      logged = [];
      process.exitCode = undefined;
      await sync.execute(undefined, { check: true });

      expect(await mainSpec()).toContain('Retry-After');
      expect(process.exitCode).toBeUndefined();
    });

    it('folds a RENAMED delta and counts it as a rename', async () => {
      await makeChange('rename-limits', {
        status: 'shipped',
        delta:
          '## RENAMED Requirements\n\n- FROM: `### Requirement: Rate limiting`\n' +
          '- TO: `### Requirement: Request throttling`\n',
      });

      await sync.execute(undefined, { check: true, json: true });
      // The only path that increments `renamed`.
      expect(JSON.parse(output()).sync.changes[0].specs[0].counts).toEqual({
        added: 0,
        modified: 0,
        removed: 0,
        renamed: 1,
      });

      logged = [];
      process.exitCode = undefined;
      await sync.execute(undefined, { yes: true });

      const folded = await mainSpec();
      expect(folded).toContain('### Requirement: Request throttling');
      expect(folded).not.toContain('### Requirement: Rate limiting');
    });

    it('folds every shipped change and leaves proposed ones alone', async () => {
      await makeChange('a-tracing', { status: 'shipped' });
      await makeChange('b-billing', {
        status: 'shipped',
        capability: 'billing',
        delta:
          '## ADDED Requirements\n\n### Requirement: Invoice totals\n' +
          'The system SHALL total invoices in the account currency.\n\n' +
          '#### Scenario: Totalling\n- **WHEN** an invoice is issued\n' +
          '- **THEN** its total is in the account currency\n',
      });
      await makeChange('c-proposed');

      await sync.execute(undefined, { yes: true });

      expect(await mainSpec()).toContain('Request tracing');
      expect(
        await fs.readFile(path.join(specsDir(), 'billing', 'spec.md'), 'utf-8')
      ).toContain('Invoice totals');
      expect(output()).toContain('Totals: + 2');
    });

    it('creates the specs tree when the project has none yet', async () => {
      await fs.rm(specsDir(), { recursive: true, force: true });
      await makeChange('add-tracing', { status: 'shipped' });

      await sync.execute(undefined, { yes: true });

      expect(await mainSpec()).toContain('### Requirement: Request tracing');
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

  describe('folding several changes in one run', () => {
    /** A second change adding a different requirement to the SAME capability. */
    async function secondChange(name: string): Promise<void> {
      const dir = path.join(changesDir(), name);
      await fs.mkdir(path.join(dir, 'specs', 'api'), { recursive: true });
      await fs.writeFile(
        path.join(dir, '.openspec.yaml'),
        'schema: spec-driven\nstatus: shipped\n'
      );
      await fs.writeFile(
        path.join(dir, 'proposal.md'),
        '## Why\nThe API needs audit logging, and today nothing records calls.\n\n' +
          '## What Changes\n- Add audit logging to the API surface.\n'
      );
      await fs.writeFile(path.join(dir, 'tasks.md'), '## 1. Work\n- [x] 1.1 Done\n');
      await fs.writeFile(
        path.join(dir, 'specs', 'api', 'spec.md'),
        '## ADDED Requirements\n\n### Requirement: Audit logging\n' +
          'The API SHALL record every call in the audit log.\n\n' +
          '#### Scenario: Logged call\n- **WHEN** a request is served\n' +
          '- **THEN** the audit log gains an entry\n'
      );
    }

    it('keeps both folds when two shipped changes touch one capability', async () => {
      await makeChange('add-tracing', { status: 'shipped' });
      await secondChange('add-audit');

      await sync.execute(undefined, { yes: true });

      // Evaluating both against the same pre-write baseline and then writing
      // them in sequence makes the second write erase the first: each rebuilt
      // body is a whole file derived from the original spec. The changes do not
      // conflict, so losing one is pure data loss.
      const spec = await mainSpec();
      expect(spec).toContain('Request tracing');
      expect(spec).toContain('Audit logging');
      expect(spec).toContain('Rate limiting');
    });

    it('is green afterwards for every change it folded', async () => {
      await makeChange('add-tracing', { status: 'shipped' });
      await secondChange('add-audit');
      await sync.execute(undefined, { yes: true });

      logged = [];
      process.exitCode = undefined;
      await sync.execute(undefined, { check: true });

      expect(process.exitCode).toBeUndefined();
    });

    // fs.symlink needs Developer Mode or elevation on a Windows runner.
    it.skipIf(process.platform === 'win32')(
      'refuses when two capability ids resolve to the same file',
      async () => {
      // A capability directory may deliberately be a symlink, so two ids
      // aliasing one spec is a shape the trust model allows. Writing both in
      // sequence is last-writer-wins: one fold is destroyed and the other's
      // requirements are filed under the wrong capability.
      await makeChange('add-tracing', { status: 'shipped' });
      await fs.mkdir(path.join(changesDir(), 'add-tracing', 'specs', 'apiv2'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(changesDir(), 'add-tracing', 'specs', 'apiv2', 'spec.md'),
        '## ADDED Requirements\n\n### Requirement: Audit logging\n' +
          'The API SHALL record every call in the audit log.\n\n' +
          '#### Scenario: Logged call\n- **WHEN** a request is served\n' +
          '- **THEN** the audit log gains an entry\n'
      );
      await fs.symlink('api', path.join(specsDir(), 'apiv2'), 'dir');

      await expect(sync.execute('add-tracing', { yes: true })).rejects.toThrow(
        /resolve to the same target/
      );
      expect(await mainSpec()).toBe(MAIN_SPEC);
      }
    );
  });

  describe('the check path sees what the writer would refuse', () => {
    it('fails a shipped change whose delta specs do not validate', async () => {
      await makeChange('add-tracing', {
        status: 'shipped',
        delta:
          '## ADDED Requirements\n\n### Requirement: Request tracing\n' +
          'The API SHALL attach a trace id.\n',
      });

      await sync.execute(undefined, { check: true });

      // The gate promises `shipped => folded`. A delta the merge would refuse
      // is not folded and never will be, so certifying it clean is a false
      // green on the one surface teams wire into CI.
      expect(process.exitCode).toBe(1);
      expect(output()).toContain('at least one scenario');
    });

    it('fails a shipped change whose only delta sits at the specs root', async () => {
      // `discoverSpecFiles` does not walk `specs/spec.md`, so the change looks
      // like it has nothing to fold while its requirement is silently dropped
      // (#1385). Archive and the sync writer both refuse this tree.
      const dir = await makeChange('add-tracing', { status: 'shipped' });
      await fs.rm(path.join(dir, 'specs', 'api'), { recursive: true });
      await fs.writeFile(path.join(dir, 'specs', 'spec.md'), ADDED_DELTA);

      await sync.execute(undefined, { check: true });

      expect(process.exitCode).toBe(1);
      expect(output()).toContain('specs/spec.md');
    });

    it('passes a shipped change that declares it has no deltas', async () => {
      // Archive treats a zero-delta change as fine; sync must give the same
      // answer rather than a stricter one of its own.
      const dir = await makeChange('add-tracing', {
        metadata: 'schema: spec-driven\nstatus: shipped\nskip_specs: true\n',
      });
      await fs.rm(path.join(dir, 'specs'), { recursive: true });

      await sync.execute(undefined, { check: true });

      expect(process.exitCode).toBeUndefined();
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
        /must include at least one scenario/
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

  describe('--no-validate', () => {
    it('needs --yes, the way archive needs an answer', async () => {
      await makeChange('add-tracing', {
        status: 'shipped',
        delta:
          '## ADDED Requirements\n\n### Requirement: Request tracing\n' +
          'The API SHALL attach a trace id.\n',
      });

      await expect(
        sync.execute('add-tracing', { validate: false })
      ).rejects.toThrow(/needs confirmation/);
      expect(await mainSpec()).toBe(MAIN_SPEC);
    });

    it('folds a delta validation would refuse, once confirmed', async () => {
      await makeChange('add-tracing', {
        status: 'shipped',
        // The same scenario-less ADDED the validation guard rejects.
        delta:
          '## ADDED Requirements\n\n### Requirement: Request tracing\n' +
          'The API SHALL attach a trace id.\n',
      });

      await sync.execute('add-tracing', { validate: false, yes: true });

      expect(await mainSpec()).toContain('### Requirement: Request tracing');
    });
  });

  describe('a fold that does not settle', () => {
    it('refuses to report success when two shipped changes cannot both hold', async () => {
      const conflicting = (discriminator: string): string =>
        '## MODIFIED Requirements\n\n### Requirement: Rate limiting\n' +
        `The API SHALL reject requests above the configured rate, per ${discriminator}.\n\n` +
        '#### Scenario: Over the limit\n- **WHEN** a client exceeds the rate\n' +
        `- **THEN** the API responds 429 with a per-${discriminator} message\n`;
      await makeChange('a-widen', { status: 'shipped', delta: conflicting('API key') });
      await makeChange('b-narrow', { status: 'shipped', delta: conflicting('IP address') });

      // Reporting success would have `--check`, run immediately after, go red
      // for a fold that just claimed to have succeeded.
      await expect(sync.execute(undefined, { yes: true })).rejects.toThrow(
        /still report unfolded deltas/
      );
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

    it('does not stamp the change when a guard refuses it', async () => {
      const dir = await makeChange('add-tracing', {
        tasks: '## 1. Work\n- [ ] 1.1 Not done\n',
      });

      await expect(
        sync.execute('add-tracing', { ship: true })
      ).rejects.toThrow(/incomplete task/i);

      // Stamping before the guards would leave the tree in the exact state
      // --ship exists to prevent: shipped, with its deltas absent.
      expect(readChangeStatus(dir).status).toBe('proposed');
      expect(await mainSpec()).toBe(MAIN_SPEC);
    });

    it('does not stamp the change when its deltas fail validation', async () => {
      const dir = await makeChange('add-tracing', {
        delta:
          '## ADDED Requirements\n\n### Requirement: Request tracing\n' +
          'The API SHALL attach a trace id.\n',
      });

      await expect(
        sync.execute('add-tracing', { ship: true })
      ).rejects.toThrow(/must include at least one scenario/);

      expect(readChangeStatus(dir).status).toBe('proposed');
    });

    it('does not stamp the change when the spec write fails', async () => {
      const dir = await makeChange('add-tracing');
      const real = fs.writeFile;
      const spy = vi
        .spyOn(fs, 'writeFile')
        .mockImplementation(async (...args: Parameters<typeof fs.writeFile>) => {
          if (String(args[0]).endsWith(path.join('specs', 'api', 'spec.md'))) {
            throw new Error('ENOSPC: no space left on device');
          }
          return real(...args);
        });

      await expect(sync.execute('add-tracing', { ship: true })).rejects.toThrow(
        /Could not write the main specs/
      );
      spy.mockRestore();

      // The field is stamped only once the specs on disk are correct, so a
      // failed write cannot leave a change claiming shipped with its deltas
      // absent.
      expect(readChangeStatus(dir).status).toBe('proposed');
      expect(await mainSpec()).toBe(MAIN_SPEC);
    });

    it('refuses before folding when there is no metadata file to stamp', async () => {
      const dir = await makeChange('add-tracing');
      await fs.rm(path.join(dir, '.openspec.yaml'));

      await expect(sync.execute('add-tracing', { ship: true })).rejects.toThrow(
        /no \.openspec\.yaml/
      );

      // Folding first and discovering the missing file afterwards leaves a
      // fold that is never stamped, and a rerun that fails in the same place.
      expect(await mainSpec()).toBe(MAIN_SPEC);
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

    it('names a blocked change rather than showing it as having no specs', async () => {
      await makeChange('retire-limits', {
        status: 'shipped',
        delta:
          '## REMOVED Requirements\n\n### Requirement: Rate limiting\n' +
          '**Reason**: Moved to the gateway.\n**Migration**: Configure the gateway.\n',
      });

      await sync.execute(undefined, { check: true, json: true });

      // Structurally unlike a dirty change: no spec entries at all, so a CI
      // consumer reading `specs` alone would read this as clean.
      const change = JSON.parse(output()).sync.changes[0];
      expect(change.folded).toBe(false);
      expect(change.specs).toEqual([]);
      expect(change.blockers[0]).toContain('openspec archive');
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

  describe('write failures leave no partly folded tree', () => {
    it('restores every spec it had already written', async () => {
      await makeChange('add-tracing', { status: 'shipped' });
      // A second capability, so the run writes more than one file and a
      // failure on the later one can strand the earlier one.
      await fs.mkdir(path.join(changesDir(), 'add-tracing', 'specs', 'billing'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(changesDir(), 'add-tracing', 'specs', 'billing', 'spec.md'),
        '## ADDED Requirements\n\n### Requirement: Invoice totals\n' +
          'The system SHALL total invoices in the account currency.\n\n' +
          '#### Scenario: Totalling\n- **WHEN** an invoice is issued\n' +
          '- **THEN** its total is in the account currency\n'
      );

      const before = await mainSpec();
      const real = fs.writeFile;
      let writes = 0;
      const spy = vi
        .spyOn(fs, 'writeFile')
        .mockImplementation(async (...args: Parameters<typeof fs.writeFile>) => {
          // Let the first spec through, fail the second, then let the
          // rollback's own writes succeed.
          if (++writes === 2) throw new Error('ENOSPC: no space left on device');
          return real(...args);
        });

      await expect(sync.execute(undefined, { yes: true })).rejects.toThrow(
        /Could not write the main specs/
      );
      spy.mockRestore();

      expect(await mainSpec()).toBe(before);
      // The spec this run would have created must not be left behind either.
      await expect(
        fs.stat(path.join(specsDir(), 'billing', 'spec.md'))
      ).rejects.toThrow();
    });
  });

  describe('stores', () => {
    it("folds the selected store's specs and leaves the working directory alone", async () => {
      const storeRoot = path.join(tempDir, 'stores', 'team-context');
      const storeSpec = path.join(storeRoot, 'openspec', 'specs', 'api', 'spec.md');
      const changeDir = path.join(storeRoot, 'openspec', 'changes', 'add-tracing');
      await fs.mkdir(path.join(storeRoot, 'openspec', 'specs', 'api'), { recursive: true });
      await fs.mkdir(path.join(storeRoot, 'openspec', 'changes', 'archive'), {
        recursive: true,
      });
      await fs.mkdir(path.join(changeDir, 'specs', 'api'), { recursive: true });
      await fs.writeFile(
        path.join(storeRoot, 'openspec', 'config.yaml'),
        'schema: spec-driven\n'
      );
      await fs.writeFile(storeSpec, MAIN_SPEC);
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: spec-driven\nstatus: shipped\n'
      );
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '## Why\nThe API needs request tracing, and today nothing correlates calls.\n\n' +
          '## What Changes\n- Add request tracing to the API surface.\n'
      );
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '## 1. Work\n- [x] 1.1 Done\n');
      await fs.writeFile(path.join(changeDir, 'specs', 'api', 'spec.md'), ADDED_DELTA);
      await writeStoreMetadataState(storeRoot, { version: 1, id: 'team-context' });
      await writeStoreRegistryState({
        version: 1,
        stores: { 'team-context': { backend: { type: 'git', local_path: storeRoot } } },
      });

      await sync.execute(undefined, { yes: true, store: 'team-context' });

      expect(await fs.readFile(storeSpec, 'utf-8')).toContain('Request tracing');
      // The working directory's own project has no shipped change; nothing
      // there may be touched by a store-scoped run.
      expect(await mainSpec()).toBe(MAIN_SPEC);
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

  it('leaves the state undetermined when the declared schema does not resolve', async () => {
    await fs.writeFile(
      path.join(changeDir(), '.openspec.yaml'),
      'schema: no-such-schema\nstatus: shipped\n'
    );

    // Distinct from a bad status value: the field parses, the schema does not
    // resolve, and rounding that to `proposed` is the fail-open direction.
    const marker = readChangeStatus(changeDir());

    expect(marker.invalidReason).toContain('no-such-schema');
    expect(marker.declared).toBe(false);
  });

  it('replaces a status that is already set, in place', async () => {
    await fs.writeFile(
      path.join(changeDir(), '.openspec.yaml'),
      '# hand-authored\nschema: spec-driven\nstatus: proposed\ncreated: 2026-09-07\n'
    );

    writeChangeStatus(changeDir(), 'shipped');

    // Replaced, not appended: a duplicate `status` key would make the file
    // parse differently in yaml and in a hand-reading author's head.
    expect(await fs.readFile(path.join(changeDir(), '.openspec.yaml'), 'utf-8')).toBe(
      '# hand-authored\nschema: spec-driven\nstatus: shipped\ncreated: 2026-09-07\n'
    );
  });

  it('refuses to stamp a change with no metadata file', () => {
    expect(() => writeChangeStatus(changeDir(), 'shipped')).toThrow(
      /nothing to set status on/
    );
  });
});
