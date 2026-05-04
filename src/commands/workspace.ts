import { Command } from 'commander';
import * as nodeFs from 'node:fs';
import * as path from 'node:path';

import { listWorkspaceRegistryEntries } from '../core/workspace/index.js';
import { isInteractive, resolveNoInteractive } from '../utils/interactive.js';
import {
  addWorkspaceLink,
  createManagedWorkspace,
  inferLinkName,
  loadWorkspaceForDoctor,
  loadWorkspaceForList,
  parseSetupLinks,
  readRegistry,
  resolveExistingDirectory,
  updateWorkspaceLink,
  validateLinkNameForCommand,
  validateWorkspaceNameForSetup,
} from './workspace/operations.js';
import { selectWorkspaceForCommand } from './workspace/selection.js';
import {
  WorkspaceCliError,
  WorkspaceLinkMutationPayload,
  WorkspaceLinkOptions,
  WorkspaceListOptions,
  WorkspaceOutput,
  WorkspaceSetupOptions,
  WorkspaceStatus,
  appendStatus,
  asErrorMessage,
  asStatus,
} from './workspace/types.js';

function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

async function promptWorkspaceName(initialName?: string): Promise<string> {
  if (initialName) {
    return validateWorkspaceNameForSetup(initialName);
  }

  const { input } = await import('@inquirer/prompts');

  return input({
    message: 'Workspace name:',
    validate(value: string) {
      try {
        validateWorkspaceNameForSetup(value);
        return true;
      } catch {
        return 'Workspace names must be kebab-case with lowercase letters, numbers, and single hyphen separators.';
      }
    },
  });
}

async function promptExistingPath(message: string): Promise<string> {
  const { input } = await import('@inquirer/prompts');

  const pathInput = await input({
    message,
    validate(value: string) {
      const resolvedPath = path.isAbsolute(value)
        ? path.resolve(value)
        : path.resolve(process.cwd(), value);
      return nodeFs.existsSync(resolvedPath) && nodeFs.statSync(resolvedPath).isDirectory()
        ? true
        : 'Enter an existing repo or folder path.';
    },
  });

  return resolveExistingDirectory(pathInput);
}

async function promptLinkName(existingLinks: Record<string, string>): Promise<string> {
  const { input } = await import('@inquirer/prompts');

  return input({
    message: 'Link name:',
    validate(value: string) {
      try {
        validateLinkNameForCommand(value);
      } catch (error) {
        return asErrorMessage(error);
      }

      if (existingLinks[value]) {
        return `Link name '${value}' is already linked to ${existingLinks[value]}.`;
      }

      return true;
    },
  });
}

async function promptSetupLinks(): Promise<Record<string, string>> {
  const { confirm } = await import('@inquirer/prompts');
  const links: Record<string, string> = {};

  while (true) {
    const resolvedPath = await promptExistingPath(
      Object.keys(links).length === 0 ? 'Repo or folder path:' : 'Another repo or folder path:'
    );
    let linkName = inferLinkName(resolvedPath);

    try {
      validateLinkNameForCommand(linkName);
    } catch {
      linkName = await promptLinkName(links);
    }

    if (links[linkName]) {
      console.log(`Link name '${linkName}' is already linked to ${links[linkName]}.`);
      linkName = await promptLinkName(links);
    }

    links[linkName] = resolvedPath;

    const addAnother = await confirm({
      message: 'Add another repo or folder?',
      default: false,
    });

    if (!addAnother) {
      return links;
    }
  }
}

function printStatusLines(statuses: WorkspaceStatus[]): void {
  for (const status of statuses) {
    const label = status.severity === 'warning' ? 'Warning' : 'Issue';
    console.log(`${label}: ${status.message}`);
    if (status.fix) {
      console.log(`Fix: ${status.fix}`);
    }
  }
}

function printLinksHuman(links: WorkspaceOutput['links']): void {
  if (links.length === 0) {
    console.log('  (no linked repos or folders)');
    return;
  }

  for (const link of links) {
    const suffix = link.status.some((status) => status.severity === 'error') ? ' [issue]' : '';
    console.log(`  ${link.name} -> ${link.path ?? '(no local path recorded)'}${suffix}`);
    if (link.repo_specs_path) {
      console.log(`    repo specs: ${link.repo_specs_path}`);
    }
  }
}

