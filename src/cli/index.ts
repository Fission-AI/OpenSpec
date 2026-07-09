import { asStatus } from '../commands/shared-output.js';
import { Command, Option } from 'commander';
import { createRequire } from 'module';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { AI_TOOLS } from '../core/config.js';
import { UpdateCommand } from '../core/update.js';
import { ListCommand } from '../core/list.js';
import {
  rollupInitiatives,
  rollupRegisteredStorePortfolios,
  type PortfolioInfo,
} from '../core/initiatives.js';
import { ArchiveCommand, type ArchiveOptions } from '../core/archive.js';
import { ViewCommand } from '../core/view.js';
import { resolveRootForCommand, toRootOutput, isStoreSelectedRoot, type ResolvedOpenSpecRoot } from '../core/root-selection.js';
import { registerSpecCommand } from '../commands/spec.js';
import { ChangeCommand } from '../commands/change.js';
import { ValidateCommand } from '../commands/validate.js';
import { ShowCommand } from '../commands/show.js';
import { CompletionCommand } from '../commands/completion.js';
import { FeedbackCommand } from '../commands/feedback.js';
import { registerConfigCommand } from '../commands/config.js';
import { registerSchemaCommand } from '../commands/schema.js';
import { registerStoreCommand } from '../commands/store.js';
import { registerDoctorCommand } from '../commands/doctor.js';
import { registerContextCommand } from '../commands/context.js';
import { registerWorksetCommand } from '../commands/workset.js';
import {
  statusCommand,
  instructionsCommand,
  applyInstructionsCommand,
  templatesCommand,
  schemasCommand,
  newChangeCommand,
  DEFAULT_SCHEMA,
  type StatusOptions,
  type InstructionsOptions,
  type TemplatesOptions,
  type SchemasOptions,
  type NewChangeOptions,
} from '../commands/workflow/index.js';
import { maybeShowTelemetryNotice, trackCommand, shutdown } from '../telemetry/index.js';
import { COMMON_FLAGS } from '../core/completions/shared-flags.js';

const STORE_OPTION_DESCRIPTION = COMMON_FLAGS.store.description;

// Deliberate rejection path: --store-path stays registered (hidden) so the
// resolver can explain that registering the path is the supported route,
// instead of Commander emitting a generic unknown-option error (or, for
// `show`, silently ignoring it via allowUnknownOption).
function hiddenStorePathOption(): Option {
  return new Option(
    '--store-path <path>',
    'Not supported; register the path with "openspec store register <path>" and use --store <id>'
  ).hideHelp();
}

function printPortfolioBody(
  portfolio: PortfolioInfo,
  indent: string,
  // Store portfolios need the store-qualified ref in the link hint — a bare
  // <name> would not resolve from a consumer repo.
  refPrefix = ''
): void {
  if (portfolio.evergreen.length > 0) {
    console.log(`${indent}Evergreen: ${portfolio.evergreen.join(', ')}`);
  }
  if (portfolio.initiatives.length === 0) {
    if (portfolio.evergreen.length === 0) {
      console.log(
        `${indent}(empty — add an evergreen artifact like product.md, or a folder per initiative)`
      );
    }
    return;
  }

  let anyChanges = false;
  for (const initiative of portfolio.initiatives) {
    const summary =
      initiative.changesTotal === 0
        ? 'no changes yet'
        : `${initiative.changesComplete}/${initiative.changesTotal} changes complete`;
    const missing = initiative.exists ? '' : '  (no folder)';
    console.log('');
    console.log(`${indent}${initiative.name}   ${summary}${missing}`);
    if (initiative.stages.length > 0) {
      console.log(
        `${indent}  stages: ${initiative.stages.map((stage) => stage.name).join(' → ')}`
      );
    }
    if (initiative.changes.length === 0) continue;
    anyChanges = true;
    const changeWidth = Math.max(...initiative.changes.map((c) => c.id.length));
    for (const change of initiative.changes) {
      const mark =
        change.state === 'complete' ? '✓' : change.state === 'no-tasks' ? '–' : '·';
      const where = change.store ?? change.repo ?? 'here';
      const tasks =
        change.totalTasks === 0
          ? 'no tasks'
          : `${change.completedTasks}/${change.totalTasks} tasks`;
      console.log(
        `${indent}  ${mark} ${change.id.padEnd(changeWidth)}  ${where.padEnd(14)}  ${tasks}`
      );
    }
    // Truth flows up: an initiative whose changes are all complete is the
    // trigger to update the evergreen artifacts it served.
    if (initiative.changesTotal > 0 && initiative.changesComplete === initiative.changesTotal) {
      console.log(
        `${indent}  all changes complete — sync the evergreen artifacts this initiative served`
      );
    }
  }
  if (!anyChanges) {
    console.log('');
    console.log(
      `${indent}Link a change: openspec new change <name> --initiative ${refPrefix}<name>`
    );
  }
}

