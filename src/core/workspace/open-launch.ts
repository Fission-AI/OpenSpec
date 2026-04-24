import { spawn } from 'node:child_process';
import { buildWorkspaceOpenLaunchPrompt, openWorkspace, type WorkspaceOpenResult } from './open.js';
import {
  buildWorkspaceOpenSessionEnv,
  clearWorkspaceOpenSessionState,
  consumeWorkspaceOpenUpgradeRequest,
  createWorkspaceOpenSessionState,
} from './open-session.js';

interface WorkspaceOpenLaunchSpec {
  command: string;
  args: string[];
  cwd: string;
}

function getAttachedRepoPaths(result: WorkspaceOpenResult): string[] {
  return result.attachedRepos.map((repo) => repo.path);
}

export function buildWorkspaceOpenLaunchSpec(
  result: WorkspaceOpenResult,
  options: { resume?: boolean } = {}
): WorkspaceOpenLaunchSpec {
  const prompt = buildWorkspaceOpenLaunchPrompt(result);
  const attachedRepoPaths = getAttachedRepoPaths(result);

  if (result.agent === 'codex') {
    const args = options.resume ? ['resume', '--last'] : [];
    args.push('-C', result.workspaceRoot);

    for (const repoPath of attachedRepoPaths) {
      args.push('--add-dir', repoPath);
    }

    args.push(prompt);

    return {
      command: 'codex',
      args,
      cwd: result.workspaceRoot,
    };
  }

  if (result.agent === 'claude') {
    const args = options.resume ? ['--continue'] : [];

    if (attachedRepoPaths.length > 0) {
      args.push('--add-dir', ...attachedRepoPaths);
    }

    args.push(prompt);

    return {
      command: 'claude',
      args,
      cwd: result.workspaceRoot,
    };
  }

  if (result.agent === 'github-copilot') {
    if (!result.editorSurface) {
      throw new Error('GitHub Copilot workspace open requires an editor surface.');
    }

    return {
      command: 'code',
      args: ['-r', result.editorSurface.path],
      cwd: result.workspaceRoot,
    };
  }

  throw new Error(`No launcher is configured for workspace-open agent '${result.agent}'.`);
}

function runLaunchSpec(
  spec: WorkspaceOpenLaunchSpec,
  env: NodeJS.ProcessEnv
): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: {
        ...process.env,
        ...env,
      },
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => resolve(code));
  });
}

function supportsAutomaticUpgrade(agent: string): boolean {
  return agent === 'codex' || agent === 'claude';
}

export async function launchWorkspaceOpenSession(initialResult: WorkspaceOpenResult): Promise<void> {
  let currentResult = initialResult;
  let resume = false;

  while (true) {
    const sessionState = await createWorkspaceOpenSessionState(
      currentResult.workspaceRoot,
      currentResult.agent,
      currentResult.mode,
      currentResult.change?.id
    );
    const launchSpec = buildWorkspaceOpenLaunchSpec(currentResult, { resume });

    try {
      await runLaunchSpec(launchSpec, buildWorkspaceOpenSessionEnv(sessionState));
    } finally {
      const upgradeRequest = await consumeWorkspaceOpenUpgradeRequest(
        currentResult.workspaceRoot,
        sessionState.token
      );
      await clearWorkspaceOpenSessionState(currentResult.workspaceRoot, sessionState.token);

      if (!upgradeRequest || !supportsAutomaticUpgrade(currentResult.agent)) {
        return;
      }

      currentResult = await openWorkspace({
        cwd: currentResult.workspaceRoot,
        change: upgradeRequest.changeId,
        agent: currentResult.agent,
      });
      resume = true;
    }
  }
}
