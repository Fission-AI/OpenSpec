import { Command } from 'commander';
import { spawn, execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  getGlobalConfigPath,
  getGlobalConfig,
  saveGlobalConfig,
  GlobalConfig,
} from '../core/global-config.js';
import type { Delivery } from '../core/global-config.js';
import {
  getNestedValue,
  setNestedValue,
  deleteNestedValue,
  coerceValue,
  formatValueYaml,
  validateConfigKeyPath,
  validateConfig,
  DEFAULT_CONFIG,
} from '../core/config-schema.js';
import { PROFILES, getProfileWorkflows, isValidProfile, DEFAULT_PROFILE, type ProfileName } from '../core/profiles.js';
import { PSCODE_DIR_NAME } from '../core/config.js';
import { hasProjectConfigDrift } from '../core/profile-sync-drift.js';
import {
  findWorkspaceRoot,
  hasWorkspaceSkillProfileDrift,
  readOptionalWorkspaceViewState,
} from '../core/workspace/index.js';

type ProfileAction = 'profile' | 'delivery' | 'both' | 'keep';

interface ProfileState {
  profile: ProfileName;
  delivery: Delivery;
}

interface ProfileStateDiff {
  hasChanges: boolean;
  lines: string[];
}

interface WorkspaceConfigProfileContext {
  root: string;
  commandCwd: string;
}

function isPromptCancellationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ExitPromptError' || error.message.includes('force closed the prompt with SIGINT'))
  );
}

/**
 * Resolve the effective current profile state from global config.
 */
export function resolveCurrentProfileState(config: GlobalConfig): ProfileState {
  const profile: ProfileName = isValidProfile(config.profile ?? '') ? config.profile as ProfileName : DEFAULT_PROFILE;
  const delivery: Delivery = config.delivery ?? 'both';
  return { profile, delivery };
}

/**
 * Build a user-facing diff summary between two profile states.
 */
export function diffProfileState(before: ProfileState, after: ProfileState): ProfileStateDiff {
  const lines: string[] = [];

  if (before.profile !== after.profile) {
    lines.push(`profile: ${before.profile} -> ${after.profile}`);
  }
  if (before.delivery !== after.delivery) {
    lines.push(`delivery: ${before.delivery} -> ${after.delivery}`);
  }

  return { hasChanges: lines.length > 0, lines };
}

async function resolveWorkspaceConfigProfileContext(
  cwd = process.cwd()
): Promise<WorkspaceConfigProfileContext | null> {
  const workspaceRoot = await findWorkspaceRoot(cwd);
  if (!workspaceRoot) {
    return null;
  }

  return {
    root: workspaceRoot,
    commandCwd: cwd,
  };
}

function maybeWarnProjectConfigDrift(
  projectDir: string,
  state: ProfileState,
  colorize: (message: string) => string
): void {
  const pscodeDir = path.join(projectDir, PSCODE_DIR_NAME);
  if (!fs.existsSync(pscodeDir)) {
    return;
  }
  if (!hasProjectConfigDrift(projectDir, [...getProfileWorkflows(state.profile)], state.delivery)) {
    return;
  }
  console.log(colorize('Warning: Global config is not applied to this project. Run `pscode update` to sync.'));
}

async function maybeWarnConfigDrift(
  state: ProfileState,
  colorize: (message: string) => string
): Promise<void> {
  const workspaceContext = await resolveWorkspaceConfigProfileContext();
  if (workspaceContext) {
    let viewState = null;
    try {
      viewState = await readOptionalWorkspaceViewState(workspaceContext.root);
    } catch {
      return;
    }

    if (hasWorkspaceSkillProfileDrift(viewState)) {
      console.log(
        colorize(
          'Warning: Workspace-local agent skills are out of sync with the active global profile. Run `pscode workspace update` to sync.'
        )
      );
    }
    return;
  }

  maybeWarnProjectConfigDrift(process.cwd(), state, colorize);

}

