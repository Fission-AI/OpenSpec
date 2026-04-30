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
import type { Profile, Delivery } from '../core/global-config.js';
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
import { CORE_WORKFLOWS, ALL_WORKFLOWS, getProfileWorkflows } from '../core/profiles.js';
import { OPENSPEC_DIR_NAME } from '../core/config.js';
import { hasProjectConfigDrift } from '../core/profile-sync-drift.js';
import { CONFIG_MESSAGES, CLI_MESSAGES } from '../messages/index.js';

type ProfileAction = 'both' | 'delivery' | 'workflows' | 'keep';

interface ProfileState {
  profile: Profile;
  delivery: Delivery;
  workflows: string[];
}

interface ProfileStateDiff {
  hasChanges: boolean;
  lines: string[];
}

interface WorkflowPromptMeta {
  name: string;
  description: string;
}

const WORKFLOW_PROMPT_META: Record<string, WorkflowPromptMeta> = {
  propose: {
    name: CONFIG_MESSAGES.workflowProposeName,
    description: CONFIG_MESSAGES.workflowProposeDesc,
  },
  explore: {
    name: CONFIG_MESSAGES.workflowExploreName,
    description: CONFIG_MESSAGES.workflowExploreDesc,
  },
  new: {
    name: CONFIG_MESSAGES.workflowNewName,
    description: CONFIG_MESSAGES.workflowNewDesc,
  },
  continue: {
    name: CONFIG_MESSAGES.workflowContinueName,
    description: CONFIG_MESSAGES.workflowContinueDesc,
  },
  apply: {
    name: CONFIG_MESSAGES.workflowApplyName,
    description: CONFIG_MESSAGES.workflowApplyDesc,
  },
  ff: {
    name: CONFIG_MESSAGES.workflowFastForwardName,
    description: CONFIG_MESSAGES.workflowFastForwardDesc,
  },
  sync: {
    name: CONFIG_MESSAGES.workflowSyncName,
    description: CONFIG_MESSAGES.workflowSyncDesc,
  },
  archive: {
    name: CONFIG_MESSAGES.workflowArchiveName,
    description: CONFIG_MESSAGES.workflowArchiveDesc,
  },
  'bulk-archive': {
    name: CONFIG_MESSAGES.workflowBulkArchiveName,
    description: CONFIG_MESSAGES.workflowBulkArchiveDesc,
  },
  verify: {
    name: CONFIG_MESSAGES.workflowVerifyName,
    description: CONFIG_MESSAGES.workflowVerifyDesc,
  },
  onboard: {
    name: CONFIG_MESSAGES.workflowOnboardName,
    description: CONFIG_MESSAGES.workflowOnboardDesc,
  },
};

function isPromptCancellationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ExitPromptError' || error.message.includes('force closed the prompt with SIGINT'))
  );
}

/**
 * Resolve the effective current profile state from global config defaults.
 */
export function resolveCurrentProfileState(config: GlobalConfig): ProfileState {
  const profile = config.profile || 'core';
  const delivery = config.delivery || 'both';
  const workflows = [
    ...getProfileWorkflows(profile, config.workflows ? [...config.workflows] : undefined),
  ];
  return { profile, delivery, workflows };
}

/**
 * Derive profile type from selected workflows.
 */
export function deriveProfileFromWorkflowSelection(selectedWorkflows: string[]): Profile {
  const isCoreMatch =
    selectedWorkflows.length === CORE_WORKFLOWS.length &&
    CORE_WORKFLOWS.every((w) => selectedWorkflows.includes(w));
  return isCoreMatch ? 'core' : 'custom';
}

/**
 * Format a compact workflow summary for the profile header.
 */
export function formatWorkflowSummary(workflows: readonly string[], profile: Profile): string {
  return `${workflows.length} selected (${profile})`;
}

function stableWorkflowOrder(workflows: readonly string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const workflow of ALL_WORKFLOWS) {
    if (workflows.includes(workflow) && !seen.has(workflow)) {
      ordered.push(workflow);
      seen.add(workflow);
    }
  }

  const extras = workflows.filter((w) => !ALL_WORKFLOWS.includes(w as (typeof ALL_WORKFLOWS)[number]));
  extras.sort();
  for (const extra of extras) {
    if (!seen.has(extra)) {
      ordered.push(extra);
      seen.add(extra);
    }
  }

  return ordered;
}

/**
 * Build a user-facing diff summary between two profile states.
 */
