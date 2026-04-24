import { Command } from 'commander';
import ora from 'ora';
import {
  DEFAULT_WORKSPACE_OPEN_AGENT,
  getSupportedWorkspaceOpenAgents,
  openWorkspace,
  savePreferredWorkspaceOpenAgent,
  type WorkspaceOpenResult,
} from '../core/workspace/open.js';
import { launchWorkspaceOpenSession } from '../core/workspace/open-launch.js';
import {
  createManagedWorkspaceRoot,
  listManagedWorkspaces,
  resolveManagedWorkspaceByName,
} from '../core/workspace/create.js';
import {
  addWorkspaceRepo,
  findWorkspaceRoot,
  runWorkspaceDoctor,
  updateWorkspaceRepoGuidance,
  type WorkspaceDoctorResult,
} from '../core/workspace/registry.js';
import {
  updateWorkspaceChangeTargets,
  type UpdateWorkspaceChangeTargetsResult,
} from '../core/workspace/target-set.js';
import { readWorkspaceLocalOverlay } from '../core/workspace/metadata.js';
import {
  runWorkspaceSetupWizard,
} from './workspace-setup.js';
import { isInteractive, type InteractiveOptions } from '../utils/interactive.js';

interface WorkspaceCommandOptions {
  json?: boolean;
}

interface WorkspaceRepoCommandOptions extends WorkspaceCommandOptions {
  owner?: string;
  handoff?: string;
}

interface WorkspaceOpenCommandOptions extends WorkspaceCommandOptions, InteractiveOptions {
  change?: string;
  agent?: string;
  name?: string;
  prepareOnly?: boolean;
}

interface WorkspaceTargetsCommandOptions extends WorkspaceCommandOptions {
  add?: string;
  remove?: string;
}

interface WorkspaceSetupCommandOptions extends WorkspaceCommandOptions {
  interactive?: boolean;
  noInteractive?: boolean;
}

function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

function handleWorkspaceCommandError(error: unknown, options?: WorkspaceCommandOptions): void {
  if (options?.json) {
    console.error(JSON.stringify({ error: (error as Error).message }, null, 2));
    process.exit(1);
    return;
  }

  console.log();
  ora().fail(`Error: ${(error as Error).message}`);
  process.exit(1);
}

