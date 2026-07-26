import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSchemaCommand } from '../../src/commands/schema.js';

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
      source: 'project',
      shadows: [
        {
          source: 'remote',
          requestedRef: 'main',
          resolvedCommit: expect.stringMatching(/^[0-9a-f]{40}$/),
        },
      ],
    });
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
