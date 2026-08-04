import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { snapshotDirectory as snapshot } from '../helpers/fs-snapshot.js';
import { createOpenSpecRoot, writeSpec } from '../helpers/openspec-fixtures.js';

describe('declared store fallback (3.2)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;
  let storeRoot: string;
  let pointerRepo: string;

  beforeEach(async () => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-declared-'))
    );
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

    pointerRepo = path.join(tempDir, 'app-repo');
    fs.mkdirSync(path.join(pointerRepo, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(pointerRepo, 'openspec', 'config.yaml'),
      'store: team-context\n'
    );
  });

  afterEach(() => {
    // Windows can hold a brief handle on a just-exited spawned CLI; retry
    // the recursive remove so EBUSY during teardown does not flake the run.
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }


  it('runs the externalized-planning journey without --store anywhere', async () => {
    const pointerBefore = snapshot(pointerRepo);

    const created = await runCLI(['new', 'change', 'billing-rework', '--json'], {
      cwd: pointerRepo,
      env,
    });
    expect(created.exitCode).toBe(0);
    expect(parseJson(created).root).toEqual({
      path: fs.realpathSync.native(storeRoot),
      source: 'declared',
      store_id: 'team-context',
    });

    const statusHuman = await runCLI(['status', '--change', 'billing-rework'], {
      cwd: pointerRepo,
      env,
    });
    expect(statusHuman.exitCode).toBe(0);
    expect(statusHuman.stderr).toContain('Using OpenSpec root: team-context');

    // Hint continuity: follow-ups carry --store (JSON nextSteps is the
    // surface that prints them).
    const statusJson = await runCLI(['status', '--change', 'billing-rework', '--json'], {
      cwd: pointerRepo,
      env,
    });
    expect(parseJson(statusJson).nextSteps.join(' ')).toContain('--store team-context');

    const instructions = await runCLI(
      ['instructions', 'proposal', '--change', 'billing-rework', '--json'],
      { cwd: pointerRepo, env }
    );
    expect(instructions.exitCode).toBe(0);

    const changeDir = path.join(storeRoot, 'openspec', 'changes', 'billing-rework');
    fs.writeFileSync(
      path.join(changeDir, 'proposal.md'),
      '## Why\n\nBilling rework.\n\n## What Changes\n\n- **billing:** Rework billing\n'
    );
    const deltaDir = path.join(changeDir, 'specs', 'billing');
    fs.mkdirSync(deltaDir, { recursive: true });
    fs.writeFileSync(
      path.join(deltaDir, 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: Billing SHALL work\nThe system SHALL bill.\n\n#### Scenario: Bills\n- **WHEN** a period ends\n- **THEN** a bill exists\n'
    );

    const validate = await runCLI(['validate', 'billing-rework', '--json', '--no-interactive'], {
      cwd: pointerRepo,
      env,
    });
    expect(validate.exitCode).toBe(0);

    const list = await runCLI(['list', '--json'], { cwd: pointerRepo, env });
    expect(parseJson(list).root.source).toBe('declared');

    const show = await runCLI(['show', 'billing-rework', '--json', '--type', 'change'], {
      cwd: pointerRepo,
      env,
    });
    expect(show.exitCode).toBe(0);

    const archive = await runCLI(['archive', 'billing-rework', '--yes', '--json'], {
      cwd: pointerRepo,
      env,
    });
    expect(archive.exitCode).toBe(0);
    const archived = fs.readdirSync(path.join(storeRoot, 'openspec', 'changes', 'archive'));
    expect(archived.some((name) => name.endsWith('billing-rework'))).toBe(true);

    // The pointer repo is byte-identical: no specs/, no changes/, nothing.
    expect(snapshot(pointerRepo)).toEqual(pointerBefore);
    // Heaviest test in the file (8 CLI subprocess spawns); the 10s default
    // is tight on slow Windows runners.
  }, 60_000);

  it('composes with 3.1: the declared root surfaces the store own references', async () => {
    const upstreamRoot = path.join(tempDir, 'upstream-context');
    createOpenSpecRoot(upstreamRoot);
    writeSpec(upstreamRoot, 'platform-rules', '## Purpose\n\nPlatform rules.\n');
    await registerStore({ id: 'upstream-context', localPath: upstreamRoot, globalDataDir });
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - upstream-context\n'
    );

    const created = await runCLI(['new', 'change', 'ref-check', '--json'], {
      cwd: pointerRepo,
      env,
    });
    expect(created.exitCode).toBe(0);

    const instructions = await runCLI(
      ['instructions', 'proposal', '--change', 'ref-check', '--json'],
      { cwd: pointerRepo, env }
    );
    const refs = parseJson(instructions).references;
    expect(refs.map((entry: any) => entry.store_id)).toEqual(['upstream-context']);
  });

  it('refuses init in a pointer repo and creates nothing, then converts cleanly', async () => {
    const before = snapshot(pointerRepo);
    const dataBefore = fs.existsSync(path.join(tempDir, 'data'))
      ? snapshot(path.join(tempDir, 'data'))
      : null;

    const refused = await runCLI(['init', '.'], { cwd: pointerRepo, env });
    expect(refused.exitCode).toBe(1);
    expect(refused.stderr).toContain("externalized to store 'team-context'");
    expect(refused.stderr).toContain('Remove the store: line');
    expect(snapshot(pointerRepo)).toEqual(before);
    if (dataBefore) {
      expect(snapshot(path.join(tempDir, 'data'))).toEqual(dataBefore);
    }

    // Conversion: remove the line, rerun, get a normal local root.
    fs.writeFileSync(path.join(pointerRepo, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    const converted = await runCLI(['init', '.', '--tools', 'none'], {
      cwd: pointerRepo,
      env,
    });
    expect(converted.exitCode).toBe(0);
    expect(fs.existsSync(path.join(pointerRepo, 'openspec', 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(pointerRepo, 'openspec', 'changes'))).toBe(true);
  });

  it('refuses init for malformed pointers and from pointer-repo subdirectories', async () => {
    // A broken declaration must not be buried under a scaffold.
    fs.writeFileSync(
      path.join(pointerRepo, 'openspec', 'config.yaml'),
      'store: [team-context]\n'
    );
    const malformed = await runCLI(['init', '.'], { cwd: pointerRepo, env });
    expect(malformed.exitCode).toBe(1);
    expect(malformed.stderr).toContain('Fix or remove the store: line');
    expect(fs.existsSync(path.join(pointerRepo, 'openspec', 'specs'))).toBe(false);

    // And a subdirectory of a pointer repo must not grow a nested root
    // that silently diverts work away from the declared store.
    fs.writeFileSync(
      path.join(pointerRepo, 'openspec', 'config.yaml'),
      'store: team-context\n'
    );
    const subdir = path.join(pointerRepo, 'packages', 'api');
    fs.mkdirSync(subdir, { recursive: true });
    const nested = await runCLI(['init', '.'], { cwd: subdir, env });
    expect(nested.exitCode).toBe(1);
    expect(nested.stderr).toContain("externalized to store 'team-context'");
    expect(fs.existsSync(path.join(subdir, 'openspec'))).toBe(false);
  });

  it('keeps real-root stdout byte-identical when a pointer is present, with one warning', async () => {
    const realRepo = path.join(tempDir, 'real-repo');
    createOpenSpecRoot(realRepo);
    const runs: Record<string, { stdout: string; warnings: number }> = {};

    for (const [label, config] of [
      ['without', 'schema: spec-driven\n'],
      ['with', 'schema: spec-driven\nstore: team-context\n'],
    ] as const) {
      fs.writeFileSync(path.join(realRepo, 'openspec', 'config.yaml'), config);
      const result = await runCLI(['list', '--json'], { cwd: realRepo, env });
      expect(result.exitCode).toBe(0);
      runs[label] = {
        stdout: result.stdout,
        warnings: (result.stderr.match(/the declaration is ignored/g) ?? []).length,
      };
    }

    expect(runs.with.stdout).toBe(runs.without.stdout);
    expect(runs.without.warnings).toBe(0);
    expect(runs.with.warnings).toBe(1);
  });
});
