/**
 * Run Command
 *
 * Pipeline runner for phase execution. Manages the lifecycle of a phase
 * by executing pre-hooks/gates (start) and post-hooks/gates (complete).
 *
 * Usage:
 *   openspec run start --change <name> --phase <phase> [--session <id>] [--json]
 *   openspec run complete --change <name> --phase <phase> [--json]
 */

import ora from 'ora';
import path from 'path';
import {
  loadChangeContext,
  resolveSchema,
} from '../core/artifact-graph/index.js';
import { PipelineRunner } from '../core/pipeline/runner.js';
import { validateChangeExists } from './workflow/shared.js';
import { getChangesDir } from '../utils/change-utils.js';
import { readProjectConfig } from '../core/project-config.js';
import { loadPlugins } from '../core/plugin/loader.js';
import { validateAllPluginConfigs } from '../core/plugin/config-validator.js';
import type { LoadedPlugin } from '../core/plugin/types.js';

export class RunCommand {
  async startAction(options: {
    change?: string;
    phase?: string;
    json?: boolean;
    session?: string;
  }): Promise<void> {
    const projectRoot = process.cwd();

    // 1. Validate change exists
    const changeName = await validateChangeExists(options.change, projectRoot);

    // 2. Validate phase
    const phase = options.phase;
    if (!phase || !['propose', 'apply', 'verify', 'archive'].includes(phase)) {
      throw new Error(
        `Invalid or missing --phase. Must be one of: propose, apply, verify, archive`,
      );
    }

    // 3. Load change context to get schema name
    const context = loadChangeContext(projectRoot, changeName);
    const changeDir = path.join(getChangesDir(projectRoot), changeName);

    // 4. Resolve schema
    const schema = resolveSchema(context.schemaName, projectRoot);

    // 5. Load plugins
    const plugins = this.loadProjectPlugins(projectRoot);

    // 6. Create PipelineRunner
    const runner = new PipelineRunner(
      projectRoot,
      changeName,
      phase,
      plugins,
      changeDir,
      schema,
      options.session,
    );

    // 7. Execute start
    const result = await runner.start();

    // 8. Output
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      this.outputStartResult(result);
    }

    if (result.status === 'blocked') {
      process.exitCode = 1;
    }
  }

  async completeAction(options: {
    change?: string;
    phase?: string;
    json?: boolean;
  }): Promise<void> {
    const projectRoot = process.cwd();

    // 1. Validate change exists
    const changeName = await validateChangeExists(options.change, projectRoot);

    // 2. Validate phase
    const phase = options.phase;
    if (!phase || !['propose', 'apply', 'verify', 'archive'].includes(phase)) {
      throw new Error(
        `Invalid or missing --phase. Must be one of: propose, apply, verify, archive`,
      );
    }

    // 3. Load change context to get schema name
    const context = loadChangeContext(projectRoot, changeName);
    const changeDir = path.join(getChangesDir(projectRoot), changeName);

    // 4. Resolve schema
    const schema = resolveSchema(context.schemaName, projectRoot);

    // 5. Load plugins
    const plugins = this.loadProjectPlugins(projectRoot);

    // 6. Create PipelineRunner
    const runner = new PipelineRunner(
      projectRoot,
      changeName,
      phase,
      plugins,
      changeDir,
      schema,
    );

    // 7. Execute complete
    const result = await runner.complete();

    // 8. Output
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      this.outputCompleteResult(result);
    }

    if (result.status !== 'passed') {
      process.exitCode = 1;
    }
  }

  private loadProjectPlugins(projectRoot: string): LoadedPlugin[] {
    const config = readProjectConfig(projectRoot);
    if (!config?.plugins || config.plugins.length === 0) {
      return [];
    }

    try {
      const loaded = loadPlugins(projectRoot, config.plugins);
      const validated = validateAllPluginConfigs(
        loaded,
        config.plugin_config as Record<string, unknown> | undefined,
      );
      if (validated.errors.length > 0) {
        for (const err of validated.errors) {
          console.warn(`Plugin config: ${err}`);
        }
      }
      return validated.plugins;
    } catch (err) {
      console.warn(`Plugin loading failed: ${(err as Error).message}`);
      return [];
    }
  }

  private outputStartResult(result: RunStartResult): void {
    console.log(`Pipeline Start: ${result.changeName} (${result.phase})`);
    console.log(`Session: ${result.sessionId}`);
    console.log(`Status: ${result.status}`);
    console.log();

    // Pre-hooks
    if (result.preHooks.executed.length > 0) {
      console.log('Pre-hooks:');
      for (const hook of result.preHooks.executed) {
        const icon = hook.status === 'success' ? '\u2713' : '\u2717';
        console.log(`  ${icon} ${hook.id}: ${hook.status}`);
      }
      console.log();
    }

    // Pre-gates
    if (result.preGates.length > 0) {
      console.log('Pre-gates:');
      for (const gate of result.preGates) {
        const icon = gate.passed ? '\u2713' : '\u2717';
        console.log(`  ${icon} ${gate.id}: ${gate.description}`);
      }
      console.log();
    }

    // Pending prompts
    if (result.pendingPrompts.length > 0) {
      console.log('Pending prompts (require resolution):');
      for (const prompt of result.pendingPrompts) {
        console.log(`  - ${prompt.id}: ${prompt.prompt}`);
      }
      console.log();
    }

    // Failed gates
    if (result.failedGates && result.failedGates.length > 0) {
      console.log('BLOCKED - Failed gates:');
      for (const gate of result.failedGates) {
        console.log(`  \u2717 ${gate.id}: ${gate.description}`);
      }
    }
  }

  private outputCompleteResult(result: RunCompleteResult): void {
    console.log(`Pipeline Complete: ${result.changeName} (${result.phase})`);
    console.log(`Session: ${result.sessionId}`);
    console.log(`Status: ${result.status}`);
    console.log();

    // Post-gates
    if (result.postGates.length > 0) {
      console.log('Post-gates:');
      for (const gate of result.postGates) {
        const icon = gate.passed ? '\u2713' : '\u2717';
        console.log(`  ${icon} ${gate.id}: ${gate.description}`);
      }
      console.log();
    }

    // Post-hooks
    if (result.postHooks.executed.length > 0) {
      console.log('Post-hooks:');
      for (const hook of result.postHooks.executed) {
        const icon = hook.status === 'success' ? '\u2713' : '\u2717';
        console.log(`  ${icon} ${hook.id}: ${hook.status}`);
      }
      console.log();
    }

    // Unresolved prompts
    if (result.unresolvedPrompts && result.unresolvedPrompts.length > 0) {
      console.log('Unresolved prompts:');
      for (const id of result.unresolvedPrompts) {
        console.log(`  - ${id}`);
      }
      console.log();
    }

    // Synthesis
    const s = result.synthesis;
    console.log(`Synthesis: ${s.passed}/${s.total} passed, ${s.failed} failed`);
  }
}

// Re-export type for use in outputStartResult
import type { RunStartResult, RunCompleteResult } from '../core/pipeline/types.js';
