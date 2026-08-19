import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { discoverChanges, resolveChangeDir } from '../../src/core/change-discovery.js';
import { MigrateCommand } from '../../src/core/lifecycle-migrate.js';
import { SyncCommand } from '../../src/core/sync.js';
import { createChange } from '../../src/utils/change-utils.js';
import { getActiveChangeIds } from '../../src/utils/item-discovery.js';
import { getAvailableChanges } from '../../src/commands/workflow/shared.js';
import { JsonConverter } from '../../src/core/converters/json-converter.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const DELTA = `# Auth - Changes

## ADDED Requirements

### Requirement: Operator authentication

The system SHALL authenticate operators.

#### Scenario: Valid token
- **WHEN** a valid token is presented
- **THEN** the request is accepted
`;

describe('change discovery across layouts', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-shard-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('finds flat, sharded, and mixed changes; strips the day prefix; skips archive', async () => {
    const changes = path.join(tempDir, 'changes');
    await fs.mkdir(path.join(changes, 'flat-change'), { recursive: true });
    await fs.mkdir(path.join(changes, '2026', '03', '15-old-change'), { recursive: true });
    await fs.mkdir(path.join(changes, 'archive', '2026-01-01-buried'), { recursive: true });

    const found = await discoverChanges(changes);
    expect(found.map((c) => c.id)).toEqual(['flat-change', 'old-change']);

    expect(await resolveChangeDir(changes, 'old-change')).toBe(
      path.join(changes, '2026', '03', '15-old-change')
    );
    expect(await resolveChangeDir(changes, 'flat-change')).toBe(
      path.join(changes, 'flat-change')
    );
    expect(await resolveChangeDir(changes, 'nope')).toBeNull();
  });

  it('rejects an ambiguous id present under two shard dates', async () => {
    const changes = path.join(tempDir, 'changes');
    await fs.mkdir(path.join(changes, '2026', '03', '15-dupe'), { recursive: true });
    await fs.mkdir(path.join(changes, '2026', '04', '01-dupe'), { recursive: true });

    await expect(resolveChangeDir(changes, 'dupe')).rejects.toThrow(/ambiguous/);
  });

  it('resolves hostile ids to null instead of escaping changes/', async () => {
    const changes = path.join(tempDir, 'changes');
    await fs.mkdir(path.join(changes, 'real-change'), { recursive: true });

    expect(await resolveChangeDir(changes, '..')).toBeNull();
    expect(await resolveChangeDir(changes, '../outside')).toBeNull();
    expect(await resolveChangeDir(changes, '.hidden')).toBeNull();
    expect(await resolveChangeDir(changes, '')).toBeNull();
  });

  it('propagates an unreadable shard instead of reporting it empty', async () => {
    const changes = path.join(tempDir, 'changes');
    const month = path.join(changes, '2026', '03');
    await fs.mkdir(path.join(month, '15-hidden-by-eacces'), { recursive: true });

    // Injected rather than produced with chmod: permissions do not constrain
    // root and do not exist on Windows, and the property under test is how the
    // walk reacts to EACCES, not how the OS produces one. An unreadable month
    // shard hides shipped changes as effectively as an unreadable root.
    const realReaddir = fs.readdir.bind(fs);
    const spy = vi
      .spyOn(fs, 'readdir')
      .mockImplementation((async (dir: string, opts: unknown) => {
        if (String(dir) === month) {
          const denied: NodeJS.ErrnoException = new Error('EACCES: permission denied');
          denied.code = 'EACCES';
          throw denied;
        }
        return (realReaddir as (d: string, o: unknown) => Promise<unknown>)(dir, opts);
      }) as unknown as typeof fs.readdir);

    try {
      await expect(discoverChanges(changes)).rejects.toThrow(/EACCES/);
    } finally {
      spy.mockRestore();
    }
  });

  it.skipIf(process.platform === 'win32')(
    'treats a compatibility symlink and its target as one change',
    async () => {
      const changes = path.join(tempDir, 'changes');
      const sharded = path.join(changes, '2026', '03', '15-aliased');
      await fs.mkdir(sharded, { recursive: true });
      // The shape a project would leave behind after sharding, so old paths
      // keep working. It is one change, and calling it ambiguous would fail a
      // tree that is fine.
      await fs.symlink(sharded, path.join(changes, 'aliased'));

      expect(await resolveChangeDir(changes, 'aliased')).toBe(sharded);
    }
  );

  it('refuses an id claimed by both a flat and a sharded directory', async () => {
    const changes = path.join(tempDir, 'changes');
    await fs.mkdir(path.join(changes, 'dupe'), { recursive: true });
    await fs.mkdir(path.join(changes, '2026', '03', '15-dupe'), { recursive: true });

    // The flat directory must not win silently: list shows both, so resolving
    // to one of them would act on a different change than the listing names.
    await expect(resolveChangeDir(changes, 'dupe')).rejects.toThrow(/ambiguous/);
  });

  it('never hands out shard or archive dirs as changes', async () => {
    const changes = path.join(tempDir, 'changes');
    await fs.mkdir(path.join(changes, '2026', '03', '15-real'), { recursive: true });
    await fs.mkdir(path.join(changes, 'archive'), { recursive: true });

    expect(await resolveChangeDir(changes, '2026')).toBeNull();
    expect(await resolveChangeDir(changes, 'archive')).toBeNull();
  });

  it('derives the change id, not the year shard, from a sharded path', async () => {
    const changeDir = path.join(tempDir, 'openspec', 'changes', '2026', '03', '15-old-change');
    await fs.mkdir(changeDir, { recursive: true });
    const proposal = path.join(changeDir, 'proposal.md');
    await fs.writeFile(proposal, '# Change: Old Change\n\n## Why\n\nBecause.\n\n## What Changes\n\n- stuff\n');

    const parsed = JSON.parse(await new JsonConverter().convertChangeToJson(proposal));
    expect(parsed.name).toBe('old-change');
  });

  it('the shared enumerators see sharded changes, not shard dirs', async () => {
    const changes = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(path.join(changes, 'flat-change'), { recursive: true });
    await fs.mkdir(path.join(changes, '2026', '03', '15-old-change'), { recursive: true });
    await fs.mkdir(path.join(changes, 'archive', '2026-01-01-buried'), { recursive: true });

    expect(await getActiveChangeIds(tempDir)).toEqual(['flat-change', 'old-change']);
    expect(await getAvailableChanges(tempDir)).toEqual(['flat-change', 'old-change']);
  });

  it('refuses to create a change whose id could never be resolved', async () => {
    await fs.mkdir(path.join(tempDir, 'openspec'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\nlifecycle: status\n'
    );

    // Both pass the kebab grammar, and both name directories the layout owns.
    await expect(createChange(tempDir, 'archive')).rejects.toThrow(/reserved/);
    await expect(createChange(tempDir, '2026')).rejects.toThrow(/reserved/);
  });

  it('createChange shards by creation date under lifecycle: status', async () => {
    await fs.mkdir(path.join(tempDir, 'openspec'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\nlifecycle: status\n'
    );

    const result = await createChange(tempDir, 'fresh-change');
    const rel = path.relative(path.join(tempDir, 'openspec', 'changes'), result.changeDir);
    expect(rel).toMatch(/^\d{4}[/\\]\d{2}[/\\]\d{2}-fresh-change$/);
    const metadata = await fs.readFile(path.join(result.changeDir, '.openspec.yaml'), 'utf-8');
    expect(metadata).toContain('status: proposed');

    // The root-completion scaffold must not resurrect the directory the
    // mode abolished.
    await expect(
      fs.access(path.join(tempDir, 'openspec', 'changes', 'archive'))
    ).rejects.toThrow();
  });
});

describe('MigrateCommand', () => {
  let tempDir: string;
  let logs: string[];
  const originalLog = console.log;
  const originalExitCode = process.exitCode;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-migrate-test-'));
    logs = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(' '));
    };
    process.exitCode = undefined;

    const openspec = path.join(tempDir, 'openspec');
    // Legacy layout: one archived change whose fold sits in specs/ exactly as
    // archive left it. Hand-writing the folded spec fails the byte-identity
    // check on whitespace canon, so generate it with the same engine archive
    // uses, via a scratch status-mode project.
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-migrate-scratch-'));
    await fs.mkdir(path.join(scratch, 'openspec', 'changes', 'seed', 'specs', 'auth'), {
      recursive: true,
    });
    await fs.mkdir(path.join(scratch, 'openspec', 'specs'), { recursive: true });
    await fs.writeFile(
      path.join(scratch, 'openspec', 'config.yaml'),
      'schema: spec-driven\nlifecycle: status\n'
    );
    await fs.writeFile(
      path.join(scratch, 'openspec', 'changes', 'seed', '.openspec.yaml'),
      'schema: spec-driven\nstatus: shipped\n'
    );
    await fs.writeFile(
      path.join(scratch, 'openspec', 'changes', 'seed', 'specs', 'auth', 'spec.md'),
      DELTA
    );
    await new SyncCommand().execute('seed', scratch, { json: true });
    const foldedSpec = await fs.readFile(
      path.join(scratch, 'openspec', 'specs', 'auth', 'spec.md'),
      'utf-8'
    );
    await fs.rm(scratch, { recursive: true, force: true });

    await fs.mkdir(path.join(openspec, 'specs', 'auth'), { recursive: true });
    await fs.writeFile(path.join(openspec, 'specs', 'auth', 'spec.md'), foldedSpec);
    await fs.writeFile(path.join(openspec, 'config.yaml'), 'schema: spec-driven\n');

    const archived = path.join(openspec, 'changes', 'archive', '2026-03-15-add-user-auth');
    await fs.mkdir(path.join(archived, 'specs', 'auth'), { recursive: true });
    await fs.writeFile(path.join(archived, 'specs', 'auth', 'spec.md'), DELTA);

    const active = path.join(openspec, 'changes', 'batch-upload');
    await fs.mkdir(path.join(active, 'specs', 'beacons'), { recursive: true });
    await fs.writeFile(
      path.join(active, '.openspec.yaml'),
      'schema: spec-driven\ncreated: 2026-08-01\n'
    );
    await fs.writeFile(
      path.join(active, 'specs', 'beacons', 'spec.md'),
      `# Beacons - Changes