async function renderInitiatives(
  root: ResolvedOpenSpecRoot,
  options: { json?: boolean }
): Promise<void> {
  const initiatives = await rollupInitiatives(root.path);

  if (options.json) {
    console.log(
      JSON.stringify({ initiatives, root: toRootOutput(root) }, null, 2)
    );
    return;
  }

  if (initiatives === null) {
    console.log('No initiatives folder found at openspec/initiatives/.');
    console.log(
      'Start one: mkdir -p openspec/initiatives/<name>, then add any artifact (notes.md, roadmap.md — any name).'
    );
    return;
  }

  console.log(`Initiatives: ${initiatives.path}`);
  printPortfolioBody(initiatives, '', isStoreSelectedRoot(root) ? `${root.storeId}/` : '');
}

/**
 * Outside any root, the portfolio question is still answerable: show the
 * initiatives of every registered store that has them.
 */
async function renderStorePortfolios(options: { json?: boolean }): Promise<void> {
  const stores = await rollupRegisteredStorePortfolios();

  if (options.json) {
    console.log(JSON.stringify({ initiatives: null, stores, root: null }, null, 2));
    return;
  }

  if (stores.length === 0) {
    console.log('No local OpenSpec root, and no registered store has initiatives.');
    console.log('Run inside a repo, or pass --store <id>.');
    return;
  }

  console.log('No local OpenSpec root — showing registered store portfolios.');
  for (const { store, portfolio } of stores) {
    console.log('');
    console.log(`${store}  (${portfolio.path})`);
    printPortfolioBody(portfolio, '  ', `${store}/`);
  }
}

