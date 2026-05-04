import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir } from '../../../src/core/global-config.js';
import {
  MANAGED_WORKSPACES_DIR_NAME,
  WORKSPACE_CHANGES_DIR_NAME,
  WORKSPACE_LOCAL_STATE_FILE_NAME,
  WORKSPACE_LOCAL_STATE_IGNORE_PATTERN,
  WORKSPACE_METADATA_DIR_NAME,
  WORKSPACE_REGISTRY_FILE_NAME,
  WORKSPACE_SHARED_STATE_FILE_NAME,
  findWorkspaceRoot,
  getManagedWorkspaceRoot,
  getManagedWorkspacesDir,
  getWorkspaceChangesDir,
  getWorkspaceLocalStatePath,
  getWorkspaceMetadataDir,
  getWorkspacePortableIgnorePatterns,
  getWorkspaceRegistryPath,
  getWorkspaceSharedStatePath,
  isValidWorkspaceLinkName,
  isValidWorkspaceName,
  isWorkspaceRoot,
  listWorkspaceRegistryEntries,
  parseWorkspaceLocalState,
  parseWorkspaceRegistryState,
  parseWorkspaceSharedState,
  parseWorkspaceSetupLinkInput,
  readWorkspaceLocalState,
  readOptionalWorkspaceLocalState,
  readWorkspaceRegistryState,
  readWorkspaceSharedState,
  serializeWorkspaceLocalState,
  workspaceChangesDirExists,
  writeWorkspaceLocalState,
  writeWorkspaceRegistryState,
} from '../../../src/core/workspace/index.js';

