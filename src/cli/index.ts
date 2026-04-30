import { Command } from 'commander';
import { createRequire } from 'module';
import ora from 'ora';
import path from 'path';
import { promises as fs } from 'fs';
import { AI_TOOLS } from '../core/config.js';
import { CLI_DESCRIPTIONS, CLI_MESSAGES, CONFIG_MESSAGES } from '../messages/index.js';
import { UpdateCommand } from '../core/update.js';
import { ListCommand } from '../core/list.js';
import { ArchiveCommand } from '../core/archive.js';
import { ViewCommand } from '../core/view.js';
import { registerSpecCommand } from '../commands/spec.js';
import { ChangeCommand } from '../commands/change.js';
import { ValidateCommand } from '../commands/validate.js';
import { ShowCommand } from '../commands/show.js';
import { CompletionCommand } from '../commands/completion.js';
import { FeedbackCommand } from '../commands/feedback.js';
import { registerConfigCommand } from '../commands/config.js';
import { registerSchemaCommand } from '../commands/schema.js';
import { registerToolsCommand } from '../commands/tools.js';
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

const program = new Command();
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

/**
 * Get the full command path for nested commands.
 * For example: 'change show' -> 'change:show'
 */
function getCommandPath(command: Command): string {
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
  .description(CLI_DESCRIPTIONS.root)
  .version(version);

// Global options
program.option('--no-color', CLI_DESCRIPTIONS.noColor);

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
const toolsOptionDescription = `Configura ferramentas de IA não interativamente. Use "all", "none" ou uma lista separada por vírgula: ${availableToolIds.join(', ')}`;

program
  .command('init [path]')
  .description(CLI_DESCRIPTIONS.init)
  .option('--tools <tools>', toolsOptionDescription)
  .option('--force', CLI_DESCRIPTIONS.force)
  .option('--profile <profile>', CLI_DESCRIPTIONS.profile)
  .action(async (targetPath = '.', options?: { tools?: string; force?: boolean; profile?: string }) => {
    try {
      // Validate that the path is a valid directory
      const resolvedPath = path.resolve(targetPath);

      try {
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
          throw new Error(CLI_MESSAGES.notADirectory(targetPath));
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // Directory doesn't exist, but we can create it
          console.log(CLI_MESSAGES.directoryWillBeCreated(targetPath));
        } else if (error.message && error.message.includes('not a directory')) {
          throw error;
        } else {
          throw new Error(CLI_MESSAGES.cannotAccessPath(targetPath, error.message));
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
      console.log(); // Empty line for spacing
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

// Hidden alias: 'experimental' -> 'init' for backwards compatibility
program
  .command('experimental', { hidden: true })
  .description(CLI_DESCRIPTIONS.experimental)
  .option('--tool <tool-id>', 'Target AI tool (maps to --tools)')
  .option('--no-interactive', 'Desativa prompts interativos')
  .action(async (options?: { tool?: string; noInteractive?: boolean }) => {
    try {
      console.log(CLI_MESSAGES.experimentalDeprecated);
      const { InitCommand } = await import('../core/init.js');
      const initCommand = new InitCommand({
        tools: options?.tool,
        interactive: options?.noInteractive === true ? false : undefined,
      });
      await initCommand.execute('.');
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

program
  .command('update [path]')
  .description(CLI_DESCRIPTIONS.update)
  .option('--force', 'Força atualização mesmo quando as ferramentas estão atualizadas')
  .action(async (targetPath = '.', options?: { force?: boolean }) => {
    try {
      const resolvedPath = path.resolve(targetPath);
      const updateCommand = new UpdateCommand({ force: options?.force });
      await updateCommand.execute(resolvedPath);
    } catch (error) {
      console.log(); // Empty line for spacing
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

program
  .command('list')
  .description(CLI_DESCRIPTIONS.list)
  .option('--specs', 'Lista especificações em vez de alterações')
  .option('--changes', 'Lista alterações explicitamente (padrão)')
  .option('--sort <order>', 'Ordem de classificação: "recent" (padrão) ou "name"', 'recent')
  .option('--json', 'Saída como JSON (para uso programático)')
  .action(async (options?: { specs?: boolean; changes?: boolean; sort?: string; json?: boolean }) => {
    try {
      const listCommand = new ListCommand();
      const mode: 'changes' | 'specs' = options?.specs ? 'specs' : 'changes';
      const sort = options?.sort === 'name' ? 'name' : 'recent';
      await listCommand.execute('.', mode, { sort, json: options?.json });
    } catch (error) {
      console.log(); // Empty line for spacing
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

program
  .command('view')
  .description(CLI_DESCRIPTIONS.view)
  .action(async () => {
    try {
      const viewCommand = new ViewCommand();
      await viewCommand.execute('.');
    } catch (error) {
      console.log(); // Empty line for spacing
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

// Change command with subcommands
const changeCmd = program
  .command('change')
  .description(CLI_DESCRIPTIONS.change);

// Deprecation notice for noun-based commands
changeCmd.hook('preAction', () => {
  console.error(CLI_MESSAGES.changeCommandsDeprecated);
});

changeCmd
  .command('show [change-name]')
  .description(CLI_DESCRIPTIONS.changeShow)
  .option('--json', 'Saída como JSON')
  .option('--deltas-only', 'Exibe apenas deltas (somente JSON)')
  .option('--requirements-only', 'Alias para --deltas-only (descontinuado)')
  .option('--no-interactive', 'Disable interactive prompts')
  .action(async (changeName?: string, options?: { json?: boolean; requirementsOnly?: boolean; deltasOnly?: boolean; noInteractive?: boolean }) => {
    try {
      const changeCommand = new ChangeCommand();
      await changeCommand.show(changeName, options);
    } catch (error) {
      console.error(CLI_MESSAGES.error((error as Error).message));
      process.exitCode = 1;
    }
  });

changeCmd
  .command('list')
  .description(CLI_DESCRIPTIONS.changeList)
  .option('--json', 'Saída como JSON')
  .option('--long', 'Show id and title with counts')
  .action(async (options?: { json?: boolean; long?: boolean }) => {
    try {
      console.error(CLI_MESSAGES.changeListDeprecated);
      const changeCommand = new ChangeCommand();
      await changeCommand.list(options);
    } catch (error) {
      console.error(CLI_MESSAGES.error((error as Error).message));
      process.exitCode = 1;
    }
  });

changeCmd
  .command('validate [change-name]')
  .description(CLI_DESCRIPTIONS.changeValidate)
  .option('--strict', 'Ativa modo de validação estrita')
  .option('--json', 'Saída do relatório de validação como JSON')
  .option('--no-interactive', 'Disable interactive prompts')
  .action(async (changeName?: string, options?: { strict?: boolean; json?: boolean; noInteractive?: boolean }) => {
    try {
      const changeCommand = new ChangeCommand();
      await changeCommand.validate(changeName, options);
      if (typeof process.exitCode === 'number' && process.exitCode !== 0) {
        process.exit(process.exitCode);
      }
    } catch (error) {
      console.error(CLI_MESSAGES.error((error as Error).message));
      process.exitCode = 1;
    }
  });

program
  .command('archive [change-name]')
  .description(CLI_DESCRIPTIONS.archive)
  .option('-y, --yes', 'Pula confirmações interativas')
  .option('--skip-specs', 'Ignora operações de atualização de especificação (útil para alterações de infraestrutura, ferramentas ou apenas documentação)')
  .option('--no-validate', 'Ignora validação (não recomendado, requer confirmação)')
  .action(async (changeName?: string, options?: { yes?: boolean; skipSpecs?: boolean; noValidate?: boolean; validate?: boolean }) => {
    try {
      const archiveCommand = new ArchiveCommand();
      await archiveCommand.execute(changeName, options);
    } catch (error) {
      console.log(); // Empty line for spacing
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

registerSpecCommand(program);
registerConfigCommand(program);
registerSchemaCommand(program);
registerToolsCommand(program);

// Top-level validate command
program
  .command('validate [item-name]')
  .description(CLI_DESCRIPTIONS.validate)
  .option('--all', 'Valida todas as alterações e especificações')
  .option('--changes', 'Valida todas as alterações')
  .option('--specs', 'Valida todas as especificações')
  .option('--type <type>', 'Especifica o tipo do item quando ambíguo: change|spec')
  .option('--strict', 'Ativa modo de validação estrita')
  .option('--json', 'Saída dos resultados de validação como JSON')
  .option('--concurrency <n>', 'Máximo de validações concorrentes (padrão: env OPENSPEC_CONCURRENCY ou 6)')
  .option('--no-interactive', 'Disable interactive prompts')
  .action(async (itemName?: string, options?: { all?: boolean; changes?: boolean; specs?: boolean; type?: string; strict?: boolean; json?: boolean; noInteractive?: boolean; concurrency?: string }) => {
    try {
      const validateCommand = new ValidateCommand();
      await validateCommand.execute(itemName, options);
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

// Top-level show command
program
  .command('show [item-name]')
  .description(CLI_DESCRIPTIONS.show)
  .option('--json', 'Saída como JSON')
  .option('--type <type>', 'Especifica o tipo do item quando ambíguo: change|spec')
  .option('--no-interactive', 'Disable interactive prompts')
  // change-only flags
  .option('--deltas-only', 'Exibe apenas deltas (somente JSON, alteração)')
  .option('--requirements-only', 'Alias para --deltas-only (descontinuado, alteração)')
  // spec-only flags
  .option('--requirements', 'Somente JSON: Exibe apenas requisitos (exclui cenários)')
  .option('--no-scenarios', 'Somente JSON: Exclui conteúdo de cenários')
  .option('-r, --requirement <id>', 'Somente JSON: Exibe requisito específico pelo ID (base 1)')
  // allow unknown options to pass-through to underlying command implementation
  .allowUnknownOption(true)
  .action(async (itemName?: string, options?: { json?: boolean; type?: string; noInteractive?: boolean; [k: string]: any }) => {
    try {
      const showCommand = new ShowCommand();
      await showCommand.execute(itemName, options ?? {});
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

// Feedback command
program
  .command('feedback <message>')
  .description(CLI_DESCRIPTIONS.feedback)
  .option('--body <text>', 'Descrição detalhada do feedback')
  .action(async (message: string, options?: { body?: string }) => {
    try {
      const feedbackCommand = new FeedbackCommand();
      await feedbackCommand.execute(message, options);
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

// Completion command with subcommands
const completionCmd = program
  .command('completion')
  .description(CLI_DESCRIPTIONS.completion);

completionCmd
  .command('generate [shell]')
  .description(CLI_DESCRIPTIONS.completionGenerate)
  .action(async (shell?: string) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.generate({ shell });
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

completionCmd
  .command('install [shell]')
  .description(CLI_DESCRIPTIONS.completionInstall)
  .option('--verbose', 'Mostra saída detalhada da instalação')
  .action(async (shell?: string, options?: { verbose?: boolean }) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.install({ shell, verbose: options?.verbose });
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

completionCmd
  .command('uninstall [shell]')
  .description(CLI_DESCRIPTIONS.completionUninstall)
  .option('-y, --yes', CONFIG_MESSAGES.skipConfirmationOption)
  .action(async (shell?: string, options?: { yes?: boolean }) => {
    try {
      const completionCommand = new CompletionCommand();
      await completionCommand.uninstall({ shell, yes: options?.yes });
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

// Hidden command for machine-readable completion data
program
  .command('__complete <type>', { hidden: true })
  .description(CLI_DESCRIPTIONS.__complete)
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
  .description(CLI_DESCRIPTIONS.status)
  .option('--change <id>', 'Nome da alteração para exibir o status')
  .option('--schema <name>', 'Sobrescreve o esquema (auto-detectado do config.yaml)')
  .option('--json', 'Output as JSON')
  .action(async (options: StatusOptions) => {
    try {
      await statusCommand(options);
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

// Instructions command
program
  .command('instructions [artifact]')
  .description(CLI_DESCRIPTIONS.instructions)
  .option('--change <id>', 'Nome da alteração')
  .option('--schema <name>', 'Sobrescreve o esquema (auto-detectado do config.yaml)')
  .option('--json', 'Output as JSON')
  .action(async (artifactId: string | undefined, options: InstructionsOptions) => {
    try {
      // Special case: "apply" is not an artifact, but a command to get apply instructions
      if (artifactId === 'apply') {
        await applyInstructionsCommand(options);
      } else {
        await instructionsCommand(artifactId, options);
      }
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

// Templates command
program
  .command('templates')
  .description(CLI_DESCRIPTIONS.templates)
  .option('--schema <name>', `Esquema a usar (padrão: ${DEFAULT_SCHEMA})`)
  .option('--json', 'Saída como JSON mapeando IDs de artefatos para caminhos de templates')
  .action(async (options: TemplatesOptions) => {
    try {
      await templatesCommand(options);
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

// Schemas command
program
  .command('schemas')
  .description(CLI_DESCRIPTIONS.schemas)
  .option('--json', 'Saída como JSON (para uso por agentes)')
  .action(async (options: SchemasOptions) => {
    try {
      await schemasCommand(options);
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

// New command group with change subcommand
const newCmd = program.command('new').description(CLI_DESCRIPTIONS.new);

newCmd
  .command('change <name>')
  .description(CLI_DESCRIPTIONS.newChange)
  .option('--description <text>', 'Descrição a adicionar ao README.md')
  .option('--schema <name>', `Esquema de fluxo de trabalho a usar (padrão: ${DEFAULT_SCHEMA})`)
  .action(async (name: string, options: NewChangeOptions) => {
    try {
      await newChangeCommand(name, options);
    } catch (error) {
      console.log();
      ora().fail(CLI_MESSAGES.error((error as Error).message));
      process.exit(1);
    }
  });

program.parse();
