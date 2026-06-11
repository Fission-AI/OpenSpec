import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';

describe('store targets in instructions (3.4)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;
  let storeRoot: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-targets-'));
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });

    storeRoot = path.join(tempDir, 'team-context');
    createOpenSpecRoot(storeRoot);
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\ntargets:\n  - api-server\n  - { id: web-app, remote: "git@github.com:acme/web-app.git" }\n'
    );
    await registerStore({ id: 'team-context', localPath: storeRoot, globalDataDir });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  async function createChange(name: string, extraArgs: string[] = []) {
    const result = await runCLI(['new', 'change', name, '--json', ...extraArgs, '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(0);
  }

  it('shows store defaults with provenance on both surfaces, both modes', async () => {
    await createChange('store-defaults');

    const artifactJson = await runCLI(
      ['instructions', 'proposal', '--change', 'store-defaults', '--store', 'team-context', '--json'],
      { cwd: tempDir, env }
    );
    expect(artifactJson.exitCode).toBe(0);
    expect(parseJson(artifactJson).targets).toEqual({
      source: 'store',
      repos: [
        { id: 'api-server' },
        { id: 'web-app', remote: 'git@github.com:acme/web-app.git' },
      ],
      status: [],
    });

    const artifactHuman = await runCLI(
      ['instructions', 'proposal', '--change', 'store-defaults', '--store', 'team-context'],
      { cwd: tempDir, env }
    );
    expect(artifactHuman.stdout).toContain('<target_repos>');
    expect(artifactHuman.stdout).toContain('Declared by the store config.');
    expect(artifactHuman.stdout).toContain('  - web-app (clone: git@github.com:acme/web-app.git)');

    const applyJson = await runCLI(
      ['instructions', 'apply', '--change', 'store-defaults', '--store', 'team-context', '--json'],
      { cwd: tempDir, env }
    );
    expect(parseJson(applyJson).targets.source).toBe('store');

    const applyHuman = await runCLI(
      ['instructions', 'apply', '--change', 'store-defaults', '--store', 'team-context'],
      { cwd: tempDir, env }
    );
    expect(applyHuman.stdout).toContain('### Target Repos');
  });

  it('lets a change narrow while a second change keeps the store set', async () => {
    await createChange('narrowed');
    await createChange('full-set');

    const metadataPath = path.join(
      storeRoot, 'openspec', 'changes', 'narrowed', '.openspec.yaml'
    );
    fs.writeFileSync(
      metadataPath,
      fs.readFileSync(metadataPath, 'utf-8') + 'targets:\n  - web-app\n'
    );

    const narrowed = await runCLI(
      ['instructions', 'proposal', '--change', 'narrowed', '--store', 'team-context', '--json'],
      { cwd: tempDir, env }
    );
    expect(parseJson(narrowed).targets).toEqual({
      source: 'change',
      // The remote inherits from the store declaration.
      repos: [{ id: 'web-app', remote: 'git@github.com:acme/web-app.git' }],
      status: [],
    });

    const full = await runCLI(
      ['instructions', 'proposal', '--change', 'full-set', '--store', 'team-context', '--json'],
      { cwd: tempDir, env }
    );
    expect(parseJson(full).targets.source).toBe('store');
    expect(parseJson(full).targets.repos).toHaveLength(2);
  });

  it('warns on narrowing outside the vocabulary, in JSON and human, exit 0', async () => {
    await createChange('outside');
    const metadataPath = path.join(
      storeRoot, 'openspec', 'changes', 'outside', '.openspec.yaml'
    );
    fs.writeFileSync(
      metadataPath,
      fs.readFileSync(metadataPath, 'utf-8') + 'targets:\n  - api-sever\n'
    );

    const json = await runCLI(
      ['instructions', 'apply', '--change', 'outside', '--store', 'team-context', '--json'],
      { cwd: tempDir, env }
    );
    expect(json.exitCode).toBe(0);
    const targets = parseJson(json).targets;
    expect(targets.repos).toEqual([{ id: 'api-sever' }]);
    expect(targets.status[0]).toEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'target_not_declared',
        target: 'targets',
      })
    );

    const human = await runCLI(
      ['instructions', 'apply', '--change', 'outside', '--store', 'team-context'],
      { cwd: tempDir, env }
    );
    expect(human.exitCode).toBe(0);
    expect(human.stdout).toContain("Note: 'api-sever' is not in the store's declared targets.");
    expect(human.stdout).toContain('Fix: Add it to targets in');
  });

  it('omits the field entirely when neither level declares', async () => {
    fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    await createChange('plain');

    const result = await runCLI(
      ['instructions', 'proposal', '--change', 'plain', '--store', 'team-context', '--json'],
      { cwd: tempDir, env }
    );
    expect('targets' in parseJson(result)).toBe(false);
    const human = await runCLI(
      ['instructions', 'proposal', '--change', 'plain', '--store', 'team-context'],
      { cwd: tempDir, env }
    );
    expect(human.stdout).not.toContain('<target_repos>');
  });

  it('reads the resolved root config in pointer sessions, not the cwd', async () => {
    const pointerRepo = path.join(tempDir, 'app-repo');
    fs.mkdirSync(path.join(pointerRepo, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(pointerRepo, 'openspec', 'config.yaml'),
      // The pointer dir's own targets are inert; the store's apply.
      'store: team-context\ntargets:\n  - wrong-repo\n'
    );

    const created = await runCLI(['new', 'change', 'via-pointer', '--json'], {
      cwd: pointerRepo,
      env,
    });
    expect(created.exitCode).toBe(0);

    const result = await runCLI(
      ['instructions', 'proposal', '--change', 'via-pointer', '--json'],
      { cwd: pointerRepo, env }
    );
    const targets = parseJson(result).targets;
    expect(targets.source).toBe('store');
    expect(targets.repos.map((r: any) => r.id)).toEqual(['api-server', 'web-app']);
  });

  it('keeps targets inert: unknown-store --store and byte-identical commands', async () => {
    // A declared target id is not a store id.
    const asStore = await runCLI(['list', '--json', '--store', 'api-server'], {
      cwd: tempDir,
      env,
    });
    expect(asStore.exitCode).toBe(1);
    const status = parseJson(asStore).status[0];
    expect(status.code).toBe('unknown_store');
    expect(status.message).toContain("Unknown store 'api-server'");

    // Byte-identity for non-instruction commands, with vs without targets.
    await createChange('inert-check');
    const outputs: Record<string, string[]> = {};
    for (const [label, config] of [
      ['with', 'schema: spec-driven\ntargets:\n  - api-server\n'],
      ['without', 'schema: spec-driven\n'],
    ] as const) {
      fs.writeFileSync(path.join(storeRoot, 'openspec', 'config.yaml'), config);
      const list = await runCLI(['list', '--json', '--store', 'team-context'], {
        cwd: tempDir,
        env,
      });
      const show = await runCLI(
        ['show', 'inert-check', '--json', '--type', 'change', '--store', 'team-context'],
        { cwd: tempDir, env }
      );
      const status = await runCLI(
        ['status', '--change', 'inert-check', '--store', 'team-context', '--json'],
        { cwd: tempDir, env }
      );
      outputs[label] = [list.stdout, show.stdout, status.stdout];
    }
    expect(outputs.with).toEqual(outputs.without);
  });
});
