/**
 * Tools Command
 *
 * `openspec tools [path]`
 *
 * Add or remove IDE/Code Agent OpenSpec configuration files interactively.
 * Requires the project to already be initialized with `openspec init`.
 */

import { Command } from 'commander';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { isProjectInitialized } from '../core/is-project-initialized.js';
import {
  addTool,
  removeTool,
  getCurrentToolIds,
  getEligibleTools,
  resolveToolsArg,
} from '../core/tools-manager.js';
import { AI_TOOLS } from '../core/config.js';
import { getToolStates } from '../core/shared/index.js';
import { isInteractive } from '../utils/interactive.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function requireInitialized(projectPath: string): void {
  if (!isProjectInitialized(projectPath)) {
    ora().fail(
      'This project has not been initialized with OpenSpec.\n' +
        '  Run `openspec init` first.'
    );
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Non-interactive add
// ─────────────────────────────────────────────────────────────────────────────

async function runAdd(projectPath: string, toolsArg: string): Promise<void> {
  const toolIds = resolveToolsArg(toolsArg);
  if (toolIds.length === 0) {
    console.log(chalk.dim('No tools specified to add.'));
    return;
  }

  const added: string[] = [];
  const failed: Array<{ name: string; error: Error }> = [];

  for (const toolId of toolIds) {
    const tool = AI_TOOLS.find((t) => t.value === toolId);
    if (!tool) continue;
    const spinner = ora(`Adding ${tool.name}...`).start();
    try {
      await addTool(projectPath, tool);
      spinner.succeed(`Added ${tool.name}`);
      added.push(tool.name);
    } catch (err) {
      spinner.fail(`Failed to add ${tool.name}`);
      failed.push({ name: tool.name, error: err as Error });
    }
  }

  console.log();
  if (added.length > 0) {
    console.log(`Added: ${added.join(', ')}`);
  }
  if (failed.length > 0) {
    console.log(
      chalk.red(
        `Failed: ${failed.map((f) => `${f.name} (${f.error.message})`).join(', ')}`
      )
    );
  }
  if (added.length > 0) {
    console.log();
    console.log(chalk.white('Restart your IDE for slash commands to take effect.'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Non-interactive remove
// ─────────────────────────────────────────────────────────────────────────────

async function runRemove(projectPath: string, toolsArg: string): Promise<void> {
  const toolIds = resolveToolsArg(toolsArg);
  if (toolIds.length === 0) {
    console.log(chalk.dim('No tools specified to remove.'));
    return;
  }

  const removed: string[] = [];
  const failed: Array<{ name: string; error: Error }> = [];

  for (const toolId of toolIds) {
    const tool = AI_TOOLS.find((t) => t.value === toolId);
    if (!tool) continue;
    const spinner = ora(`Removing ${tool.name}...`).start();
    try {
      const counts = await removeTool(projectPath, tool);
      spinner.succeed(`Removed ${tool.name}`);
      removed.push(tool.name);
      if (counts.removedSkillCount > 0 || counts.removedCommandCount > 0) {
        console.log(
          chalk.dim(
            `  ${counts.removedSkillCount} skill dir(s) and ${counts.removedCommandCount} command file(s) removed`
          )
        );
      }
    } catch (err) {
      spinner.fail(`Failed to remove ${tool.name}`);
      failed.push({ name: tool.name, error: err as Error });
    }
  }

  console.log();
  if (removed.length > 0) {
    console.log(`Removed: ${removed.join(', ')}`);
  }
  if (failed.length > 0) {
    console.log(
      chalk.red(
        `Failed: ${failed.map((f) => `${f.name} (${f.error.message})`).join(', ')}`
      )
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive mode
// ─────────────────────────────────────────────────────────────────────────────

async function runInteractive(projectPath: string): Promise<void> {
  const eligibleTools = getEligibleTools();
  const toolStates = getToolStates(projectPath);
  const currentlyConfigured = getCurrentToolIds(projectPath);

  // Build choices for the multi-select, sorted: configured first, then the rest
  const choices = eligibleTools
    .map((tool) => {
      const status = toolStates.get(tool.value);
      const configured = status?.configured ?? false;
      return {
        name: tool.name,
        value: tool.value,
        configured,
        preSelected: configured,
      };
    })
    .sort((a, b) => {
      if (a.configured && !b.configured) return -1;
      if (!a.configured && b.configured) return 1;
      return 0;
    });

  if (currentlyConfigured.size > 0) {
    const names = [...currentlyConfigured]
      .map((id) => AI_TOOLS.find((t) => t.value === id)?.name ?? id)
      .join(', ');
    console.log(`Currently configured: ${names}`);
  } else {
    console.log(chalk.dim('No tools currently configured.'));
  }
  console.log();

  const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

  const newSelection: string[] = await searchableMultiSelect({
    message: `Select tools to configure (${eligibleTools.length} available)`,
    pageSize: 15,
    choices,
  });

  const newSet = new Set(newSelection);

  // Compute diffs
  const toAdd = newSelection.filter((id) => !currentlyConfigured.has(id));
  const toRemove = [...currentlyConfigured].filter((id) => !newSet.has(id));

  if (toAdd.length === 0 && toRemove.length === 0) {
    console.log(chalk.dim('\nNo changes.'));
    return;
  }

  console.log();

  const addedNames: string[] = [];
  const removedNames: string[] = [];
  const failed: Array<{ name: string; error: Error }> = [];

  for (const toolId of toAdd) {
    const tool = AI_TOOLS.find((t) => t.value === toolId);
    if (!tool) continue;
    const spinner = ora(`Adding ${tool.name}...`).start();
    try {
      await addTool(projectPath, tool);
      spinner.succeed(`Added ${tool.name}`);
      addedNames.push(tool.name);
    } catch (err) {
      spinner.fail(`Failed to add ${tool.name}`);
      failed.push({ name: tool.name, error: err as Error });
    }
  }

  for (const toolId of toRemove) {
    const tool = AI_TOOLS.find((t) => t.value === toolId);
    if (!tool) continue;
    const spinner = ora(`Removing ${tool.name}...`).start();
    try {
      await removeTool(projectPath, tool);
      spinner.succeed(`Removed ${tool.name}`);
      removedNames.push(tool.name);
    } catch (err) {
      spinner.fail(`Failed to remove ${tool.name}`);
      failed.push({ name: tool.name, error: err as Error });
    }
  }

  console.log();
  if (addedNames.length > 0) {
    console.log(`Added: ${addedNames.join(', ')}`);
  }
  if (removedNames.length > 0) {
    console.log(`Removed: ${removedNames.join(', ')}`);
  }
  if (failed.length > 0) {
    console.log(
      chalk.red(
        `Failed: ${failed.map((f) => `${f.name} (${f.error.message})`).join(', ')}`
      )
    );
  }
  if (addedNames.length > 0) {
    console.log();
    console.log(chalk.white('Restart your IDE for slash commands to take effect.'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Command registration
// ─────────────────────────────────────────────────────────────────────────────

export function registerToolsCommand(program: Command): void {
  program
    .command('tools [path]')
    .description(
      'Add or remove IDE/Code Agent configurations. Shows an interactive checklist when no flags are provided.'
    )
    .option('--add <tools>', 'Add tools (comma-separated IDs or "all")')
    .option('--remove <tools>', 'Remove tools (comma-separated IDs or "all")')
    .action(
      async (
        targetPath = '.',
        options?: { add?: string; remove?: string }
      ) => {
        try {
          const projectPath = path.resolve(targetPath);

          requireInitialized(projectPath);

          const hasAdd = typeof options?.add === 'string';
          const hasRemove = typeof options?.remove === 'string';

          if (hasAdd && hasRemove) {
            // Check for overlap
            const addIds = resolveToolsArg(options!.add!);
            const removeIds = resolveToolsArg(options!.remove!);
            const overlap = addIds.filter((id) => removeIds.includes(id));
            if (overlap.length > 0) {
              throw new Error(
                `Cannot add and remove the same tool(s): ${overlap.join(', ')}`
              );
            }
            // Run both sequentially
            if (addIds.length > 0) await runAdd(projectPath, options!.add!);
            if (removeIds.length > 0) await runRemove(projectPath, options!.remove!);
            return;
          }

          if (hasAdd) {
            await runAdd(projectPath, options!.add!);
            return;
          }

          if (hasRemove) {
            await runRemove(projectPath, options!.remove!);
            return;
          }

          // Interactive mode
          if (!isInteractive()) {
            throw new Error(
              'No --add or --remove flag provided and the terminal is not interactive.\n' +
                '  Use --add <tools> or --remove <tools> to operate non-interactively.'
            );
          }

          await runInteractive(projectPath);
        } catch (error) {
          console.log();
          ora().fail(`Error: ${(error as Error).message}`);
          process.exit(1);
        }
      }
    );
}
