import { Command } from 'commander';
import { spawn, execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseDocument, isMap } from 'yaml';
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
import { readProjectConfig } from '../core/project-config.js';
import {
  resolveEffectiveProfileSettings,
  type ConfigScope,
  type ProfileValueSource,
} from '../core/profile-resolution.js';

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

interface ProjectConfigFile {
  path: string;
  exists: boolean;
  content: Record<string, unknown>;
  document: ReturnType<typeof parseDocument>;
}

const WORKFLOW_PROMPT_META: Record<string, WorkflowPromptMeta> = {
  propose: {
    name: 'Propose change',
    description: 'Create proposal, design, and tasks from a request',
  },
  explore: {
    name: 'Explore ideas',
    description: 'Investigate a problem before implementation',
  },
  new: {
    name: 'New change',
    description: 'Create a new change scaffold quickly',
  },
  continue: {
    name: 'Continue change',
    description: 'Resume work on an existing change',
  },
  apply: {
    name: 'Apply tasks',
    description: 'Implement tasks from the current change',
  },
  ff: {
    name: 'Fast-forward',
    description: 'Run a faster implementation workflow',
  },
  sync: {
    name: 'Sync specs',
    description: 'Sync change artifacts with specs',
  },
  archive: {
    name: 'Archive change',
    description: 'Finalize and archive a completed change',
  },
  'bulk-archive': {
    name: 'Bulk archive',
    description: 'Archive multiple completed changes together',
  },
  verify: {
    name: 'Verify change',
    description: 'Run verification checks against a change',
  },
  onboard: {
    name: 'Onboard',
    description: 'Guided onboarding flow for OpenSpec',
  },
};

const DEFAULT_PROJECT_SCHEMA = 'spec-driven';
const PROJECT_PROFILE_KEYS = new Set(['profile', 'delivery', 'workflows']);
const AMBIGUOUS_PROJECT_CONFIG_ERROR =
  'Both openspec/config.yaml and openspec/config.yml exist. Remove one to continue.';

/**
 * Return candidate project config paths for both supported YAML extensions.
 *
 * Callers can use this to implement existence checks, ambiguity handling,
 * and default path selection for new files.
 */
export function getProjectConfigFilePaths(projectDir: string): {
  yamlPath: string;
  ymlPath: string;
} {
  return {
    yamlPath: path.join(projectDir, OPENSPEC_DIR_NAME, 'config.yaml'),
    ymlPath: path.join(projectDir, OPENSPEC_DIR_NAME, 'config.yml'),
  };
}