function printDoctorHuman(result: { workspace: WorkspaceOutput; status: WorkspaceStatus[] }): void {
  console.log(`Workspace: ${result.workspace.name}`);
  console.log(`Root: ${result.workspace.root}`);
  console.log(`Planning path: ${result.workspace.planning_path}`);
  console.log('');
  printStatusLines(result.status);
  if (result.status.length > 0) {
    console.log('');
  }
  console.log('Linked repos or folders:');
  printLinksHuman(result.workspace.links);

  const issues = [
    ...result.workspace.status,
    ...result.workspace.links.flatMap((link) => link.status),
  ];

  if (issues.length === 0) {
    console.log('');
    console.log('No workspace issues found.');
    return;
  }

  console.log('');
  console.log('Issues:');
  for (const issue of issues) {
    console.log(`  - ${issue.message}`);
    if (issue.target) {
      console.log(`    Target: ${issue.target}`);
    }
    if (issue.fix) {
      console.log(`    Fix: ${issue.fix}`);
    }
  }
}

function printWorkspaceSummaryHuman(workspace: WorkspaceOutput): void {
  console.log(`Workspace: ${workspace.name}`);
  console.log(`Root: ${workspace.root}`);
  console.log(`Planning path: ${workspace.planning_path}`);
  console.log('');
  console.log('Linked repos or folders:');
  printLinksHuman(workspace.links);
}

function printLinkMutationHuman(
  heading: string,
  payload: WorkspaceLinkMutationPayload
): void {
  printStatusLines(payload.status);
  console.log(heading);
  console.log(`  ${payload.link.name} -> ${payload.link.path}`);
  console.log(`Workspace: ${payload.workspace.name}`);
}

class WorkspaceCommand {
  async setup(options: WorkspaceSetupOptions = {}): Promise<void> {
    try {
      const noInteractive = resolveNoInteractive(options);

      if (options.json && !noInteractive) {
        throw new WorkspaceCliError(
          'workspace setup --json requires --no-interactive.',
          'setup_json_requires_no_interactive',
          {
            fix: 'openspec workspace setup --no-interactive --json --name <name> --link <path>',
          }
        );
      }

      const interactive = !noInteractive && isInteractive(options);
      if (!interactive && (!options.name || (options.link ?? []).length === 0)) {
        throw new WorkspaceCliError(
          'workspace setup --no-interactive requires --name <name> and at least one --link <path>.',
          'missing_setup_inputs',
          {
            fix: 'openspec workspace setup --no-interactive --name platform --link /path/to/repo',
          }
        );
      }

      const workspaceName = interactive
        ? await promptWorkspaceName(options.name)
        : validateWorkspaceNameForSetup(options.name ?? '');
      const links = interactive ? await promptSetupLinks() : await parseSetupLinks(options.link);

      if (Object.keys(links).length === 0) {
        throw new WorkspaceCliError(
          'workspace setup --no-interactive requires --name <name> and at least one --link <path>.',
          'missing_setup_inputs',
          {
            fix: 'openspec workspace setup --no-interactive --name platform --link /path/to/repo',
          }
        );
      }

      const workspace = await createManagedWorkspace(workspaceName, links);
      const doctorResult = await loadWorkspaceForDoctor({
        name: workspace.name,
        root: workspace.root,
        status: [],
        unregisteredCurrentWorkspace: false,
      });

      if (options.json) {
        printJson({
          workspace: doctorResult.workspace,
          status: doctorResult.status,
        });
        return;
      }

      console.log('Workspace setup complete');
      console.log('');
      printWorkspaceSummaryHuman(workspace);
      console.log('');
      console.log('Workspace check:');
      printDoctorHuman(doctorResult);
      console.log('');
      console.log('Next useful commands:');
      console.log(`  openspec workspace doctor --workspace ${workspace.name}`);
      console.log('  openspec workspace list');
    } catch (error) {
      this.handleFailure(options.json, { workspace: null, status: [] }, error);
    }
  }