function formatPlural(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatRepoGuidanceDetails(repo: { owner?: string; handoff?: string }): string[] {
  const details: string[] = [];

  if (repo.owner) {
    details.push(`owner: ${repo.owner}`);
  }

  if (repo.handoff) {
    details.push(`handoff: ${repo.handoff}`);
  }

  return details;
}

function printRepoGuidanceDetails(repo: { owner?: string; handoff?: string }): void {
  for (const detail of formatRepoGuidanceDetails(repo)) {
    console.log(detail[0].toUpperCase() + detail.slice(1));
  }
}

function getDoctorNextStep(result: WorkspaceDoctorResult): string | null {
  const firstIssue = result.issues[0];
  if (!firstIssue) {
    return null;
  }

  switch (firstIssue.code) {
    case 'extra-local-alias':
      return `remove or register alias '${firstIssue.alias}', then rerun 'openspec workspace doctor'.`;
    case 'missing-openspec-state':
      return `point alias '${firstIssue.alias}' at a repo root containing 'openspec/', then rerun 'openspec workspace doctor'.`;
    case 'missing-local-path':
    case 'missing-repo-path':
    case 'non-canonical-path':
    case 'repo-not-directory':
      return `repair '.openspec/local.yaml' for alias '${firstIssue.alias}', then rerun 'openspec workspace doctor'.`;
    default:
      return null;
  }
}

function printDoctorReport(result: WorkspaceDoctorResult): void {
  if (result.issues.length === 0) {
    console.log(`Workspace doctor passed for ${result.workspaceRoot}`);
    console.log(
      `Validated ${formatPlural(result.registeredAliasCount, 'registered alias', 'registered aliases')} against ${formatPlural(result.localAliasCount, 'local overlay entry', 'local overlay entries')}.`
    );
    return;
  }

  console.log(`Workspace doctor found ${formatPlural(result.issues.length, 'issue')} in ${result.workspaceRoot}:`);
  for (const issue of result.issues) {
    console.log(`- ${issue.message}`);
  }

  const nextStep = getDoctorNextStep(result);
  if (nextStep) {
    console.log(`Next step: ${nextStep}`);
  }
}

function printWorkspaceOpenReport(result: WorkspaceOpenResult): void {
  console.log(`Prepared ${result.mode} open surface for ${result.agent}.`);
  console.log(`Workspace root: ${result.workspaceRoot}`);

  if (result.change) {
    console.log(`Change: ${result.change.id}`);
    console.log(`Change path: ${result.change.path}`);
  }

  if (result.attachedRepos.length === 0) {
    console.log('Attached repos: none');
  } else {
    console.log('Attached repos:');
    for (const repo of result.attachedRepos) {
      const guidanceDetails = formatRepoGuidanceDetails(repo);
      const guidanceSuffix = guidanceDetails.length > 0
        ? ` (${guidanceDetails.join('; ')})`
        : '';
      console.log(`- ${repo.alias}: ${repo.path}${guidanceSuffix}`);
    }
  }

  if (result.mode === 'workspace-root') {
    if (result.registeredRepos.length === 0) {
      console.log('Registered repos: none');
    } else {
      console.log('Registered repos:');
      for (const repo of result.registeredRepos) {
        const guidanceDetails = formatRepoGuidanceDetails(repo);
        const repoPath = repo.path ?? '(missing local path)';
        const guidanceSuffix = guidanceDetails.length > 0
          ? ` (${guidanceDetails.join('; ')})`
          : '';
        const statusSuffix = repo.status === 'ready'
          ? ''
          : ` [${repo.status}: ${repo.note ?? 'unavailable'}]`;
        console.log(`- ${repo.alias}: ${repoPath}${guidanceSuffix}${statusSuffix}`);
      }
    }

    if (result.availableChanges.length === 0) {
      console.log('Active workspace changes: none');
    } else {
      console.log('Active workspace changes:');
      for (const changeId of result.availableChanges) {
        console.log(`- ${changeId}`);
      }
    }
  }

  console.log('');
  if (result.editorSurface) {
    console.log(`Editor surface (${result.editorSurface.kind}): ${result.editorSurface.path}`);
    console.log('');
  }
  console.log(`Instruction surface (${result.instructionSurface.path}):`);
  console.log(result.instructionSurface.content.trimEnd());
}

function printWorkspaceOpenLaunchSummary(result: WorkspaceOpenResult): void {
  console.log(`Opening ${result.mode} session for ${result.agent}.`);
  console.log(`Workspace root: ${result.workspaceRoot}`);

  if (result.change) {
    console.log(`Change: ${result.change.id}`);
  }

  if (result.attachedRepos.length === 0) {
    console.log('Attached repos: none');
  } else {
    console.log(`Attached repos: ${result.attachedRepos.map((repo) => repo.alias).join(', ')}`);
  }

  if (result.mode === 'workspace-root') {
    if (result.registeredRepos.length === 0) {
      console.log('Registered repos available: none');
    } else {
      console.log(`Registered repos available: ${result.registeredRepos.map((repo) => repo.alias).join(', ')}`);
    }
  }

  if (result.editorSurface) {
    console.log(`Editor surface: ${result.editorSurface.path}`);
  }
}

async function resolveWorkspaceRootForOpen(options?: WorkspaceOpenCommandOptions): Promise<string> {
  if (options?.name) {
    return (await resolveManagedWorkspaceByName(options.name)).workspaceRoot;
  }

  const currentWorkspaceRoot = await findWorkspaceRoot(process.cwd());
  if (currentWorkspaceRoot) {
    return currentWorkspaceRoot;
  }

  const managedWorkspaces = await listManagedWorkspaces();
  if (managedWorkspaces.length === 0) {
    throw new Error(
      "No managed workspaces found. Create one with 'openspec workspace setup' or 'openspec workspace create <name>'."
    );
  }

  if (managedWorkspaces.length === 1) {
    return managedWorkspaces[0].workspaceRoot;
  }

  const canPrompt = !options?.json && isInteractive(options);
  if (!canPrompt) {
    throw new Error(
      `Multiple managed workspaces found: ${managedWorkspaces.map((workspace) => workspace.name).join(', ')}. Re-run with '--name <workspace-name>' or from inside the target workspace.`
    );
  }

  const { select } = await import('@inquirer/prompts');
  return select<string>({
    message: 'Which workspace should OpenSpec open?',
    choices: managedWorkspaces.map((workspace) => ({
      value: workspace.workspaceRoot,
      name: workspace.name,
      description: workspace.workspaceRoot,
    })),
  });
}

async function resolveWorkspaceOpenAgentForCommand(
  workspaceRoot: string,
  options?: WorkspaceOpenCommandOptions
): Promise<string | undefined> {
  if (options?.agent?.trim()) {
    return savePreferredWorkspaceOpenAgent(workspaceRoot, options.agent);
  }

  const localOverlay = await readWorkspaceLocalOverlay(workspaceRoot);
  const preferredAgent = localOverlay.preferredAgent?.trim();
  if (preferredAgent && getSupportedWorkspaceOpenAgents().includes(preferredAgent)) {
    return preferredAgent;
  }

  const shouldPrompt = !options?.json && !options?.prepareOnly && isInteractive(options);
  if (!shouldPrompt) {
    return undefined;
  }

  const { select } = await import('@inquirer/prompts');
  return savePreferredWorkspaceOpenAgent(workspaceRoot, await select<string>({
    message: 'Preferred agent for this workspace:',
    default: DEFAULT_WORKSPACE_OPEN_AGENT,
    choices: getSupportedWorkspaceOpenAgents().map((toolId) => ({
      value: toolId,
      name: toolId,
      description: toolId === 'github-copilot'
        ? 'Open a VS Code workspace with Copilot prompt support'
        : 'Launch an interactive workspace session',
    })),
  }));
}

function printWorkspaceTargetUpdateReport(result: UpdateWorkspaceChangeTargetsResult): void {
  console.log(`Updated workspace targets for '${result.change.id}'.`);
  console.log(`Workspace root: ${result.workspaceRoot}`);
  console.log(`Change path: ${result.change.path}`);
  console.log(`Targets: ${result.targets.join(', ')}`);

  if (result.addedTargets.length > 0) {
    console.log(`Added: ${result.addedTargets.join(', ')}`);
  }

  if (result.removedTargets.length > 0) {
    console.log(`Removed: ${result.removedTargets.join(', ')}`);
  }

  console.log('Updated: .openspec.yaml, targets/');
  console.log('Workspace open, apply, and workspace-aware status now use the adjusted target set.');
}

export function registerWorkspaceCommand(program: Command): void {
  const workspaceCmd = program
    .command('workspace')
    .description('Manage OpenSpec workspaces for cross-repo planning');

  workspaceCmd
    .command('setup')
    .description('Interactively create a workspace and register repos')
    .option('--no-interactive', 'Disable interactive prompts')
    .action(async (options?: WorkspaceSetupCommandOptions) => {
      try {
        await runWorkspaceSetupWizard(options ?? {}, {
          reportWorkspaceCreated(result) {
            console.log(`Workspace '${result.name}' created at ${result.workspaceRoot}`);
            console.log('Created: .openspec/workspace.yaml, .openspec/local.yaml, changes/');
          },
          reportRepoRegistered(result) {
            console.log(`Registered repo alias '${result.alias}' -> ${result.canonicalPath}`);
            printRepoGuidanceDetails(result);
            console.log('Updated: .openspec/workspace.yaml, .openspec/local.yaml');
          },
          reportDoctor(result) {
            printDoctorReport(result);
          },
          reportSummary(summary) {
            console.log('');
            console.log(summary);
          },
          reportWorkspaceOpen(result) {
            console.log('');
            printWorkspaceOpenReport(result);
          },
        });
      } catch (error) {
        handleWorkspaceCommandError(error, options);
      }
    });

  workspaceCmd
    .command('create <name>')
    .description('Create a managed OpenSpec workspace root')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options?: WorkspaceCommandOptions) => {
      try {
        const result = await createManagedWorkspaceRoot(name);

        if (options?.json) {
          printJson(result);
          return;
        }

        console.log(`Workspace '${result.name}' created at ${result.workspaceRoot}`);
        console.log('Created: .openspec/workspace.yaml, .openspec/local.yaml, changes/');
      } catch (error) {
        handleWorkspaceCommandError(error, options);
      }
    });

  workspaceCmd
    .command('add-repo <alias> <path>')
    .description('Register a repo alias in the current workspace, with optional owner or handoff guidance')
    .option('--owner <name>', 'Record the owner or primary contact for this repo alias in committed workspace metadata')
    .option('--handoff <note>', 'Record a short handoff note for this repo alias in committed workspace metadata')
    .option('--json', 'Output as JSON')
    .action(async (alias: string, repoPath: string, options?: WorkspaceRepoCommandOptions) => {
      try {
        const result = await addWorkspaceRepo(alias, repoPath, {
          owner: options?.owner,
          handoff: options?.handoff,
        });

        if (options?.json) {
          printJson(result);
          return;
        }

        console.log(`Registered repo alias '${result.alias}' -> ${result.canonicalPath}`);
        printRepoGuidanceDetails(result);
        console.log('Updated: .openspec/workspace.yaml, .openspec/local.yaml');
      } catch (error) {
        handleWorkspaceCommandError(error, options);
      }
    });

  workspaceCmd
    .command('update-repo <alias>')
    .description('Record or update owner or handoff guidance for a registered repo alias')
    .option('--owner <name>', 'Update the owner or primary contact for this repo alias')
    .option('--handoff <note>', 'Update the handoff note for this repo alias')
    .option('--json', 'Output as JSON')
    .action(async (alias: string, options?: WorkspaceRepoCommandOptions) => {
      try {
        const result = await updateWorkspaceRepoGuidance(alias, {
          owner: options?.owner,
          handoff: options?.handoff,
        });

        if (options?.json) {
          printJson(result);
          return;
        }

        console.log(`Updated repo guidance for '${result.alias}'.`);
        printRepoGuidanceDetails(result);
        console.log('Updated: .openspec/workspace.yaml');
      } catch (error) {
        handleWorkspaceCommandError(error, options);
      }
    });

  workspaceCmd
    .command('doctor')
    .description('Validate repo registry state for the current workspace')
    .option('--json', 'Output as JSON')
    .action(async (options?: WorkspaceCommandOptions) => {
      try {
        const result = await runWorkspaceDoctor();
        const payload = {
          ...result,
          status: result.issues.length === 0 ? 'ok' : 'issues',
        };

        if (options?.json) {
          printJson(payload);
        } else {
          printDoctorReport(result);
        }

        if (result.issues.length > 0) {
          process.exitCode = 1;
        }
      } catch (error) {
        handleWorkspaceCommandError(error, options);
      }
    });

  workspaceCmd
    .command('targets <change>')
    .description('Add or remove target aliases for an existing workspace change')
    .option('--add <aliases>', 'Comma-separated repo aliases to add to the workspace change target set')
    .option('--remove <aliases>', 'Comma-separated repo aliases to remove from the workspace change target set')
    .option('--json', 'Output as JSON')
    .action(async (change: string, options?: WorkspaceTargetsCommandOptions) => {
      try {
        const result = await updateWorkspaceChangeTargets({
          change,
          add: options?.add,
          remove: options?.remove,
        });

        if (options?.json) {
          printJson(result);
          return;
        }

        printWorkspaceTargetUpdateReport(result);
      } catch (error) {
        handleWorkspaceCommandError(error, options);
      }
    });

  workspaceCmd
    .command('open')
    .description('Open a workspace-root or change-scoped session for the current or selected managed workspace')
    .option('--change <id>', 'Open a specific workspace change with only its targeted repos attached')
    .option('--name <workspace>', 'Managed workspace name to open when running outside a workspace root')
    .option(
      '--agent <tool>',
      `Agent target for the workspace session (supported: ${getSupportedWorkspaceOpenAgents().join(', ')})`
    )
    .option('--prepare-only', 'Prepare the workspace-open surfaces without launching the agent')
    .option('--no-interactive', 'Disable workspace-selection prompts')
    .option('--json', 'Output as JSON')
    .action(async (options?: WorkspaceOpenCommandOptions) => {
      try {
        const workspaceRoot = await resolveWorkspaceRootForOpen(options);
        const agent = await resolveWorkspaceOpenAgentForCommand(workspaceRoot, options);
        const result = await openWorkspace({
          cwd: workspaceRoot,
          change: options?.change,
          ...(agent ? { agent } : {}),
        });

        if (options?.json) {
          printJson(result);
          return;
        }

        if (options?.prepareOnly) {
          printWorkspaceOpenReport(result);
          return;
        }

        printWorkspaceOpenLaunchSummary(result);
        await launchWorkspaceOpenSession(result);
      } catch (error) {
        handleWorkspaceCommandError(error, options);
      }
    });
}
