import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';

interface SchemaOutput {
  name: string;
  source: 'project' | 'user' | 'package';
}

interface FailureOutput {
  schemas: unknown[];
  root: null;
  status: Array<{ code: string; message: string; fix?: string }>;
}

const SCHEMAS_MATRIX_TIMEOUT_MS = 30_000;

describe('openspec schemas root selection', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;
  let globalDataDir: string;
  let localRoot: string;
  let storeRoot: string;
  let scratch: string;

  beforeEach(async () => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schemas-root-'))
    );
    env = isolatedEnv('selected');
    globalDataDir = getGlobalDataDir({ env });

    localRoot = path.join(tempDir, 'local-project');
    createOpenSpecRoot(localRoot);
    writeProjectSchema(localRoot, 'local-only', 'Local-only workflow');

    // A native path containing spaces catches shell-composition and separator assumptions.
    storeRoot = path.join(tempDir, 'team store root');
    createOpenSpecRoot(storeRoot);
    writeProjectSchema(storeRoot, 'store-only', 'Store-only workflow');
    await registerStore({ id: 'team-context', localPath: storeRoot, globalDataDir });

    scratch = path.join(tempDir, 'scratch');
    fs.mkdirSync(scratch, { recursive: true });
  });

  afterEach(() => {
    cleanupTempPath(tempDir);
  });

  function isolatedEnv(name: string): NodeJS.ProcessEnv {
    return {
      XDG_DATA_HOME: path.join(tempDir, `${name}-data`),
      XDG_CONFIG_HOME: path.join(tempDir, `${name}-config`),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
  }

  function writeProjectSchema(root: string, name: string, description: string): void {
    const schemaDir = path.join(root, 'openspec', 'schemas', name);
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      `name: ${name}\n` +
        'version: 1\n' +
        `description: ${description}\n` +
        'artifacts:\n' +
        '  - id: proposal\n' +
        '    generates: proposal.md\n' +
        '    description: Proposal\n' +
        '    template: proposal.md\n'
    );
    fs.writeFileSync(path.join(schemaDir, 'proposal.md'), '# Proposal\n');
  }

  function parseSchemas(result: RunCLIResult): SchemaOutput[] {
    const parsed: unknown = JSON.parse(result.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    return parsed as SchemaOutput[];
  }

  function parseFailure(result: RunCLIResult): FailureOutput {
    const parsed = JSON.parse(result.stdout) as FailureOutput;
    expect(Object.keys(parsed).sort()).toEqual(['root', 'schemas', 'status']);
    expect(parsed.schemas).toEqual([]);
    expect(parsed.root).toBeNull();
    expect(parsed.status).toHaveLength(1);
    return parsed;
  }

  function schemaNames(schemas: SchemaOutput[]): string[] {
    return schemas.map((schema) => schema.name);
  }

  function setDefaultStore(id: string): void {
    const configDir = path.join(env.XDG_CONFIG_HOME as string, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      `${JSON.stringify({ defaultStore: id })}\n`
    );
  }

  it('uses an explicit store instead of the cwd root and preserves success output shapes', async () => {
    const json = await runCLI(['schemas', '--json', '--store', 'team-context'], {
      cwd: localRoot,
      env,
    });

    expect(json.exitCode).toBe(0);
    expect(json.stderr).toBe('');
    const names = schemaNames(parseSchemas(json));
    expect(names).toContain('store-only');
    expect(names).not.toContain('local-only');

    const human = await runCLI(['schemas', '--store', 'team-context'], {
      cwd: localRoot,
      env,
    });
    expect(human.exitCode).toBe(0);
    expect(human.stdout).toContain('Available schemas:');
    expect(human.stdout).toContain('store-only');
    expect(human.stdout).not.toContain('local-only');
    expect(human.stderr).toContain('Using OpenSpec root: team-context');
    expect(human.stderr).toContain(fs.realpathSync.native(storeRoot));
  }, SCHEMAS_MATRIX_TIMEOUT_MS);

  it('rejects --store-path through the standard machine-readable diagnostic', async () => {
    const result = await runCLI(['schemas', '--json', '--store-path', storeRoot], {
      cwd: localRoot,
      env,
    });

    expect(result.exitCode).toBe(1);
    expect(parseFailure(result).status[0].code).toBe('store_path_not_supported');
  });

  it('honors declared pointers and global defaults while keeping nearest-root precedence', async () => {
    const pointerRoot = path.join(tempDir, 'pointer-project');
    fs.mkdirSync(path.join(pointerRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(pointerRoot, 'openspec', 'config.yaml'),
      'store: team-context\n'
    );
    writeProjectSchema(pointerRoot, 'pointer-only', 'Pointer-only workflow');

    const declared = await runCLI(['schemas', '--json'], { cwd: pointerRoot, env });
    expect(declared.exitCode).toBe(0);
    const declaredNames = schemaNames(parseSchemas(declared));
    expect(declaredNames).toContain('store-only');
    expect(declaredNames).not.toContain('pointer-only');

    setDefaultStore('team-context');
    const globalDefault = await runCLI(['schemas', '--json'], { cwd: scratch, env });
    expect(globalDefault.exitCode).toBe(0);
    expect(schemaNames(parseSchemas(globalDefault))).toContain('store-only');

    const nearest = await runCLI(['schemas', '--json'], { cwd: localRoot, env });
    expect(nearest.exitCode).toBe(0);
    const nearestNames = schemaNames(parseSchemas(nearest));
    expect(nearestNames).toContain('local-only');
    expect(nearestNames).not.toContain('store-only');
  }, SCHEMAS_MATRIX_TIMEOUT_MS);

  it('keeps rootless schema listing compatible when no stores are registered', async () => {
    const rootlessEnv = isolatedEnv('rootless');
    const rootlessDir = path.join(tempDir, 'rootless-project');
    fs.mkdirSync(rootlessDir, { recursive: true });

    const result = await runCLI(['schemas', '--json'], { cwd: rootlessDir, env: rootlessEnv });

    expect(result.exitCode).toBe(0);
    expect(schemaNames(parseSchemas(result))).toContain('spec-driven');
  });

  it('fails closed with one JSON document when stores exist but none is selected', async () => {
    const result = await runCLI(['schemas', '--json'], { cwd: scratch, env });

    expect(result.exitCode).toBe(1);
    const failure = parseFailure(result);
    expect(failure.status[0].code).toBe('no_root_with_registered_stores');
    expect(failure.status[0].fix).toContain('--store <id>');
  });

  it('reports unknown and unavailable stores through canonical diagnostics', async () => {
    const unknown = await runCLI(['schemas', '--json', '--store', 'ghost-context'], {
      cwd: localRoot,
      env,
    });
    expect(unknown.exitCode).toBe(1);
    expect(parseFailure(unknown).status[0].code).toBe('unknown_store');

    const unavailableRoot = path.join(tempDir, 'unavailable-store');
    createOpenSpecRoot(unavailableRoot);
    await registerStore({
      id: 'unavailable-context',
      localPath: unavailableRoot,
      globalDataDir,
    });
    cleanupTempPath(unavailableRoot);

    const unavailable = await runCLI(
      ['schemas', '--json', '--store', 'unavailable-context'],
      { cwd: localRoot, env }
    );
    expect(unavailable.exitCode).toBe(1);
    expect(parseFailure(unavailable).status[0].code).toBe('store_identity_mismatch');
  }, SCHEMAS_MATRIX_TIMEOUT_MS);
});
