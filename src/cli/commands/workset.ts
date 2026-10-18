import { Command, Option } from 'commander';
import { COMMAND_REGISTRY } from '../../core/completions/command-registry.js';
import type { StoreDiagnostic } from '../../core/store/errors.js';
import { printJson } from '../../commands/shared-output.js';
import type {
  WorksetCommand,
  WorksetCreateOptions,
  WorksetOpenOptions,
  WorksetRemoveOptions,
} from '../../commands/workset.js';

async function loadWorksetCommand(): Promise<WorksetCommand> {
  const { WorksetCommand } = await import('../../commands/workset.js');
  return new WorksetCommand();
}

function collectMember(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function registerWorksetCommand(program: Command): void {
  const groupDescription =
    COMMAND_REGISTRY.find((entry) => entry.name === 'workset')?.description ??
    'Compose, keep, and open personal working views (purely local)';
  const workset = program.command('workset').description(groupDescription);
  // Parsed at the group level so `openspec workset --json` keeps the
  // one-JSON-document contract instead of a raw Commander error. The
  // parent option matches anywhere; actions read optsWithGlobals().
  workset.addOption(new Option('--json', 'Output as JSON').hideHelp());

  workset
    .command('create [name]')
    .description('Compose and save a named working view of folders you choose')
    .option(
      '--member <member>',
      'Member folder as <path> or <name>=<path>; repeatable, first is the primary',
      collectMember,
      [] as string[]
    )
    .option('--tool <id>', 'Preferred tool to open this workset with')
    .option('--json', 'Output as JSON')
    .action(async (name: string | undefined, _options: WorksetCreateOptions, command: Command) => {
      const worksetCommand = await loadWorksetCommand();
      await worksetCommand.create(name, command.optsWithGlobals());
    });

  workset
    .command('list')
    .alias('ls')
    .description('Show saved worksets with their members')
    .option('--json', 'Output as JSON')
    .action(async (_options: { json?: boolean }, command: Command) => {
      const worksetCommand = await loadWorksetCommand();
      await worksetCommand.list(command.optsWithGlobals());
    });

  workset
    .command('open <name>')
    .description('Open a saved workset in your tool (editor window or agent session)')
    .option('--tool <id>', 'Open with this tool just this once')
    .addOption(
      // Parsed so Commander never owns the error; rejected in the
      // action with one JSON document. Hidden because help should not
      // advertise a mode that only rejects.
      new Option('--json', 'Not supported for open').hideHelp()
    )
    .action(async (name: string, _options: WorksetOpenOptions, command: Command) => {
      const worksetCommand = await loadWorksetCommand();
      await worksetCommand.open(name, command.optsWithGlobals());
    });

  workset
    .command('remove <name>')
    .description('Delete a saved workset (member folders are never touched)')
    .option('--yes', 'Confirm removal non-interactively')
    .option('--json', 'Output as JSON')
    .action(async (name: string, _options: WorksetRemoveOptions, command: Command) => {
      const worksetCommand = await loadWorksetCommand();
      await worksetCommand.remove(name, command.optsWithGlobals());
    });

  const subcommandsLine = workset.commands
    .map((subcommand) => {
      const aliases = subcommand.aliases();
      return aliases.length > 0
        ? `${subcommand.name()} (${aliases.join(', ')})`
        : subcommand.name();
    })
    .join(', ');

  // One handler owns missing AND unknown subcommands: known
  // subcommands dispatch above; everything else lands in this action
  // (allowExcessArguments routes the unknown operand here), keeping
  // the one-JSON-document contract for `--json` probes.
  workset.allowExcessArguments(true);
  workset.action(() => {
    const attempted = workset.args.filter(
      (operand) => !operand.startsWith('-')
    );
    const message =
      attempted.length > 0
        ? `Unknown command '${attempted[0]}' for 'openspec workset'. Workset subcommands: ${subcommandsLine}.`
        : `Missing subcommand for 'openspec workset'. Workset subcommands: ${subcommandsLine}.`;
    if (workset.opts().json) {
      printJson({
        status: [
          {
            severity: 'error',
            code: 'unknown_workset_subcommand',
            message,
            fix: 'Run one of the workset subcommands.',
          } satisfies StoreDiagnostic,
        ],
      });
    } else {
      console.error(`Error: ${message}`);
    }
    process.exitCode = 1;
  });
}