function resolveProjectConfigFilePath(projectDir: string): { path: string; exists: boolean } {
  const { yamlPath, ymlPath } = getProjectConfigFilePaths(projectDir);
  const yamlExists = fs.existsSync(yamlPath);
  const ymlExists = fs.existsSync(ymlPath);

  if (yamlExists && ymlExists) {
    throw new Error(AMBIGUOUS_PROJECT_CONFIG_ERROR);
  }

  if (yamlExists) {
    return { path: yamlPath, exists: true };
  }
  if (ymlExists) {
    return { path: ymlPath, exists: true };
  }
  return { path: yamlPath, exists: false };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRawProjectConfigFile(projectDir: string): ProjectConfigFile {
  const resolved = resolveProjectConfigFilePath(projectDir);

  if (!resolved.exists) {
    return {
      path: resolved.path,
      exists: false,
      content: {},
      document: parseDocument(''),
    };
  }

  const fileContent = fs.readFileSync(resolved.path, 'utf-8');
  const document = parseDocument(fileContent);
  if (document.errors.length > 0) {
    throw new Error(
      `Invalid YAML in ${path.relative(projectDir, resolved.path)}: ${document.errors[0]?.message}`
    );
  }

  const parsed = document.toJS();

  if (parsed == null) {
    return {
      path: resolved.path,
      exists: true,
      content: {},
      document,
    };
  }

  if (!isObjectRecord(parsed)) {
    throw new Error(`Invalid YAML object in ${path.relative(projectDir, resolved.path)}`);
  }

  return {
    path: resolved.path,
    exists: true,
    content: { ...parsed },
    document,
  };
}

function writeProjectConfigFile(file: ProjectConfigFile): void {
  fs.mkdirSync(path.dirname(file.path), { recursive: true });
  const serialized = String(file.document);
  const contentWithNewline = serialized.endsWith('\n') ? serialized : `${serialized}\n`;
  fs.writeFileSync(file.path, contentWithNewline, 'utf-8');
}

function ensureProjectConfigForWrite(projectDir: string): ProjectConfigFile {
  const file = readRawProjectConfigFile(projectDir);
  if (!file.exists && file.document.get('schema') === undefined) {
    file.document.set('schema', DEFAULT_PROJECT_SCHEMA);
  }
  return file;
}

function toPathSegments(key: string): string[] {
  return key.split('.');
}

function setProjectConfigDocumentValue(document: ReturnType<typeof parseDocument>, key: string, value: unknown): void {
  const pathSegments = toPathSegments(key);

  for (let depth = 1; depth < pathSegments.length; depth += 1) {
    const parentPath = pathSegments.slice(0, depth);
    const existingParent = document.getIn(parentPath, true);
    if (existingParent === undefined) {
      document.setIn(parentPath, document.createNode({}));
      continue;
    }
    if (!isMap(existingParent)) {
      document.setIn(parentPath, document.createNode({}));
    }
  }

  if (pathSegments.length === 1) {
    document.set(pathSegments[0], value);
    return;
  }
  document.setIn(pathSegments, value);
}

function deleteProjectConfigDocumentValue(document: ReturnType<typeof parseDocument>, key: string): boolean {
  const pathSegments = toPathSegments(key);
  if (!document.hasIn(pathSegments)) {
    return false;
  }
  document.deleteIn(pathSegments);
  return true;
}

function parseScope(rawScope: unknown): ConfigScope | null {
  if (rawScope === undefined || rawScope === null || rawScope === 'global') {
    return 'global';
  }
  if (rawScope === 'project') {
    return 'project';
  }
  console.error(`Error: Invalid scope "${String(rawScope)}". Use "global" or "project".`);
  process.exitCode = 1;
  return null;
}

function isSupportedProjectProfileKey(key: string): boolean {
  return !key.includes('.') && PROJECT_PROFILE_KEYS.has(key);
}

function validateProjectProfileValue(key: string, value: unknown): { valid: boolean; error?: string } {
  if (key === 'profile') {
    if (value === 'core' || value === 'custom') {
      return { valid: true };
    }
    return { valid: false, error: 'profile must be "core" or "custom"' };
  }

  if (key === 'delivery') {
    if (value === 'both' || value === 'skills' || value === 'commands') {
      return { valid: true };
    }
    return { valid: false, error: 'delivery must be "both", "skills", or "commands"' };
  }

  if (key === 'workflows') {
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      return { valid: true };
    }
    return { valid: false, error: 'workflows must be an array of strings' };
  }

  return { valid: false, error: `Unsupported project config key "${key}"` };
}

