import { Command } from 'commander';
import chalk from 'chalk';
import * as nodeFs from 'node:fs';
import * as path from 'node:path';

import {
  WorkspacePreferredOpener,
  getDefaultWorkspaceOpenerChoiceValue,
  getWorkspaceOpenerLabel,
  isWorkspaceAgentOpenerId,
  listWorkspaceOpenerChoices,
  parseWorkspacePreferredOpenerValue,
  listWorkspaceRegistryEntries,
} from '../core/workspace/index.js';
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
  assertWorkspaceOpenerAvailable,
  buildWorkspaceOpenCommandForState,
  launchWorkspaceOpenCommand,
  readWorkspaceOpenState,
} from './workspace/open.js';
import {
  WorkspaceCliError,
  WorkspaceLinkMutationPayload,
  WorkspaceListOutput,
  WorkspaceLinkOptions,
  WorkspaceListOptions,
  WorkspaceOpenOptions,
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

const workspacePromptTheme = {
  prefix: '',
  style: {
    answer: (text: string) => chalk.cyan(text),
    defaultAnswer: (text: string) => chalk.dim(text),
    error: (text: string) => chalk.red(text),
    help: (text: string) => chalk.dim(text),
    highlight: (text: string) => chalk.cyan(text),
    key: (text: string) => chalk.cyan(text),
    message: (text: string) => chalk.bold(text),
  },
};

const workspaceSelectTheme = {
  ...workspacePromptTheme,
  icon: {
    cursor: chalk.cyan('>'),
  },
  style: {
    ...workspacePromptTheme.style,
    keysHelpTip: (keys: [key: string, action: string][]) =>
      chalk.dim(keys.map(([key, action]) => `${key}: ${action}`).join(' | ')),
  },
};

function printWorkspaceSetupIntro(): void {
  console.log(chalk.bold('Workspace setup'));
  console.log('');
}

function isPromptCancellationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ExitPromptError' || error.message.includes('force closed the prompt with SIGINT'))
  );
}

