import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getSchemaDir,
  listSchemas,
  listSchemasWithInfo,
} from '../../../src/core/artifact-graph/resolver.js';
import { computeBundleIntegrity } from '../../../src/core/remote-schema/bundle.js';
import { installRemoteSchemaCache } from '../../../src/core/remote-schema/cache.js';
import { writeSchemaLock } from '../../../src/core/remote-schema/lockfile.js';

function writeSchema(dir: string, name: string, marker: string): void {
  fs.mkdirSync(path.join(dir, 'templates'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'schema.yaml'),
    `name: ${name}
version: 1
description: ${marker}
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
    requires: []
`
  );
  fs.writeFileSync(path.join(dir, 'templates', 'proposal.md'), `# ${marker}\n`);
}

describe('remote schema resolver', () => {
  let tempDir: string;
  let projectRoot: string;
  let originalEnv: NodeJS.ProcessEnv;
  let integrity: string;
  let cacheDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-remote-resolver-'));
    projectRoot = path.join(tempDir, 'project');
    originalEnv = { ...process.env };
    process.env.XDG_DATA_HOME = path.join(tempDir, 'data');
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, 'openspec', 'config.yaml'),
      `schema: team-flow
schemaSources:
  team-flow:
    git: https://example.test/team.git
    ref: main
    path: schemas/team-flow
`
    );
    const source = path.join(tempDir, 'bundle');
    writeSchema(source, 'team-flow', 'remote');
    integrity = computeBundleIntegrity(source).integrity;
    cacheDir = installRemoteSchemaCache(source, integrity);
    writeSchemaLock(projectRoot, {
      version: 1,
      schemas: {
        'team-flow': {
          git: 'https://example.test/team.git',
          requestedRef: 'main',
          resolvedCommit: 'a'.repeat(40),
          bundlePath: 'schemas/team-flow',
          integrity,
        },
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves project-local, remote, user, then package priority', () => {
    const user = path.join(process.env.XDG_DATA_HOME!, 'openspec', 'schemas', 'team-flow');
    writeSchema(user, 'team-flow', 'user');
    expect(getSchemaDir('team-flow', projectRoot)).toBe(cacheDir);

    const local = path.join(projectRoot, 'openspec', 'schemas', 'team-flow');
    writeSchema(local, 'team-flow', 'project');
    expect(getSchemaDir('team-flow', projectRoot)).toBe(local);
    expect(getSchemaDir('team-flow')).toBe(user);
    expect(getSchemaDir('spec-driven', projectRoot)).toContain(
      path.join('schemas', 'spec-driven')
    );
  });

  it.each([
    ['missing lock', () => fs.rmSync(path.join(projectRoot, 'openspec', 'schemas.lock.yaml'))],
    ['missing cache', () => fs.rmSync(cacheDir, { recursive: true })],
    [
      'digest mismatch',
      () => fs.appendFileSync(path.join(cacheDir, 'templates', 'proposal.md'), 'tampered'),
    ],
  ])('fails closed on %s instead of using a same-named user schema', (_name, breakState) => {
    const user = path.join(process.env.XDG_DATA_HOME!, 'openspec', 'schemas', 'team-flow');
    writeSchema(user, 'team-flow', 'user');
    breakState();
    expect(() => getSchemaDir('team-flow', projectRoot)).toThrow(
      /openspec schema sync/
    );
  });

  it('fails closed when config and lock source metadata drift', () => {
    const configPath = path.join(projectRoot, 'openspec', 'config.yaml');
    fs.writeFileSync(
      configPath,
      fs.readFileSync(configPath, 'utf8').replace('ref: main', 'ref: next')
    );
    expect(() => getSchemaDir('team-flow', projectRoot)).toThrow(
      /does not match.*schema sync/
    );
  });

  it('discovers a locked remote schema and reports its source once', () => {
    expect(listSchemas(projectRoot).filter((name) => name === 'team-flow')).toEqual([
      'team-flow',
    ]);
    expect(listSchemasWithInfo(projectRoot)).toContainEqual({
      name: 'team-flow',
      description: 'remote',
      artifacts: ['proposal'],
      source: 'remote',
    });
  });

  it('reports an unsynchronized declaration as unavailable', () => {
    fs.rmSync(path.join(projectRoot, 'openspec', 'schemas.lock.yaml'));
    expect(listSchemasWithInfo(projectRoot)).toContainEqual({
      name: 'team-flow',
      description: '',
      artifacts: [],
      source: 'remote',
      available: false,
      error: expect.stringMatching(/schema sync/),
    });
  });
});
