import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir } from '../../../src/core/global-config.js';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import {
  MANAGED_WORKSPACES_DIR_NAME,
  WORKSPACE_CHANGES_DIR_NAME,
  WORKSPACE_METADATA_DIR_NAME,
  WORKSPACE_REGISTRY_FILE_NAME,
  WORKSPACE_VIEW_STATE_FILE_NAME,
  applyWorkspaceGuidanceBlock,
  buildWorkspaceCodeWorkspaceContent,
  buildWorkspaceGuidanceBlock,
  findWorkspaceRoot,
  getManagedWorkspaceRoot,
  getManagedWorkspacesDir,
  getWorkspaceCodeWorkspaceFileName,
  getWorkspaceCodeWorkspacePath,
  getWorkspaceChangesDir,
  getWorkspaceMetadataDir,
  getWorkspacePortableIgnorePatterns,
  getWorkspaceRegistryPath,
  getWorkspaceViewStatePath,
  isValidWorkspaceLinkName,
  isValidWorkspaceName,
  isWorkspaceRoot,
  isWorkspaceExecutableAvailable,
  listWorkspaceRegistryEntries,
  listWorkspaceOpenerChoices,
  parseWorkspacePreferredOpenerValue,
  parseWorkspaceRegistryState,
  parseWorkspaceSetupLinkInput,
  parseWorkspaceViewState,
  readWorkspaceRegistryState,
  readWorkspaceViewState,
  serializeWorkspaceViewState,
  syncWorkspaceOpenSurface,
  workspaceChangesDirExists,
  writeWorkspaceViewState,
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
    fs.mkdirSync(workspaceRoot, { recursive: true });
    fs.writeFileSync(
      getWorkspaceViewStatePath(workspaceRoot),
      `version: 1
name: ${name}
context: null
links: {}
`
    );

    return workspaceRoot;
  }

  function expectedExistingPath(existingPath: string): string {
    return fs.realpathSync.native(existingPath);
  }

  function expectSameExistingPath(actualPath: string | null, expectedPath: string): void {
    expect(actualPath).not.toBeNull();
    expect(fs.realpathSync.native(actualPath as string)).toBe(expectedExistingPath(expectedPath));
  }

  describe('path helpers', () => {
    it('exposes the workspace constants', () => {
      expect(WORKSPACE_METADATA_DIR_NAME).toBe('.openspec-workspace');
      expect(WORKSPACE_VIEW_STATE_FILE_NAME).toBe('workspace.yaml');
      expect(WORKSPACE_CHANGES_DIR_NAME).toBe('changes');
      expect(MANAGED_WORKSPACES_DIR_NAME).toBe('workspaces');
      expect(WORKSPACE_REGISTRY_FILE_NAME).toBe('registry.yaml');
    });

    it('returns workspace file paths using platform-aware path helpers', () => {
      const workspaceRoot = path.join(tempDir, 'platform');

      expect(getWorkspaceMetadataDir(workspaceRoot)).toBe(
        path.join(workspaceRoot, '.openspec-workspace')
      );
      expect(getWorkspaceViewStatePath(workspaceRoot)).toBe(
        path.join(workspaceRoot, 'workspace.yaml')
      );
      expect(getWorkspaceChangesDir(workspaceRoot)).toBe(path.join(workspaceRoot, 'changes'));
      expect(getWorkspaceCodeWorkspaceFileName('platform')).toBe('platform.code-workspace');
      expect(getWorkspaceCodeWorkspacePath(workspaceRoot, 'platform')).toBe(
        path.join(workspaceRoot, 'platform.code-workspace')
      );
    });

    it('preserves Windows-style location strings when building workspace file paths', () => {
      const workspaceRoot = 'D:\\repos\\platform-workspace';

      expect(getWorkspaceViewStatePath(workspaceRoot)).toBe(
        'D:\\repos\\platform-workspace\\workspace.yaml'
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
      expect(getWorkspacePortableIgnorePatterns()).toEqual([]);
      expect(getWorkspacePortableIgnorePatterns('platform')).toEqual([
        'platform.code-workspace',
      ]);
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
      expectSameExistingPath(await findWorkspaceRoot(workspaceRoot), workspaceRoot);
      expectSameExistingPath(await findWorkspaceRoot(nestedDir), workspaceRoot);
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

      expectSameExistingPath(await findWorkspaceRoot(linkedPath), workspaceRoot);
    });

    it('keeps detected workspace roots comparable through symlink or junction aliases', async () => {
      const workspaceRoot = createWorkspaceRoot('real-platform');
      const aliasRoot = path.join(tempDir, 'alias-platform');
      fs.symlinkSync(workspaceRoot, aliasRoot, process.platform === 'win32' ? 'junction' : 'dir');

      expectSameExistingPath(await findWorkspaceRoot(aliasRoot), workspaceRoot);
      expectSameExistingPath(
        await findWorkspaceRoot(path.join(aliasRoot, 'changes', 'add-billing')),
        workspaceRoot
      );
    });

    it('canonicalizes detected workspace roots before returning them', async () => {
      const workspaceRoot = createWorkspaceRoot();
      const canonicalize = vi.spyOn(FileSystemUtils, 'canonicalizeExistingPath');

      try {
        await expect(findWorkspaceRoot(workspaceRoot)).resolves.toBe(expectedExistingPath(workspaceRoot));
        expect(canonicalize).toHaveBeenCalledWith(workspaceRoot);
      } finally {
        canonicalize.mockRestore();
      }
    });
  });

  describe('state parsing', () => {
    it('parses canonical workspace state with stable link names and paths', () => {
      const state = parseWorkspaceViewState(`version: 1
name: platform
context: null
links:
  api: /repos/api
  web: null
`);

      expect(state).toEqual({
        version: 1,
        name: 'platform',
        context: null,
        links: {
          api: '/repos/api',
          web: null,
        },
      });
    });

    it('parses path-bound initiative context in workspace state', () => {
      const state = parseWorkspaceViewState(`version: 1
name: scratch-launch
context:
  kind: initiative
  store:
    id: scratch-context
    selector:
      kind: path
      path: /Users/me/context/scratch
      observed_id: scratch-context
  initiative:
    id: scratch-launch
links: {}
`);

      expect(state.context).toEqual({
        kind: 'initiative',
        store: {
          id: 'scratch-context',
          selector: {
            kind: 'path',
            path: '/Users/me/context/scratch',
            observed_id: 'scratch-context',
          },
        },
        initiative: {
          id: 'scratch-launch',
        },
      });
      expect(parseWorkspaceViewState(serializeWorkspaceViewState(state))).toEqual(state);
    });

    it('rejects the unshipped flat initiative context shape', () => {
      expect(() =>
        parseWorkspaceViewState(`version: 1
name: billing-launch
context:
  store: platform
  initiative: billing-launch
links: {}
`)
      ).toThrow(/Invalid workspace state/);
    });

    it('parses and serializes structured preferred openers in canonical state', () => {
      const state = parseWorkspaceViewState(`version: 1
name: platform
context: null
links:
  api: /repo/api
preferred_opener:
  kind: agent
  id: codex
`);

      expect(state.preferred_opener).toEqual({
        kind: 'agent',
        id: 'codex',
      });
      expect(parseWorkspaceViewState(serializeWorkspaceViewState(state))).toEqual(state);
      expect(parseWorkspacePreferredOpenerValue('editor')).toEqual({
        kind: 'editor',
        id: 'vscode',
      });
      expect(parseWorkspacePreferredOpenerValue('github-copilot')).toEqual({
        kind: 'agent',
        id: 'github-copilot',
      });
    });

    it('writes canonical view state without normalizing paths', async () => {
      const workspaceRoot = path.join(tempDir, 'roundtrip');
      const viewState = {
        version: 1 as const,
        name: 'roundtrip',
        context: null,
        links: {
          windows: 'D:\\repos\\api',
          wsl: '/mnt/d/repos/api',
        },
      };

      await writeWorkspaceViewState(workspaceRoot, viewState);

      await expect(readWorkspaceViewState(workspaceRoot)).resolves.toEqual(viewState);
    });

    it('rejects invalid canonical state versions, link names, paths, and openers', () => {
      expect(() =>
        parseWorkspaceViewState('version: 2\nname: platform\ncontext: null\nlinks: {}\n')
      ).toThrow(/Invalid workspace state/);
      expect(() =>
        parseWorkspaceViewState('version: 1\nname: bad/name\ncontext: null\nlinks: {}\n')
      ).toThrow(/Workspace name/);
      expect(() =>
        parseWorkspaceViewState('version: 1\nname: platform\ncontext: null\nlinks:\n  bad/name: /repo\n')
      ).toThrow(/workspace link name/);
      expect(() =>
        parseWorkspaceViewState('version: 1\nname: platform\ncontext: null\nlinks:\n  api: 42\n')
      ).toThrow(/Invalid workspace state/);
      expect(() =>
        parseWorkspaceViewState(
          'version: 1\nname: platform\ncontext: null\nlinks: {}\npreferred_opener:\n  kind: agent\n  id: editor\n'
        )
      ).toThrow(/Unsupported workspace opener/);
      expect(() => parseWorkspacePreferredOpenerValue('cursor')).toThrow(
        /Unsupported workspace opener/
      );
    });

    it('rejects invalid canonical state instead of treating it as missing', async () => {
      const workspaceRoot = createWorkspaceRoot();
      fs.writeFileSync(getWorkspaceViewStatePath(workspaceRoot), 'version: 1\npaths: []\n');

      await expect(readWorkspaceViewState(workspaceRoot)).rejects.toThrow(
        /Invalid workspace state/
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

  describe('open surface sync', () => {
    it('builds and refreshes managed workspace guidance while preserving user content', () => {
      const existing = `# Team Notes

Keep this.

${buildWorkspaceGuidanceBlock()}

After block.
`;

      const refreshed = applyWorkspaceGuidanceBlock(existing);

      expect(refreshed).toContain('# Team Notes');
      expect(refreshed).toContain('Keep this.');
      expect(refreshed).toContain('After block.');
      expect(refreshed.match(/OPENSPEC:WORKSPACE-GUIDANCE:START/gu)).toHaveLength(1);
      expect(applyWorkspaceGuidanceBlock('# Team Notes\n')).toContain(
        '<!-- OPENSPEC:WORKSPACE-GUIDANCE:START -->'
      );
    });

    it('builds VS Code workspace content with stable root and linked paths', () => {
      const content = buildWorkspaceCodeWorkspaceContent([
        {
          name: 'api',
          path: '/repos/api',
        },
        {
          name: 'windows',
          path: 'D:\\repos\\web',
        },
      ]);
      const payload = JSON.parse(content);

      expect(payload.folders).toEqual([
        {
          path: '.',
        },
        {
          name: 'api',
          path: '/repos/api',
        },
        {
          name: 'windows',
          path: 'D:\\repos\\web',
        },
      ]);
    });

    it('syncs AGENTS, the maintained code-workspace file, and scoped ignore rules', async () => {
      const workspaceRoot = createWorkspaceRoot();
      const api = path.join(tempDir, 'api');
      const missing = path.join(tempDir, 'missing');
      fs.mkdirSync(api, { recursive: true });
      fs.writeFileSync(path.join(workspaceRoot, 'AGENTS.md'), '# Existing\n');
      fs.writeFileSync(path.join(workspaceRoot, '.gitignore'), '*.code-workspace\n');
      const workspaceState = {
        version: 1 as const,
        name: 'platform',
        context: null,
        links: {
          api,
          missing,
          noPath: null,
        },
      };

      const result = await syncWorkspaceOpenSurface(
        workspaceRoot,
        workspaceState
      );

      expect(result.links).toEqual([{ name: 'api', path: api }]);
      expect(result.skipped).toEqual([
        { name: 'missing', path: missing, reason: 'path-missing' },
        { name: 'noPath', path: null, reason: 'missing-local-path' },
      ]);
      expect(fs.readFileSync(path.join(workspaceRoot, 'AGENTS.md'), 'utf-8')).toContain(
        'Use initiatives for durable cross-team or cross-repo intent'
      );
      expect(JSON.parse(fs.readFileSync(getWorkspaceCodeWorkspacePath(workspaceRoot, 'platform'), 'utf-8')).folders).toEqual([
        {
          path: '.',
        },
        {
          name: 'api',
          path: api,
        },
      ]);
      expect(fs.readFileSync(path.join(workspaceRoot, '.gitignore'), 'utf-8')).toContain(
        '*.code-workspace\nplatform.code-workspace\n'
      );
    });
  });

  describe('opener detection', () => {
    it('detects simple opener executables and orders available choices first', () => {
      const binDir = path.join(tempDir, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      const codePath = path.join(binDir, process.platform === 'win32' ? 'code.cmd' : 'code');
      fs.writeFileSync(codePath, '');
      fs.chmodSync(codePath, 0o755);
      const env = {
        PATH: binDir,
        PATHEXT: '.CMD',
      };

      expect(isWorkspaceExecutableAvailable('code', { env, platform: process.platform })).toBe(true);
      expect(isWorkspaceExecutableAvailable('codex', { env, platform: process.platform })).toBe(false);

      const choices = listWorkspaceOpenerChoices({ env, platform: process.platform });
      expect(choices.slice(0, 2).map((choice) => choice.value).sort()).toEqual([
        'editor',
        'github-copilot',
      ]);
      expect(choices.find((choice) => choice.value === 'codex')?.unavailableNote).toContain(
        'codex not found on PATH'
      );
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
