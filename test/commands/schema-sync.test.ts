import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSchemaCommand } from '../../src/commands/schema.js';
import { schemasCommand } from '../../src/commands/workflow/schemas.js';

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'OpenSpec Test',
  GIT_AUTHOR_EMAIL: 'openspec@example.test',
  GIT_COMMITTER_NAME: 'OpenSpec Test',
  GIT_COMMITTER_EMAIL: 'openspec@example.test',
};

function git(cwd: string, ...args: string[]): void {
  execFileSync('git', args, {
    cwd,
    env: gitEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerSchemaCommand(program);
  return program;
}

describe('schema sync command', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-sync-cli-'));
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    process.chdir(tempDir);
    process.env.XDG_DATA_HOME = path.join(tempDir, 'data');
    process.exitCode = undefined;
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    process.chdir(originalCwd);
    process.env = originalEnv;
    process.exitCode = undefined;
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('emits exactly one JSON document and a failure exit code', async () => {
    fs.writeFileSync(path.join(tempDir, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await createProgram().parseAsync(['node', 'openspec', 'schema', 'sync', '--json']);

    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      synced: false,
      error: expect.stringMatching(/No remote schema sources/),
    });
    expect(process.exitCode).toBe(1);
  });

  it('reports a structured code when another process owns the sync lock', async () => {
    const lockDir = path.join(tempDir, 'openspec', '.schemas.lock');
    fs.mkdirSync(lockDir);
    fs.writeFileSync(
      path.join(lockDir, 'claim-busy.ticket.json'),
      JSON.stringify({
        token: 'busy',
        pid: process.pid,
        hostname: os.hostname(),
        startedAt: new Date().toISOString(),
        number: 1,
      })
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();

    const command = createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'sync',
      '--json',
    ]);
    await vi.advanceTimersByTimeAsync(30_100);
    await command;

    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      synced: false,
      status: [{ code: 'schema_sync_locked' }],
    });
    expect(process.exitCode).toBe(1);
    vi.useRealTimers();
  });

  it('emits JSON when schema which is missing its name', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'which',
      '--json',
    ]);

    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      name: null,
      status: [{ code: 'schema_name_required' }],
    });
    expect(process.exitCode).toBe(1);
  });

  it('reports every semantic and template validation failure in JSON output', async () => {
    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'broken-flow');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      `name: broken-flow
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: missing-proposal.md
    requires: [missing-proposal-dependency]
  - id: design
    generates: design.md
    description: Design
    template: missing-design.md
    requires: [missing-design-dependency]
`
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'validate',
      'broken-flow',
      '--json',
    ]);

    const output = JSON.parse(String(log.mock.calls[0][0]));
    expect(output.valid).toBe(false);
    expect(output.issues.map((issue: { message: string }) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('missing-proposal-dependency'),
        expect.stringContaining('missing-design-dependency'),
        expect.stringContaining('missing-proposal.md'),
        expect.stringContaining('missing-design.md'),
      ])
    );
    expect(output.issues).toHaveLength(4);
  });

  it('syncs a named local Git source with JSON output', async () => {
    const repo = path.join(tempDir, 'remote');
    const schemaDir = path.join(repo, 'schemas', 'team-flow');
    fs.mkdirSync(path.join(schemaDir, 'templates'), { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      `name: team-flow
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
    requires: []
`
    );
    fs.writeFileSync(path.join(schemaDir, 'templates', 'proposal.md'), '# Proposal\n');
    git(repo, 'init', '-b', 'main');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-m', 'schema');
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: team-flow
schemaSources:
  team-flow:
    git: ${pathToFileURL(repo).href}
    ref: main
    path: schemas/team-flow
`
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'sync',
      'team-flow',
      '--json',
    ]);

    expect(log).toHaveBeenCalledTimes(1);
    const output = JSON.parse(String(log.mock.calls[0][0]));
    expect(output).toMatchObject({
      synced: true,
      locked: false,
      schemas: [{ name: 'team-flow', resolvedCommit: expect.stringMatching(/^[0-9a-f]{40}$/) }],
    });
    expect(process.exitCode).toBeUndefined();
    expect(fs.existsSync(path.join(tempDir, 'openspec', 'schemas.lock.yaml'))).toBe(true);

    log.mockClear();
    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'sync',
      '--locked',
    ]);
    expect(String(log.mock.calls[0][0])).toMatch(
      /Verified 'team-flow': main → [0-9a-f]{40}/
    );

    log.mockClear();
    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'sync',
      'not-declared',
      '--json',
    ]);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      synced: false,
      error: expect.stringMatching(/not declared/),
    });
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;

    log.mockClear();
    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'which',
      'team-flow',
      '--json',
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      name: 'team-flow',
      source: 'remote',
      requestedRef: 'main',
      resolvedCommit: expect.stringMatching(/^[0-9a-f]{40}$/),
      bundlePath: 'schemas/team-flow',
      integrity: expect.stringMatching(/^sha256:/),
    });

    const localSchema = path.join(tempDir, 'openspec', 'schemas', 'team-flow');
    fs.cpSync(schemaDir, localSchema, { recursive: true });
    log.mockClear();
    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'which',
      'team-flow',
      '--json',
    ]);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      name: 'team-flow',
      available: false,
      source: 'remote',
      path: null,
      status: [
        {
          code: 'schema_name_conflict',
          message: expect.stringMatching(/project-local schema.*conflicts/i),
        },
      ],
    });
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;

    log.mockClear();
    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'sync',
      'team-flow',
      '--json',
    ]);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      synced: false,
      status: [
        expect.objectContaining({
          code: 'schema_name_conflict',
        }),
      ],
    });
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });

  it('preserves every remote validation issue path in sync JSON output', async () => {
    const repo = path.join(tempDir, 'invalid-remote');
    const schemaDir = path.join(repo, 'schemas', 'broken-flow');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      `name: wrong-name
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: missing-proposal.md
    requires: []
  - id: design
    generates: design.md
    description: Design
    template: missing-design.md
    requires: []
`
    );
    git(repo, 'init', '-b', 'main');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-m', 'invalid schema');
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: spec-driven
schemaSources:
  broken-flow:
    git: ${pathToFileURL(repo).href}
    ref: main
    path: schemas/broken-flow
`
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'sync',
      'broken-flow',
      '--json',
    ]);

    const output = JSON.parse(String(log.mock.calls[0][0]));
    expect(output.synced).toBe(false);
    expect(output.status).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'remote_schema_invalid',
          path: 'schema.yaml',
        }),
        expect.objectContaining({
          code: 'remote_schema_invalid',
          path: 'templates',
        }),
        expect.objectContaining({
          code: 'remote_schema_invalid',
          path: 'templates/missing-proposal.md',
        }),
        expect.objectContaining({
          code: 'remote_schema_invalid',
          path: 'templates/missing-design.md',
        }),
      ])
    );
    expect(process.exitCode).toBe(1);
  });

  it('resolves the consumer root when synchronizing from a nested directory', async () => {
    const repo = path.join(tempDir, 'remote-nested');
    const schemaDir = path.join(repo, 'schemas', 'nested-flow');
    fs.mkdirSync(path.join(schemaDir, 'templates'), { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      `name: nested-flow
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
    requires: []
`
    );
    fs.writeFileSync(path.join(schemaDir, 'templates', 'proposal.md'), '# Proposal\n');
    git(repo, 'init', '-b', 'main');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-m', 'schema');
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: nested-flow
store: team-context
schemaSources:
  nested-flow:
    git: ${pathToFileURL(repo).href}
    ref: main
    path: schemas/nested-flow
`
    );
    const nestedDir = path.join(tempDir, 'packages', 'app', 'src');
    fs.mkdirSync(nestedDir, { recursive: true });
    process.chdir(nestedDir);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'sync',
      'nested-flow',
      '--json',
    ]);

    const consumerRoot = fs.realpathSync.native(tempDir);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      synced: true,
      lockfile: path.join(consumerRoot, 'openspec', 'schemas.lock.yaml'),
      schemas: [{ name: 'nested-flow' }],
    });
    expect(fs.existsSync(path.join(tempDir, 'openspec', 'schemas.lock.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(nestedDir, 'openspec', 'schemas.lock.yaml'))).toBe(false);
    expect(process.exitCode).toBeUndefined();

    log.mockClear();
    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'validate',
      'nested-flow',
      '--json',
    ]);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      valid: true,
      name: 'nested-flow',
    });
  });

  it('keeps healthy schemas visible when one declared remote is unsynchronized', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: spec-driven
schemaSources:
  unavailable-flow:
    git: https://example.com/schemas.git
    ref: main
    path: schemas/unavailable-flow
`
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'which',
      '--all',
      '--json',
    ]);

    const output = JSON.parse(String(log.mock.calls[0][0]));
    expect(output).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'spec-driven',
          available: true,
          source: 'package',
        }),
        expect.objectContaining({
          name: 'unavailable-flow',
          available: false,
          source: 'remote',
          path: null,
          status: [
            expect.objectContaining({
              code: 'remote_not_locked',
              message: expect.stringMatching(/schema sync unavailable-flow/),
            }),
          ],
        }),
      ])
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('rejects forking into a name declared by a remote source', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: spec-driven
schemaSources:
  claimed-flow:
    git: https://example.com/schemas.git
    ref: main
    path: schemas/claimed-flow
`
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await createProgram().parseAsync([
      'node',
      'openspec',
      'schema',
      'fork',
      'spec-driven',
      'claimed-flow',
      '--json',
    ]);

    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({
      forked: false,
      code: 'schema_name_conflict',
      error: expect.stringMatching(/claimed-flow/),
    });
    expect(
      fs.existsSync(path.join(tempDir, 'openspec', 'schemas', 'claimed-flow'))
    ).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('preserves conflict codes in schema discovery JSON', async () => {
    const local = path.join(
      tempDir,
      'openspec',
      'schemas',
      'claimed-flow'
    );
    fs.mkdirSync(local, { recursive: true });
    fs.writeFileSync(
      path.join(local, 'schema.yaml'),
      'name: claimed-flow\nversion: 1\nartifacts: []\n'
    );
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: spec-driven
schemaSources:
  claimed-flow:
    git: https://example.com/schemas.git
    ref: main
    path: schemas/claimed-flow
`
    );
    const nested = path.join(tempDir, 'src', 'nested');
    fs.mkdirSync(nested, { recursive: true });
    process.chdir(nested);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await schemasCommand({ json: true });

    expect(JSON.parse(String(log.mock.calls[0][0]))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'claimed-flow',
          available: false,
          status: [
            expect.objectContaining({
              code: 'schema_name_conflict',
            }),
          ],
        }),
      ])
    );
  });

  it('does not leak credentials from a rejected HTTPS declaration', async () => {
    const secret = 'never-print-this-token';
    fs.writeFileSync(
      path.join(tempDir, 'openspec', 'config.yaml'),
      `schema: private-flow
schemaSources:
  private-flow:
    git: https://oauth2:${secret}@github.com/acme/private.git
    ref: main
    path: schemas/private-flow
`
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await createProgram().parseAsync(['node', 'openspec', 'schema', 'sync', '--json']);

    expect(log).toHaveBeenCalledTimes(1);
    expect(
      [...log.mock.calls, ...error.mock.calls, ...warn.mock.calls]
        .flat()
        .map(String)
        .join('\n')
    ).not.toContain(secret);
    expect(process.exitCode).toBe(1);
  });
});
