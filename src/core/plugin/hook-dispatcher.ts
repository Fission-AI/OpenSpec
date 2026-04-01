import * as fs from 'node:fs';
import * as path from 'node:path';
import { exec } from 'node:child_process';
import type { LoadedPlugin, HandlerConfig, HookDefinition } from './types.js';
import { VALID_HOOK_POINTS } from './types.js';
import { flattenConfigToEnvVars } from './config-validator.js';

export type HookPoint = (typeof VALID_HOOK_POINTS)[number];

export interface HookExecutedResult {
  id: string;
  type: 'command';
  status: 'success' | 'failed';
  output: string;
}

export interface HookPendingResult {
  id: string;
  type: 'prompt';
  prompt: string;
}

export interface HookResult {
  executed: HookExecutedResult[];
  pending: HookPendingResult[];
}

export interface HookContext {
  changeName: string;
  changeDir: string;
  schema: string;
  projectRoot: string;
  phase: string;
  hookPoint: HookPoint;
  archiveDir?: string;
  changedFiles?: string[];
}

/**
 * Build environment variables for command handlers.
 */
function buildEnvVars(
  context: HookContext,
  plugin: LoadedPlugin
): Record<string, string> {
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    OPENSPEC_CHANGE_NAME: context.changeName,
    OPENSPEC_CHANGE_DIR: context.changeDir,
    OPENSPEC_SCHEMA: context.schema,
    OPENSPEC_PROJECT_ROOT: context.projectRoot,
    OPENSPEC_PHASE: context.phase,
    OPENSPEC_HOOK_POINT: context.hookPoint,
  };

  if (context.archiveDir) {
    env.OPENSPEC_ARCHIVE_DIR = context.archiveDir;
  }

  if (context.changedFiles) {
    env.OPENSPEC_CHANGED_FILES = context.changedFiles.join(',');
  }

  // Add plugin config as env vars
  const pluginEnv = flattenConfigToEnvVars(plugin.manifest.name, plugin.config);
  Object.assign(env, pluginEnv);

  return env;
}

/**
 * Execute a shell command and return the result.
 */
function execCommand(
  command: string,
  env: Record<string, string>,
  cwd: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    exec(command, { env, cwd, timeout: 60000 }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (error.code ?? 1) : 0,
        stdout: stdout.toString().trim(),
        stderr: stderr.toString().trim(),
      });
    });
  });
}

/**
 * Read a prompt file and substitute template variables.
 */
function renderPrompt(
  filePath: string,
  context: HookContext,
  plugin: LoadedPlugin,
  commandOutput?: string
): string {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read prompt file '${filePath}': ${err}`);
  }

  // Build substitution map
  const vars: Record<string, string> = {
    change_name: context.changeName,
    change_dir: context.changeDir,
    schema: context.schema,
    project_root: context.projectRoot,
    phase: context.phase,
    hook_point: context.hookPoint,
  };

  if (context.archiveDir) {
    vars.archive_dir = context.archiveDir;
  }

  if (context.changedFiles) {
    vars.changed_files = context.changedFiles.join(', ');
  }

  if (commandOutput !== undefined) {
    vars.command_output = commandOutput;
  }

  // Add plugin.config.* variables
  for (const [category, fields] of Object.entries(plugin.config)) {
    for (const [field, value] of Object.entries(fields)) {
      vars[`plugin.config.${category}.${field}`] = String(value);
    }
  }

  // Replace {{variable}} placeholders
  content = content.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    if (trimmedKey in vars) {
      return vars[trimmedKey];
    }
    console.warn(`[hook] Unknown template variable: {{${trimmedKey}}}`);
    return match; // Leave as-is
  });

  return content;
}

/**
 * Execute a single hook handler.
 */
async function executeHandler(
  hook: HookDefinition,
  handler: HandlerConfig,
  context: HookContext,
  plugin: LoadedPlugin
): Promise<{ executed?: HookExecutedResult; pending?: HookPendingResult }> {
  const env = buildEnvVars(context, plugin);

  if (handler.type === 'command') {
    const { exitCode, stdout, stderr } = await execCommand(
      handler.run!,
      env,
      context.projectRoot
    );
    const output = [stdout, stderr].filter(Boolean).join('\n');
    return {
      executed: {
        id: hook.id,
        type: 'command',
        status: exitCode === 0 ? 'success' : 'failed',
        output,
      },
    };
  }

  if (handler.type === 'prompt') {
    const filePath = path.join(plugin.dir, handler.file!);
    const prompt = renderPrompt(filePath, context, plugin);
    return {
      pending: {
        id: hook.id,
        type: 'prompt',
        prompt,
      },
    };
  }

  if (handler.type === 'both') {
    // Run command first
    const { exitCode, stdout, stderr } = await execCommand(
      handler.run!,
      env,
      context.projectRoot
    );
    const output = [stdout, stderr].filter(Boolean).join('\n');

    if (exitCode !== 0 && !handler.ignore_failure) {
      return {
        executed: {
          id: hook.id,
          type: 'command',
          status: 'failed',
          output,
        },
      };
    }

    // Then render prompt with command output
    const filePath = path.join(plugin.dir, handler.file!);
    const prompt = renderPrompt(filePath, context, plugin, output);
    return {
      executed: {
        id: hook.id,
        type: 'command',
        status: exitCode === 0 ? 'success' : 'failed',
        output,
      },
      pending: {
        id: hook.id,
        type: 'prompt',
        prompt,
      },
    };
  }

  throw new Error(`Unknown handler type: ${handler.type}`);
}

/**
 * Collect all hooks for a given hook point from loaded plugins.
 * Returns hooks in plugin whitelist order, then hook definition order within each plugin.
 */
function collectHooks(
  plugins: LoadedPlugin[],
  hookPoint: HookPoint
): Array<{ plugin: LoadedPlugin; hook: HookDefinition }> {
  const result: Array<{ plugin: LoadedPlugin; hook: HookDefinition }> = [];

  for (const plugin of plugins) {
    const hooks = plugin.manifest.hooks?.[hookPoint];
    if (hooks) {
      for (const hook of hooks) {
        result.push({ plugin, hook });
      }
    }
  }

  return result;
}

/**
 * Dispatch hooks for a given hook point across all loaded plugins.
 *
 * Command handlers are executed immediately.
 * Prompt handlers are collected for the calling agent.
 *
 * @returns HookResult with executed commands and pending prompts
 */
export async function dispatchHooks(
  plugins: LoadedPlugin[],
  hookPoint: HookPoint,
  context: HookContext
): Promise<HookResult> {
  const result: HookResult = { executed: [], pending: [] };
  const hookEntries = collectHooks(plugins, hookPoint);

  if (hookEntries.length === 0) {
    return result;
  }

  for (const { plugin, hook } of hookEntries) {
    const handler = hook.handler;

    try {
      const hookOutput = await executeHandler(hook, handler, context, plugin);

      if (hookOutput.executed) {
        result.executed.push(hookOutput.executed);

        // Check if non-ignored failure should halt execution
        if (
          hookOutput.executed.status === 'failed' &&
          !handler.ignore_failure
        ) {
          break; // Stop executing further hooks
        }
      }

      if (hookOutput.pending) {
        result.pending.push(hookOutput.pending);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.executed.push({
        id: hook.id,
        type: 'command',
        status: 'failed',
        output: `Hook error: ${errorMessage}`,
      });

      if (!handler.ignore_failure) {
        break;
      }
    }
  }

  return result;
}