function failWithError(
  error: unknown,
  json?: { enabled: boolean | undefined; payload?: Record<string, unknown>; fallbackCode?: string }
): void {
  // The agent contract: every --json failure leaves exactly one JSON
  // document on stdout (the command's null-shape plus a status array).
  if (json?.enabled) {
    console.log(
      JSON.stringify(
        { ...(json.payload ?? {}), status: [asStatus(error, json.fallbackCode ?? 'command_error')] },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }
  ora().fail(`Error: ${(error as Error).message}`);
  // Resolution and store errors carry a pasteable fix - never drop it.
  const fix = (error as { diagnostic?: { fix?: string } }).diagnostic?.fix;
  if (fix) {
    console.error(`Fix: ${fix}`);
  }
  process.exitCode = process.exitCode ?? 1;
}

const program = new Command();
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

/**
 * Get the full command path for nested commands.
 * For example: 'change show' -> 'change:show'
 */
export function getCommandPath(command: Command): string {
  const names: string[] = [];
  let current: Command | null = command;

  while (current) {
    const name = current.name();
    // Skip the root 'openspec' command
    if (name && name !== 'openspec') {
      names.unshift(name);
    }
    current = current.parent;
  }

  return names.join(':') || 'openspec';
}

program
  .name('openspec')
  .description('AI-native system for spec-driven development')
  .version(version);

// Global options
program.option('--no-color', 'Disable color output');

// Apply global flags and telemetry before any command runs
// Note: preAction receives (thisCommand, actionCommand) where:
// - thisCommand: the command where hook was added (root program)
// - actionCommand: the command actually being executed (subcommand)
program.hook('preAction', async (thisCommand, actionCommand) => {
  const opts = thisCommand.opts();
  if (opts.color === false) {
    process.env.NO_COLOR = '1';
  }

  // Show first-run telemetry notice (if not seen)
  await maybeShowTelemetryNotice();

  // Track command execution (use actionCommand to get the actual subcommand)
  const commandPath = getCommandPath(actionCommand);
  await trackCommand(commandPath, version);
});

// Shutdown telemetry after command completes
program.hook('postAction', async () => {
  await shutdown();
});

const availableToolIds = AI_TOOLS.filter((tool) => tool.skillsDir).map((tool) => tool.value);
const toolsOptionDescription = `Configure AI tools non-interactively. Use "all", "none", or a comma-separated list of: ${availableToolIds.join(', ')}`;

program
  .command('init [path]')
  .description('Initialize OpenSpec in your project')
  .option('--tools <tools>', toolsOptionDescription)
  .option('--force', 'Auto-cleanup legacy files without prompting')
  .option('--profile <profile>', 'Override global config profile (core or custom)')
  .action(async (targetPath = '.', options?: { tools?: string; force?: boolean; profile?: string }) => {
    try {
      // Validate that the path is a valid directory
      const resolvedPath = path.resolve(targetPath);

      try {
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
          throw new Error(`Path "${targetPath}" is not a directory`);
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // Directory doesn't exist, but we can create it
          console.log(`Directory "${targetPath}" doesn't exist, it will be created.`);
        } else if (error.message && error.message.includes('not a directory')) {
          throw error;
        } else {
          throw new Error(`Cannot access path "${targetPath}": ${error.message}`);
        }
      }

      const { InitCommand } = await import('../core/init.js');
      const initCommand = new InitCommand({
        tools: options?.tools,
        force: options?.force,
        profile: options?.profile,
      });
      await initCommand.execute(targetPath);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// Hidden alias: 'experimental' -> 'init' for backwards compatibility
program
  .command('experimental', { hidden: true })
  .description('Alias for init (deprecated)')
  .option('--tool <tool-id>', 'Target AI tool (maps to --tools)')
  .option('--no-interactive', 'Disable interactive prompts')
  .action(async (options?: { tool?: string; noInteractive?: boolean }) => {
    try {
      console.log('Note: "openspec experimental" is deprecated. Use "openspec init" instead.');
      const { InitCommand } = await import('../core/init.js');
      const initCommand = new InitCommand({
        tools: options?.tool,
        interactive: options?.noInteractive === true ? false : undefined,
      });
      await initCommand.execute('.');
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

program
  .command('update [path]')
  .description('Update OpenSpec instruction files')
  .option('--force', 'Force update even when tools are up to date')
  .action(async (targetPath = '.', options?: { force?: boolean }) => {
    try {
      const updateCommand = new UpdateCommand({ force: options?.force });
      await updateCommand.execute(targetPath);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List items (changes by default). Use --specs to list specs, --initiatives to see the portfolio rollup.')
  .option('--specs', 'List specs instead of changes')
  .option('--changes', 'List changes explicitly (default)')
  .option('--initiatives', "Show the root's portfolio: every initiative, and every change pointing at it")
  .option('--sort <order>', 'Sort order: "recent" (default) or "name"', 'recent')
  .option('--json', 'Output as JSON (for programmatic use)')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (options?: { specs?: boolean; changes?: boolean; initiatives?: boolean; sort?: string; json?: boolean; store?: string; storePath?: string }) => {
    try {
      const failurePayload = options?.initiatives
        ? { initiatives: null, root: null }
        : options?.specs
          ? { specs: [], root: null }
          : { changes: [], root: null };
      // The portfolio question is the one `list` answer that still makes
      // sense outside any root: fall back to registered store portfolios
      // instead of failing root resolution.
      if (
        options?.initiatives &&
        options.store === undefined &&
        options.storePath === undefined
      ) {
        try {
          const root = await resolveRootForCommand(options ?? {});
          if (root) {
            await renderInitiatives(root, { json: options?.json });
          }
          return;
        } catch (error) {
          const code = (error as { diagnostic?: { code?: string } }).diagnostic?.code;
          if (code !== 'no_root_with_registered_stores') throw error;
          await renderStorePortfolios({ json: options?.json });
          return;
        }
      }
      const root = await resolveRootForCommand(options ?? {}, {
        json: options?.json,
        failurePayload,
      });
      if (!root) {
        return;
      }
      if (options?.initiatives) {
        await renderInitiatives(root, { json: options?.json });
        return;
      }
      const listCommand = new ListCommand();
      const mode: 'changes' | 'specs' = options?.specs ? 'specs' : 'changes';
      const sort = options?.sort === 'name' ? 'name' : 'recent';
      await listCommand.execute(root.path, mode, {
        sort,
        json: options?.json,
        ...(options?.json ? { root: toRootOutput(root) } : {}),
      });
    } catch (error) {
      failWithError(error, {
        enabled: options?.json,
        payload: options?.initiatives
          ? { initiatives: null, root: null }
          : options?.specs
            ? { specs: [], root: null }
            : { changes: [], root: null },
        fallbackCode: 'list_error',
      });
      process.exit(1);
    }
  });

program
  .command('view')
  .description('Display an interactive dashboard of specs and changes')
  .action(async () => {
    try {
      const viewCommand = new ViewCommand();
      await viewCommand.execute('.');
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// Change command with subcommands
const changeCmd = program
  .command('change')
  .description('Manage OpenSpec change proposals');

// Deprecation notice for noun-based commands
changeCmd.hook('preAction', () => {
  console.error('Warning: The "openspec change ..." commands are deprecated. Prefer verb-first commands (e.g., "openspec list", "openspec validate --changes").');
});

changeCmd
  .command('show [change-name]')
  .description('Show a change proposal in JSON or markdown format')
  .option('--json', 'Output as JSON')
  .option('--deltas-only', 'Show only deltas (JSON only)')
  .option('--requirements-only', 'Alias for --deltas-only (deprecated)')
  .option('--no-interactive', 'Disable interactive prompts')
  .action(async (changeName?: string, options?: { json?: boolean; requirementsOnly?: boolean; deltasOnly?: boolean; noInteractive?: boolean }) => {
    try {
      const changeCommand = new ChangeCommand();
      await changeCommand.show(changeName, options);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exitCode = 1;
    }
  });

changeCmd
  .command('list')
  .description('List all active changes (DEPRECATED: use "openspec list" instead)')
  .option('--json', 'Output as JSON')
  .option('--long', 'Show id and title with counts')
  .action(async (options?: { json?: boolean; long?: boolean }) => {
    try {
      console.error('Warning: "openspec change list" is deprecated. Use "openspec list".');
      const changeCommand = new ChangeCommand();
      await changeCommand.list(options);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exitCode = 1;
    }
  });

changeCmd
  .command('validate [change-name]')
  .description('Validate a change proposal')
  .option('--strict', 'Enable strict validation mode')
  .option('--json', 'Output validation report as JSON')
  .option('--no-interactive', 'Disable interactive prompts')
  .action(async (changeName?: string, options?: { strict?: boolean; json?: boolean; noInteractive?: boolean }) => {
    try {
      const changeCommand = new ChangeCommand();
      await changeCommand.validate(changeName, options);
      if (typeof process.exitCode === 'number' && process.exitCode !== 0) {
        process.exit(process.exitCode);
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command('archive [change-name]')
  .description('Archive a completed change and update main specs')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--skip-specs', 'Skip spec update operations (useful for infrastructure, tooling, or doc-only changes)')
  .option('--no-validate', 'Skip validation (not recommended, requires confirmation)')
  .option('--json', 'Output as JSON (non-interactive)')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (changeName?: string, options?: ArchiveOptions) => {
    try {
      const archiveCommand = new ArchiveCommand();
      await archiveCommand.execute(changeName, options);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

registerSpecCommand(program);
registerConfigCommand(program);
registerSchemaCommand(program);
registerStoreCommand(program);
registerDoctorCommand(program);
registerContextCommand(program);
registerWorksetCommand(program);

// Top-level validate command
program
  .command('validate [item-name]')
  .description('Validate changes and specs')
  .option('--all', 'Validate all changes and specs')
  .option('--changes', 'Validate all changes')
  .option('--specs', 'Validate all specs')
  .option('--type <type>', 'Specify item type when ambiguous: change|spec')
  .option('--strict', 'Enable strict validation mode')
  .option('--json', 'Output validation results as JSON')
  .option('--concurrency <n>', 'Max concurrent validations (defaults to env OPENSPEC_CONCURRENCY or 6)')
  .option('--no-interactive', 'Disable interactive prompts')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (itemName?: string, options?: { all?: boolean; changes?: boolean; specs?: boolean; type?: string; strict?: boolean; json?: boolean; noInteractive?: boolean; concurrency?: string; store?: string; storePath?: string }) => {
    try {
      const validateCommand = new ValidateCommand();
      await validateCommand.execute(itemName, options);
    } catch (error) {
      failWithError(error, { enabled: options?.json, fallbackCode: 'validate_error' });
      process.exit(1);
    }
  });

// Top-level show command
program
  .command('show [item-name]')
  .description('Show a change or spec')
  .option('--json', 'Output as JSON')
  .option('--type <type>', 'Specify item type when ambiguous: change|spec')
  .option('--no-interactive', 'Disable interactive prompts')
  // change-only flags
  .option('--deltas-only', 'Show only deltas (JSON only, change)')
  .option('--requirements-only', 'Alias for --deltas-only (deprecated, change)')
  // spec-only flags
  .option('--requirements', 'JSON only: Show only requirements (exclude scenarios)')
  .option('--no-scenarios', 'JSON only: Exclude scenario content')
  .option('-r, --requirement <id>', 'JSON only: Show specific requirement by ID (1-based)')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  // Explicit registration required: allowUnknownOption would otherwise
  // silently swallow --store-path instead of rejecting it deliberately.
  .addOption(hiddenStorePathOption())
  // allow unknown options to pass-through to underlying command implementation
  .allowUnknownOption(true)
  .action(async (itemName?: string, options?: { json?: boolean; type?: string; noInteractive?: boolean; [k: string]: any }) => {
    try {
      const showCommand = new ShowCommand();
      await showCommand.execute(itemName, options ?? {});
    } catch (error) {
      failWithError(error, { enabled: options?.json, fallbackCode: 'show_error' });
      process.exit(1);
    }
  });

// Feedback command
program
  .command('feedback <message>')
  .description('Submit feedback about OpenSpec')
  .option('--body <text>', 'Detailed description for the feedback')
  .action(async (message: string, options?: { body?: string }) => {
    try {
      const feedbackCommand = new FeedbackCommand();
      await feedbackCommand.execute(message, options);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// Completion command with subcommands
const completionCmd = program
  .command('completion')
  .description('Manage shell completions for OpenSpec CLI');

completionCmd
  .command('generate [shell]')
  .description('Generate completion script for a shell (outputs to stdout)')
  .action(async (shell?: string) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.generate({ shell });
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

completionCmd
  .command('install [shell]')
  .description('Install completion script for a shell')
  .option('--verbose', 'Show detailed installation output')
  .action(async (shell?: string, options?: { verbose?: boolean }) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.install({ shell, verbose: options?.verbose });
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

completionCmd
  .command('uninstall [shell]')
  .description('Uninstall completion script for a shell')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (shell?: string, options?: { yes?: boolean }) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.uninstall({ shell, yes: options?.yes });
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// Hidden command for machine-readable completion data
program
  .command('__complete <type>', { hidden: true })
  .description('Output completion data in machine-readable format (internal use)')
  .action(async (type: string) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.complete({ type });
    } catch (error) {
      // Silently fail for graceful shell completion experience
      process.exitCode = 1;
    }
  });

// ═══════════════════════════════════════════════════════════
// Workflow Commands (formerly experimental)
// ═══════════════════════════════════════════════════════════

// Status command
program
  .command('status')
  .description('Display artifact completion status for a change')
  .option('--change <id>', 'Change name to show status for')
  .option('--schema <name>', 'Schema override (auto-detected from config.yaml)')
  .option('--json', 'Output as JSON')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (options: StatusOptions) => {
    try {
      await statusCommand(options);
    } catch (error) {
      failWithError(error, { enabled: options.json, fallbackCode: 'change_error' });
      process.exit(1);
    }
  });

// Instructions command
program
  .command('instructions [artifact]')
  .description('Output enriched instructions for creating an artifact or applying tasks')
  .option('--change <id>', 'Change name')
  .option('--schema <name>', 'Schema override (auto-detected from config.yaml)')
  .option('--json', 'Output as JSON')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (artifactId: string | undefined, options: InstructionsOptions) => {
    try {
      // Special case: "apply" is not an artifact, but a command to get apply instructions
      if (artifactId === 'apply') {
        await applyInstructionsCommand(options);
      } else {
        await instructionsCommand(artifactId, options);
      }
    } catch (error) {
      failWithError(error, { enabled: options.json, fallbackCode: 'change_error' });
      process.exit(1);
    }
  });

// Templates command
program
  .command('templates')
  .description('Show resolved template paths for all artifacts in a schema')
  .option('--schema <name>', `Schema to use (default: ${DEFAULT_SCHEMA})`)
  .option('--json', 'Output as JSON mapping artifact IDs to template paths')
  .action(async (options: TemplatesOptions) => {
    try {
      await templatesCommand(options);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// Schemas command
program
  .command('schemas')
  .description('List available workflow schemas with descriptions')
  .option('--json', 'Output as JSON (for agent use)')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  .action(async (options: SchemasOptions) => {
    try {
      await schemasCommand(options);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

// New command group with change subcommand
const newCmd = program.command('new').description('Create new items');

newCmd
  .command('change <name>')
  .description('Create a new change directory')
  .option('--description <text>', 'Description to add to README.md')
  .option('--goal <text>', 'Optional goal metadata to store with the change')
  .option('--schema <name>', `Workflow schema to use (default: ${DEFAULT_SCHEMA})`)
  .option('--initiative <ref>', 'Link this change to an initiative: <name> or <store-id>/<name>')
  .option('--json', 'Output as JSON')
  .option('--store <id>', STORE_OPTION_DESCRIPTION)
  .addOption(hiddenStorePathOption())
  // Removed option kept registered (hidden) so users get a deliberate
  // explanation instead of a generic unknown-option error.
  .addOption(new Option('--areas <names>', 'No longer supported').hideHelp())
  .action(async (name: string, options: NewChangeOptions) => {
    try {
      await newChangeCommand(name, options);
    } catch (error) {
      failWithError(error);
      process.exit(1);
    }
  });

export { program };

export function runCli(argv = process.argv): void {
  program.parse(argv);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