export function diffProfileState(before: ProfileState, after: ProfileState): ProfileStateDiff {
  const lines: string[] = [];

  if (before.delivery !== after.delivery) {
    lines.push(`delivery: ${before.delivery} -> ${after.delivery}`);
  }

  if (before.profile !== after.profile) {
    lines.push(`profile: ${before.profile} -> ${after.profile}`);
  }

  const beforeOrdered = stableWorkflowOrder(before.workflows);
  const afterOrdered = stableWorkflowOrder(after.workflows);
  const beforeSet = new Set(beforeOrdered);
  const afterSet = new Set(afterOrdered);

  const added = afterOrdered.filter((w) => !beforeSet.has(w));
  const removed = beforeOrdered.filter((w) => !afterSet.has(w));

  if (added.length > 0 || removed.length > 0) {
    const tokens: string[] = [];
    if (added.length > 0) {
      tokens.push(`added ${added.join(', ')}`);
    }
    if (removed.length > 0) {
      tokens.push(`removed ${removed.join(', ')}`);
    }
    lines.push(`workflows: ${tokens.join('; ')}`);
  }

  return {
    hasChanges: lines.length > 0,
    lines,
  };
}

function maybeWarnConfigDrift(
  projectDir: string,
  state: ProfileState,
  colorize: (message: string) => string
): void {
  const openspecDir = path.join(projectDir, OPENSPEC_DIR_NAME);
  if (!fs.existsSync(openspecDir)) {
    return;
  }
  if (!hasProjectConfigDrift(projectDir, state.workflows, state.delivery)) {
    return;
  }
  console.log(colorize(CONFIG_MESSAGES.warningGlobalConfigNotApplied));
}

/**
 * Register the config command and all its subcommands.
 *
 * @param program - The Commander program instance
 */
