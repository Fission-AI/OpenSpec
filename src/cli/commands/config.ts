import { Command } from 'commander';

/**
 * Register the config command and all its subcommands.
 *
 * @param program - The Commander program instance
 */
export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('View and modify global OpenSpec configuration')
    .option('--scope <scope>', 'Config scope (only "global" supported currently)')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.scope && opts.scope !== 'global') {
        console.error('Error: Project-local config is not yet implemented');
        process.exit(1);
      }
    });

  // config path
  configCmd
    .command('path')
    .description('Show config file location')
    .action(async () => {
      const { configPathCommand } = await import('../../commands/config.js');
      configPathCommand();
    });

  // config list
  configCmd
    .command('list')
    .description('Show all current settings')
    .option('--json', 'Output as JSON')
    .action(async (options: { json?: boolean }) => {
      const { configListCommand } = await import('../../commands/config.js');
      configListCommand(options);
    });

  // config get
  configCmd
    .command('get <key>')
    .description('Get a specific value (raw, scriptable)')
    .action(async (key: string) => {
      const { configGetCommand } = await import('../../commands/config.js');
      configGetCommand(key);
    });

  // config set
  configCmd
    .command('set <key> <value>')
    .description('Set a value (auto-coerce types)')
    .option('--string', 'Force value to be stored as string')
    .option('--allow-unknown', 'Allow setting unknown keys')
    .action(async (key: string, value: string, options: { string?: boolean; allowUnknown?: boolean }) => {
      const { configSetCommand } = await import('../../commands/config.js');
      configSetCommand(key, value, options);
    });

  // config unset
  configCmd
    .command('unset <key>')
    .description('Remove a key (revert to default)')
    .action(async (key: string) => {
      const { configUnsetCommand } = await import('../../commands/config.js');
      configUnsetCommand(key);
    });

  // config reset
  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .option('--all', 'Reset all configuration (required)')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (options: { all?: boolean; yes?: boolean }) => {
      const { configResetCommand } = await import('../../commands/config.js');
      await configResetCommand(options);
    });

  // config edit
  configCmd
    .command('edit')
    .description('Open config in $EDITOR')
    .action(async () => {
      const { configEditCommand } = await import('../../commands/config.js');
      await configEditCommand();
    });

  // config profile [preset]
  configCmd
    .command('profile [preset]')
    .description('Configure workflow profile (interactive picker or preset shortcut)')
    .action(async (preset?: string) => {
      const { configProfileCommand } = await import('../../commands/config.js');
      await configProfileCommand(preset);
    });
}
