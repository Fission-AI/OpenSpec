import { execFileSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchSchemaBundleFromGit } from '../../../src/core/remote-schema/git.js';

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

function writeSchema(repo: string, marker: string): void {
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
  fs.writeFileSync(path.join(schemaDir, 'templates', 'proposal.md'), `# ${marker}\n`);
}

describe('fetchSchemaBundleFromGit', () => {
  let tempDir: string;
  let remoteRepo: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-git-'));
    remoteRepo = path.join(tempDir, 'remote repo');
    fs.mkdirSync(remoteRepo);
    git(remoteRepo, 'init', '-b', 'main');
    writeSchema(remoteRepo, 'Version One');
    git(remoteRepo, 'add', '-A');
    git(remoteRepo, 'commit', '-m', 'version one');
    git(remoteRepo, 'tag', '-a', 'v1.0.0', '-m', 'version one');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves a branch to its immutable commit and extracts only the selected tracked tree', async () => {
    const destinationDir = path.join(tempDir, 'bundle');
    const expectedCommit = git(remoteRepo, 'rev-parse', 'HEAD');

    const result = await fetchSchemaBundleFromGit({
      git: pathToFileURL(remoteRepo).href,
      requestedRef: 'main',
      bundlePath: 'schemas/team-flow',
      destinationDir,
    });

    expect(result.resolvedCommit).toBe(expectedCommit);
    expect(result.fileCount).toBe(2);
    expect(result.integrity).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(fs.readFileSync(path.join(destinationDir, 'templates', 'proposal.md'), 'utf8')).toBe(
      '# Version One\n'
    );
    expect(fs.existsSync(path.join(destinationDir, '.git'))).toBe(false);
  });

  it('resolves annotated tags and restores an exact locked commit after the branch advances', async () => {
    const firstCommit = git(remoteRepo, 'rev-parse', 'HEAD');
    const tagged = await fetchSchemaBundleFromGit({
      git: pathToFileURL(remoteRepo).href,
      requestedRef: 'v1.0.0',
      bundlePath: 'schemas/team-flow',
      destinationDir: path.join(tempDir, 'tagged'),
    });
    expect(tagged.resolvedCommit).toBe(firstCommit);

    writeSchema(remoteRepo, 'Version Two');
    git(remoteRepo, 'add', '-A');
    git(remoteRepo, 'commit', '-m', 'version two');

    const restored = await fetchSchemaBundleFromGit({
      git: pathToFileURL(remoteRepo).href,
      requestedRef: 'main',
      lockedCommit: firstCommit,
      bundlePath: 'schemas/team-flow',
      destinationDir: path.join(tempDir, 'restored'),
    });
    expect(restored.resolvedCommit).toBe(firstCommit);
    expect(
      fs.readFileSync(path.join(tempDir, 'restored', 'templates', 'proposal.md'), 'utf8')
    ).toBe('# Version One\n');
  });

  it('resolves a lightweight tag to its commit', async () => {
    const expectedCommit = git(remoteRepo, 'rev-parse', 'HEAD');
    git(remoteRepo, 'tag', 'latest-schema');
    const result = await fetchSchemaBundleFromGit({
      git: pathToFileURL(remoteRepo).href,
      requestedRef: 'latest-schema',
      bundlePath: 'schemas/team-flow',
      destinationDir: path.join(tempDir, 'lightweight'),
    });
    expect(result.resolvedCommit).toBe(expectedCommit);
  });

  it('rejects a locked commit that is not reachable from the requested ref', async () => {
    const mainCommit = git(remoteRepo, 'rev-parse', 'HEAD');
    git(remoteRepo, 'checkout', '-b', 'other');
    writeSchema(remoteRepo, 'Other Branch');
    git(remoteRepo, 'add', '-A');
    git(remoteRepo, 'commit', '-m', 'other branch');
    const otherCommit = git(remoteRepo, 'rev-parse', 'HEAD');
    git(remoteRepo, 'checkout', 'main');
    expect(otherCommit).not.toBe(mainCommit);

    await expect(
      fetchSchemaBundleFromGit({
        git: pathToFileURL(remoteRepo).href,
        requestedRef: 'main',
        lockedCommit: otherCommit,
        bundlePath: 'schemas/team-flow',
        destinationDir: path.join(tempDir, 'unreachable'),
      })
    ).rejects.toThrow(/locked commit verification/i);
  });

  it('rejects a tracked symbolic link without reading its target', async () => {
    const secret = path.join(tempDir, 'secret.txt');
    fs.writeFileSync(secret, 'never-copy');
    const link = path.join(remoteRepo, 'schemas', 'team-flow', 'templates', 'linked.md');
    try {
      fs.symlinkSync(secret, link, 'file');
    } catch {
      return;
    }
    git(remoteRepo, 'add', '-A');
    git(remoteRepo, 'commit', '-m', 'malicious symlink');

    await expect(
      fetchSchemaBundleFromGit({
        git: pathToFileURL(remoteRepo).href,
        requestedRef: 'main',
        bundlePath: 'schemas/team-flow',
        destinationDir: path.join(tempDir, 'unsafe'),
      })
    ).rejects.toThrow(/symbolic link/);
    expect(fs.existsSync(path.join(tempDir, 'unsafe', 'templates', 'linked.md'))).toBe(false);
  });

  it('rejects a Git submodule entry in the selected bundle', async () => {
    const nested = path.join(tempDir, 'nested');
    fs.mkdirSync(nested);
    git(nested, 'init', '-b', 'main');
    fs.writeFileSync(path.join(nested, 'README.md'), 'nested\n');
    git(nested, 'add', '-A');
    git(nested, 'commit', '-m', 'nested');
    execFileSync(
      'git',
      [
        '-c',
        'protocol.file.allow=always',
        'submodule',
        'add',
        pathToFileURL(nested).href,
        'schemas/team-flow/vendor',
      ],
      { cwd: remoteRepo, env: gitEnv, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    git(remoteRepo, 'commit', '-am', 'submodule');

    await expect(
      fetchSchemaBundleFromGit({
        git: pathToFileURL(remoteRepo).href,
        requestedRef: 'main',
        bundlePath: 'schemas/team-flow',
        destinationDir: path.join(tempDir, 'submodule'),
      })
    ).rejects.toThrow(/submodule/);
  });

  it('rejects a bundle larger than the byte limit', async () => {
    fs.writeFileSync(
      path.join(remoteRepo, 'schemas', 'team-flow', 'templates', 'oversized.bin'),
      Buffer.alloc(10 * 1024 * 1024 + 1)
    );
    git(remoteRepo, 'add', '-A');
    git(remoteRepo, 'commit', '-m', 'oversized');

    await expect(
      fetchSchemaBundleFromGit({
        git: pathToFileURL(remoteRepo).href,
        requestedRef: 'main',
        bundlePath: 'schemas/team-flow',
        destinationDir: path.join(tempDir, 'oversized'),
      })
    ).rejects.toThrow(/more than 10485760 bytes/);
  });

  it('does not expose a credential-bearing source or untrusted Git stderr', async () => {
    const secret = 'super-secret-token';
    await expect(
      fetchSchemaBundleFromGit({
        git: `https://oauth2:${secret}@127.0.0.1:1/private.git`,
        requestedRef: 'main',
        bundlePath: 'schemas/team-flow',
        destinationDir: path.join(tempDir, 'auth-failure'),
        timeoutMs: 2_000,
      })
    ).rejects.not.toThrow(new RegExp(secret));
  });

  it('rejects option-like refs before invoking Git fetch', async () => {
    await expect(
      fetchSchemaBundleFromGit({
        git: pathToFileURL(remoteRepo).href,
        requestedRef: '--upload-pack=malicious',
        bundlePath: 'schemas/team-flow',
        destinationDir: path.join(tempDir, 'option-ref'),
      })
    ).rejects.toThrow(/Invalid remote schema ref/);
  });
});
