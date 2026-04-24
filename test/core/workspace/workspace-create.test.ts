import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  createManagedWorkspaceRoot,
  getManagedWorkspacesRoot,
  resolveManagedWorkspaceRoot,
} from '../../../src/core/workspace/create.js';
import { assertWorkspaceLayout } from '../../helpers/workspace-assertions.js';

describe('workspace create core behavior', () => {
  let tempRoot: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-create-core-'));
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = path.join(tempRoot, 'xdg-config');
    process.env.XDG_DATA_HOME = path.join(tempRoot, 'xdg-data');
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('resolves managed workspace roots beneath the XDG data home', () => {
    const managedRoot = path.join(tempRoot, 'xdg-data', 'openspec', 'workspaces');

    expect(getManagedWorkspacesRoot()).toBe(managedRoot);
    expect(resolveManagedWorkspaceRoot('alpha-team')).toBe(path.join(managedRoot, 'alpha-team'));
  });

  it('initializes workspace metadata, local overlay, and layout for new workspaces', async () => {
    const result = await createManagedWorkspaceRoot('  alpha-team  ');

    expect(result.name).toBe('alpha-team');
    expect(result.workspaceRoot).toBe(resolveManagedWorkspaceRoot('alpha-team'));
    expect(result.metadataPath).toBe(path.join(result.workspaceRoot, '.openspec', 'workspace.yaml'));
    expect(result.localOverlayPath).toBe(path.join(result.workspaceRoot, '.openspec', 'local.yaml'));
    expect(result.changesPath).toBe(path.join(result.workspaceRoot, 'changes'));
    expect(result.gitignoreStatus).toBe('created');

    await assertWorkspaceLayout(result.workspaceRoot);

    const workspaceMetadata = parseYaml(await fs.readFile(result.metadataPath, 'utf-8'));
    const localOverlay = parseYaml(await fs.readFile(result.localOverlayPath, 'utf-8'));
    const gitignoreContent = await fs.readFile(path.join(result.workspaceRoot, '.gitignore'), 'utf-8');

    expect(workspaceMetadata).toEqual({
      version: 1,
      name: 'alpha-team',
      repos: {},
    });
    expect(localOverlay).toEqual({
      version: 1,
      repoPaths: {},
    });
    expect(gitignoreContent).toBe('/.openspec/local.yaml\n/.openspec/workspace-open/\n');
  });
});
