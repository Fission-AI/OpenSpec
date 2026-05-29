import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getWorkspaceMetadataDir,
  getWorkspaceViewStatePath,
  parseWorkspacePreferredOpenerValue,
  parseWorkspaceViewState,
  readWorkspaceViewState,
  serializeWorkspaceViewState,
  writeWorkspaceViewState,
} from '../../../src/core/workspace/index.js';
import {
  WORKSPACE_LEGACY_LOCAL_STATE_FILE_NAME,
  WORKSPACE_LEGACY_LOCAL_STATE_IGNORE_PATTERN,
  WORKSPACE_LEGACY_SHARED_STATE_FILE_NAME,
  getWorkspaceLegacyLocalStatePath,
  getWorkspaceLegacySharedStatePath,
  parseWorkspaceLocalState,
  parseWorkspaceSharedState,
  serializeWorkspaceLocalState,
  workspaceStatePartsToViewState,
  workspaceViewToLocalState,
  workspaceViewToSharedState,
} from '../../../src/core/workspace/legacy-state.js';

describe('workspace legacy state compatibility', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-legacy-'));
  });

  afterEach(() => {
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

  it('keeps legacy file helpers isolated from canonical workspace helpers', () => {
    const workspaceRoot = path.join(tempDir, 'platform');

    expect(WORKSPACE_LEGACY_SHARED_STATE_FILE_NAME).toBe('workspace.yaml');
    expect(WORKSPACE_LEGACY_LOCAL_STATE_FILE_NAME).toBe('local.yaml');
    expect(WORKSPACE_LEGACY_LOCAL_STATE_IGNORE_PATTERN).toBe('.openspec-workspace/local.yaml');
    expect(getWorkspaceLegacySharedStatePath(workspaceRoot)).toBe(
      path.join(workspaceRoot, '.openspec-workspace', 'workspace.yaml')
    );
    expect(getWorkspaceLegacyLocalStatePath(workspaceRoot)).toBe(
      path.join(workspaceRoot, '.openspec-workspace', 'local.yaml')
    );
    expect(getWorkspaceLegacyLocalStatePath('D:\\repos\\platform-workspace')).toBe(
      'D:\\repos\\platform-workspace\\.openspec-workspace\\local.yaml'
    );
  });

  it('parses and validates legacy shared state', () => {
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
      context: null,
      links: {
        api: {},
        web: { note: 'planning only' },
      },
    });
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

  it('parses, serializes, and validates legacy local state', () => {
    const state = parseWorkspaceLocalState(String.raw`version: 1
paths:
  windows: D:\repos\api
  wsl: /mnt/d/repos/api
  linux: /home/tabish/repos/api
`);

    expect(state.paths.windows).toBe('D:\\repos\\api');
    expect(state.paths.wsl).toBe('/mnt/d/repos/api');
    expect(state.paths.linux).toBe('/home/tabish/repos/api');

    const codexState = parseWorkspaceLocalState(`version: 1
paths:
  api: /repo/api
preferred_opener:
  kind: agent
  id: codex
`);
    expect(codexState.preferred_opener).toEqual({
      kind: 'agent',
      id: 'codex-cli',
    });
    expect(parseWorkspaceLocalState(serializeWorkspaceLocalState(codexState))).toEqual(
      codexState
    );
    expect(parseWorkspacePreferredOpenerValue('editor')).toEqual({
      kind: 'editor',
      id: 'vscode',
    });

    expect(() => parseWorkspaceLocalState('version: 2\npaths: {}\n')).toThrow(
      /Invalid workspace local state/
    );
    expect(() => parseWorkspaceLocalState('version: 1\npaths:\n  ../api: /repo\n')).toThrow(
      /workspace local path name/
    );
    expect(() => parseWorkspaceLocalState('version: 1\npaths:\n  api: 42\n')).toThrow(
      /Invalid workspace local state/
    );
    expect(() =>
      parseWorkspaceLocalState(
        'version: 1\npaths: {}\npreferred_opener:\n  kind: agent\n  id: editor\n'
      )
    ).toThrow(/Unsupported workspace opener/);
  });

  it('converts legacy state parts to and from canonical view state', async () => {
    const workspaceRoot = path.join(tempDir, 'roundtrip');
    const viewState = workspaceStatePartsToViewState(
      {
        version: 1,
        name: 'roundtrip',
        context: null,
        links: {
          api: {},
          web: {},
        },
      },
      {
        version: 1,
        paths: {
          api: '/repos/api',
        },
      }
    );

    expect(viewState.links).toEqual({
      api: '/repos/api',
      web: null,
    });
    expect(parseWorkspaceViewState(serializeWorkspaceViewState(viewState))).toEqual(viewState);
    expect(workspaceViewToSharedState(viewState).links).toEqual({
      api: {},
      web: {},
    });
    expect(workspaceViewToLocalState(viewState).paths).toEqual({
      api: '/repos/api',
    });

    await writeWorkspaceViewState(workspaceRoot, viewState);
    await expect(readWorkspaceViewState(workspaceRoot)).resolves.toEqual(viewState);
  });

  it('reads legacy split state through the canonical view-state reader', async () => {
    const workspaceRoot = createWorkspaceRoot();
    fs.rmSync(getWorkspaceViewStatePath(workspaceRoot));
    fs.mkdirSync(getWorkspaceMetadataDir(workspaceRoot), { recursive: true });
    fs.writeFileSync(
      getWorkspaceLegacySharedStatePath(workspaceRoot),
      `version: 1
name: platform
context: null
links:
  api: {}
`
    );
    fs.writeFileSync(
      getWorkspaceLegacyLocalStatePath(workspaceRoot),
      `version: 1
paths:
  api: /repos/api
`
    );

    await expect(readWorkspaceViewState(workspaceRoot)).resolves.toEqual({
      version: 1,
      name: 'platform',
      context: null,
      links: {
        api: '/repos/api',
      },
    });
  });
});