async function promptWorkspaceName(initialName?: string): Promise<string> {
  if (initialName) {
    return validateWorkspaceNameForSetup(initialName);
  }

  const { input } = await import('@inquirer/prompts');

  console.log(chalk.bold('[1/4] Name the workspace'));
  console.log(chalk.dim('Use a stable name for the repo group, e.g. platform.'));
  console.log('');

  return input({
    message: 'Workspace name:',
    required: true,
    theme: workspacePromptTheme,
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

async function promptExistingPath(message: string, defaultPath?: string): Promise<string> {
  const { input } = await import('@inquirer/prompts');

  const pathInput = await input({
    message,
    default: defaultPath,
    prefill: defaultPath ? 'editable' : undefined,
    required: true,
    theme: workspacePromptTheme,
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
    required: true,
    theme: workspacePromptTheme,
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
  const { select } = await import('@inquirer/prompts');
  const links: Record<string, string> = {};

  console.log('');
  console.log(chalk.bold('[2/4] Link repos or folders'));
  console.log(chalk.dim('Start with the current directory, or enter another repo path.'));
  console.log('');

  while (true) {
    const linkCount = Object.keys(links).length;
    const resolvedPath = await promptExistingPath(
      linkCount === 0 ? 'Repo or folder path:' : 'Another repo or folder path:',
      linkCount === 0 ? '.' : undefined
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
    console.log(chalk.green(`Added link '${linkName}'`));
    console.log(chalk.dim(`  ${resolvedPath}`));

    const nextAction = await select({
      message: 'Continue',
      default: 'finish',
      choices: [
        {
          name: 'Create workspace files',
          short: 'Create workspace files',
          value: 'finish',
          description: 'Run a workspace check after setup',
        },
        {
          name: 'Add another repo or folder',
          short: 'Add another',
          value: 'add',
          description: 'Include another local directory in this workspace',
        },
      ],
      theme: workspaceSelectTheme,
    });

    if (nextAction === 'finish') {
      return links;
    }
  }
}

function formatOpenerChoiceName(choice: ReturnType<typeof listWorkspaceOpenerChoices>[number]): string {
  return choice.unavailableNote ? `${choice.label} (${choice.unavailableNote})` : choice.label;
}

async function promptPreferredOpener(
  message: string,
  openerChoices = listWorkspaceOpenerChoices()
): Promise<WorkspacePreferredOpener> {
  const { select } = await import('@inquirer/prompts');
  const selectedValue = await select({
    message,
    default: getDefaultWorkspaceOpenerChoiceValue(openerChoices),
    choices: openerChoices.map((choice) => ({
      name: formatOpenerChoiceName(choice),
      short: choice.label,
      value: choice.value,
      description: choice.unavailableNote ?? `Use ${choice.label}`,
    })),
    theme: workspaceSelectTheme,
  });

  return parseWorkspacePreferredOpenerValue(selectedValue);
}

function parseSetupOpenerOption(opener: string | undefined): WorkspacePreferredOpener | undefined {
  if (!opener) {
    return undefined;
  }

  try {
    return parseWorkspacePreferredOpenerValue(opener);
  } catch (error) {
    throw new WorkspaceCliError(asErrorMessage(error), 'unsupported_workspace_opener', {
      target: 'workspace.opener',
      fix: 'Use --opener codex, --opener claude, --opener github-copilot, or --opener editor.',
    });
  }
}

function parseAgentOverride(agent: string): WorkspacePreferredOpener {
  if (!isWorkspaceAgentOpenerId(agent)) {
    throw new WorkspaceCliError(
      `Unsupported workspace agent '${agent}'. Supported agents: codex, claude, github-copilot.`,
      'unsupported_workspace_agent',
      {
        target: 'workspace.opener',
        fix: 'Use --agent codex, --agent claude, or --agent github-copilot.',
      }
    );
  }

  return {
    kind: 'agent',
    id: agent,
  };
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

function collectWorkspaceIssues(workspace: WorkspaceListOutput): WorkspaceStatus[] {
  return [
    ...workspace.status,
    ...workspace.links.flatMap((link) => link.status),
  ];
}

function printDoctorHuman(result: { workspace: WorkspaceOutput; status: WorkspaceStatus[] }): void {
  console.log(`Workspace: ${result.workspace.name}`);
  console.log(`Location: ${result.workspace.root}`);
  console.log(`Planning path: ${result.workspace.planning_path}`);
  console.log('');
  printStatusLines(result.status);
  if (result.status.length > 0) {
    console.log('');
  }
  console.log('Linked repos or folders:');
  printLinksHuman(result.workspace.links);

  const issues = collectWorkspaceIssues(result.workspace);

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

function printWorkspaceListHuman(workspaces: WorkspaceListOutput[]): void {
  console.log(chalk.bold(`OpenSpec workspaces (${workspaces.length})`));

  for (const workspace of workspaces) {
    console.log('');
    console.log(chalk.bold(workspace.name));
    console.log(`  Location: ${workspace.root}`);

    if (workspace.status.length > 0) {
      console.log('  Status:');
      for (const status of workspace.status) {
        const statusLabel = status.severity === 'warning' ? chalk.yellow('Warning') : chalk.red('Issue');
        console.log(`    ${statusLabel}: ${status.message}`);
        if (status.fix) {
          console.log(`    Fix: ${status.fix}`);
        }
      }
    }

    console.log(`  Linked repos or folders (${workspace.links.length}):`);
    if (workspace.links.length === 0) {
      console.log(chalk.dim('    (none)'));
      continue;
    }

    for (const link of workspace.links) {
      const suffix = link.status.some((status) => status.severity === 'error') ? chalk.red(' [issue]') : '';
      console.log(`    ${link.name} -> ${link.path ?? '(no local path recorded)'}${suffix}`);
      if (link.repo_specs_path) {
        console.log(chalk.dim(`      repo specs: ${link.repo_specs_path}`));
      }
    }
  }
}

function printWorkspaceCheckSummaryHuman(result: { workspace: WorkspaceOutput; status: WorkspaceStatus[] }): void {
  printStatusLines(result.status);
  const issues = collectWorkspaceIssues(result.workspace);

  if (issues.length === 0) {
    console.log('  No workspace issues found.');
    return;
  }

  console.log('  Issues:');
  for (const issue of issues) {
    console.log(`    - ${issue.message}`);
    if (issue.target) {
      console.log(`      Target: ${issue.target}`);
    }
    if (issue.fix) {
      console.log(`      Fix: ${issue.fix}`);
    }
  }
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

async function resolveWorkspaceOpenOpener(
  localState: { preferred_opener?: WorkspacePreferredOpener },
  options: WorkspaceOpenOptions
): Promise<WorkspacePreferredOpener> {
  if (options.agent && options.editor) {
    throw new WorkspaceCliError(
      'workspace open accepts either --agent <tool> or --editor, not both.',
      'workspace_opener_conflict',
      {
        target: 'workspace.opener',
        fix: 'Choose one opener override.',
      }
    );
  }

  if (options.agent) {
    return parseAgentOverride(options.agent);
  }

  if (options.editor) {
    return parseWorkspacePreferredOpenerValue('editor');
  }

  if (localState.preferred_opener) {
    return localState.preferred_opener;
  }

  if (!resolveNoInteractive(options) && isInteractive(options)) {
    const openerChoices = listWorkspaceOpenerChoices().filter((choice) => choice.available);
    if (openerChoices.length === 0) {
      throw new WorkspaceCliError(
        'No supported workspace opener is available on PATH.',
        'workspace_no_available_openers',
        {
          target: 'workspace.opener',
          fix: "Install VS Code ('code'), Codex ('codex'), or Claude ('claude'), then retry.",
        }
      );
    }

    return promptPreferredOpener('Open with:', openerChoices);
  }

  throw new WorkspaceCliError(
    'This workspace does not have a preferred opener yet.',
    'workspace_opener_unset',
    {
      target: 'workspace.opener',
      fix: 'Pass --agent <tool> or --editor, or run workspace setup interactively to choose a default opener.',
    }
  );
}

function assertWorkspaceOpenSupportedOptions(options: WorkspaceOpenOptions): void {
  if (options.prepareOnly) {
    throw new WorkspaceCliError(
      'workspace open supports launching through a selected opener; preview output is reserved for a future context/query surface.',
      'workspace_open_prepare_only_unsupported',
      {
        target: 'workspace.open',
        fix: 'Run openspec workspace open with --agent <tool> or --editor.',
      }
    );
  }

  if (options.json) {
    throw new WorkspaceCliError(
      'workspace open supports launching through a selected opener; machine-readable context is reserved for a future context/query surface.',
      'workspace_open_json_unsupported',
      {
        target: 'workspace.open',
        fix: 'Use openspec workspace doctor --json for current workspace status.',
      }
    );
  }

  if (options.change) {
    throw new WorkspaceCliError(
      'workspace open currently supports root workspace open only; change-scoped open belongs to future workspace change planning.',
      'workspace_open_change_unsupported',
      {
        target: 'workspace.change',
        fix: 'Open the root workspace, then start implementation from an explicit change workflow.',
      }
    );
  }
}

function resolveOpenWorkspaceName(
  positionalName: string | undefined,
  options: WorkspaceOpenOptions
): string | undefined {
  if (positionalName && options.workspace && positionalName !== options.workspace) {
    throw new WorkspaceCliError(
      `Conflicting workspace selectors: positional '${positionalName}' and --workspace '${options.workspace}'.`,
      'workspace_selection_conflict',
      {
        target: 'workspace.name',
        fix: 'Use either the positional workspace name or --workspace with the same value.',
      }
    );
  }

  return positionalName ?? options.workspace;
}

function printWorkspaceOpenHuman(
  selectedName: string,
  selectedRoot: string,
  opener: WorkspacePreferredOpener,
  skipped: Awaited<ReturnType<typeof buildWorkspaceOpenCommandForState>>['skipped']
): void {
  console.log(`Opening workspace: ${selectedName}`);
  console.log(`Location: ${selectedRoot}`);
  console.log(`Opener: ${getWorkspaceOpenerLabel(opener)}`);

  if (skipped.length === 0) {
    return;
  }

  console.log('');
  console.log('Skipped linked repos or folders:');
  for (const link of skipped) {
    const location = link.path ?? '(no local path recorded)';
    console.log(`  ${link.name} -> ${location}`);
  }
  console.log('Repair skipped links with openspec workspace doctor.');
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
      if (interactive) {
        printWorkspaceSetupIntro();
      }

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
      if (interactive) {
        console.log('');
        console.log(chalk.bold('[3/4] Choose preferred opener'));
      }
      const preferredOpener = interactive
        ? await promptPreferredOpener('Preferred opener:')
        : parseSetupOpenerOption(options.opener);

      if (Object.keys(links).length === 0) {
        throw new WorkspaceCliError(
          'workspace setup --no-interactive requires --name <name> and at least one --link <path>.',
          'missing_setup_inputs',
          {
            fix: 'openspec workspace setup --no-interactive --name platform --link /path/to/repo',
          }
        );
      }

      if (interactive) {
        console.log('');
        console.log(chalk.bold('[4/4] Create workspace files'));
      }

      const workspace = await createManagedWorkspace(workspaceName, links, preferredOpener);
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

      console.log(chalk.green('Workspace setup complete'));
      console.log('');
      printWorkspaceListHuman([doctorResult.workspace]);
      console.log('');
      console.log(`Planning path: ${doctorResult.workspace.planning_path}`);
      console.log('');
      console.log('Workspace check:');
      printWorkspaceCheckSummaryHuman(doctorResult);
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

      printWorkspaceListHuman(workspaces);
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

  async open(
    positionalName: string | undefined,
    options: WorkspaceOpenOptions = {}
  ): Promise<void> {
    try {
      assertWorkspaceOpenSupportedOptions(options);

      const workspaceName = resolveOpenWorkspaceName(positionalName, options);
      const selected = await selectWorkspaceForCommand(
        {
          ...options,
          workspace: workspaceName,
        },
        'open',
        { preferPositionalName: true }
      );
      const state = await readWorkspaceOpenState(selected);
      const opener = await resolveWorkspaceOpenOpener(state.localState, options);

      assertWorkspaceOpenerAvailable(opener, state.codeWorkspacePath);

      const { command, skipped } = await buildWorkspaceOpenCommandForState(
        opener,
        selected.root,
        state
      );

      printStatusLines(selected.status);
      if (selected.status.length > 0) {
        console.log('');
      }
      printWorkspaceOpenHuman(selected.name, selected.root, opener, skipped);

      await launchWorkspaceOpenCommand(command);
    } catch (error) {
      this.handleFailure(options.json, { workspace: null, status: [] }, error);
    }
  }

  private handleFailure<T extends { status: WorkspaceStatus[] }>(
    json: boolean | undefined,
    payload: T,
    error: unknown
  ): void {
    if (!json && isPromptCancellationError(error)) {
      console.error('Cancelled.');
      process.exitCode = 130;
      return;
    }

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
    .option('--opener <id>', 'Preferred opener: codex, claude, github-copilot, or editor')
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
    .command('open [name]')
    .description('Open a workspace in an agent or VS Code editor')
    .option('--workspace <name>', 'Workspace name from the local workspace registry')
    .option('--agent <tool>', 'Use an agent for this session: codex, claude, or github-copilot')
    .option('--editor', 'Open the workspace in VS Code editor mode')
    .option('--prepare-only', 'Unsupported: preview surfaces belong to a future context/query command')
    .option('--json', 'Unsupported: machine-readable context belongs to a future context/query command')
    .option('--change <id>', 'Unsupported: change-scoped open belongs to future workspace change planning')
    .option('--no-interactive', 'Disable prompts')
    .action(async (name: string | undefined, options: WorkspaceOpenOptions) => {
      await workspaceCommand.open(name, options);
    });

  // Intentionally no public `workspace create` command in this slice.
}