describe('workspace foundation', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-foundation-'));
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createWorkspaceRoot(name = 'platform'): string {
    const workspaceRoot = path.join(tempDir, name);
    fs.mkdirSync(path.join(workspaceRoot, WORKSPACE_METADATA_DIR_NAME), { recursive: true });
    fs.mkdirSync(path.join(workspaceRoot, WORKSPACE_CHANGES_DIR_NAME), { recursive: true });
    fs.writeFileSync(
      path.join(workspaceRoot, WORKSPACE_METADATA_DIR_NAME, WORKSPACE_SHARED_STATE_FILE_NAME),
      `version: 1
name: ${name}
links: {}
`
    );
    fs.writeFileSync(
      path.join(workspaceRoot, WORKSPACE_METADATA_DIR_NAME, WORKSPACE_LOCAL_STATE_FILE_NAME),
      `version: 1
paths: {}
`
    );

    return workspaceRoot;
  }

  describe('path helpers', () => {
    it('exposes the workspace constants', () => {
      expect(WORKSPACE_METADATA_DIR_NAME).toBe('.openspec-workspace');
      expect(WORKSPACE_SHARED_STATE_FILE_NAME).toBe('workspace.yaml');
      expect(WORKSPACE_LOCAL_STATE_FILE_NAME).toBe('local.yaml');
      expect(WORKSPACE_CHANGES_DIR_NAME).toBe('changes');
      expect(MANAGED_WORKSPACES_DIR_NAME).toBe('workspaces');
      expect(WORKSPACE_REGISTRY_FILE_NAME).toBe('registry.yaml');
    });

    it('returns workspace file paths using platform-aware path helpers', () => {
      const workspaceRoot = path.join(tempDir, 'platform');

      expect(getWorkspaceMetadataDir(workspaceRoot)).toBe(
        path.join(workspaceRoot, '.openspec-workspace')
      );
      expect(getWorkspaceSharedStatePath(workspaceRoot)).toBe(
        path.join(workspaceRoot, '.openspec-workspace', 'workspace.yaml')
      );
      expect(getWorkspaceLocalStatePath(workspaceRoot)).toBe(
        path.join(workspaceRoot, '.openspec-workspace', 'local.yaml')
      );
      expect(getWorkspaceChangesDir(workspaceRoot)).toBe(path.join(workspaceRoot, 'changes'));
    });

    it('preserves Windows-style location strings when building workspace file paths', () => {
      const workspaceRoot = 'D:\\repos\\platform-workspace';

      expect(getWorkspaceSharedStatePath(workspaceRoot)).toBe(
        'D:\\repos\\platform-workspace\\.openspec-workspace\\workspace.yaml'
      );
      expect(getWorkspaceLocalStatePath(workspaceRoot)).toBe(
        'D:\\repos\\platform-workspace\\.openspec-workspace\\local.yaml'
      );
    });

    it('uses getGlobalDataDir for managed workspace and registry locations', () => {
      process.env.XDG_DATA_HOME = tempDir;

      expect(getManagedWorkspacesDir()).toBe(path.join(tempDir, 'openspec', 'workspaces'));
      expect(getManagedWorkspaceRoot('platform')).toBe(
        path.join(tempDir, 'openspec', 'workspaces', 'platform')
      );
      expect(getWorkspaceRegistryPath()).toBe(
        path.join(tempDir, 'openspec', 'workspaces', 'registry.yaml')
      );
    });

    it('uses the Linux data-dir fallback under the managed workspaces directory', () => {
      const dataDir = getGlobalDataDir({
        env: {},
        platform: 'linux',
        homedir: '/home/tabish',
      });

      expect(getManagedWorkspacesDir({ globalDataDir: dataDir })).toBe(
        '/home/tabish/.local/share/openspec/workspaces'
      );
    });

    it('uses the native Windows data-dir fallback under the managed workspaces directory', () => {
      const dataDir = getGlobalDataDir({
        env: {},
        platform: 'win32',
        homedir: 'C:\\Users\\Tabish',
      });

      expect(getManagedWorkspacesDir({ globalDataDir: dataDir })).toBe(
        'C:\\Users\\Tabish\\AppData\\Local\\openspec\\workspaces'
      );
    });

    it('exposes the portable collaboration ignore rule for local state', () => {
      expect(WORKSPACE_LOCAL_STATE_IGNORE_PATTERN).toBe('.openspec-workspace/local.yaml');
      expect(getWorkspacePortableIgnorePatterns()).toEqual(['.openspec-workspace/local.yaml']);
    });
  });

  describe('name validation', () => {
    it('accepts kebab-case workspace names and folder-style link names', () => {
      expect(isValidWorkspaceName('platform')).toBe(true);
      expect(isValidWorkspaceName('checkout-web')).toBe(true);
      expect(isValidWorkspaceName('api2')).toBe(true);
      expect(isValidWorkspaceLinkName('billing')).toBe(true);
      expect(isValidWorkspaceLinkName('Checkout App')).toBe(true);
    });

    it('rejects invalid workspace names while keeping link names folder-style', () => {
      for (const invalidName of [
        '',
        '.',
        '..',
        'bad/name',
        'bad\\name',
        'Checkout',
        'checkout_app',
        'checkout.app',
        'checkout app',
        '-checkout',
        'checkout-',
        'checkout--web',
      ]) {
        expect(isValidWorkspaceName(invalidName)).toBe(false);
      }

      for (const invalidName of ['', '.', '..', 'bad/name', 'bad\\name']) {
        expect(isValidWorkspaceLinkName(invalidName)).toBe(false);
      }
    });
  });

  describe('workspace folder detection', () => {
    it('detects a workspace folder from itself and nested directories', async () => {
      const workspaceRoot = createWorkspaceRoot();
      const nestedDir = path.join(workspaceRoot, 'changes', 'add-billing', 'specs');
      fs.mkdirSync(nestedDir, { recursive: true });

      await expect(isWorkspaceRoot(workspaceRoot)).resolves.toBe(true);
      await expect(findWorkspaceRoot(workspaceRoot)).resolves.toBe(workspaceRoot);
      await expect(findWorkspaceRoot(nestedDir)).resolves.toBe(workspaceRoot);
      await expect(workspaceChangesDirExists(workspaceRoot)).resolves.toBe(true);
    });

    it('does not enter workspace mode for directories that only contain changes', async () => {
      const notWorkspace = path.join(tempDir, 'plain-changes-root');
      fs.mkdirSync(path.join(notWorkspace, 'changes'), { recursive: true });

      await expect(isWorkspaceRoot(notWorkspace)).resolves.toBe(false);
      await expect(findWorkspaceRoot(path.join(notWorkspace, 'changes'))).resolves.toBe(null);
    });

    it('does not mistake repo-local openspec projects for coordination workspaces', async () => {
      const repoRoot = path.join(tempDir, 'repo');
      fs.mkdirSync(path.join(repoRoot, 'openspec', 'changes', 'add-feature'), {
        recursive: true,
      });
      fs.mkdirSync(path.join(repoRoot, 'openspec', 'specs'), { recursive: true });

      await expect(findWorkspaceRoot(path.join(repoRoot, 'openspec', 'changes'))).resolves.toBe(
        null
      );
    });

    it('detects a workspace even when a linked path has no repo-local openspec state', async () => {
      const workspaceRoot = createWorkspaceRoot();
      const linkedPath = path.join(workspaceRoot, 'external-folder');
      fs.mkdirSync(linkedPath, { recursive: true });

      await expect(findWorkspaceRoot(linkedPath)).resolves.toBe(workspaceRoot);
    });
  });

  describe('state parsing', () => {
    it('parses shared workspace state with stable link names', () => {
      const state = parseWorkspaceSharedState(`version: 1
name: platform
links:
  api: {}
  web:
    note: planning only
`);

      expect(state).toEqual({
        version: 1,
        name: 'platform',
        links: {
          api: {},
          web: { note: 'planning only' },
        },
      });
    });

    it('rejects invalid shared-state versions, names, and link maps', () => {
      expect(() => parseWorkspaceSharedState('version: 2\nname: platform\nlinks: {}\n')).toThrow(
        /Invalid workspace shared state/
      );
      expect(() => parseWorkspaceSharedState('version: 1\nname: bad/name\nlinks: {}\n')).toThrow(
        /Workspace name/
      );
      expect(() =>
        parseWorkspaceSharedState('version: 1\nname: platform\nlinks:\n  bad/name: {}\n')
      ).toThrow(/workspace link name/);
      expect(() =>
        parseWorkspaceSharedState('version: 1\nname: platform\nlinks:\n  api: nope\n')
      ).toThrow(/Invalid workspace shared state/);
    });

    it('parses local state while preserving native Windows and WSL2-style paths', () => {
      const state = parseWorkspaceLocalState(String.raw`version: 1
paths:
  windows: D:\repos\api
  wsl: /mnt/d/repos/api
  linux: /home/tabish/repos/api
`);

      expect(state.paths.windows).toBe('D:\\repos\\api');
      expect(state.paths.wsl).toBe('/mnt/d/repos/api');
      expect(state.paths.linux).toBe('/home/tabish/repos/api');
    });

    it('serializes and writes local state without normalizing runtime-local paths', async () => {
      const workspaceRoot = path.join(tempDir, 'roundtrip');
      const localState = {
        version: 1 as const,
        paths: {
          windows: 'D:\\repos\\api',
          wsl: '/mnt/d/repos/api',
        },
      };

      expect(parseWorkspaceLocalState(serializeWorkspaceLocalState(localState))).toEqual(
        localState
      );

      await writeWorkspaceLocalState(workspaceRoot, localState);

      await expect(readWorkspaceLocalState(workspaceRoot)).resolves.toEqual(localState);
    });

    it('rejects invalid local-state versions, link names, and path maps', () => {
      expect(() => parseWorkspaceLocalState('version: 2\npaths: {}\n')).toThrow(
        /Invalid workspace local state/
      );
      expect(() => parseWorkspaceLocalState('version: 1\npaths:\n  ../api: /repo\n')).toThrow(
        /workspace local path name/
      );
      expect(() => parseWorkspaceLocalState('version: 1\npaths:\n  api: 42\n')).toThrow(
        /Invalid workspace local state/
      );
      expect(() => parseWorkspaceLocalState('version: 1\npaths: []\n')).toThrow(
        /Invalid workspace local state/
      );
    });

    it('reads shared and local state from a workspace folder', async () => {
      const workspaceRoot = createWorkspaceRoot();

      await expect(readWorkspaceSharedState(workspaceRoot)).resolves.toEqual({
        version: 1,
        name: 'platform',
        links: {},
      });
      await expect(readWorkspaceLocalState(workspaceRoot)).resolves.toEqual({
        version: 1,
        paths: {},
      });
    });

    it('returns null only when optional local state is absent', async () => {
      const workspaceRoot = createWorkspaceRoot();
      fs.rmSync(getWorkspaceLocalStatePath(workspaceRoot));

      await expect(readOptionalWorkspaceLocalState(workspaceRoot)).resolves.toBeNull();
    });

    it('rejects invalid optional local state instead of treating it as missing', async () => {
      const workspaceRoot = createWorkspaceRoot();
      fs.writeFileSync(getWorkspaceLocalStatePath(workspaceRoot), 'version: 1\npaths: []\n');

      await expect(readOptionalWorkspaceLocalState(workspaceRoot)).rejects.toThrow(
        /Invalid workspace local state/
      );
    });
  });

  describe('workspace link input parsing', () => {
    it('preserves an existing path with equals signs as an inferred-name link input', async () => {
      const linkPath = path.join(tempDir, 'repos', 'foo=bar');
      fs.mkdirSync(linkPath, { recursive: true });

      await expect(parseWorkspaceSetupLinkInput(linkPath)).resolves.toEqual({
        pathInput: linkPath,
      });
    });

    it('parses explicit link names while preserving equals signs in the path', async () => {
      const linkPath = path.join(tempDir, 'repos', 'foo=bar');

      await expect(parseWorkspaceSetupLinkInput(`api=${linkPath}`)).resolves.toEqual({
        name: 'api',
        pathInput: linkPath,
      });
    });
  });

  describe('registry parsing', () => {
    it('parses the local workspace registry as a convenience index', () => {
      const staleWorkspaceRoot = path.join(tempDir, 'missing-workspace');
      const registry = parseWorkspaceRegistryState(`version: 1
workspaces:
  checkout: ${staleWorkspaceRoot}
  platform: ${path.join(tempDir, 'platform')}
`);

      expect(registry.workspaces.checkout).toBe(staleWorkspaceRoot);
      expect(listWorkspaceRegistryEntries(registry)).toEqual([
        { name: 'checkout', workspaceRoot: staleWorkspaceRoot },
        { name: 'platform', workspaceRoot: path.join(tempDir, 'platform') },
      ]);
    });

    it('rejects invalid registry versions, workspace names, and path maps', () => {
      expect(() => parseWorkspaceRegistryState('version: 2\nworkspaces: {}\n')).toThrow(
        /Invalid workspace registry state/
      );
      expect(() =>
        parseWorkspaceRegistryState('version: 1\nworkspaces:\n  ../platform: /workspace\n')
      ).toThrow(/workspace registry name/);
      expect(() =>
        parseWorkspaceRegistryState('version: 1\nworkspaces:\n  platform: {}\n')
      ).toThrow(/Invalid workspace registry state/);
    });

    it('reads the local registry from the standard registry path', async () => {
      const globalDataDir = path.join(tempDir, 'data', 'openspec');
      const registryPath = getWorkspaceRegistryPath({ globalDataDir });
      fs.mkdirSync(path.dirname(registryPath), { recursive: true });
      fs.writeFileSync(
        registryPath,
        `version: 1
workspaces:
  platform: ${path.join(tempDir, 'platform')}
`
      );

      await expect(readWorkspaceRegistryState({ globalDataDir })).resolves.toEqual({
        version: 1,
        workspaces: {
          platform: path.join(tempDir, 'platform'),
        },
      });
    });

    it('writes the local registry to the standard registry path', async () => {
      const globalDataDir = path.join(tempDir, 'data', 'openspec');
      const registry = {
        version: 1 as const,
        workspaces: {
          platform: path.join(tempDir, 'platform'),
        },
      };

      await writeWorkspaceRegistryState(registry, { globalDataDir });

      await expect(readWorkspaceRegistryState({ globalDataDir })).resolves.toEqual(registry);
    });

    it('returns null when the local registry has not been created', async () => {
      await expect(readWorkspaceRegistryState({ globalDataDir: tempDir })).resolves.toBeNull();
    });
  });
});
