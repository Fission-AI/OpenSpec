import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';
import {
  readWorkspaceLocalOverlay,
  readWorkspaceMetadata,
  writeWorkspaceLocalOverlay,
  writeWorkspaceMetadata,
} from '../../../src/core/workspace/metadata.js';
import { openWorkspace } from '../../../src/core/workspace/open.js';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(
  fixture: 'happy-path' | 'dirty' = 'dirty'
): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture });
  sandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace open core behavior', () => {
  it('returns a workspace-root surface without attaching repo roots', async () => {
    const sandbox = await createSandbox('dirty');
    const result = await openWorkspace({ cwd: sandbox.workspaceRoot });
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);

    expect(result.mode).toBe('workspace-root');
    expect(result.agent).toBe('claude');
    expect(result.change).toBeNull();
    expect(result.workspaceRoot).toBe(canonicalWorkspaceRoot);
    expect(result.attachedRepos).toEqual([]);
    expect(result.availableChanges).toEqual(['shared-cleanup']);
    expect(result.registeredRepos).toEqual([
      { alias: 'api', path: sandbox.repoPaths.api, status: 'ready' },
      { alias: 'app', path: sandbox.repoPaths.app, status: 'ready' },
      {
        alias: 'docs',
        path: sandbox.overlayRepoPaths.docs,
        status: 'missing-repo-path',
        note: expect.stringContaining(`Target alias 'docs' points to a missing repo path`),
      },
    ]);
    expect(result.instructionSurface.path).toBe(path.join('.claude', 'commands', 'opsx', 'workspace-open.md'));
    expect(result.instructionSurface.content).toContain('Mode: workspace-root');
    expect(result.instructionSurface.content).toContain(`Workspace root: ${canonicalWorkspaceRoot}`);
    expect(result.instructionSurface.content).toContain('Registered repos:');
    expect(result.instructionSurface.content).toContain(`- api: ${sandbox.repoPaths.api}`);
    expect(result.instructionSurface.content).toContain(`- app: ${sandbox.repoPaths.app}`);
    expect(result.instructionSurface.content).toContain(`- docs: ${sandbox.overlayRepoPaths.docs}`);
    expect(result.instructionSurface.content).toContain('Active workspace changes:\n- shared-cleanup');
    expect(result.instructionSurface.content).toContain('Attached repos:\nnone');
  });

  it('attaches only the targeted repos for a change-scoped open', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });
    const canonicalChangePath = FileSystemUtils.canonicalizeExistingPath(
      sandbox.workspacePath('changes', 'shared-refresh')
    );

    const result = await openWorkspace({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
    });

    expect(result.mode).toBe('change-scoped');
    expect(result.change).toEqual({
      id: 'shared-refresh',
      path: canonicalChangePath,
    });
    expect(result.attachedRepos).toEqual([
      { alias: 'app', path: sandbox.repoPaths.app },
      { alias: 'api', path: sandbox.repoPaths.api },
    ]);
    expect(result.attachedRepos).not.toContainEqual({
      alias: 'docs',
      path: sandbox.overlayRepoPaths.docs,
    });
    expect(result.instructionSurface.content).toContain(`- app: ${sandbox.repoPaths.app}`);
    expect(result.instructionSurface.content).toContain(`- api: ${sandbox.repoPaths.api}`);
    expect(result.instructionSurface.content).not.toContain(`- docs: ${sandbox.overlayRepoPaths.docs}`);
  });

  it('includes repo owner or handoff guidance when it is configured in workspace metadata', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });

    const metadata = await readWorkspaceMetadata(sandbox.workspaceRoot);
    metadata.repos.app = {
      ...metadata.repos.app,
      owner: 'App Platform',
      handoff: 'Open the app repo-local change once the shared plan is approved',
    };
    metadata.repos.api = {
      ...metadata.repos.api,
      owner: 'API Platform',
    };
    await writeWorkspaceMetadata(sandbox.workspaceRoot, metadata);

    const result = await openWorkspace({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
    });

    expect(result.attachedRepos).toEqual([
      {
        alias: 'app',
        path: sandbox.repoPaths.app,
        owner: 'App Platform',
        handoff: 'Open the app repo-local change once the shared plan is approved',
      },
      {
        alias: 'api',
        path: sandbox.repoPaths.api,
        owner: 'API Platform',
      },
    ]);
    expect(result.instructionSurface.content).toContain('owner: App Platform');
    expect(result.instructionSurface.content).toContain(
      'handoff: Open the app repo-local change once the shared plan is approved'
    );
    expect(result.instructionSurface.content).toContain('owner: API Platform');
  });

  it('keeps older ownerless workspace fixtures readable without guidance fields', async () => {
    const sandbox = await createSandbox('happy-path');
    await createWorkspaceChange(sandbox.workspaceRoot, 'ownerless-open', {
      targets: 'app,docs',
    });

    const result = await openWorkspace({
      cwd: sandbox.workspaceRoot,
      change: 'ownerless-open',
    });

    expect(result.attachedRepos).toEqual([
      {
        alias: 'app',
        path: sandbox.repoPaths.app,
      },
      {
        alias: 'docs',
        path: sandbox.repoPaths.docs,
      },
    ]);
    expect(JSON.stringify(result.attachedRepos)).not.toContain('"owner"');
    expect(JSON.stringify(result.attachedRepos)).not.toContain('"handoff"');
    expect(result.instructionSurface.content).not.toContain('owner:');
    expect(result.instructionSurface.content).not.toContain('handoff:');
  });

  it('fails when any targeted repo is unresolved', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-broken', {
      targets: 'app,docs',
    });

    await expect(
      openWorkspace({
        cwd: sandbox.workspaceRoot,
        change: 'shared-broken',
      })
    ).rejects.toThrow(
      `Could not open workspace change 'shared-broken' because 1 targeted repo is unresolved:`
    );

    await expect(
      openWorkspace({
        cwd: sandbox.workspaceRoot,
        change: 'shared-broken',
      })
    ).rejects.toThrow(`Target alias 'docs' points to a missing repo path: ${sandbox.overlayRepoPaths.docs}`);
  });

  it('supports codex prompt surfaces when requested explicitly', async () => {
    const sandbox = await createSandbox('dirty');
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);
    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = sandbox.workspacePath('.codex-home');

    try {
      const result = await openWorkspace({
        cwd: sandbox.workspaceRoot,
        agent: 'codex',
      });

      expect(result.agent).toBe('codex');
      expect(result.instructionSurface.path).toBe(
        path.join(sandbox.workspacePath('.codex-home'), 'prompts', 'opsx-workspace-open.md')
      );
      expect(result.instructionSurface.content).toContain('description: Prepare a workspace-root coordination session');
      expect(result.instructionSurface.content).toContain('Mode: workspace-root');
      expect(result.instructionSurface.content).toContain(`Workspace root: ${canonicalWorkspaceRoot}`);
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });

  it('uses the stored preferred agent when one is configured in the workspace local overlay', async () => {
    const sandbox = await createSandbox('dirty');
    const localOverlay = await readWorkspaceLocalOverlay(sandbox.workspaceRoot);
    const originalCodexHome = process.env.CODEX_HOME;

    localOverlay.preferredAgent = 'codex';
    await writeWorkspaceLocalOverlay(sandbox.workspaceRoot, localOverlay);
    process.env.CODEX_HOME = sandbox.workspacePath('.codex-home');

    try {
      const result = await openWorkspace({
        cwd: sandbox.workspaceRoot,
      });

      expect(result.agent).toBe('codex');
      expect(result.instructionSurface.path).toBe(
        path.join(sandbox.workspacePath('.codex-home'), 'prompts', 'opsx-workspace-open.md')
      );
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });

  it('supports github copilot by writing a vscode workspace surface and prompt file', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);

    const result = await openWorkspace({
      cwd: sandbox.workspaceRoot,
      change: 'shared-refresh',
      agent: 'github-copilot',
    });

    expect(result.agent).toBe('github-copilot');
    expect(result.instructionSurface.path).toBe(path.join('.github', 'prompts', 'opsx-workspace-open.prompt.md'));
    expect(result.instructionSurface.content).toContain(
      'description: Prepare a change-scoped workspace session for shared-refresh'
    );
    expect(result.editorSurface).toEqual({
      kind: 'vscode-workspace',
      path: path.join(
        canonicalWorkspaceRoot,
        '.openspec',
        'workspace-open',
        'github-copilot',
        'shared-refresh.code-workspace'
      ),
      content: expect.any(String),
    });
    expect(result.editorSurface?.content).toContain(`"name": "workspace"`);
    expect(result.editorSurface?.content).toContain(`"path": "${canonicalWorkspaceRoot}"`);
    expect(result.editorSurface?.content).toContain(`"name": "app"`);
    expect(result.editorSurface?.content).toContain(`"path": "${sandbox.repoPaths.app}"`);
    expect(result.editorSurface?.content).toContain(`"name": "api"`);
    expect(result.editorSurface?.content).toContain(`"path": "${sandbox.repoPaths.api}"`);
    expect(result.editorSurface?.content).not.toContain(sandbox.overlayRepoPaths.docs);

    expect(
      await fs.readFile(
        path.join(sandbox.workspaceRoot, '.github', 'prompts', 'opsx-workspace-open.prompt.md'),
        'utf-8'
      )
    ).toBe(result.instructionSurface.content);
    expect(await fs.readFile(result.editorSurface!.path, 'utf-8')).toBe(result.editorSurface!.content);
    expect(await fs.readFile(path.join(sandbox.workspaceRoot, '.gitignore'), 'utf-8')).toContain(
      '/.openspec/workspace-open/'
    );
  });

  it('rejects unsupported workspace-open agents even when the adapter exists for that tool', async () => {
    const sandbox = await createSandbox('dirty');

    await expect(
      openWorkspace({
        cwd: sandbox.workspaceRoot,
        agent: 'cursor',
      })
    ).rejects.toThrow("Unsupported agent 'cursor' for workspace open. Supported agents: claude, codex, github-copilot.");
  });
});
