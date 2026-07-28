import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { runCLI } from '../helpers/run-cli.js';

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

function createRemote(root: string, name: string): string {
  const repo = path.join(root, `${name}-remote`);
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
  fs.writeFileSync(path.join(schemaDir, 'templates', 'proposal.md'), '# Proposal\n');
  git(repo, 'init', '-b', 'main');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-m', name);
  return repo;
}

describe('remote schema synchronization across CLI processes', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reclaims an abandoned ticket while concurrent named sync processes preserve both entries', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-sync-processes-'));
    const projectRoot = path.join(tempDir, 'consumer');
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    const alphaRepo = createRemote(tempDir, 'alpha-flow');
    const betaRepo = createRemote(tempDir, 'beta-flow');
    fs.writeFileSync(
      path.join(projectRoot, 'openspec', 'config.yaml'),
      `schema: spec-driven
schemaSources:
  alpha-flow:
    git: ${pathToFileURL(alphaRepo).href}
    ref: main
    path: schemas/alpha-flow
  beta-flow:
    git: ${pathToFileURL(betaRepo).href}
    ref: main
    path: schemas/beta-flow
`
    );
    const env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPENSPEC_TELEMETRY: '0',
    };
    const staleLock = path.join(
      projectRoot,
      'openspec',
      '.schemas.lock'
    );
    fs.mkdirSync(staleLock);
    fs.writeFileSync(
      path.join(staleLock, 'claim-abandoned.ticket.json'),
      JSON.stringify({
        token: 'abandoned',
        pid: 2_147_483_647,
        hostname: os.hostname(),
        startedAt: new Date().toISOString(),
        number: 1,
      })
    );

    const [alpha, beta] = await Promise.all([
      runCLI(['schema', 'sync', 'alpha-flow', '--json'], {
        cwd: projectRoot,
        env,
      }),
      runCLI(['schema', 'sync', 'beta-flow', '--json'], {
        cwd: projectRoot,
        env,
      }),
    ]);

    expect(alpha.exitCode).toBe(0);
    expect(beta.exitCode).toBe(0);
    const lock = parseYaml(
      fs.readFileSync(
        path.join(projectRoot, 'openspec', 'schemas.lock.yaml'),
        'utf8'
      )
    ) as { schemas: Record<string, unknown> };
    expect(Object.keys(lock.schemas).sort()).toEqual([
      'alpha-flow',
      'beta-flow',
    ]);
  });
});
