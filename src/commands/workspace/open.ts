import { spawn as nodeSpawn } from 'node:child_process';
import { createRequire } from 'node:module';

import {
  WorkspaceLocalState,
  WorkspacePreferredOpener,
  WorkspaceSharedState,
  getWorkspaceCodeWorkspacePath,
  getWorkspaceOpenerExecutable,
  getWorkspaceOpenerLabel,
  isWorkspaceExecutableAvailable,
  readWorkspaceLocalState,
  readWorkspaceSharedState,
  resolveWorkspaceOpenLinks,
  writeWorkspaceCodeWorkspaceFile,
} from '../../core/workspace/index.js';
import { SelectedWorkspace, WorkspaceCliError, asErrorMessage } from './types.js';

export const WORKSPACE_OPEN_MINIMAL_PROMPT = 'Open this OpenSpec workspace.';
const require = createRequire(import.meta.url);
const spawn = require('cross-spawn') as typeof nodeSpawn;

export interface WorkspaceOpenState {
  sharedState: WorkspaceSharedState;
  localState: WorkspaceLocalState;
  codeWorkspacePath: string;
}

export interface WorkspaceOpenLaunchCommand {
  executable: string;
  args: string[];
  cwd: string;
  openerLabel: string;
}

export type WorkspaceOpenSpawn = typeof nodeSpawn;

export interface WorkspaceOpenLaunchOptions {
  spawn?: WorkspaceOpenSpawn;
  isExecutableAvailable?: (executable: string) => boolean;
}

export async function readWorkspaceOpenState(
  selected: SelectedWorkspace
): Promise<WorkspaceOpenState> {
  const sharedState = await readWorkspaceSharedState(selected.root);
  const localState = await readWorkspaceLocalState(selected.root);

  return {
    sharedState,
    localState,
    codeWorkspacePath: getWorkspaceCodeWorkspacePath(selected.root, sharedState.name),
  };
}

export function buildWorkspaceOpenLaunchCommand(
  opener: WorkspacePreferredOpener,
  workspaceRoot: string,
  codeWorkspacePath: string,
  linkedPaths: string[]
): WorkspaceOpenLaunchCommand {
  const executable = getWorkspaceOpenerExecutable(opener);
  const openerLabel = getWorkspaceOpenerLabel(opener);

  if (opener.kind === 'editor' || opener.id === 'github-copilot') {
    return {
      executable,
      args: [codeWorkspacePath],
      cwd: workspaceRoot,
      openerLabel,
    };
  }

  return {
    executable,
    args: [
      ...linkedPaths.flatMap((linkedPath) => ['--add-dir', linkedPath]),
      WORKSPACE_OPEN_MINIMAL_PROMPT,
    ],
    cwd: workspaceRoot,
    openerLabel,
  };
}

export function assertWorkspaceOpenerAvailable(
  opener: WorkspacePreferredOpener,
  codeWorkspacePath: string,
  isExecutableAvailable: (executable: string) => boolean = isWorkspaceExecutableAvailable
): void {
  const executable = getWorkspaceOpenerExecutable(opener);

  if (isExecutableAvailable(executable)) {
    return;
  }

  const openerLabel = getWorkspaceOpenerLabel(opener);
  const manualPath = executable === 'code'
    ? ` You can open the workspace file manually: ${codeWorkspacePath}`
    : '';

  throw new WorkspaceCliError(
    `${openerLabel} requires '${executable}', but '${executable}' was not found on PATH.${manualPath}`,
    'workspace_opener_unavailable',
    {
      target: 'workspace.opener',
      fix: `Install '${executable}' or choose another opener.`,
    }
  );
}

export async function buildWorkspaceOpenCommandForState(
  opener: WorkspacePreferredOpener,
  workspaceRoot: string,
  state: WorkspaceOpenState
): Promise<{
  command: WorkspaceOpenLaunchCommand;
  skipped: Awaited<ReturnType<typeof resolveWorkspaceOpenLinks>>['skipped'];
}> {
  const openLinks = await resolveWorkspaceOpenLinks(state.sharedState, state.localState);
  await writeWorkspaceCodeWorkspaceFile(state.codeWorkspacePath, openLinks.links);

  return {
    command: buildWorkspaceOpenLaunchCommand(
      opener,
      workspaceRoot,
      state.codeWorkspacePath,
      openLinks.links.map((link) => link.path)
    ),
    skipped: openLinks.skipped,
  };
}

export async function launchWorkspaceOpenCommand(
  command: WorkspaceOpenLaunchCommand,
  options: WorkspaceOpenLaunchOptions = {}
): Promise<void> {
  const spawnCommand = options.spawn ?? spawn;

  await new Promise<void>((resolve, reject) => {
    const child = spawnCommand(command.executable, command.args, {
      cwd: command.cwd,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', (error) => {
      reject(
        new WorkspaceCliError(
          `Could not launch ${command.openerLabel}: ${asErrorMessage(error)}`,
          'workspace_opener_launch_failed',
          {
            target: 'workspace.opener',
          }
        )
      );
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(
        new WorkspaceCliError(
          `${command.openerLabel} exited with ${reason}.`,
          'workspace_opener_launch_failed',
          {
            target: 'workspace.opener',
          }
        )
      );
    });
  });
}
