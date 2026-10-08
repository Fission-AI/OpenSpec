import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI } from '../helpers/run-cli.js';
import { createHealthyOpenSpecRoot } from '../helpers/store-git.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';

const SURVIVING_COMMANDS_TIMEOUT_MS = 30_000;

describe('legacy command groups are removed', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-legacy-removed-'));
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });
  });

  afterEach(() => {
    cleanupTempPath(tempDir);
  });

  function snapshotDirectory(root: string): Map<string, string> {
    const snapshot = new Map<string, string>();

    function walk(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Record directories too, so a command deleting an empty
          // subdirectory cannot pass the byte-identity check.
          snapshot.set(`${path.relative(root, fullPath).split(path.sep).join('/')}/`, '');
          walk(fullPath);
        } else if (entry.isFile()) {
          snapshot.set(path.relative(root, fullPath).split(path.sep).join('/'), fs.readFileSync(fullPath, 'utf-8'));
        }
      }
    }

    walk(root);
    return snapshot;
  }

  // Frozen legacy bytes, written by the now-deleted workspace commands.
  // Deliberately NOT the production writer: the pin is that pre-existing
  // on-disk state still behaves, independent of serializer drift (the
  // writer itself dies in 4.1).
  function writeWorkspaceViewFixture(dir: string): void {
    const metadataDir = path.join(dir, '.openspec-workspace');
    fs.mkdirSync(metadataDir, { recursive: true });
    fs.writeFileSync(
      path.join(metadataDir, 'view.yaml'),
      'version: 1\nname: platform\ncontext: null\nlinks: {}\n'
    );
  }

  it('rejects the deleted groups as unknown commands', async () => {
    for (const group of ['workspace', 'initiative']) {
      const result = await runCLI([group, 'list'], { cwd: tempDir, env });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(`unknown command '${group}'`);
    }
  });

  it('lists neither group in --help', async () => {
    const result = await runCLI(['--help'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(/^\s*workspace\s/m);
    expect(result.stdout).not.toMatch(/^\s*initiative\s/m);
  });

  it('update falls through to the standard no-project error in a view dir', async () => {
    writeWorkspaceViewFixture(tempDir);

    const result = await runCLI(['update'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('No OpenSpec directory found');
    expect(result.stderr).not.toContain('workspace');
  });

  it('keeps initiative data and view state byte-identical across surviving commands', async () => {
    // A store carrying initiative data created by the deleted commands.
    const storeRoot = path.join(tempDir, 'team-context');
    createHealthyOpenSpecRoot(storeRoot);
    const initiativeDir = path.join(storeRoot, 'initiatives', 'billing-launch');
    fs.mkdirSync(initiativeDir, { recursive: true });
    fs.writeFileSync(
      path.join(initiativeDir, 'initiative.yaml'),
      'version: 1\nid: billing-launch\ntitle: Billing Launch\n'
    );
    await registerStore({ id: 'team-context', localPath: storeRoot, globalDataDir });

    // An unrelated store, so `store remove` runs without touching the first.
    const otherRoot = path.join(tempDir, 'other-context');
    createHealthyOpenSpecRoot(otherRoot);
    await registerStore({ id: 'other-context', localPath: otherRoot, globalDataDir });

    // Leftover workspace view state in a project dir.
    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
    writeWorkspaceViewFixture(projectDir);

    const initiativeBefore = snapshotDirectory(path.join(storeRoot, 'initiatives'));
    const viewBefore = snapshotDirectory(path.join(projectDir, '.openspec-workspace'));

    expect((await runCLI(['store', 'list', '--json'], { cwd: projectDir, env })).exitCode).toBe(0);
    expect((await runCLI(['store', 'doctor', '--json'], { cwd: projectDir, env })).exitCode).toBe(0);
    expect(
      (await runCLI(['store', 'remove', 'other-context', '--yes', '--json'], {
        cwd: projectDir,
        env,
      })).exitCode
    ).toBe(0);
    // update exits 1 here (no project) — asserted so a future auto-init
    // behavior cannot silently start writing into this fixture.
    expect((await runCLI(['update'], { cwd: projectDir, env })).exitCode).toBe(1);
    expect(
      (await runCLI(['new', 'change', 'survival-check', '--store', 'team-context', '--json'], {
        cwd: projectDir,
        env,
      })).exitCode
    ).toBe(0);
    expect(
      (await runCLI(['status', '--change', 'survival-check', '--store', 'team-context', '--json'], {
        cwd: projectDir,
        env,
      })).exitCode
    ).toBe(0);

    expect(snapshotDirectory(path.join(storeRoot, 'initiatives'))).toEqual(initiativeBefore);
    expect(snapshotDirectory(path.join(projectDir, '.openspec-workspace'))).toEqual(viewBefore);
  }, SURVIVING_COMMANDS_TIMEOUT_MS);

  it('tolerates legacy initiative metadata without re-emitting it', async () => {
    const projectDir = path.join(tempDir, 'legacy-project');
    createHealthyOpenSpecRoot(projectDir);
    const changeDir = path.join(projectDir, 'openspec', 'changes', 'legacy-change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, '.openspec.yaml'),
      ['schema: spec-driven', 'initiative:', '  store: team-context', '  id: billing-launch'].join(
        '\n'
      ) + '\n'
    );

    const result = await runCLI(['status', '--change', 'legacy-change'], {
      cwd: projectDir,
      env,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toContain('Initiative:');
  });

  it('reports repo-local in a view dir, exactly as before this slice', async () => {
    // workspace-planning mode has been CLI-unreachable since slice 1.2's
    // resolver demotion; this pins that the deletion changed nothing.
    const projectDir = path.join(tempDir, 'view-project');
    createHealthyOpenSpecRoot(projectDir);
    writeWorkspaceViewFixture(projectDir);
    const changeDir = path.join(projectDir, 'openspec', 'changes', 'mode-check');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\n');

    const result = await runCLI(['status', '--change', 'mode-check', '--json'], {
      cwd: projectDir,
      env,
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).actionContext.mode).toBe('repo-local');
  });

});
