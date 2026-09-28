import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createOpenSpecRoot, writeSpec } from '../helpers/openspec-fixtures.js';
import { snapshotDirectory as snapshot } from '../helpers/fs-snapshot.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';
import { isolatedGitEnv } from '../helpers/store-git.js';

describe('openspec doctor (3.6)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;
  let storeRoot: string;

  beforeEach(async () => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-doctor-')));
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });

    storeRoot = path.join(tempDir, 'team-context');
    createOpenSpecRoot(storeRoot);
    await registerStore({ id: 'team-context', localPath: storeRoot, globalDataDir });
  });

  afterEach(() => {
    cleanupTempPath(tempDir);
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  // Git-backed store with one base commit, isolated from host gitconfig.
  // Returns the git runner and the base branch name for upstream setup.
  async function initGitStore() {
    const { execFileSync } = await import('node:child_process');
    const gitEnv = { ...process.env, ...isolatedGitEnv(tempDir) };
    const git = (args: string[]) =>
      execFileSync('git', args, { cwd: storeRoot, env: gitEnv, stdio: 'ignore' });
    git(['init']);
    git(['add', '-A']);
    git(['commit', '-m', 'base']);
    const head = execFileSync('git', ['branch', '--show-current'], { cwd: storeRoot, env: gitEnv })
      .toString()
      .trim();
    return { git, head };
  }

  it('reports ok everywhere for a healthy store-backed root, all session shapes', async () => {
    // A resolvable reference.
    const upstream = path.join(tempDir, 'upstream-context');
    createOpenSpecRoot(upstream);
    writeSpec(upstream, 'rules', '## Purpose\n\nRules.\n');
    await registerStore({ id: 'upstream-context', localPath: upstream, globalDataDir });
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - upstream-context\n'
    );

    // Explicit --store session.
    const flagged = await runCLI(['doctor', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    expect(flagged.exitCode).toBe(0);
    const health = parseJson(flagged);
    expect(health.root).toEqual({
      path: storeRoot,
      source: 'store',
      store_id: 'team-context',
      healthy: true,
      status: [],
    });
    expect(health.store).toEqual({
      id: 'team-context',
      metadata: { present: true, valid: true },
      status: [],
    });
    expect(health.references).toEqual([
      { store_id: 'upstream-context', root: upstream, status: [] },
    ]);
    expect('specs' in health.references[0]).toBe(false);
    expect(health.status).toEqual([]);

    // Banner on stderr in human mode; sections in the transcript voice.
    const human = await runCLI(['doctor', '--store', 'team-context'], { cwd: tempDir, env });
    expect(human.exitCode).toBe(0);
    expect(human.stderr).toContain('Using OpenSpec root: team-context');
    expect(human.stdout).toContain('Root');
    expect(human.stdout).toContain('  Store: team-context (metadata ok)');
    expect(human.stdout).toContain(`  - upstream-context: ok (${upstream})`);

    // Nearest-root session.
    const nearest = await runCLI(['doctor', '--json'], { cwd: storeRoot, env });
    expect(parseJson(nearest).root.source).toBe('nearest');

    // Declared-pointer session.
    const pointerRepo = mkdir('app-repo');
    fs.mkdirSync(path.join(pointerRepo, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(pointerRepo, 'openspec', 'config.yaml'), 'store: team-context\n');
    const declared = await runCLI(['doctor', '--json'], { cwd: pointerRepo, env });
    expect(parseJson(declared).root.source).toBe('declared');
    expect(parseJson(declared).store.id).toBe('team-context');

    // Global-default session: no root, no pointer — provenance must name
    // the machine-level default, not masquerade as a repo pointer.
    fs.mkdirSync(path.join(tempDir, 'config', 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'config', 'openspec', 'config.json'),
      JSON.stringify({ defaultStore: 'team-context' }) + '\n'
    );
    const fallback = await runCLI(['doctor', '--json'], { cwd: mkdir('no-root-here'), env });
    const fallbackHealth = parseJson(fallback);
    expect(fallbackHealth.root.source).toBe('global_default');
    expect(fallbackHealth.root.store_id).toBe('team-context');
    expect(fallbackHealth.store.id).toBe('team-context');
  }, 30_000);

  it('renders none-declared sections distinguishably', async () => {
    const result = await runCLI(['doctor', '--store', 'team-context'], { cwd: tempDir, env });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('References\n  (none declared)');
    const json = await runCLI(['doctor', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    expect(parseJson(json).references).toEqual([]);
  });

  it('shows broken relationships with pasteable fixes at exit 0', async () => {
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\n' +
        'references:\n  - { id: design-system, remote: https://192.0.2.1/ds.git }\n'
    );

    const result = await runCLI(['doctor', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(0);
    const health = parseJson(result);
    expect(health.references[0].status[0]).toEqual(
      expect.objectContaining({
        code: 'reference_unresolved',
        fix: expect.stringContaining('git clone -- https://192.0.2.1/ds.git'),
      })
    );

    const human = await runCLI(['doctor', '--store', 'team-context'], { cwd: tempDir, env });
    expect(human.stdout).toContain('Fix: git clone --');
  });

  it('distinguishes an empty registry from an unreadable one', async () => {
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - ghost-context\n'
    );

    // Corrupt registry: top-level cause + per-reference blast radius.
    const registryPath = path.join(globalDataDir, 'stores', 'registry.yaml');
    const original = fs.readFileSync(registryPath, 'utf-8');
    fs.writeFileSync(registryPath, ':[ broken');
    const corrupt = await runCLI(['doctor', '--json'], { cwd: storeRoot, env });
    const corruptHealth = parseJson(corrupt);
    expect(corruptHealth.status[0].code).toBe('relationship_registry_unreadable');
    expect(corruptHealth.references[0].status[0].code).toBe('reference_registry_unreadable');
    fs.writeFileSync(registryPath, original);

    // Empty-but-readable registry: unresolved references.
    fs.rmSync(registryPath);
    const empty = await runCLI(['doctor', '--json'], { cwd: storeRoot, env });
    const emptyHealth = parseJson(empty);
    expect(emptyHealth.status).toEqual([]);
    expect(emptyHealth.references[0].status[0].code).toBe('reference_unresolved');
  });

  it('surfaces both-shapes and inert-pointer wrong turns', async () => {
    // Both shapes: a real root whose config declares a pointer.
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nstore: team-context\n'
    );
    const bothShapes = await runCLI(['doctor', '--json'], { cwd: storeRoot, env });
    expect(parseJson(bothShapes).status[0]).toEqual(
      expect.objectContaining({ code: 'root_pointer_ignored' })
    );
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n');

    // Inert pointer declarations, including from a subdirectory.
    const pointerRepo = mkdir('app-repo');
    fs.mkdirSync(path.join(pointerRepo, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(pointerRepo, 'openspec', 'config.yaml'),
      'store: team-context\nreferences:\n  - wrong-context\n'
    );
    const subdir = mkdir('app-repo/packages/api');
    const inert = await runCLI(['doctor', '--json'], { cwd: subdir, env });
    const entry = parseJson(inert).status.find(
      (item: any) => item.code === 'pointer_declarations_inert'
    );
    expect(entry).toBeDefined();
    expect(entry.message).toContain('references');
  });

  it('notes remote divergence as info in the store section', async () => {
    fs.writeFileSync(
      path.join(storeRoot, '.openspec-store', 'store.yaml'),
      'version: 1\nid: team-context\nremote: https://192.0.2.1/canon.git\n'
    );
    const { execFileSync } = await import('node:child_process');
    execFileSync('git', ['init'], { cwd: storeRoot });
    execFileSync('git', ['remote', 'add', 'origin', 'https://192.0.2.2/fork.git'], {
      cwd: storeRoot,
    });

    const result = await runCLI(['doctor', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    const store = parseJson(result).store;
    expect(store.metadata.remote).toBe('https://192.0.2.1/canon.git');
    expect(store.origin_url).toBe('https://192.0.2.2/fork.git');
    expect(store.status[0]).toEqual(
      expect.objectContaining({ severity: 'info', code: 'store_remote_divergence' })
    );
    expect(result.exitCode).toBe(0);
  });

  it('notes an upstream-behind store checkout as info drift', async () => {
    const { git, head } = await initGitStore();

    // A tracking branch that advances one commit past HEAD, then set it as
    // HEAD's upstream — HEAD is now one commit behind, no network involved.
    git(['branch', 'tracking']);
    git(['checkout', 'tracking']);
    fs.writeFileSync(path.join(storeRoot, 'ahead.txt'), 'newer\n');
    git(['add', '-A']);
    git(['commit', '-m', 'advance upstream']);
    git(['checkout', head]);
    git(['branch', `--set-upstream-to=tracking`, head]);

    const result = await runCLI(['doctor', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(0);
    const store = parseJson(result).store;
    expect(store.drift).toEqual({ ahead: 0, behind: 1 });
    expect(store.status[0]).toEqual(
      expect.objectContaining({ severity: 'info', code: 'store_checkout_drift' })
    );
    expect(store.status[0].message).toContain('1 commit behind its upstream tracking branch');

    const human = await runCLI(['doctor', '--store', 'team-context'], { cwd: tempDir, env });
    expect(human.stdout).toContain('behind its upstream tracking branch');
  });

  it('reports diverged drift when the checkout is both ahead and behind', async () => {
    const { git, head } = await initGitStore();

    // Upstream advances one commit; HEAD then adds its own — the two have
    // diverged (1 behind, 1 ahead) off a common base.
    git(['branch', 'tracking']);
    git(['checkout', 'tracking']);
    fs.writeFileSync(path.join(storeRoot, 'upstream.txt'), 'theirs\n');
    git(['add', '-A']);
    git(['commit', '-m', 'advance upstream']);
    git(['checkout', head]);
    git(['branch', `--set-upstream-to=tracking`, head]);
    fs.writeFileSync(path.join(storeRoot, 'local.txt'), 'mine\n');
    git(['add', '-A']);
    git(['commit', '-m', 'local work']);

    const result = await runCLI(['doctor', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(0);
    const store = parseJson(result).store;
    expect(store.drift).toEqual({ ahead: 1, behind: 1 });
    expect(store.status[0]).toEqual(
      expect.objectContaining({ severity: 'info', code: 'store_checkout_drift' })
    );
    expect(store.status[0].message).toContain('diverged');
    expect(store.status[0].message).toContain('1 behind, 1 ahead');
  });

  it('reports no drift for a store checkout with no upstream tracking branch', async () => {
    await initGitStore();

    const result = await runCLI(['doctor', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(0);
    const store = parseJson(result).store;
    expect('drift' in store).toBe(false);
    expect(store.status).toEqual([]);
  });

  it('fails with the null-shape payload on command failures', async () => {
    const unknown = await runCLI(['doctor', '--json', '--store', 'missing-store'], {
      cwd: tempDir,
      env,
    });
    expect(unknown.exitCode).toBe(1);
    const payload = parseJson(unknown);
    expect(payload.root).toBeNull();
    expect(payload.store).toBeNull();
    expect(payload.references).toEqual([]);
    expect(payload.status[0].code).toBe('unknown_store');

    const bare = mkdir('bare-dir');
    const noRoot = await runCLI(['doctor', '--json'], { cwd: bare, env });
    expect(noRoot.exitCode).toBe(1);
    expect(parseJson(noRoot).root).toBeNull();
  });

  it('prints taxonomy errors in human mode instead of stack traces', async () => {
    const bare = mkdir('bare-dir-human');
    const result = await runCLI(['doctor'], { cwd: bare, env });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error: No OpenSpec root found');
    expect(result.stderr).not.toContain('at ');
  });

  it('distinguishes self-reference omission from none declared', async () => {
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - team-context\n'
    );
    const result = await runCLI(['doctor', '--store', 'team-context'], { cwd: tempDir, env });
    expect(result.stdout).toContain('(declared references all resolve to this root)');
    expect(result.stdout).not.toContain('References\n  (none declared)');
  });

  it('surfaces a malformed pointer on a real root', async () => {
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nstore: [broken]\n'
    );
    const result = await runCLI(['doctor', '--json'], { cwd: storeRoot, env });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).status[0]).toEqual(
      expect.objectContaining({ code: 'root_pointer_invalid' })
    );
  });

  it('is read-only and changes nothing elsewhere', async () => {
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    const rootBefore = snapshot(storeRoot);
    const dataBefore = snapshot(path.join(tempDir, 'data'));

    const listBefore = await runCLI(['list', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    await runCLI(['doctor', '--json', '--store', 'team-context'], { cwd: tempDir, env });
    const listAfter = await runCLI(['list', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });

    expect(snapshot(storeRoot)).toEqual(rootBefore);
    expect(snapshot(path.join(tempDir, 'data'))).toEqual(dataBefore);
    expect(listAfter.stdout).toBe(listBefore.stdout);
  });
});
