import { Command } from 'commander';
import { COMMAND_REGISTRY } from '../../core/completions/command-registry.js';
import { printJson } from '../../commands/shared-output.js';
import type {
  StoreCommand,
  StoreJsonOptions,
  StoreRegisterOptions,
  StoreRemoveOptions,
  StoreSetupOptions,
} from '../../commands/store.js';

async function loadStoreCommand(): Promise<StoreCommand> {
  const { StoreCommand } = await import('../../commands/store.js');
  return new StoreCommand();
}

export function registerStoreCommand(program: Command): void {
  // One source for the locked group one-liner: the completions registry
  // entry, which shell completion scripts also consume.
  const storeGroupDescription =
    COMMAND_REGISTRY.find((entry) => entry.name === 'store')?.description ??
    'Create and manage stores - standalone OpenSpec repos you register on this machine';
  const store = program.command('store').description(storeGroupDescription);

  store
    .command('setup [id]')
    .description('Create and register a local store')
    .option('--path <path>', 'Folder where the store should live (for example ~/openspec/<id>)')
    .option('--init-git', 'Initialize a Git repository with an initial commit (default)')
    .option('--no-init-git', 'Skip every Git action: no init, no initial commit')
    .option('--remote <url>', 'Canonical clone source recorded in store.yaml')
    .option('--json', 'Output as JSON')
    .action(async (id: string | undefined, options: StoreSetupOptions) => {
      const storeCommand = await loadStoreCommand();
      await storeCommand.setup(id, options);
    });

  store
    .command('register [path]')
    .description('Register an existing local store')
    .option('--id <id>', 'Store id; defaults to metadata or folder name')
    .option('--yes', 'Confirm creating store identity metadata for a healthy OpenSpec root')
    .option('--json', 'Output as JSON')
    .action(async (inputPath: string | undefined, options: StoreRegisterOptions) => {
      const storeCommand = await loadStoreCommand();
      await storeCommand.register(inputPath, options);
    });

  store
    .command('unregister <id>')
    .description('Forget a local store registration without deleting files')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options: StoreJsonOptions) => {
      const storeCommand = await loadStoreCommand();
      await storeCommand.unregister(id, options);
    });

  store
    .command('remove <id>')
    .description('Forget a local store registration and delete its local folder')
    .option('--yes', 'Confirm local store folder deletion')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options: StoreRemoveOptions) => {
      const storeCommand = await loadStoreCommand();
      await storeCommand.remove(id, options);
    });

  store
    .command('list')
    .alias('ls')
    .description('List locally registered stores')
    .option('--json', 'Output as JSON')
    .action(async (options: StoreJsonOptions) => {
      const storeCommand = await loadStoreCommand();
      await storeCommand.list(options);
    });

  store
    .command('doctor [id]')
    .description('Check local store registration and metadata')
    .option('--json', 'Output as JSON')
    .action(async (id: string | undefined, options: StoreJsonOptions) => {
      const storeCommand = await loadStoreCommand();
      await storeCommand.doctor(id, options);
    });

  const lifecycleRedirects = new Set(
    COMMAND_REGISTRY.filter(
      (entry) =>
        entry.flags.some((flag) => flag.name === 'store') ||
        (entry.subcommands ?? []).some((subcommand) =>
          subcommand.flags.some((flag) => flag.name === 'store')
        )
    ).map((entry) => entry.name)
  );
  const storeSubcommandsLine = store.commands
    .map((subcommand) => {
      const aliases = subcommand.aliases();
      return aliases.length > 0 ? `${subcommand.name()} (${aliases.join(', ')})` : subcommand.name();
    })
    .join(', ');
  // One group action owns missing AND unknown subcommands. Known
  // subcommands dispatch above; everything else — including a bare
  // `store --json` with no operand — lands here, so the handler owns the
  // entire message and exit path (same text for human and --json). The
  // permissive flags route unknown operands/options here instead of
  // letting Commander emit a raw error before the action runs. We detect
  // `--json` in the residual args rather than declaring a group option,
  // which would otherwise shadow each subcommand's own `--json` flag.
  store.allowExcessArguments(true);
  store.allowUnknownOption(true);
  store.action(() => {
    const operands = store.args;
    // Flag values are indistinguishable from operands without a full
    // parse, so the verbatim echo only applies to plain-operand input.
    const attempted = operands.filter((operand) => !operand.startsWith('-'));
    const hasFlagLikeToken = operands.some((operand) => operand.startsWith('-'));
    // The agent contract: --json failures emit one JSON document.
    if (operands.includes('--json')) {
      const message =
        attempted.length > 0
          ? `Unknown command '${attempted[0]}' for 'openspec store'. Store subcommands: ${storeSubcommandsLine}.`
          : `Missing subcommand for 'openspec store'. Store subcommands: ${storeSubcommandsLine}.`;
      printJson({
        status: [
          {
            severity: 'error',
            code: 'unknown_store_subcommand',
            message,
            fix: 'Run a store subcommand, or use the lifecycle command with --store <id>.',
          },
        ],
      });
      process.exitCode = 1;
      return;
    }
    let example = 'openspec new change <change-id> --store <id>';
    if (!hasFlagLikeToken && attempted.length > 0 && lifecycleRedirects.has(attempted[0])) {
      if (attempted[0] === 'new') {
        const changeId = attempted[1] === 'change' && attempted[2] ? attempted[2] : '<change-id>';
        example = `openspec new change ${changeId} --store <id>`;
      } else {
        example = `openspec ${attempted.join(' ')} --store <id>`;
      }
    }
    console.error(
      attempted.length > 0
        ? `Error: unknown command '${attempted[0]}' for 'openspec store'.`
        : "Error: missing subcommand for 'openspec store'."
    );
    console.error(
      `Store subcommands manage store registration: ${storeSubcommandsLine}.`
    );
    console.error(
      'To create or work on a change in a store, use the normal command with --store, for example:'
    );
    console.error(`  ${example}`);
    process.exitCode = 1;
  });
}