function coerceProjectScopedValue(key: string, value: string, forceString: boolean): unknown {
  if (key === 'workflows' && !forceString) {
    const trimmed = value.trim();
    if (trimmed === '') {
      return [];
    }

    if (trimmed.startsWith('[')) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch (error) {
        throw new Error(
          `Invalid JSON array for workflows: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      if (!Array.isArray(parsed)) {
        throw new Error('workflows JSON value must be an array');
      }

      return parsed;
    }

    return trimmed
      .split(',')
      .map((workflow) => workflow.trim())
      .filter((workflow) => workflow.length > 0);
  }

  return coerceValue(value, forceString);
}

function formatSource(source: ProfileValueSource): string {
  if (source === 'project') return 'project';
  if (source === 'global') return 'global';
  if (source === 'cli') return 'CLI override';
  return 'default';
}

interface ProfileSourceState {
  profile: ProfileValueSource;
  delivery: ProfileValueSource;
  workflows: ProfileValueSource;
}

interface DriftWarningContext {
  scope?: ConfigScope;
  effectiveSources?: ProfileSourceState;
  hasProjectConfig?: boolean;
}

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
 * Build a CLI-facing diff summary between two profile states.
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
  colorize: (message: string) => string,
  context: DriftWarningContext = {}
): void {
  const scope = context.scope ?? 'global';
  const openspecDir = path.join(projectDir, OPENSPEC_DIR_NAME);
  if (!fs.existsSync(openspecDir)) {
    return;
  }
  if (!hasProjectConfigDrift(projectDir, state.workflows, state.delivery)) {
    return;
  }

  const hasProjectSource =
    context.effectiveSources !== undefined &&
    [
      context.effectiveSources.profile,
      context.effectiveSources.delivery,
      context.effectiveSources.workflows,
    ].some((source) => source === 'project');
  const useProjectWording =
    scope === 'project' && (hasProjectSource || context.hasProjectConfig === true);

  const message =
    useProjectWording
      ? 'Warning: Project config is not applied to this project. Run `openspec update` to sync.'
      : 'Warning: Global config is not applied to this project. Run `openspec update` to sync.';
  console.log(colorize(message));
}

/**
 * Register the config command and all its subcommands.
 *
 * @param program - The Commander program instance
 */
export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('View and modify OpenSpec configuration')
    .option('--scope <scope>', 'Config scope ("global" or "project")', 'global');

  // config path
  configCmd
    .command('path')
    .description('Show config file location')
    .action(() => {
      const scope = parseScope(configCmd.opts<{ scope?: string }>().scope);
      if (!scope) {
        return;
      }

      if (scope === 'global') {
        console.log(getGlobalConfigPath());
        return;
      }

      try {
        console.log(resolveProjectConfigFilePath(process.cwd()).path);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      }
    });

  // config list
  configCmd
    .command('list')
    .description('Show all current settings')
    .option('--json', 'Output as JSON')
    .action((options: { json?: boolean }) => {
      const scope = parseScope(configCmd.opts<{ scope?: string }>().scope);
      if (!scope) {
        return;
      }

      if (scope === 'global') {
        const config = getGlobalConfig();

        if (options.json) {
          console.log(JSON.stringify(config, null, 2));
          return;
        }

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
        console.log(`\nProfile settings:`);
        console.log(`  profile: ${config.profile} ${profileSource}`);
        console.log(`  delivery: ${config.delivery} ${deliverySource}`);
        if (config.profile === 'core') {
          console.log(`  workflows: ${CORE_WORKFLOWS.join(', ')} (from core profile)`);
        } else if (config.workflows && config.workflows.length > 0) {
          console.log(`  workflows: ${config.workflows.join(', ')} (explicit)`);
        } else {
          console.log(`  workflows: (none)`);
        }

        return;
      }

      const projectDir = process.cwd();

      let projectFile: ProjectConfigFile;
      let projectConfig: NonNullable<ReturnType<typeof readProjectConfig>>;
      try {
        projectFile = readRawProjectConfigFile(projectDir);
        projectConfig = readProjectConfig(projectDir) ?? {};
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
        return;
      }

      const effective = resolveEffectiveProfileSettings({
        projectConfig,
        globalConfig: getGlobalConfig(),
      });

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              raw: projectFile.content,
              effective: {
                profile: effective.profile,
                delivery: effective.delivery,
                workflows: effective.workflows,
                sources: effective.sources,
              },
            },
            null,
            2
          )
        );
        return;
      }

      console.log(
        Object.keys(projectFile.content).length > 0
          ? formatValueYaml(projectFile.content)
          : '{}'
      );

      console.log(`\nProfile settings (effective):`);
      console.log(`  profile: ${effective.profile} (${formatSource(effective.sources.profile)})`);
      console.log(`  delivery: ${effective.delivery} (${formatSource(effective.sources.delivery)})`);
      if (effective.profile === 'core') {
        console.log(`  workflows: ${CORE_WORKFLOWS.join(', ')} (from core profile)`);
      } else if (effective.workflows.length > 0) {
        console.log(`  workflows: ${effective.workflows.join(', ')} (${formatSource(effective.sources.workflows)})`);
      } else {
        console.log(`  workflows: (none)`);
      }
    });

  // config get
  configCmd
    .command('get <key>')
    .description('Get a specific value (raw, scriptable)')
    .option('--allow-unknown', 'Allow getting unknown keys')
    .action((key: string, options: { allowUnknown?: boolean }) => {
      const scope = parseScope(configCmd.opts<{ scope?: string }>().scope);
      if (!scope) {
        return;
      }

      const allowUnknown = Boolean(options.allowUnknown);

      if (scope === 'project' && !allowUnknown && !isSupportedProjectProfileKey(key)) {
        console.error(
          `Error: Project scope only supports profile-related keys: ${Array.from(PROJECT_PROFILE_KEYS).join(', ')}`
        );
        console.error('Pass --allow-unknown to bypass this check.');
        process.exitCode = 1;
        return;
      }

      let config: Record<string, unknown>;
      if (scope === 'global') {
        config = getGlobalConfig() as Record<string, unknown>;
      } else {
        try {
          config = readRawProjectConfigFile(process.cwd()).content;
        } catch (error) {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
          process.exitCode = 1;
          return;
        }
      }

      const value = getNestedValue(config, key);

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
      const scope = parseScope(configCmd.opts<{ scope?: string }>().scope);
      if (!scope) {
        return;
      }

      const allowUnknown = Boolean(options.allowUnknown);

      if (scope === 'global') {
        const keyValidation = validateConfigKeyPath(key);
        if (!keyValidation.valid && !allowUnknown) {
          const reason = keyValidation.reason ? ` ${keyValidation.reason}.` : '';
          console.error(`Error: Invalid configuration key "${key}".${reason}`);
          console.error('Use "openspec config list" to see available keys.');
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
        return;
      }

      if (!allowUnknown && !isSupportedProjectProfileKey(key)) {
        console.error(
          `Error: Project scope only supports profile-related keys: ${Array.from(PROJECT_PROFILE_KEYS).join(', ')}`
        );
        console.error('Pass --allow-unknown to bypass this check.');
        process.exitCode = 1;
        return;
      }

      let coercedValue: unknown;
      try {
        coercedValue = coerceProjectScopedValue(key, value, options.string || false);
      } catch (error) {
        console.error(
          `Error: Invalid configuration - ${error instanceof Error ? error.message : String(error)}`
        );
        process.exitCode = 1;
        return;
      }

      if (isSupportedProjectProfileKey(key)) {
        const validation = validateProjectProfileValue(key, coercedValue);
        if (!validation.valid) {
          console.error(`Error: Invalid configuration - ${validation.error}`);
          process.exitCode = 1;
          return;
        }
      }

      let projectFile: ProjectConfigFile;
      try {
        projectFile = ensureProjectConfigForWrite(process.cwd());
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
        return;
      }

      setProjectConfigDocumentValue(projectFile.document, key, coercedValue);
      writeProjectConfigFile(projectFile);

      const displayValue =
        typeof coercedValue === 'string' ? `"${coercedValue}"` : JSON.stringify(coercedValue);
      console.log(`Set ${key} = ${displayValue}`);
    });

  // config unset
  configCmd
    .command('unset <key>')
    .description('Remove a key (revert to default)')
    .option('--allow-unknown', 'Allow unsetting unknown keys')
    .action((key: string, options: { allowUnknown?: boolean }) => {
      const scope = parseScope(configCmd.opts<{ scope?: string }>().scope);
      if (!scope) {
        return;
      }

      const allowUnknown = Boolean(options.allowUnknown);

      if (scope === 'global') {
        const config = getGlobalConfig() as Record<string, unknown>;
        const existed = deleteNestedValue(config, key);

        if (existed) {
          saveGlobalConfig(config as GlobalConfig);
          console.log(`Unset ${key} (reverted to default)`);
        } else {
          console.log(`Key "${key}" was not set`);
        }
        return;
      }

      if (!allowUnknown && !isSupportedProjectProfileKey(key)) {
        console.error(
          `Error: Project scope only supports profile-related keys: ${Array.from(PROJECT_PROFILE_KEYS).join(', ')}`
        );
        console.error('Pass --allow-unknown to bypass this check.');
        process.exitCode = 1;
        return;
      }

      let projectFile: ProjectConfigFile;
      try {
        projectFile = readRawProjectConfigFile(process.cwd());
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
        return;
      }

      const existed = deleteProjectConfigDocumentValue(projectFile.document, key);

      if (existed) {
        writeProjectConfigFile(projectFile);
        console.log(`Unset ${key} (reverted to fallback)`);
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
      const scope = parseScope(configCmd.opts<{ scope?: string }>().scope);
      if (!scope) {
        return;
      }

      if (scope === 'project') {
        console.error('Error: config reset is only supported for global scope');
        process.exitCode = 1;
        return;
      }

      if (!options.all) {
        console.error('Error: --all flag is required for reset');
        console.error('Usage: openspec config reset --all [-y]');
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
      const scope = parseScope(configCmd.opts<{ scope?: string }>().scope);
      if (!scope) {
        return;
      }

      if (scope === 'project') {
        console.error('Error: config edit is only supported for global scope');
        process.exitCode = 1;
        return;
      }

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

  // config profile [preset]
  configCmd
    .command('profile [preset]')
    .description('Configure workflow profile (interactive picker or preset shortcut)')
    .action(async (preset?: string) => {
      const scope = parseScope(configCmd.opts<{ scope?: string }>().scope);
      if (!scope) {
        return;
      }

      // Preset shortcut: `openspec config profile core`
      if (preset === 'core') {
        if (scope === 'global') {
          const config = getGlobalConfig();
          config.profile = 'core';
          config.workflows = [...CORE_WORKFLOWS];
          // Preserve delivery setting
          saveGlobalConfig(config);
        } else {
          let projectFile: ProjectConfigFile;
          try {
            projectFile = ensureProjectConfigForWrite(process.cwd());
          } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
            return;
          }

          setProjectConfigDocumentValue(projectFile.document, 'profile', 'core');
          setProjectConfigDocumentValue(projectFile.document, 'workflows', [...CORE_WORKFLOWS]);
          writeProjectConfigFile(projectFile);
        }
        console.log('Config updated. Run `openspec update` in your projects to apply.');
        return;
      }

      if (preset) {
        console.error(`Error: Unknown profile preset "${preset}". Available presets: core`);
        process.exitCode = 1;
        return;
      }

      // Non-interactive check
      if (!process.stdout.isTTY) {
        console.error('Interactive mode required. Use `openspec config profile core` or set config via environment/flags.');
        process.exitCode = 1;
        return;
      }

      // Interactive picker
      const { select, checkbox, confirm } = await import('@inquirer/prompts');
      const chalk = (await import('chalk')).default;

      try {
        const globalConfig = getGlobalConfig();
        const projectDir = process.cwd();
        let hasProjectConfig = false;
        let projectConfig: NonNullable<ReturnType<typeof readProjectConfig>> | null = null;

        if (scope === 'project') {
          const resolvedProjectConfigPath = resolveProjectConfigFilePath(projectDir);
          hasProjectConfig = resolvedProjectConfigPath.exists;
          projectConfig = readProjectConfig(projectDir) ?? {};
        }

        const effective = resolveEffectiveProfileSettings({
          projectConfig,
          globalConfig,
        });
        const currentState: ProfileState = {
          profile: effective.profile,
          delivery: effective.delivery,
          workflows: [...effective.workflows],
        };

        console.log(chalk.bold('\nCurrent profile settings'));
        console.log(`  Delivery: ${currentState.delivery}`);
        console.log(`  Workflows: ${formatWorkflowSummary(currentState.workflows, currentState.profile)}`);
        console.log(chalk.dim('  Delivery = where workflows are installed (skills, commands, or both)'));
        console.log(chalk.dim('  Workflows = which actions are available (propose, explore, apply, etc.)'));
        console.log();

        const action = await select<ProfileAction>({
          message: 'What do you want to configure?',
          choices: [
            {
              value: 'both',
              name: 'Delivery and workflows',
              description: 'Update install mode and available actions together',
            },
            {
              value: 'delivery',
              name: 'Delivery only',
              description: 'Change where workflows are installed',
            },
            {
              value: 'workflows',
              name: 'Workflows only',
              description: 'Change which workflow actions are available',
            },
            {
              value: 'keep',
              name: 'Keep current settings (exit)',
              description: 'Leave configuration unchanged and exit',
            },
          ],
        });

        if (action === 'keep') {
          console.log('No config changes.');
          maybeWarnConfigDrift(projectDir, currentState, chalk.yellow, {
            scope,
            effectiveSources: effective.sources,
            hasProjectConfig,
          });
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
              name: 'Both (skills + commands)',
              description: 'Install workflows as both skills and slash commands',
            },
            {
              value: 'skills' as Delivery,
              name: 'Skills only',
              description: 'Install workflows only as skills',
            },
            {
              value: 'commands' as Delivery,
              name: 'Commands only',
              description: 'Install workflows only as slash commands',
            },
          ];
          for (const choice of deliveryChoices) {
            if (choice.value === currentState.delivery) {
              choice.name += ' [current]';
            }
          }

          nextState.delivery = await select<Delivery>({
            message: 'Delivery mode (how workflows are installed):',
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
            message: 'Select workflows to make available:',
            instructions: 'Space to toggle, Enter to confirm',
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
          console.log('No config changes.');
          maybeWarnConfigDrift(projectDir, nextState, chalk.yellow, {
            scope,
            effectiveSources: effective.sources,
            hasProjectConfig,
          });
          return;
        }

        console.log(chalk.bold('\nConfig changes:'));
        for (const line of diff.lines) {
          console.log(`  ${line}`);
        }
        console.log();

        if (scope === 'global') {
          const config = getGlobalConfig();
          config.profile = nextState.profile;
          config.delivery = nextState.delivery;
          config.workflows = nextState.workflows;
          saveGlobalConfig(config);
        } else {
          let projectFile: ProjectConfigFile;
          try {
            projectFile = ensureProjectConfigForWrite(process.cwd());
          } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exitCode = 1;
            return;
          }

          if (action === 'both' || action === 'workflows') {
            setProjectConfigDocumentValue(projectFile.document, 'profile', nextState.profile);
            setProjectConfigDocumentValue(projectFile.document, 'workflows', nextState.workflows);
          }
          if (action === 'both' || action === 'delivery') {
            setProjectConfigDocumentValue(projectFile.document, 'delivery', nextState.delivery);
          }
          writeProjectConfigFile(projectFile);
        }

        // Check if inside an OpenSpec project
        const openspecDir = path.join(projectDir, OPENSPEC_DIR_NAME);
        if (fs.existsSync(openspecDir)) {
          const applyNow = await confirm({
            message: 'Apply changes to this project now?',
            default: true,
          });

          if (applyNow) {
            try {
              const updateCommand =
                scope === 'project' ? 'npx openspec update --scope project' : 'npx openspec update --scope global';
              execSync(updateCommand, { stdio: 'inherit', cwd: projectDir });
              console.log('Run `openspec update` in your other projects to apply.');
            } catch {
              console.error('`openspec update` failed. Please run it manually to apply the profile changes.');
              process.exitCode = 1;
            }
            return;
          }
        }

        console.log('Config updated. Run `openspec update` in your projects to apply.');
      } catch (error) {
        if (isPromptCancellationError(error)) {
          console.log('Config profile cancelled.');
          process.exitCode = 130;
          return;
        }
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      }
    });
}
