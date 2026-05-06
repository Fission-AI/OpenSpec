import { describe, expect, it } from 'vitest';

import {
  assertWorkspaceOpenerAvailable,
  buildWorkspaceOpenLaunchCommand,
  launchWorkspaceOpenCommand,
} from '../../src/commands/workspace/open.js';

describe('workspace open launchers', () => {
  it('builds launcher commands for VS Code, GitHub Copilot, Codex, and Claude', () => {
    expect(
      buildWorkspaceOpenLaunchCommand(
        { kind: 'editor', id: 'vscode' },
        '/workspace',
        '/workspace/platform.code-workspace',
        ['/repos/api']
      )
    ).toEqual({
      executable: 'code',
      args: ['/workspace/platform.code-workspace'],
      cwd: '/workspace',
      openerLabel: 'VS Code editor',
    });

    expect(
      buildWorkspaceOpenLaunchCommand(
        { kind: 'agent', id: 'github-copilot' },
        '/workspace',
        '/workspace/platform.code-workspace',
        ['/repos/api']
      )
    ).toEqual({
      executable: 'code',
      args: ['/workspace/platform.code-workspace'],
      cwd: '/workspace',
      openerLabel: 'GitHub Copilot in VS Code',
    });

    expect(
      buildWorkspaceOpenLaunchCommand(
        { kind: 'agent', id: 'codex' },
        '/workspace',
        '/workspace/platform.code-workspace',
        ['/repos/api', '/repos/web']
      )
    ).toEqual({
      executable: 'codex',
      args: [
        '--add-dir',
        '/repos/api',
        '--add-dir',
        '/repos/web',
        'Open this OpenSpec workspace.',
      ],
      cwd: '/workspace',
      openerLabel: 'Codex',
    });

    expect(
      buildWorkspaceOpenLaunchCommand(
        { kind: 'agent', id: 'claude' },
        '/workspace',
        '/workspace/platform.code-workspace',
        ['/repos/api']
      )
    ).toEqual({
      executable: 'claude',
      args: ['--add-dir', '/repos/api', 'Open this OpenSpec workspace.'],
      cwd: '/workspace',
      openerLabel: 'Claude',
    });
  });

  it('checks availability without fallback and launches through a test double', async () => {
    expect(() =>
      assertWorkspaceOpenerAvailable(
        { kind: 'editor', id: 'vscode' },
        '/workspace/platform.code-workspace',
        () => false
      )
    ).toThrow(/code.*not found on PATH/);

    const calls: Array<{ command: string; args: string[]; cwd: string; shell: boolean | string | undefined }> = [];
    const fakeSpawn = ((command: string, args: string[], options: { cwd?: string; shell?: boolean | string }) => {
      calls.push({ command, args, cwd: options.cwd ?? '', shell: options.shell });
      return {
        on(event: string, callback: (code?: number | null) => void) {
          if (event === 'close') {
            queueMicrotask(() => callback(0));
          }
          return this;
        },
      };
    }) as any;
    const command = buildWorkspaceOpenLaunchCommand(
      { kind: 'agent', id: 'codex' },
      '/workspace',
      '/workspace/platform.code-workspace',
      ['/repos/api', 'C:\\Program Files\\repo']
    );

    await launchWorkspaceOpenCommand(command, { spawn: fakeSpawn });

    expect(calls).toEqual([
      {
        command: 'codex',
        args: [
          '--add-dir',
          '/repos/api',
          '--add-dir',
          'C:\\Program Files\\repo',
          'Open this OpenSpec workspace.',
        ],
        cwd: '/workspace',
        shell: false,
      },
    ]);
  });
});
