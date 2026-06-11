import { Command } from 'commander';

import { getWorkspaceSkillToolIds } from '../../core/workspace/index.js';
import {
  WorkspaceLinkOptions,
  WorkspaceListOptions,
  WorkspaceOpenOptions,
  WorkspaceSetupOptions,
  WorkspaceUpdateOptions,
} from './types.js';

export interface WorkspaceCommandActions {
  setup(options: WorkspaceSetupOptions): Promise<void>;
  list(options: WorkspaceListOptions): Promise<void>;
  link(
    nameOrPath: string | undefined,
    linkPath: string | undefined,
    options: WorkspaceLinkOptions
  ): Promise<void>;
  relink(
    linkNameInput: string | undefined,
    linkPath: string | undefined,
    options: WorkspaceLinkOptions
  ): Promise<void>;
  doctor(options: WorkspaceLinkOptions): Promise<void>;
  update(
    positionalName: string | undefined,
    options: WorkspaceUpdateOptions
  ): Promise<void>;
  open(
    positionalName: string | undefined,
    options: WorkspaceOpenOptions
  ): Promise<void>;
}

function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function addWorkspaceSelectionOptions(command: Command): Command {
  return command
    .option('--workspace <name>', 'Workspace name from known local workspace views')
    .option('--json', 'Output as JSON')
    .option('--no-interactive', 'Disable prompts');
}

export function registerWorkspaceCommandWith(
  program: Command,
  workspaceCommand: WorkspaceCommandActions
): void {
  const workspace = program
    .command('workspace')
    .description('Set up and inspect coordination workspaces');

  workspace
    .command('setup')
    .description('Set up a workspace and link existing repos or folders')
    .option('--name <name>', 'Workspace name')
    .option('--link <link>', 'Repo or folder link. Use <path> or <name>=<path>.', collectOption, [])
    .option('--opener <id>', 'Preferred opener: codex-cli, claude, github-copilot, or editor')
    .option(
      '--tools <tools>',
      `Install OpenSpec skills for agents. Use "all", "none", or a comma-separated list of: ${getWorkspaceSkillToolIds().join(', ')}`
    )
    .option('--json', 'Output as JSON')
    .option('--no-interactive', 'Disable prompts')
    .action(async (options: WorkspaceSetupOptions) => {
      await workspaceCommand.setup(options);
    });

  workspace
    .command('list')
    .description('List known OpenSpec workspaces')
    .option('--json', 'Output as JSON')
    .action(async (options: WorkspaceListOptions) => {
      await workspaceCommand.list(options);
    });

  workspace
    .command('ls')
    .description('List known OpenSpec workspaces')
    .option('--json', 'Output as JSON')
    .action(async (options: WorkspaceListOptions) => {
      await workspaceCommand.list(options);
    });

  addWorkspaceSelectionOptions(
    workspace
      .command('link [nameOrPath] [path]')
      .description('Link an existing repo or folder to a workspace')
  ).action(async (
    nameOrPath: string | undefined,
    linkPath: string | undefined,
    options: WorkspaceLinkOptions
  ) => {
    await workspaceCommand.link(nameOrPath, linkPath, options);
  });

  addWorkspaceSelectionOptions(
    workspace
      .command('relink <name> <path>')
      .description('Update the local path for an existing workspace link')
  ).action(async (
    linkName: string | undefined,
    linkPath: string | undefined,
    options: WorkspaceLinkOptions
  ) => {
    await workspaceCommand.relink(linkName, linkPath, options);
  });

  addWorkspaceSelectionOptions(
    workspace
      .command('doctor')
      .description('Check what a workspace can resolve on this machine')
  ).action(async (options: WorkspaceLinkOptions) => {
    await workspaceCommand.doctor(options);
  });

  workspace
    .command('update [name]')
    .description('Refresh workspace-local OpenSpec guidance and agent skills')
    .option('--workspace <name>', 'Workspace name from known local workspace views')
    .option(
      '--tools <tools>',
      `Select agents for workspace skills. Use "all", "none", or a comma-separated list of: ${getWorkspaceSkillToolIds().join(', ')}. Global profile selects workflows; --tools selects agents.`
    )
    .option('--json', 'Output as JSON')
    .option('--no-interactive', 'Disable prompts')
    .action(async (name: string | undefined, options: WorkspaceUpdateOptions) => {
      await workspaceCommand.update(name, options);
    });

  workspace
    .command('open [name]')
    .description('Open a workspace in an agent or VS Code editor')
    .option('--workspace <name>', 'Workspace name from known local workspace views')
    .option('--initiative <id>', 'Open an initiative as a local workspace view')
    .option('--store <id>', 'Context store id for --initiative')
    .option('--store-path <path>', 'Existing local context store root for --initiative')
    .option('--agent <tool>', 'Use an agent for this session: codex-cli, claude, or github-copilot')
    .option('--editor', 'Open the workspace in VS Code editor mode')
    .option('--prepare-only', 'Unsupported: preview surfaces belong to a future context/query command')
    .option('--json', 'Output generated workspace view context as JSON after launch')
    .option('--change <id>', 'Unsupported: change-scoped open belongs to future workspace change planning')
    .option('--no-interactive', 'Disable prompts')
    .action(async (name: string | undefined, options: WorkspaceOpenOptions) => {
      await workspaceCommand.open(name, options);
    });

  // Intentionally no public `workspace create` command in this slice.
}