## ADDED Requirements

### Requirement: Batched upload

The system SHALL accept batched readings.

#### Scenario: Replay
- **WHEN** a gateway replays a batch
- **THEN** all readings are accepted
`
    );
  });

  afterEach(async () => {
    console.log = originalLog;
    process.exitCode = originalExitCode;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('dry run plans without writing', async () => {
    await new MigrateCommand().execute(tempDir, { dryRun: true });
    await expect(
      fs.access(path.join(tempDir, 'openspec', 'changes', 'archive', '2026-03-15-add-user-auth'))
    ).resolves.not.toThrow();
    const config = await fs.readFile(path.join(tempDir, 'openspec', 'config.yaml'), 'utf-8');
    expect(config).not.toContain('lifecycle: status');
  });

  it('migrates both eras, stamps statuses, flips the config, and the gate is green', async () => {
    await new MigrateCommand().execute(tempDir, {});

    const shipped = path.join(
      tempDir, 'openspec', 'changes', '2026', '03', '15-add-user-auth'
    );
    const shippedMeta = await fs.readFile(path.join(shipped, '.openspec.yaml'), 'utf-8');
    expect(shippedMeta).toContain('status: shipped');
    expect(shippedMeta).toContain('created: 2026-03-15');

    const proposed = path.join(tempDir, 'openspec', 'changes', '2026', '08', '01-batch-upload');
    const proposedMeta = await fs.readFile(path.join(proposed, '.openspec.yaml'), 'utf-8');
    expect(proposedMeta).toContain('status: proposed');

    await expect(
      fs.access(path.join(tempDir, 'openspec', 'changes', 'archive'))
    ).rejects.toThrow();

    const config = await fs.readFile(path.join(tempDir, 'openspec', 'config.yaml'), 'utf-8');
    expect(config).toContain('lifecycle: status');

    // The migrated shipped change re-verifies: its delta re-applied to the
    // already-folded spec is a no-op, so the gate passes.
    const gate = await new SyncCommand().execute(undefined, tempDir, {
      check: true,
      silent: true,
    });
    expect(gate.clean).toBe(true);
  });

  it('refuses to migrate when a legacy name reuse would shard into an ambiguous id', async () => {
    // Reusing an archived change's name is idiomatic under archive mode — the
    // date prefix exists to allow it — but bare ids cannot address two shards.
    const reused = path.join(tempDir, 'openspec', 'changes', 'add-user-auth');
    await fs.mkdir(reused, { recursive: true });

    await expect(new MigrateCommand().execute(tempDir, { dryRun: true })).rejects.toThrow(
      /ambiguous/
    );
    await expect(new MigrateCommand().execute(tempDir, {})).rejects.toThrow(/add-user-auth/);

    // Nothing moved: the plan was refused before the first rename.
    await expect(
      fs.access(path.join(tempDir, 'openspec', 'changes', 'archive', '2026-03-15-add-user-auth'))
    ).resolves.not.toThrow();
    const config = await fs.readFile(path.join(tempDir, 'openspec', 'config.yaml'), 'utf-8');
    expect(config).not.toContain('lifecycle: status');
  });

  it('resumes after an interrupted migration instead of renaming shards into themselves', async () => {
    // Simulate a crash after the archived change moved but before the flat
    // scan, the archive cleanup, and the config flip.
    const changes = path.join(tempDir, 'openspec', 'changes');
    const shard = path.join(changes, '2026', '03', '15-add-user-auth');
    await fs.mkdir(path.dirname(shard), { recursive: true });
    await fs.rename(path.join(changes, 'archive', '2026-03-15-add-user-auth'), shard);

    await new MigrateCommand().execute(tempDir, {});

    await expect(fs.access(shard)).resolves.not.toThrow();
    await expect(
      fs.access(path.join(changes, '2026', '08', '01-batch-upload'))
    ).resolves.not.toThrow();
    const config = await fs.readFile(path.join(tempDir, 'openspec', 'config.yaml'), 'utf-8');
    expect(config).toContain('lifecycle: status');
  });

  it('preserves metadata comments and key order when stamping', async () => {
    const meta = path.join(tempDir, 'openspec', 'changes', 'batch-upload', '.openspec.yaml');
    await fs.writeFile(
      meta,
      '# provenance: imported from wiki\nschema: spec-driven\ncreated: 2026-08-01\n'
    );

    await new MigrateCommand().execute(tempDir, {});

    const stamped = await fs.readFile(
      path.join(tempDir, 'openspec', 'changes', '2026', '08', '01-batch-upload', '.openspec.yaml'),
      'utf-8'
    );
    expect(stamped).toContain('# provenance: imported from wiki');
    expect(stamped).toContain('status: proposed');
    expect(stamped.indexOf('schema:')).toBeLessThan(stamped.indexOf('created:'));
  });

  it('is a no-op on an already-migrated project', async () => {
    await new MigrateCommand().execute(tempDir, {});
    logs = [];
    await new MigrateCommand().execute(tempDir, {});
    expect(logs.join('\n')).toContain('Already on');
  });

  it('strips status from a proposed change that does not move', async () => {
    await new MigrateCommand().execute(tempDir, {});
    await new MigrateCommand().execute(tempDir, { to: 'archive' });

    // batch-upload is flat under both layouts, so its reverse move is a no-op.
    // The stamp is a separate obligation: a surviving status key would be read
    // as authoritative by a later forward migration.
    const meta = await fs.readFile(
      path.join(tempDir, 'openspec', 'changes', 'batch-upload', '.openspec.yaml'),
      'utf-8'
    );
    expect(meta).not.toContain('status:');
    expect(meta).toContain('created: 2026-08-01');
  });

  it('round-trips: migrate → migrate --to archive restores the legacy layout', async () => {
    await new MigrateCommand().execute(tempDir, {});
    await new MigrateCommand().execute(tempDir, { to: 'archive' });

    // Shipped change back in archive/ under its date; active change flat.
    const archived = path.join(
      tempDir, 'openspec', 'changes', 'archive', '2026-03-15-add-user-auth'
    );
    await expect(fs.access(archived)).resolves.not.toThrow();
    await expect(
      fs.access(path.join(tempDir, 'openspec', 'changes', 'batch-upload'))
    ).resolves.not.toThrow();

    // Location is the state again: no status key survives.
    const archivedMeta = await fs.readFile(path.join(archived, '.openspec.yaml'), 'utf-8');
    expect(archivedMeta).not.toContain('status:');
    expect(archivedMeta).toContain('created: 2026-03-15');

    // Shard dirs pruned; config back to the default mode.
    await expect(
      fs.access(path.join(tempDir, 'openspec', 'changes', '2026'))
    ).rejects.toThrow();
    const config = await fs.readFile(path.join(tempDir, 'openspec', 'config.yaml'), 'utf-8');
    expect(config).not.toContain('lifecycle:');
  });

  it('refuses --to archive while a shipped change has unfolded deltas', async () => {
    await new MigrateCommand().execute(tempDir, {});
    // Flip the proposed change to shipped WITHOUT folding: gate red.
    const meta = path.join(
      tempDir, 'openspec', 'changes', '2026', '08', '01-batch-upload', '.openspec.yaml'
    );
    await fs.writeFile(
      meta,
      (await fs.readFile(meta, 'utf-8')).replace('status: proposed', 'status: shipped')
    );

    await expect(
      new MigrateCommand().execute(tempDir, { to: 'archive' })
    ).rejects.toThrow(/unfolded deltas/);
    expect(process.exitCode).toBeUndefined();
  });
});