export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description(CONFIG_MESSAGES.viewAndModify)
    .option('--scope <scope>', CONFIG_MESSAGES.configScopeOption)
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.scope && opts.scope !== 'global') {
        console.error(CLI_MESSAGES.projectLocalNotImplemented);
        process.exit(1);
      }
    });

  // config path
  configCmd
    .command('path')
    .description(CONFIG_MESSAGES.showLocation)
    .action(() => {
      console.log(getGlobalConfigPath());
    });

  // config list
  configCmd
    .command('list')
    .description(CONFIG_MESSAGES.showAllSettings)
    .option('--json', CONFIG_MESSAGES.outputAsJson)
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
        const profileSource = rawConfig.profile !== undefined ? '(explicit)' : '(default)';
        const deliverySource = rawConfig.delivery !== undefined ? '(explicit)' : '(default)';
        console.log(`\n${CONFIG_MESSAGES.profileSettings}`);
        console.log(CONFIG_MESSAGES.profileLabel(config.profile, profileSource));
        console.log(CONFIG_MESSAGES.deliveryLabel(config.delivery, deliverySource));
        if (config.profile === 'core') {
          console.log(CONFIG_MESSAGES.coreWorkflowsNote(CORE_WORKFLOWS.join(', ')));
        } else if (config.workflows && config.workflows.length > 0) {
          console.log(CONFIG_MESSAGES.explicitWorkflowsNote(config.workflows.join(', ')));
        } else {
          console.log(CONFIG_MESSAGES.noWorkflowsNote);
        }
      }
    });

  // config get
  configCmd
    .command('get <key>')
    .description(CONFIG_MESSAGES.getValue)
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
    .description(CONFIG_MESSAGES.setValue)
    .option('--string', CONFIG_MESSAGES.forceStringOption)
    .option('--allow-unknown', CONFIG_MESSAGES.allowUnknownOption)
    .action((key: string, value: string, options: { string?: boolean; allowUnknown?: boolean }) => {
      const allowUnknown = Boolean(options.allowUnknown);
      const keyValidation = validateConfigKeyPath(key);
      if (!keyValidation.valid && !allowUnknown) {
        const reason = keyValidation.reason ? ` ${keyValidation.reason}.` : '';
        console.error(CONFIG_MESSAGES.invalidConfigKey(key, reason));
        console.error(CONFIG_MESSAGES.useConfigList);
        console.error(CONFIG_MESSAGES.passAllowUnknown);
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
        console.error(CONFIG_MESSAGES.invalidConfiguration(validation.error!));
        process.exitCode = 1;
        return;
      }

      // Apply changes and save
      setNestedValue(config, key, coercedValue);
      saveGlobalConfig(config as GlobalConfig);

      const displayValue =
        typeof coercedValue === 'string' ? `"${coercedValue}"` : String(coercedValue);
      console.log(CONFIG_MESSAGES.setKeyValue(key, displayValue));
    });

  // config unset
  configCmd
    .command('unset <key>')
    .description(CONFIG_MESSAGES.removeKey)
    .action((key: string) => {
      const config = getGlobalConfig() as Record<string, unknown>;
      const existed = deleteNestedValue(config, key);

      if (existed) {
        saveGlobalConfig(config as GlobalConfig);
        console.log(CONFIG_MESSAGES.unsetKey(key));
      } else {
        console.log(CONFIG_MESSAGES.keyNotSet(key));
      }
    });

  // config reset
  configCmd
    .command('reset')
    .description(CONFIG_MESSAGES.resetConfig)
    .option('--all', CONFIG_MESSAGES.resetAllOption)
    .option('-y, --yes', CONFIG_MESSAGES.skipConfirmationOption)
    .action(async (options: { all?: boolean; yes?: boolean }) => {
      if (!options.all) {
        console.error(CONFIG_MESSAGES.resetAllRequired);
        console.error(CONFIG_MESSAGES.resetUsage);
        process.exitCode = 1;
        return;
      }

      if (!options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        let confirmed: boolean;
        try {
          confirmed = await confirm({
            message: CONFIG_MESSAGES.resetConfirm,
            default: false,
          });
        } catch (error) {
          if (isPromptCancellationError(error)) {
            console.log(CONFIG_MESSAGES.resetCancelled);
            process.exitCode = 130;
            return;
          }
          throw error;
        }

        if (!confirmed) {
          console.log(CONFIG_MESSAGES.resetCancelled);
          return;
        }
      }

      saveGlobalConfig({ ...DEFAULT_CONFIG });
      console.log(CONFIG_MESSAGES.configurationReset);
    });

  // config edit
  configCmd
    .command('edit')
    .description(CONFIG_MESSAGES.openInEditor)
    .action(async () => {
      const editor = process.env.EDITOR || process.env.VISUAL;

      if (!editor) {
        console.error(CONFIG_MESSAGES.noEditorConfigured);
        console.error(CONFIG_MESSAGES.setEditorEnv);
        console.error(CONFIG_MESSAGES.editorExample);
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
          console.error(CONFIG_MESSAGES.invalidConfiguration(validation.error!));
          process.exitCode = 1;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.error(CONFIG_MESSAGES.configFileNotFound(configPath));
        } else if (error instanceof SyntaxError) {
          console.error(CONFIG_MESSAGES.invalidJson(configPath));
          console.error(error.message);
        } else {
          console.error(CONFIG_MESSAGES.unableToValidateConfig(error instanceof Error ? error.message : String(error)));
        }
        process.exitCode = 1;
      }
    });

  // config profile [preset]
  configCmd
    .command('profile [preset]')
    .description(CONFIG_MESSAGES.configureProfile)
    .action(async (preset?: string) => {
      // Preset shortcut: `openspec config profile core`
      if (preset === 'core') {
        const config = getGlobalConfig();
        config.profile = 'core';
        config.workflows = [...CORE_WORKFLOWS];
        // Preserve delivery setting
        saveGlobalConfig(config);
        console.log(CONFIG_MESSAGES.configUpdated);
        return;
      }

      if (preset) {
        console.error(CONFIG_MESSAGES.unknownProfilePreset(preset));
        process.exitCode = 1;
        return;
      }

      // Non-interactive check
      if (!process.stdout.isTTY) {
        console.error(CONFIG_MESSAGES.interactiveModeRequired);
        process.exitCode = 1;
        return;
      }

      // Interactive picker
      const { select, checkbox, confirm } = await import('@inquirer/prompts');
      const chalk = (await import('chalk')).default;

      try {
        const config = getGlobalConfig();
        const currentState = resolveCurrentProfileState(config);

        console.log(chalk.bold('\n' + CONFIG_MESSAGES.currentProfileSettings));
        console.log(CONFIG_MESSAGES.deliveryLabel(currentState.delivery));
        console.log(CONFIG_MESSAGES.workflowsLabel(formatWorkflowSummary(currentState.workflows, currentState.profile)));
        console.log(chalk.dim(CONFIG_MESSAGES.deliveryHelp));
        console.log(chalk.dim(CONFIG_MESSAGES.workflowsHelp));
        console.log();

        const action = await select<ProfileAction>({
          message: CONFIG_MESSAGES.whatToConfigure,
          choices: [
            {
              value: 'both',
              name: CONFIG_MESSAGES.deliveryAndWorkflows,
              description: CONFIG_MESSAGES.deliveryAndWorkflowsDesc,
            },
            {
              value: 'delivery',
              name: CONFIG_MESSAGES.deliveryOnly,
              description: CONFIG_MESSAGES.deliveryOnlyDesc,
            },
            {
              value: 'workflows',
              name: CONFIG_MESSAGES.workflowsOnly,
              description: CONFIG_MESSAGES.workflowsOnlyDesc,
            },
            {
              value: 'keep',
              name: CONFIG_MESSAGES.keepCurrentSettings,
              description: CONFIG_MESSAGES.keepCurrentSettingsDesc,
            },
          ],
        });

        if (action === 'keep') {
          console.log(CONFIG_MESSAGES.noConfigChanges);
          maybeWarnConfigDrift(process.cwd(), currentState, chalk.yellow);
          return;
        }

        const nextState: ProfileState = {
          profile: currentState.profile,
          delivery: currentState.delivery,
          workflows: [...currentState.workflows],
        };

        if (action === 'both' || action === 'delivery') {
          const deliveryChoices: { value: Delivery; name: string; description: string }[] = [
            {
              value: 'both' as Delivery,
              name: CONFIG_MESSAGES.bothSkillsAndCommands,
              description: CONFIG_MESSAGES.bothSkillsAndCommandsDesc,
            },
            {
              value: 'skills' as Delivery,
              name: CONFIG_MESSAGES.skillsOnly,
              description: CONFIG_MESSAGES.skillsOnlyDesc,
            },
            {
              value: 'commands' as Delivery,
              name: CONFIG_MESSAGES.commandsOnly,
              description: CONFIG_MESSAGES.commandsOnlyDesc,
            },
          ];
          for (const choice of deliveryChoices) {
            if (choice.value === currentState.delivery) {
              choice.name += CONFIG_MESSAGES.currentSuffix;
            }
          }

          nextState.delivery = await select<Delivery>({
            message: CONFIG_MESSAGES.deliveryMode,
            choices: deliveryChoices,
            default: currentState.delivery,
          });
        }

        if (action === 'both' || action === 'workflows') {
          const formatWorkflowChoice = (workflow: string) => {
            const metadata = WORKFLOW_PROMPT_META[workflow] ?? {
              name: workflow,
              description: `Workflow: ${workflow}`,
            };
            return {
              value: workflow,
              name: metadata.name,
              description: metadata.description,
              short: metadata.name,
              checked: currentState.workflows.includes(workflow),
            };
          };

          const selectedWorkflows = await checkbox<string>({
            message: CONFIG_MESSAGES.selectWorkflows,
            instructions: CONFIG_MESSAGES.spaceToToggle,
            pageSize: ALL_WORKFLOWS.length,
            theme: {
              icon: {
                checked: '[x]',
                unchecked: '[ ]',
              },
            },
            choices: ALL_WORKFLOWS.map(formatWorkflowChoice),
          });
          nextState.workflows = selectedWorkflows;
          nextState.profile = deriveProfileFromWorkflowSelection(selectedWorkflows);
        }

        const diff = diffProfileState(currentState, nextState);
        if (!diff.hasChanges) {
          console.log(CONFIG_MESSAGES.noConfigChanges);
          maybeWarnConfigDrift(process.cwd(), nextState, chalk.yellow);
          return;
        }

        console.log(chalk.bold('\n' + CONFIG_MESSAGES.configChanges));
        for (const line of diff.lines) {
          console.log(`  ${line}`);
        }
        console.log();

        config.profile = nextState.profile;
        config.delivery = nextState.delivery;
        config.workflows = nextState.workflows;
        saveGlobalConfig(config);

        // Check if inside an OpenSpec project
        const projectDir = process.cwd();
        const openspecDir = path.join(projectDir, OPENSPEC_DIR_NAME);
        if (fs.existsSync(openspecDir)) {
          const applyNow = await confirm({
            message: CONFIG_MESSAGES.applyChangesNow,
            default: true,
          });

          if (applyNow) {
            try {
              execSync('npx openspec update', { stdio: 'inherit', cwd: projectDir });
              console.log(CONFIG_MESSAGES.configUpdated);
            } catch {
              console.error(CONFIG_MESSAGES.updateFailed);
              process.exitCode = 1;
            }
            return;
          }
        }

        console.log(CONFIG_MESSAGES.configUpdated);
      } catch (error) {
        if (isPromptCancellationError(error)) {
          console.log(CONFIG_MESSAGES.configProfileCancelled);
          process.exitCode = 130;
          return;
        }
        throw error;
      }
    });
}