  async list(options: WorkspaceListOptions = {}): Promise<void> {
    try {
      const registry = await readRegistry();
      const entries = listWorkspaceRegistryEntries(registry);
      const workspaces = await Promise.all(entries.map((entry) => loadWorkspaceForList(entry)));
      const payload = { workspaces, status: [] as WorkspaceStatus[] };

      if (options.json) {
        printJson(payload);
        return;
      }

      if (workspaces.length === 0) {
        console.log("No OpenSpec workspaces found. Run 'openspec workspace setup' first.");
        return;
      }

      console.log('Known OpenSpec workspaces:');
      for (const workspace of workspaces) {
        console.log(`  ${workspace.name}`);
        console.log(`    Root: ${workspace.root}`);
        if (workspace.status.length > 0) {
          for (const status of workspace.status) {
            console.log(
              `    ${status.severity === 'warning' ? 'Warning' : 'Issue'}: ${status.message}`
            );
            if (status.fix) {
              console.log(`    Fix: ${status.fix}`);
            }
          }
        }
        console.log('    Linked repos or folders:');
        if (workspace.links.length === 0) {
          console.log('      (none)');
        } else {
          for (const link of workspace.links) {
            console.log(`      ${link.name} -> ${link.path ?? '(no local path recorded)'}`);
          }
        }
      }
    } catch (error) {
      this.handleFailure(options.json, { workspaces: [], status: [] }, error);
    }
  }

  async link(
    nameOrPath: string | undefined,
    linkPath: string | undefined,
    options: WorkspaceLinkOptions = {}
  ): Promise<void> {
    try {
      if (!nameOrPath) {
        throw new WorkspaceCliError(
          'workspace link requires a repo or folder path.',
          'missing_link_path',
          {
            fix: 'openspec workspace link /path/to/repo',
          }
        );
      }

      const selected = await selectWorkspaceForCommand(options, 'link');
      const payload = await addWorkspaceLink(selected, nameOrPath, linkPath);

      if (options.json) {
        printJson(payload);
        return;
      }

      printLinkMutationHuman('Linked repo or folder:', payload);
    } catch (error) {
      this.handleFailure(options.json, { workspace: null, link: null, status: [] }, error);
    }
  }

  async relink(
    linkNameInput: string | undefined,
    linkPath: string | undefined,
    options: WorkspaceLinkOptions = {}
  ): Promise<void> {
    try {
      if (!linkNameInput || !linkPath) {
        throw new WorkspaceCliError(
          'workspace relink requires a link name and repo or folder path.',
          'missing_relink_arguments',
          {
            fix: 'openspec workspace relink <name> /path/to/repo',
          }
        );
      }

      const selected = await selectWorkspaceForCommand(options, 'relink');
      const payload = await updateWorkspaceLink(selected, linkNameInput, linkPath);

      if (options.json) {
        printJson(payload);
        return;
      }

      printLinkMutationHuman('Relinked repo or folder:', payload);
    } catch (error) {
      this.handleFailure(options.json, { workspace: null, link: null, status: [] }, error);
    }
  }

  async doctor(options: WorkspaceLinkOptions = {}): Promise<void> {
    try {
      const selected = await selectWorkspaceForCommand(options, 'doctor');
      const result = await loadWorkspaceForDoctor(selected);

      if (options.json) {
        printJson(result);
        return;
      }

      printDoctorHuman(result);
    } catch (error) {
      this.handleFailure(options.json, { workspace: null, status: [] }, error);
    }
  }

  private handleFailure<T extends { status: WorkspaceStatus[] }>(
    json: boolean | undefined,
    payload: T,
    error: unknown
  ): void {
    if (json) {
      printJson(appendStatus(payload, asStatus(error)));
      process.exitCode = 1;
      return;
    }

    const status = asStatus(error);
    console.error(`Error: ${status.message}`);
    if (status.fix) {
      console.error(`Fix: ${status.fix}`);
    }
    process.exitCode = 1;
  }
}

function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function addWorkspaceSelectionOptions(command: Command): Command {
  return command
    .option('--workspace <name>', 'Workspace name from the local workspace registry')
    .option('--json', 'Output as JSON')
    .option('--no-interactive', 'Disable prompts');
}

export function registerWorkspaceCommand(program: Command): void {
  const workspaceCommand = new WorkspaceCommand();
  const workspace = program
    .command('workspace')
    .description('Set up and inspect coordination workspaces');

  workspace
    .command('setup')
    .description('Set up a workspace and link existing repos or folders')
    .option('--name <name>', 'Workspace name')
    .option('--link <link>', 'Repo or folder link. Use <path> or <name>=<path>.', collectOption, [])
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

  // Intentionally no public `workspace create` command in this slice.
}
