import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { FileSystemUtils } from '../../../src/utils/file-system.js';
import {
  WORKSPACE_CHANGES_DIR_NAME,
  WORKSPACE_METADATA_DIR_NAME,
  WORKSPACE_VIEW_STATE_FILE_NAME,
  findWorkspaceRoot,
  getWorkspaceCodeWorkspaceFileName,
  getWorkspaceCodeWorkspacePath,
  getWorkspaceChangesDir,
  getWorkspaceMetadataDir,
  getWorkspacePortableIgnorePatterns,
  getWorkspaceViewStatePath,
  isValidWorkspaceLinkName,
  isValidWorkspaceName,
  isWorkspaceRoot,
  parseWorkspacePreferredOpenerValue,
  parseWorkspaceViewState,
  readWorkspaceViewState,
  serializeWorkspaceViewState,
  workspaceChangesDirExists,
  writeWorkspaceViewState,
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
    fs.mkdirSync(getWorkspaceMetadataDir(workspaceRoot), { recursive: true });
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
      expect(WORKSPACE_VIEW_STATE_FILE_NAME).toBe('view.yaml');
      expect(WORKSPACE_CHANGES_DIR_NAME).toBe('changes');
    });

    it('returns workspace file paths using platform-aware path helpers', () => {
      const workspaceRoot = path.join(tempDir, 'platform');

      expect(getWorkspaceMetadataDir(workspaceRoot)).toBe(
        path.join(workspaceRoot, '.openspec-workspace')
      );
      expect(getWorkspaceViewStatePath(workspaceRoot)).toBe(
        path.join(workspaceRoot, '.openspec-workspace', 'view.yaml')
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
        'D:\\repos\\platform-workspace\\.openspec-workspace\\view.yaml'
      );
    });


    it('keeps legacy portable ignore helper as an empty compatibility shim', () => {
      expect(getWorkspacePortableIgnorePatterns()).toEqual([]);
      expect(getWorkspacePortableIgnorePatterns('platform')).toEqual([]);
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

    it('ignores foreign root workspace.yaml files in repo-local projects', async () => {
      const repoRoot = path.join(tempDir, 'foreign-tool-repo');
      const nestedDir = path.join(repoRoot, 'openspec', 'changes', 'add-feature');
      fs.mkdirSync(nestedDir, { recursive: true });
      fs.writeFileSync(
        path.join(repoRoot, 'workspace.yaml'),
        `tool_workspace:
  projects:
    - name: example
      path: ./service
`
      );

      await expect(isWorkspaceRoot(repoRoot)).resolves.toBe(false);
      await expect(findWorkspaceRoot(nestedDir)).resolves.toBe(null);
    });

    it('ignores unmarked root view state even when it is OpenSpec-shaped', async () => {
      const workspaceRoot = path.join(tempDir, 'unmarked-beta-workspace');
      fs.mkdirSync(workspaceRoot, { recursive: true });
      fs.writeFileSync(
        path.join(workspaceRoot, 'workspace.yaml'),
        `version: 1
name: unmarked-beta-workspace
context: null
links: {}
`
      );

      await expect(isWorkspaceRoot(workspaceRoot)).resolves.toBe(false);
      await expect(findWorkspaceRoot(workspaceRoot)).resolves.toBe(null);
    });

    it('writes canonical view state inside the OpenSpec metadata directory', async () => {
      const workspaceRoot = path.join(tempDir, 'written-workspace');

      await writeWorkspaceViewState(workspaceRoot, {
        version: 1,
        name: 'written-workspace',
        context: null,
        links: {},
      });

      expect(fs.existsSync(getWorkspaceMetadataDir(workspaceRoot))).toBe(true);
      expect(fs.existsSync(getWorkspaceViewStatePath(workspaceRoot))).toBe(true);
      expect(fs.existsSync(path.join(workspaceRoot, 'workspace.yaml'))).toBe(false);
      await expect(isWorkspaceRoot(workspaceRoot)).resolves.toBe(true);
      expectSameExistingPath(await findWorkspaceRoot(workspaceRoot), workspaceRoot);
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
        id: 'codex-cli',
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
      expect(parseWorkspacePreferredOpenerValue('codex')).toEqual({
        kind: 'agent',
        id: 'codex-cli',
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

});
