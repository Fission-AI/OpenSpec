import { spawn as nodeSpawn } from 'node:child_process';
import { createRequire } from 'node:module';

import {
  WorkspacePreferredOpener,
  WorkspaceViewState,
  WorkspaceOpenResolvedContext,
  WorkspaceOpenSurfaceGeneration,
  WorkspaceSkippedOpenLink,
  getWorkspaceCodeWorkspacePath,
  getWorkspaceOpenerExecutable,
  getWorkspaceOpenerLabel,
  isWorkspaceExecutableAvailable,
  readWorkspaceViewState,
  syncWorkspaceOpenSurface,
} from '../../core/workspace/index.js';
import { SelectedWorkspace, WorkspaceCliError, asErrorMessage } from './types.js';

export const WORKSPACE_OPEN_MINIMAL_PROMPT = 'Open this OpenSpec workspace.';
const require = createRequire(import.meta.url);
const spawn = require('cross-spawn') as typeof nodeSpawn;

export interface WorkspaceOpenState {
  viewState: WorkspaceViewState;
  codeWorkspacePath: string;
}

export interface WorkspaceOpenLaunchCommand {
  executable: string;
  args: string[];
  cwd: string;
  openerLabel: string;
}

export type WorkspaceOpenedRoot = {
  kind: 'workspace' | 'initiative' | 'link';
  name?: string;
  path: string;
};

export interface WorkspaceOpenCommandBuildResult {
  command: WorkspaceOpenLaunchCommand;
  skipped: WorkspaceSkippedOpenLink[];
  generated: WorkspaceOpenSurfaceGeneration;
  openedRoots: WorkspaceOpenedRoot[];
}

export type WorkspaceOpenSpawn = typeof nodeSpawn;

export interface WorkspaceOpenLaunchOptions {
  spawn?: WorkspaceOpenSpawn;
  isExecutableAvailable?: (executable: string) => boolean;
  stdio?: 'inherit' | 'ignore';
}

export async function readWorkspaceOpenState(
  selected: SelectedWorkspace
): Promise<WorkspaceOpenState> {
  const viewState = await readWorkspaceViewState(selected.root);

  return {
    viewState,
    codeWorkspacePath: getWorkspaceCodeWorkspacePath(selected.root, viewState.name),
  };
}

export function buildWorkspaceOpenLaunchCommand(
  opener: WorkspacePreferredOpener,
  workspaceRoot: string,
  codeWorkspacePath: string,
  attachedPaths: string[]
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
      ...attachedPaths.flatMap((linkedPath) => ['--add-dir', linkedPath]),
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
  state: WorkspaceOpenState,
  resolvedContext?: WorkspaceOpenResolvedContext | null
): Promise<WorkspaceOpenCommandBuildResult> {
  const openSurface = await syncWorkspaceOpenSurface(
    workspaceRoot,
    state.viewState,
    resolvedContext
  );
  const openedRoots = [
    { kind: 'workspace' as const, path: workspaceRoot },
    ...(resolvedContext
      ? [
          {
            kind: 'initiative' as const,
            name: resolvedContext.initiative.id,
            path: resolvedContext.initiative.root,
          },
        ]
      : []),
    ...openSurface.links.map((link) => ({
      kind: 'link' as const,
      name: link.name,
      path: link.path,
    })),
  ];

  return {
    command: buildWorkspaceOpenLaunchCommand(
      opener,
      workspaceRoot,
      state.codeWorkspacePath,
      openedRoots
        .filter((root) => root.kind !== 'workspace')
        .map((root) => root.path)
    ),
    skipped: openSurface.skipped,
    generated: openSurface.generated,
    openedRoots,
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
      stdio: options.stdio ?? 'inherit',
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
