import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { runCLI } from '../../helpers/run-cli.js';
import { assertWorkspaceLayout } from '../../helpers/workspace-assertions.js';

const tempRoots: string[] = [];

async function createIsolatedEnv(): Promise<{ env: NodeJS.ProcessEnv; root: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-cli-e2e-'));
  tempRoots.push(root);

  return {
    root,
    env: {
      OPEN_SPEC_TELEMETRY_DISABLED: '1',
      XDG_CONFIG_HOME: path.join(root, 'xdg-config'),
      XDG_DATA_HOME: path.join(root, 'xdg-data'),
    },
  };
}

async function readWorkspaceSnapshot(workspaceRoot: string): Promise<Record<string, string>> {
  const entries = [
    '.gitignore',
    path.join('.openspec', 'workspace.yaml'),
    path.join('.openspec', 'local.yaml'),
  ];

  const snapshotEntries = await Promise.all(
    entries.map(async (entry) => [entry, await fs.readFile(path.join(workspaceRoot, entry), 'utf-8')] as const)
  );

  return Object.fromEntries(snapshotEntries);
}

afterAll(async () => {
  await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('workspace create CLI e2e', () => {
  it('documents workspace create in help output', async () => {
    const result = await runCLI(['workspace', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Manage OpenSpec workspaces for cross-repo planning');
    expect(result.stdout).toContain('create [options] <name>');
    expect(result.stdout).toContain('update-repo [options] <alias>');
  });

  it('creates a usable workspace root on disk with clean JSON output', async () => {
    const { env, root } = await createIsolatedEnv();
    const result = await runCLI(['workspace', 'create', 'alpha-e2e', '--json'], { env });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const output = JSON.parse(result.stdout);
    const workspaceRoot = path.join(root, 'xdg-data', 'openspec', 'workspaces', 'alpha-e2e');

    expect(output.name).toBe('alpha-e2e');
    expect(output.workspaceRoot).toBe(workspaceRoot);
    expect(output.metadataPath).toBe(path.join(workspaceRoot, '.openspec', 'workspace.yaml'));
    expect(output.localOverlayPath).toBe(path.join(workspaceRoot, '.openspec', 'local.yaml'));
    expect(output.changesPath).toBe(path.join(workspaceRoot, 'changes'));

    await assertWorkspaceLayout(workspaceRoot);

    const workspaceMetadata = parseYaml(await fs.readFile(path.join(workspaceRoot, '.openspec', 'workspace.yaml'), 'utf-8'));
    expect(workspaceMetadata).toEqual({
      version: 1,
      name: 'alpha-e2e',
      repos: {},
    });
  });

  it('returns explicit exit codes and preserves the workspace on duplicate create attempts', async () => {
    const { env, root } = await createIsolatedEnv();
    const firstResult = await runCLI(['workspace', 'create', 'alpha-duplicate'], { env });

    expect(firstResult.exitCode).toBe(0);

    const workspaceRoot = path.join(root, 'xdg-data', 'openspec', 'workspaces', 'alpha-duplicate');
    const beforeSnapshot = await readWorkspaceSnapshot(workspaceRoot);

    const duplicateResult = await runCLI(['workspace', 'create', 'alpha-duplicate'], { env });
    const afterSnapshot = await readWorkspaceSnapshot(workspaceRoot);

    expect(duplicateResult.exitCode).toBe(1);
    expect(duplicateResult.stdout).toBe('\n');
    expect(duplicateResult.stderr).toContain("Workspace 'alpha-duplicate' already exists");
    expect(afterSnapshot).toEqual(beforeSnapshot);
  });
});
