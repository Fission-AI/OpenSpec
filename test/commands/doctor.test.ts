import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createOpenSpecRoot, writeSpec } from '../helpers/openspec-fixtures.js';
import { snapshotDirectory as snapshot } from '../helpers/fs-snapshot.js';

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
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  it('reports ok everywhere for a healthy store-backed root, all session shapes', async () => {
    // A resolvable reference + a mapped target.
    const upstream = path.join(tempDir, 'upstream-context');
    createOpenSpecRoot(upstream);
    writeSpec(upstream, 'rules', '## Purpose\n\nRules.\n');
    await registerStore({ id: 'upstream-context', localPath: upstream, globalDataDir });
    const apiDir = mkdir('src/api-server');
    await runCLI(['repo', 'register', apiDir, '--json'], { cwd: tempDir, env });
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - upstream-context\ntargets:\n  - api-server\n'
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
    expect(health.targets).toEqual([{ id: 'api-server', path: apiDir, status: [] }]);
    expect(health.status).toEqual([]);

    // Banner on stderr in human mode; sections in the transcript voice.
    const human = await runCLI(['doctor', '--store', 'team-context'], { cwd: tempDir, env });
    expect(human.exitCode).toBe(0);
    expect(human.stderr).toContain('Using OpenSpec root: team-context');
    expect(human.stdout).toContain('Root');
    expect(human.stdout).toContain('  Store: team-context (metadata ok)');
    expect(human.stdout).toContain(`  - upstream-context: ok (${upstream})`);
    expect(human.stdout).toContain(`  - api-server: mapped (${apiDir})`);

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
  });

  it('renders none-declared sections distinguishably', async () => {
    const result = await runCLI(['doctor', '--store', 'team-context'], { cwd: tempDir, env });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('References\n  (none declared)');
    expect(result.stdout).toContain('Targets\n  (none declared)');
    const json = await runCLI(['doctor', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    expect(parseJson(json).references).toEqual([]);
    expect(parseJson(json).targets).toEqual([]);
  });

  it('shows broken relationships with pasteable fixes at exit 0', async () => {
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\n' +
        'references:\n  - { id: design-system, remote: https://192.0.2.1/ds.git }\n' +
        'targets:\n  - web-app\n'
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
    expect(health.targets[0].status[0]).toEqual(
      expect.objectContaining({
        code: 'target_unmapped',
        fix: 'Run: openspec repo register <path> --id web-app',
      })
    );

    const human = await runCLI(['doctor', '--store', 'team-context'], { cwd: tempDir, env });
    expect(human.stdout).toContain('Fix: git clone --');
    expect(human.stdout).toContain('Fix: Run: openspec repo register <path> --id web-app');
  });

  it('distinguishes an empty registry from an unreadable one', async () => {
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - ghost-context\ntargets:\n  - web-app\n'
    );

    // Corrupt registry: top-level cause + per-reference blast radius +
    // bare targets (no wrong register fix).
    const registryPath = path.join(globalDataDir, 'stores', 'registry.yaml');
    const original = fs.readFileSync(registryPath, 'utf-8');
    fs.writeFileSync(registryPath, ':[ broken');
    const corrupt = await runCLI(['doctor', '--json'], { cwd: storeRoot, env });
    const corruptHealth = parseJson(corrupt);
    expect(corruptHealth.status[0].code).toBe('relationship_registry_unreadable');
    expect(corruptHealth.references[0].status[0].code).toBe('reference_registry_unreadable');
    expect(corruptHealth.targets).toEqual([{ id: 'web-app', status: [] }]);
    fs.writeFileSync(registryPath, original);

    // Empty-but-readable registry: unresolved references, unmapped targets.
    fs.rmSync(registryPath);
    const empty = await runCLI(['doctor', '--json'], { cwd: storeRoot, env });
    const emptyHealth = parseJson(empty);
    expect(emptyHealth.status).toEqual([]);
    expect(emptyHealth.references[0].status[0].code).toBe('reference_unresolved');
    expect(emptyHealth.targets[0].status[0].code).toBe('target_unmapped');
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
      'store: team-context\ntargets:\n  - wrong-repo\n'
    );
    const subdir = mkdir('app-repo/packages/api');
    const inert = await runCLI(['doctor', '--json'], { cwd: subdir, env });
    const entry = parseJson(inert).status.find(
      (item: any) => item.code === 'pointer_declarations_inert'
    );
    expect(entry).toBeDefined();
    expect(entry.message).toContain('targets');
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

  it('fails with the null-shape payload on command failures', async () => {
    const repoDir = mkdir('src/api-server');
    await runCLI(['repo', 'register', repoDir, '--json'], { cwd: tempDir, env });

    const asRepo = await runCLI(['doctor', '--json', '--store', 'api-server'], {
      cwd: tempDir,
      env,
    });
    expect(asRepo.exitCode).toBe(1);
    const payload = parseJson(asRepo);
    expect(payload.root).toBeNull();
    expect(payload.store).toBeNull();
    expect(payload.references).toEqual([]);
    expect(payload.targets).toEqual([]);
    expect(payload.status[0].code).toBe('store_id_is_repo');

    const bare = mkdir('bare-dir');
    const noRoot = await runCLI(['doctor', '--json'], { cwd: bare, env });
    expect(noRoot.exitCode).toBe(1);
    expect(parseJson(noRoot).root).toBeNull();
  });

  it('is read-only and changes nothing elsewhere', async () => {
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\ntargets:\n  - web-app\n'
    );
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
