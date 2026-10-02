import { Command, Option } from 'commander';
import { COMMAND_REGISTRY } from '../../core/completions/command-registry.js';
import { COMMON_FLAGS } from '../../core/completions/shared-flags.js';
import type { ContextOptions } from '../../commands/context.js';

export function registerContextCommand(program: Command): void {
  const description =
    COMMAND_REGISTRY.find((entry) => entry.name === 'context')?.description ??
    'Print the working context for the resolved OpenSpec root';

  program
    .command('context')
    .description(description)
    .option('--store <id>', COMMON_FLAGS.store.description)
    .addOption(
      new Option('--store-path <path>', 'Removed; register the store and use --store').hideHelp()
    )
    .option('--json', 'Output the agent brief as JSON')
    .option('--code-workspace <path>', 'Also write a VS Code workspace file for the set')
    .option('--force', 'Overwrite an existing --code-workspace file')
    .action(async (options: ContextOptions) => {
      const { contextCommand } = await import('../../commands/context.js');
      await contextCommand(options);
    });
}
