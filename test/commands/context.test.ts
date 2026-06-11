import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';
import { snapshotDirectory as snapshot } from '../helpers/fs-snapshot.js';

describe('openspec context (4.1)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;
  let storeRoot: string;
  let upstream: string;
  let apiDir: string;

  beforeEach(async () => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-context-')));
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

    upstream = path.join(tempDir, 'upstream-context');
    createOpenSpecRoot(upstream);
    await registerStore({ id: 'upstream-context', localPath: upstream, globalDataDir });

    apiDir = path.join(tempDir, 'src/api-server');
    fs.mkdirSync(apiDir, { recursive: true });
    await runCLI(['repo', 'register', apiDir, '--json'], { cwd: tempDir, env });

    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\n' +
        'references:\n  - upstream-context\n  - { id: design-system, remote: https://192.0.2.1/ds.git }\n' +
        'targets:\n  - api-server\n  - web-app\n'
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  it('assembles the working set from declarations, all session shapes', async () => {
    const result = await runCLI(['context', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(0);
    const workingSet = parseJson(result);
    expect(workingSet.root).toEqual({
      path: storeRoot,
      source: 'store',
      store_id: 'team-context',
      role: 'openspec_root',
    });
    expect(workingSet.members).toEqual([
      {
        role: 'referenced_store',
        id: 'upstream-context',
        path: upstream,
        fetch: 'openspec show <spec-id> --type spec --store upstream-context',
        status: [],
      },
      {
        role: 'referenced_store',
        id: 'design-system',
        status: [
          expect.objectContaining({
            code: 'reference_unresolved',
            fix: expect.stringContaining('git clone -- https://192.0.2.1/ds.git'),
          }),
        ],
      },
      { role: 'target_repo', id: 'api-server', path: apiDir, status: [] },
      {
        role: 'target_repo',
        id: 'web-app',
        status: [expect.objectContaining({ code: 'target_unmapped' })],
      },
    ]);
    expect(workingSet.status).toEqual([]);

    const human = await runCLI(['context', '--store', 'team-context'], { cwd: tempDir, env });
    expect(human.exitCode).toBe(0);
    expect(human.stdout).toContain(`Working context for team-context (${storeRoot})`);
    expect(human.stdout).toContain(`  upstream-context  ${upstream}`);
    expect(human.stdout).toContain('Fetch: openspec show <spec-id> --type spec --store upstream-context');
    expect(human.stdout).toContain(`  api-server  ${apiDir}`);
    expect(human.stdout).toContain('Not available on this machine');
    expect(human.stdout).toContain('Fix: git clone --');
    expect(human.stdout).toContain('Fix: Run: openspec repo register <path> --id web-app');

    // Nearest-root session.
    const nearest = await runCLI(['context', '--json'], { cwd: storeRoot, env });
    expect(parseJson(nearest).root.source).toBe('nearest');

    // Declared-pointer session.
    const pointerRepo = path.join(tempDir, 'app-repo');
    fs.mkdirSync(path.join(pointerRepo, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(pointerRepo, 'openspec', 'config.yaml'), 'store: team-context\n');
    const declared = await runCLI(['context', '--json'], { cwd: pointerRepo, env });
    expect(parseJson(declared).root.source).toBe('declared');
    expect(parseJson(declared).members).toHaveLength(4);
  });

  it('says so plainly when nothing is declared', async () => {
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    const human = await runCLI(['context', '--store', 'team-context'], { cwd: tempDir, env });
    expect(human.stdout).toContain('the working set is this root alone');
    const json = await runCLI(['context', '--json', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    expect(parseJson(json).members).toEqual([]);
  });

  it('emits the code-workspace view with the pinned write matrix', async () => {
    const outPath = path.join(tempDir, 'team.code-workspace');

    // Fresh write: available members only, unresolved on stderr.
    const fresh = await runCLI(
      ['context', '--store', 'team-context', '--code-workspace', outPath],
      { cwd: tempDir, env }
    );
    expect(fresh.exitCode).toBe(0);
    expect(fresh.stderr).toContain('2 members not available');
    const file = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(file.folders).toEqual([
      { name: 'team-context', path: storeRoot },
      { name: 'ref:upstream-context', path: upstream },
      { name: 'repo:api-server', path: apiDir },
    ]);

    // Exists without --force: typed refusal, exit 1.
    const refused = await runCLI(
      ['context', '--store', 'team-context', '--code-workspace', outPath],
      { cwd: tempDir, env }
    );
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toContain(`Refusing to overwrite ${outPath}`);
    expect(refused.stderr).toContain('--force');

    // With --force: overwrites.
    const forced = await runCLI(
      ['context', '--store', 'team-context', '--code-workspace', outPath, '--force'],
      { cwd: tempDir, env }
    );
    expect(forced.exitCode).toBe(0);

    // Missing parent dir: clear error, no mkdir.
    const nested = path.join(tempDir, 'no-such-dir', 'x.code-workspace');
    const badDir = await runCLI(
      ['context', '--store', 'team-context', '--code-workspace', nested],
      { cwd: tempDir, env }
    );
    expect(badDir.exitCode).toBe(1);
    expect(badDir.stderr).toContain('Output directory does not exist');
    expect(fs.existsSync(path.dirname(nested))).toBe(false);

    // JSON mode: stdout stays the pure brief; confirmation on stderr.
    const jsonOut = path.join(tempDir, 'json.code-workspace');
    const jsonMode = await runCLI(
      ['context', '--json', '--store', 'team-context', '--code-workspace', jsonOut],
      { cwd: tempDir, env }
    );
    expect(jsonMode.exitCode).toBe(0);
    expect(() => JSON.parse(jsonMode.stdout)).not.toThrow();
    expect(jsonMode.stderr).toContain(`Wrote ${jsonOut}`);
  });

  it('excludes stale mapped paths from the editor view', async () => {
    fs.rmSync(apiDir, { recursive: true });
    const outPath = path.join(tempDir, 'stale.code-workspace');
    const result = await runCLI(
      ['context', '--json', '--store', 'team-context', '--code-workspace', outPath],
      { cwd: tempDir, env }
    );
    expect(result.exitCode).toBe(0);
    const member = parseJson(result).members.find((entry: any) => entry.id === 'api-server');
    expect(member.status[0].code).toBe('target_path_missing');
    const file = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(file.folders.map((f: any) => f.name)).toEqual([
      'team-context',
      'ref:upstream-context',
    ]);
  });

  it('is read-only except the requested file and fails with the null shape', async () => {
    const rootBefore = snapshot(storeRoot);
    const dataBefore = snapshot(path.join(tempDir, 'data'));
    await runCLI(['context', '--json', '--store', 'team-context'], { cwd: tempDir, env });
    expect(snapshot(storeRoot)).toEqual(rootBefore);
    expect(snapshot(path.join(tempDir, 'data'))).toEqual(dataBefore);

    const bare = path.join(tempDir, 'bare');
    fs.mkdirSync(bare);
    const noRoot = await runCLI(['context', '--json'], { cwd: bare, env });
    expect(noRoot.exitCode).toBe(1);
    const payload = parseJson(noRoot);
    expect(payload.root).toBeNull();
    expect(payload.members).toEqual([]);
    expect(payload.status[0].code).toBeDefined();
  });
});
