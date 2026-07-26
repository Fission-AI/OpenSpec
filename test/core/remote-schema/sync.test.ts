import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readSchemaLock } from '../../../src/core/remote-schema/lockfile.js';
import { syncRemoteSchemas } from '../../../src/core/remote-schema/sync.js';
import { getSchemaDir } from '../../../src/core/artifact-graph/resolver.js';

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'OpenSpec Test',
  GIT_AUTHOR_EMAIL: 'openspec@example.test',
  GIT_COMMITTER_NAME: 'OpenSpec Test',
  GIT_COMMITTER_EMAIL: 'openspec@example.test',
};

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    env: gitEnv,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function writeSchema(repo: string, name: string, marker: string): void {
  const schemaDir = path.join(repo, 'schemas', name);
  fs.mkdirSync(path.join(schemaDir, 'templates'), { recursive: true });
  fs.writeFileSync(
    path.join(schemaDir, 'schema.yaml'),
    `name: ${name}
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
    requires: []
`
  );
  fs.writeFileSync(path.join(schemaDir, 'templates', 'proposal.md'), `# ${marker}\n`);
}

describe('syncRemoteSchemas', () => {
  let tempDir: string;
  let projectRoot: string;
  let repo: string;
  let globalDataDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-sync-'));
    projectRoot = path.join(tempDir, 'project');
    repo = path.join(tempDir, 'remote');
    globalDataDir = path.join(tempDir, 'data', 'openspec');
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.mkdirSync(repo);
    git(repo, 'init', '-b', 'main');
    writeSchema(repo, 'team-flow', 'one');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-m', 'one');
    fs.writeFileSync(
      path.join(projectRoot, 'openspec', 'config.yaml'),
      `schema: team-flow
schemaSources:
  team-flow:
    git: ${pathToFileURL(repo).href}
    ref: main
    path: schemas/team-flow
`
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('locks a moving ref to a commit and installs a verified cache entry', async () => {
    const result = await syncRemoteSchemas(projectRoot, { globalDataDir });
    const lock = readSchemaLock(projectRoot);

    expect(result.schemas).toHaveLength(1);
    expect(result.schemas[0].resolvedCommit).toBe(git(repo, 'rev-parse', 'HEAD'));
    expect(lock?.schemas['team-flow']).toMatchObject({
      requestedRef: 'main',
      bundlePath: 'schemas/team-flow',
    });
    expect(fs.readFileSync(path.join(result.schemas[0].cachePath, 'templates', 'proposal.md'), 'utf8'))
      .toBe('# one\n');
  });

  it('keeps using the old lock until an explicit update and supports locked restoration', async () => {
    const first = await syncRemoteSchemas(projectRoot, { globalDataDir });
    const lockPath = path.join(projectRoot, 'openspec', 'schemas.lock.yaml');
    const firstLock = fs.readFileSync(lockPath);
    fs.rmSync(first.schemas[0].cachePath, { recursive: true });

    writeSchema(repo, 'team-flow', 'two');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-m', 'two');

    const restored = await syncRemoteSchemas(projectRoot, {
      locked: true,
      globalDataDir,
    });
    expect(fs.readFileSync(path.join(restored.schemas[0].cachePath, 'templates', 'proposal.md'), 'utf8'))
      .toBe('# one\n');
    expect(fs.readFileSync(lockPath)).toEqual(firstLock);

    const upgraded = await syncRemoteSchemas(projectRoot, { globalDataDir });
    expect(upgraded.schemas[0].resolvedCommit).toBe(git(repo, 'rev-parse', 'HEAD'));
    expect(upgraded.schemas[0].resolvedCommit).not.toBe(first.schemas[0].resolvedCommit);
  });

  it('resolves offline from the old lock after its branch advances', async () => {
    const first = await syncRemoteSchemas(projectRoot, { globalDataDir });
    process.env.XDG_DATA_HOME = path.dirname(globalDataDir);
    writeSchema(repo, 'team-flow', 'two');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-m', 'two');
    const originalPath = process.env.PATH;
    process.env.PATH = path.join(tempDir, 'no-programs');
    try {
      const resolved = getSchemaDir('team-flow', projectRoot);
      expect(resolved).toBe(first.schemas[0].cachePath);
      expect(fs.readFileSync(path.join(resolved!, 'templates', 'proposal.md'), 'utf8'))
        .toBe('# one\n');
    } finally {
      process.env.PATH = originalPath;
    }
  });

  it('repairs a corrupt locked cache entry without changing the lock', async () => {
    const first = await syncRemoteSchemas(projectRoot, { globalDataDir });
    const lockPath = path.join(projectRoot, 'openspec', 'schemas.lock.yaml');
    const firstLock = fs.readFileSync(lockPath);
    fs.appendFileSync(
      path.join(first.schemas[0].cachePath, 'templates', 'proposal.md'),
      'tampered'
    );

    const restored = await syncRemoteSchemas(projectRoot, {
      locked: true,
      globalDataDir,
    });

    expect(fs.readFileSync(lockPath)).toEqual(firstLock);
    expect(
      fs.readFileSync(
        path.join(restored.schemas[0].cachePath, 'templates', 'proposal.md'),
        'utf8'
      )
    ).toBe('# one\n');
  });

  it('syncs one selected source and rejects unknown names', async () => {
    writeSchema(repo, 'second-flow', 'second');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-m', 'second');
    fs.appendFileSync(
      path.join(projectRoot, 'openspec', 'config.yaml'),
      `  second-flow:
    git: ${pathToFileURL(repo).href}
    ref: main
    path: schemas/second-flow
`
    );

    const result = await syncRemoteSchemas(projectRoot, {
      name: 'second-flow',
      globalDataDir,
    });
    expect(result.schemas.map((entry) => entry.name)).toEqual(['second-flow']);
    await expect(
      syncRemoteSchemas(projectRoot, { name: 'missing', globalDataDir })
    ).rejects.toThrow(/not declared/);
  });

  it('preserves the old lock and cache when an upgrade is invalid', async () => {
    const first = await syncRemoteSchemas(projectRoot, { globalDataDir });
    const lockPath = path.join(projectRoot, 'openspec', 'schemas.lock.yaml');
    const firstLock = fs.readFileSync(lockPath);
    fs.rmSync(path.join(repo, 'schemas', 'team-flow', 'templates'), {
      recursive: true,
    });
    git(repo, 'add', '-A');
    git(repo, 'commit', '-m', 'invalid');

    await expect(syncRemoteSchemas(projectRoot, { globalDataDir })).rejects.toThrow(
      /templates directory not found/
    );
    expect(fs.readFileSync(lockPath)).toEqual(firstLock);
    expect(fs.existsSync(first.schemas[0].cachePath)).toBe(true);
  });

  it('does not partially replace the lock when a later source fails', async () => {
    await syncRemoteSchemas(projectRoot, { globalDataDir });
    const lockPath = path.join(projectRoot, 'openspec', 'schemas.lock.yaml');
    const firstLock = fs.readFileSync(lockPath);
    writeSchema(repo, 'team-flow', 'two');
    const brokenDir = path.join(repo, 'schemas', 'z-broken');
    fs.mkdirSync(brokenDir, { recursive: true });
    fs.writeFileSync(
      path.join(brokenDir, 'schema.yaml'),
      `name: z-broken
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
    requires: []
`
    );
    git(repo, 'add', '-A');
    git(repo, 'commit', '-m', 'partial failure');
    fs.appendFileSync(
      path.join(projectRoot, 'openspec', 'config.yaml'),
      `  z-broken:
    git: ${pathToFileURL(repo).href}
    ref: main
    path: schemas/z-broken
`
    );

    await expect(syncRemoteSchemas(projectRoot, { globalDataDir })).rejects.toThrow(
      /templates directory not found/
    );
    expect(fs.readFileSync(lockPath)).toEqual(firstLock);
  });

  it('preserves the active lock and cache when cache installation fails', async () => {
    const first = await syncRemoteSchemas(projectRoot, { globalDataDir });
    const lockPath = path.join(projectRoot, 'openspec', 'schemas.lock.yaml');
    const firstLock = fs.readFileSync(lockPath);
    writeSchema(repo, 'team-flow', 'two');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-m', 'two');
    const unusableDataDir = path.join(tempDir, 'not-a-directory');
    fs.writeFileSync(unusableDataDir, 'file');

    await expect(
      syncRemoteSchemas(projectRoot, { globalDataDir: unusableDataDir })
    ).rejects.toThrow();
    expect(fs.readFileSync(lockPath)).toEqual(firstLock);
    expect(fs.existsSync(first.schemas[0].cachePath)).toBe(true);
  });

  it('fails locked mode when source metadata drifts from the lock', async () => {
    await syncRemoteSchemas(projectRoot, { globalDataDir });
    fs.appendFileSync(
      path.join(projectRoot, 'openspec', 'config.yaml'),
      '\n# intentional edit\n'
    );
    const configPath = path.join(projectRoot, 'openspec', 'config.yaml');
    fs.writeFileSync(
      configPath,
      fs.readFileSync(configPath, 'utf8').replace('ref: main', 'ref: other')
    );
    await expect(
      syncRemoteSchemas(projectRoot, { locked: true, globalDataDir })
    ).rejects.toThrow(/does not match the configured source/);
  });

  it('rebuilds a malformed lockfile in all-source update mode', async () => {
    const lockPath = path.join(projectRoot, 'openspec', 'schemas.lock.yaml');
    fs.writeFileSync(lockPath, 'version: 99\nschemas: {}\n');

    const result = await syncRemoteSchemas(projectRoot, { globalDataDir });

    expect(result.schemas.map((schema) => schema.name)).toEqual(['team-flow']);
    expect(readSchemaLock(projectRoot)?.schemas['team-flow'].resolvedCommit).toMatch(
      /^[0-9a-f]{40}$/
    );
  });

  it.each(['../schemas/team-flow', '/schemas/team-flow', 'C:/schemas/team-flow'])(
    'rejects unsafe configured bundle path %s',
    async (unsafePath) => {
      const configPath = path.join(projectRoot, 'openspec', 'config.yaml');
      fs.writeFileSync(
        configPath,
        fs.readFileSync(configPath, 'utf8').replace(
          'path: schemas/team-flow',
          `path: ${unsafePath}`
        )
      );
      await expect(syncRemoteSchemas(projectRoot, { globalDataDir })).rejects.toThrow(
        /Invalid schema bundle path/
      );
      expect(readSchemaLock(projectRoot)).toBeNull();
    }
  );
});
