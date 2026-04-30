import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceOpenLaunchSpec,
} from '../../../src/core/workspace/open-launch.js';
import type { WorkspaceOpenResult } from '../../../src/core/workspace/open.js';

function createWorkspaceOpenResult(overrides: Partial<WorkspaceOpenResult> = {}): WorkspaceOpenResult {
  return {
    workspaceRoot: '/tmp/workspace-root',
    mode: 'workspace-root',
    agent: 'claude',
    change: null,
    attachedRepos: [],
    registeredRepos: [
      { alias: 'app', path: '/tmp/repos/app', status: 'ready' },
      { alias: 'api', path: '/tmp/repos/api', status: 'ready' },
    ],
    availableChanges: [],
    instructionSurface: {
      path: path.join('.claude', 'commands', 'opsx', 'workspace-open.md'),
      content: 'prompt',
    },
    ...overrides,
  };
}

describe('workspace open launch spec', () => {
  it('builds a codex launch with add-dir flags for change-scoped repos', () => {
    const result = createWorkspaceOpenResult({
      agent: 'codex',
      mode: 'change-scoped',
      change: {
        id: 'shared-refresh',
        path: '/tmp/workspace-root/changes/shared-refresh',
      },
      attachedRepos: [
        { alias: 'app', path: '/tmp/repos/app' },
        { alias: 'api', path: '/tmp/repos/api' },
      ],
    });

    const spec = buildWorkspaceOpenLaunchSpec(result);

    expect(spec).toEqual({
      command: 'codex',
      args: [
        '-C',
        '/tmp/workspace-root',
        '--add-dir',
        '/tmp/repos/app',
        '--add-dir',
        '/tmp/repos/api',
        expect.stringContaining('Mode: change-scoped'),
      ],
      cwd: '/tmp/workspace-root',
    });
  });

  it('builds a claude resume launch for an upgraded change-scoped session', () => {
    const result = createWorkspaceOpenResult({
      mode: 'change-scoped',
      change: {
        id: 'shared-refresh',
        path: '/tmp/workspace-root/changes/shared-refresh',
      },
      attachedRepos: [
        { alias: 'app', path: '/tmp/repos/app' },
      ],
    });

    const spec = buildWorkspaceOpenLaunchSpec(result, { resume: true });

    expect(spec).toEqual({
      command: 'claude',
      args: [
        '--continue',
        '--add-dir',
        '/tmp/repos/app',
        expect.stringContaining('Change ID: shared-refresh'),
      ],
      cwd: '/tmp/workspace-root',
    });
  });

  it('builds a VS Code launch for github copilot editor surfaces', () => {
    const result = createWorkspaceOpenResult({
      agent: 'github-copilot',
      editorSurface: {
        kind: 'vscode-workspace',
        path: '/tmp/workspace-root/.openspec/workspace-open/github-copilot/planning.code-workspace',
        content: '{}\n',
      },
    });

    const spec = buildWorkspaceOpenLaunchSpec(result);

    expect(spec).toEqual({
      command: 'code',
      args: ['-r', '/tmp/workspace-root/.openspec/workspace-open/github-copilot/planning.code-workspace'],
      cwd: '/tmp/workspace-root',
    });
  });
});