function printConfigProfileApplyGuidance(workspaceContext: WorkspaceConfigProfileContext | null): void {
  if (workspaceContext) {
    console.log('Config updated. Run `pscode workspace update` to apply it to workspace-local skills.');
    return;
  }

  console.log('Config updated. Run `pscode update` in your projects to apply.');
}

/**
 * Register the config command and all its subcommands.
 *
 * @param program - The Commander program instance
 */
export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('View and modify global Pscode configuration')
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
    .action(() => {
      console.log(getGlobalConfigPath());
    });

  // config list
  configCmd
    .command('list')
    .description('Show all current settings')
    .option('--json', 'Output as JSON')
    .action((options: { json?: boolean }) => {
      const config = getGlobalConfig();

      if (options.json) {
        console.log(JSON.stringify(config, null, 2));
      } else {
        // Read raw config to determine which values are explicit vs defaults
        const configPath = getGlobalConfigPath();
        let rawConfig: Record<string, unknown> = {};
        try {
          if (fs.existsSync(configPath)) {
            rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          }
        } catch {
          // If reading fails, treat all as defaults
        }

        console.log(formatValueYaml(config));

        // Annotate profile settings
        const profileName: ProfileName = isValidProfile(config.profile ?? '') ? config.profile as ProfileName : DEFAULT_PROFILE;
        const profileSource = rawConfig.profile !== undefined ? '(explicit)' : '(default)';
        const deliverySource = rawConfig.delivery !== undefined ? '(explicit)' : '(default)';
        console.log(`\nProfile settings:`);
        console.log(`  profile: ${profileName} ${profileSource} — ${PROFILES[profileName].description}`);
        console.log(`  delivery: ${config.delivery ?? 'both'} ${deliverySource}`);
        console.log(`  workflows: ${getProfileWorkflows(profileName).join(', ')}`);
      }
    });

  // config get
  configCmd
    .command('get <key>')
    .description('Get a specific value (raw, scriptable)')
    .action((key: string) => {
      const config = getGlobalConfig();
      const value = getNestedValue(config as Record<string, unknown>, key);

      if (value === undefined) {
        process.exitCode = 1;
        return;
      }

      if (typeof value === 'object' && value !== null) {
        console.log(JSON.stringify(value));
      } else {
        console.log(String(value));
      }
    });

  // config set
  configCmd
    .command('set <key> <value>')
    .description('Set a value (auto-coerce types)')
    .option('--string', 'Force value to be stored as string')
    .option('--allow-unknown', 'Allow setting unknown keys')
    .action((key: string, value: string, options: { string?: boolean; allowUnknown?: boolean }) => {
      const allowUnknown = Boolean(options.allowUnknown);
      const keyValidation = validateConfigKeyPath(key);
      if (!keyValidation.valid && !allowUnknown) {
        const reason = keyValidation.reason ? ` ${keyValidation.reason}.` : '';
        console.error(`Error: Invalid configuration key "${key}".${reason}`);
        console.error('Use "pscode config list" to see available keys.');
        console.error('Pass --allow-unknown to bypass this check.');
        process.exitCode = 1;
        return;
      }

      const config = getGlobalConfig() as Record<string, unknown>;
      const coercedValue = coerceValue(value, options.string || false);

      // Create a copy to validate before saving
      const newConfig = JSON.parse(JSON.stringify(config));
      setNestedValue(newConfig, key, coercedValue);

      // Validate the new config
      const validation = validateConfig(newConfig);
      if (!validation.success) {
        console.error(`Error: Invalid configuration - ${validation.error}`);
        process.exitCode = 1;
        return;
      }

      // Apply changes and save
      setNestedValue(config, key, coercedValue);
      saveGlobalConfig(config as GlobalConfig);

      const displayValue =
        typeof coercedValue === 'string' ? `"${coercedValue}"` : String(coercedValue);
      console.log(`Set ${key} = ${displayValue}`);
    });

  // config unset
  configCmd
    .command('unset <key>')
    .description('Remove a key (revert to default)')
    .action((key: string) => {
      const config = getGlobalConfig() as Record<string, unknown>;
      const existed = deleteNestedValue(config, key);

      if (existed) {
        saveGlobalConfig(config as GlobalConfig);
        console.log(`Unset ${key} (reverted to default)`);
      } else {
        console.log(`Key "${key}" was not set`);
      }
    });

  // config reset
  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .option('--all', 'Reset all configuration (required)')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (options: { all?: boolean; yes?: boolean }) => {
      if (!options.all) {
        console.error('Error: --all flag is required for reset');
        console.error('Usage: pscode config reset --all [-y]');
        process.exitCode = 1;
        return;
      }

      if (!options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        let confirmed: boolean;
        try {
          confirmed = await confirm({
            message: 'Reset all configuration to defaults?',
            default: false,
          });
        } catch (error) {
          if (isPromptCancellationError(error)) {
            console.log('Reset cancelled.');
            process.exitCode = 130;
            return;
          }
          throw error;
        }

        if (!confirmed) {
          console.log('Reset cancelled.');
          return;
        }
      }

      saveGlobalConfig({ ...DEFAULT_CONFIG });
      console.log('Configuration reset to defaults');
    });

  // config edit
  configCmd
    .command('edit')
    .description('Open config in $EDITOR')
    .action(async () => {
      const editor = process.env.EDITOR || process.env.VISUAL;

      if (!editor) {
        console.error('Error: No editor configured');
        console.error('Set the EDITOR or VISUAL environment variable to your preferred editor');
        console.error('Example: export EDITOR=vim');
        process.exitCode = 1;
        return;
      }

      const configPath = getGlobalConfigPath();

      // Ensure config file exists with defaults
      if (!fs.existsSync(configPath)) {
        saveGlobalConfig({ ...DEFAULT_CONFIG });
      }

      // Spawn editor and wait for it to close
      // Avoid shell parsing to correctly handle paths with spaces in both
      // the editor path and config path
      const child = spawn(editor, [configPath], {
        stdio: 'inherit',
        shell: false,
      });

      await new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Editor exited with code ${code}`));
          }
        });
        child.on('error', reject);
      });

      try {
        const rawConfig = fs.readFileSync(configPath, 'utf-8');
        const parsedConfig = JSON.parse(rawConfig);
        const validation = validateConfig(parsedConfig);

        if (!validation.success) {
          console.error(`Error: Invalid configuration - ${validation.error}`);
          process.exitCode = 1;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.error(`Error: Config file not found at ${configPath}`);
        } else if (error instanceof SyntaxError) {
          console.error(`Error: Invalid JSON in ${configPath}`);
          console.error(error.message);
        } else {
          console.error(`Error: Unable to validate configuration - ${error instanceof Error ? error.message : String(error)}`);
        }
        process.exitCode = 1;
      }
    });

  // config profile [name]
  configCmd
    .command('profile [name]')
    .description(`Switch workflow profile. Available: ${Object.keys(PROFILES).join(', ')}`)
    .action(async (name?: string) => {
      const availableNames = Object.keys(PROFILES).join(', ');

      // Direct selection via argument
      if (name) {
        if (!isValidProfile(name)) {
          console.error(`Error: Unknown profile "${name}". Available: ${availableNames}`);
          process.exitCode = 1;
          return;
        }
        const config = getGlobalConfig();
        config.profile = name;
        delete (config as Record<string, unknown>).workflows;
        saveGlobalConfig(config);
        const workflows = getProfileWorkflows(name as ProfileName);
        console.log(`Profile set to "${name}" (${PROFILES[name as ProfileName].description})`);
        console.log(`Workflows: ${workflows.join(', ')}`);
        const workspaceContext = await resolveWorkspaceConfigProfileContext();
        printConfigProfileApplyGuidance(workspaceContext);
        return;
      }

      // Non-interactive fallback
      if (!process.stdout.isTTY) {
        console.error(`Interactive mode required. Use: pscode config profile <name>`);
        console.error(`Available profiles: ${availableNames}`);
        process.exitCode = 1;
        return;
      }

      // Interactive picker
      const { select, confirm } = await import('@inquirer/prompts');
      const chalk = (await import('chalk')).default;

      try {
        const config = getGlobalConfig();
        const currentState = resolveCurrentProfileState(config);

        console.log(chalk.bold('\nCurrent profile:'), `${currentState.profile} — ${PROFILES[currentState.profile].description}`);
        console.log(chalk.dim(`Workflows: ${getProfileWorkflows(currentState.profile).join(', ')}`));
        console.log();

        const action = await select<ProfileAction>({
          message: 'What do you want to configure?',
          choices: [
            { value: 'profile', name: 'Switch profile', description: 'Choose a different workflow set' },
            { value: 'delivery', name: 'Change delivery', description: 'Skills, commands, or both' },
            { value: 'both', name: 'Profile + delivery', description: 'Change both at once' },
            { value: 'keep', name: 'Keep current (exit)', description: 'Leave unchanged' },
          ],
        });

        if (action === 'keep') {
          console.log('No changes.');
          await maybeWarnConfigDrift(currentState, chalk.yellow);
          return;
        }

        const nextState: ProfileState = { ...currentState };

        if (action === 'profile' || action === 'both') {
          const profileChoices = Object.entries(PROFILES).map(([key, def]) => ({
            value: key as ProfileName,
            name: key,
            description: `${def.description} | workflows: ${def.workflows.join(', ')}`,
          }));

          nextState.profile = await select<ProfileName>({
            message: 'Select profile:',
            choices: profileChoices,
            default: currentState.profile,
          });
        }

        if (action === 'delivery' || action === 'both') {
          const deliveryChoices: { value: Delivery; name: string; description: string }[] = [
            { value: 'both', name: 'Both (skills + commands)', description: 'Install as both skills and slash commands' },
            { value: 'skills', name: 'Skills only', description: 'Install only as agent skills' },
            { value: 'commands', name: 'Commands only', description: 'Install only as slash commands' },
          ];

          nextState.delivery = await select<Delivery>({
            message: 'Delivery mode:',
            choices: deliveryChoices,
            default: currentState.delivery,
          });
        }

        const diff = diffProfileState(currentState, nextState);
        if (!diff.hasChanges) {
          console.log('No changes.');
          await maybeWarnConfigDrift(currentState, chalk.yellow);
          return;
        }

        console.log(chalk.bold('\nChanges:'));
        for (const line of diff.lines) {
          console.log(`  ${line}`);
        }
        console.log();

        config.profile = nextState.profile;
        config.delivery = nextState.delivery;
        delete (config as Record<string, unknown>).workflows;
        saveGlobalConfig(config);

        const workspaceContext = await resolveWorkspaceConfigProfileContext();
        if (workspaceContext) {
          const applyNow = await confirm({ message: 'Apply to this workspace now?', default: true });
          if (applyNow) {
            try {
              execSync('npx pscode workspace update', { stdio: 'inherit', cwd: workspaceContext.commandCwd });
            } catch {
              console.error('`pscode workspace update` failed. Run it manually.');
              process.exitCode = 1;
            }
            return;
          }
          printConfigProfileApplyGuidance(workspaceContext);
          return;
        }

        const projectDir = process.cwd();
        const pscodeDir = path.join(projectDir, PSCODE_DIR_NAME);
        if (fs.existsSync(pscodeDir)) {
          const applyNow = await confirm({ message: 'Apply to this project now?', default: true });
          if (applyNow) {
            try {
              execSync('npx pscode update', { stdio: 'inherit', cwd: projectDir });
            } catch {
              console.error('`pscode update` failed. Run it manually.');
              process.exitCode = 1;
            }
            return;
          }
        }

        printConfigProfileApplyGuidance(null);
      } catch (error) {
        if (isPromptCancellationError(error)) {
          console.log('Cancelled.');
          process.exitCode = 130;
          return;
        }
        throw error;
      }
    });
}
