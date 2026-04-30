import path from 'node:path';
import {
  createManagedWorkspaceRoot,
} from '../core/workspace/create.js';
import {
  addWorkspaceRepo,
  normalizeWorkspaceRepoAlias,
  runWorkspaceDoctor,
  validateWorkspaceRepoPath,
  type WorkspaceAddRepoResult,
} from '../core/workspace/registry.js';
import {
  DEFAULT_WORKSPACE_OPEN_AGENT,
  getSupportedWorkspaceOpenAgents,
  openWorkspace,
  savePreferredWorkspaceOpenAgent,
  type WorkspaceOpenResult,
} from '../core/workspace/open.js';
import { launchWorkspaceOpenSession } from '../core/workspace/open-launch.js';
import { isInteractive, type InteractiveOptions } from '../utils/interactive.js';

export interface WorkspaceSetupOptions extends InteractiveOptions {
  noInteractive?: boolean;
}

export interface WorkspaceSetupReporter {
  reportWorkspaceCreated(result: Awaited<ReturnType<typeof createManagedWorkspaceRoot>>): void;
  reportRepoRegistered(result: WorkspaceAddRepoResult): void;
  reportDoctor(result: Awaited<ReturnType<typeof runWorkspaceDoctor>>): void;
  reportSummary(summary: string): void;
  reportWorkspaceOpen(result: WorkspaceOpenResult): void;
}

function trimOptionalInput(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function formatRepoGuidance(repo: { owner?: string; handoff?: string }): string[] {
  const details: string[] = [];

  if (repo.owner) {
    details.push(`owner: ${repo.owner}`);
  }

  if (repo.handoff) {
    details.push(`handoff: ${repo.handoff}`);
  }

  return details;
}

function suggestRepoAlias(repoPath: string): string | undefined {
  const candidate = path.basename(repoPath.trim());

  if (!candidate) {
    return undefined;
  }

  try {
    return normalizeWorkspaceRepoAlias(candidate);
  } catch {
    return undefined;
  }
}

function formatNextSteps(workspaceRoot: string, aliases: string[], preferredAgent: string): string {
  const targetSuggestion = aliases.join(',');

  return [
    'Workspace setup complete.',
    `Workspace root: ${workspaceRoot}`,
    `Preferred agent: ${preferredAgent}`,
    'Registered repos:',
    ...aliases.map((alias) => `- ${alias}`),
    '',
    'Next commands:',
    `cd ${workspaceRoot}`,
    `openspec new change <id> --targets ${targetSuggestion}`,
    'openspec workspace open',
    'openspec status --change <id>',
  ].join('\n');
}

async function promptForRepo(
  launchCwd: string,
  registeredAliases: Set<string>
): Promise<{
  canonicalPath: string;
  alias: string;
  owner?: string;
  handoff?: string;
}> {
  const { input } = await import('@inquirer/prompts');

  const repoPath = await input({
    message: 'Repo path:',
    validate: async (value: string) => {
      try {
        await validateWorkspaceRepoPath(value, launchCwd);
        return true;
      } catch (error) {
        return (error as Error).message;
      }
    },
  });
  const canonicalPath = await validateWorkspaceRepoPath(repoPath, launchCwd);
  const alias = await input({
    message: 'Repo alias:',
    default: suggestRepoAlias(canonicalPath),
    validate: (value: string) => {
      try {
        const normalized = normalizeWorkspaceRepoAlias(value);
        if (registeredAliases.has(normalized)) {
          return `Repo alias '${normalized}' is already registered in this setup session`;
        }
        return true;
      } catch (error) {
        return (error as Error).message;
      }
    },
  });
  const owner = trimOptionalInput(await input({
    message: 'Owner (optional):',
  }));
  const handoff = trimOptionalInput(await input({
    message: 'Handoff note (optional):',
  }));

  return {
    canonicalPath,
    alias: normalizeWorkspaceRepoAlias(alias),
    owner,
    handoff,
  };
}

export async function runWorkspaceSetupWizard(
  options: WorkspaceSetupOptions,
  reporter: WorkspaceSetupReporter
): Promise<void> {
  if (!isInteractive(options)) {
    throw new Error('Interactive mode required. Run `openspec workspace setup` in an interactive terminal.');
  }

  const { confirm, input, select } = await import('@inquirer/prompts');
  const launchCwd = process.cwd();

  const workspaceName = await input({
    message: 'Workspace name:',
    validate: (value: string) => value.trim().length > 0 || 'Workspace name cannot be empty',
  });
  const createResult = await createManagedWorkspaceRoot(workspaceName);
  reporter.reportWorkspaceCreated(createResult);

  const addedRepos: WorkspaceAddRepoResult[] = [];
  const registeredAliases = new Set<string>();

  while (true) {
    const repo = await promptForRepo(launchCwd, registeredAliases);
    const addResult = await addWorkspaceRepo(repo.alias, repo.canonicalPath, {
      cwd: createResult.workspaceRoot,
      owner: repo.owner,
      handoff: repo.handoff,
    });

    addedRepos.push(addResult);
    registeredAliases.add(addResult.alias);
    reporter.reportRepoRegistered(addResult);

    const addAnother = await confirm({
      message: 'Add another repo?',
      default: true,
    });

    if (!addAnother) {
      break;
    }
  }

  const doctorResult = await runWorkspaceDoctor({ cwd: createResult.workspaceRoot });
  reporter.reportDoctor(doctorResult);

  if (doctorResult.issues.length > 0) {
    throw new Error('Workspace doctor reported issues after setup. Repair the workspace registry and retry.');
  }

  const supportedAgents = getSupportedWorkspaceOpenAgents();
  const preferredAgent = await select<string>({
    message: 'Preferred agent for this workspace:',
    default: DEFAULT_WORKSPACE_OPEN_AGENT,
    choices: supportedAgents.map((toolId) => ({
      value: toolId,
      name: toolId,
      description: toolId === 'github-copilot'
        ? 'Generate a VS Code workspace and Copilot prompt surface'
        : 'Generate a prompt surface',
    })),
  });
  await savePreferredWorkspaceOpenAgent(createResult.workspaceRoot, preferredAgent);

  reporter.reportSummary(formatNextSteps(
    createResult.workspaceRoot,
    addedRepos.map((repo) => repo.alias),
    preferredAgent
  ));

  const openNow = await confirm({
    message: 'Open the workspace now?',
    default: false,
  });

  if (!openNow) {
    return;
  }
  const openResult = await openWorkspace({
    cwd: createResult.workspaceRoot,
    agent: preferredAgent,
  });
  await launchWorkspaceOpenSession(openResult);
}

export function formatWorkspaceSetupRepoSummary(repos: WorkspaceAddRepoResult[]): string[] {
  return repos.map((repo) => {
    const guidance = formatRepoGuidance(repo);
    return guidance.length === 0
      ? `- ${repo.alias}: ${repo.canonicalPath}`
      : `- ${repo.alias}: ${repo.canonicalPath} (${guidance.join('; ')})`;
  });
}
