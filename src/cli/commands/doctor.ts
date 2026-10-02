import { Command, Option } from 'commander';
import { COMMAND_REGISTRY } from '../../core/completions/command-registry.js';
import { COMMON_FLAGS } from '../../core/completions/shared-flags.js';
import type { DoctorOptions } from '../../commands/doctor.js';

export function registerDoctorCommand(program: Command): void {
  const description =
    COMMAND_REGISTRY.find((entry) => entry.name === 'doctor')?.description ??
    'Report relationship health for the resolved OpenSpec root';

  program
    .command('doctor')
    .description(description)
    .option('--store <id>', COMMON_FLAGS.store.description)
    .addOption(
      new Option('--store-path <path>', 'Removed; register the store and use --store').hideHelp()
    )
    .option('--json', 'Output as JSON')
    .action(async (options: DoctorOptions) => {
      const { doctorCommand } = await import('../../commands/doctor.js');
      await doctorCommand(options);
    });
}
