import {
  lifecycleHookProblem,
  readLifecycleConfigForRoot,
  resolveLifecycleActions,
  toLifecycleError,
  type LifecycleActionItem,
} from '../core/lifecycle.js';
import { resolveRootForCommand, toRootOutput, withStoreFlag } from '../core/root-selection.js';

export interface LifecycleActionsOptions {
  at?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
}

interface StatusEntry {
  severity: 'error';
  code: string;
  message: string;
  target: string;
  fix: string;
}

function fail(options: LifecycleActionsOptions, status: StatusEntry[]): void {
  if (options.json) {
    const payload = options.at !== undefined ? { hook: options.at, status } : { status };
    console.log(JSON.stringify(payload, null, 2));
  } else {
    for (const entry of status) {
      console.error(`Error: ${entry.message}`);
    }
    console.error(`Fix: ${status[0].fix}`);
  }
  process.exitCode = 1;
}

function printAction(action: LifecycleActionItem, index: number, withInstructions: boolean): void {
  console.log(`  ${index + 1}. ${action.id} (${action.mode}): ${action.title}`);
  if (action.description) {
    console.log(`     ${action.description}`);
  }
  if (withInstructions) {
    for (const line of action.instructions.split('\n')) {
      console.log(`     | ${line}`);
    }
  }
}

/**
 * `openspec lifecycle actions [--at <hook>]`: read-only lookup of the actions
 * configured for each hook. Runs nothing and launches no agent.
 */
export async function lifecycleActionsCommand(options: LifecycleActionsOptions): Promise<void> {
  if (options.at !== undefined) {
    const problem = lifecycleHookProblem(options.at);
    if (problem) {
      fail(options, [
        {
          severity: 'error',
          code: 'invalid_lifecycle_hook',
          message: problem,
          target: 'hook',
          fix: 'Pass a built-in hook such as change.apply.before, or a custom hook such as custom.security-review.completed.',
        },
      ]);
      return;
    }
  }

  const root = await resolveRootForCommand(options, {
    json: options.json,
    ...(options.at !== undefined ? { failurePayload: { hook: options.at } } : {}),
  });
  if (!root) {
    return;
  }

  const read = readLifecycleConfigForRoot(root);
  if (read.status === 'invalid') {
    const { issues, fix } = toLifecycleError(read, root);
    fail(
      options,
      issues.map((message) => ({
        severity: 'error',
        code: 'invalid_lifecycle_config',
        message,
        target: 'lifecycle',
        fix,
      }))
    );
    return;
  }
  const config = read.status === 'ok' ? read.config : { actions: {}, triggers: [] };

  if (options.at !== undefined) {
    const actions = resolveLifecycleActions(config, options.at);
    if (options.json) {
      console.log(JSON.stringify({ hook: options.at, root: toRootOutput(root), actions }, null, 2));
      return;
    }
    if (actions.length === 0) {
      console.log(`No lifecycle actions are configured for ${options.at}.`);
      return;
    }
    console.log(`${options.at}`);
    actions.forEach((action, index) => printAction(action, index, true));
    return;
  }

  // Hooks in the order their first trigger appears; actions in trigger order.
  const hooks = [...new Set(config.triggers.map((trigger) => trigger.on))].map((hook) => ({
    hook,
    actions: resolveLifecycleActions(config, hook),
  }));

  if (options.json) {
    console.log(JSON.stringify({ root: toRootOutput(root), hooks }, null, 2));
    return;
  }
  if (hooks.length === 0) {
    console.log('No lifecycle actions are configured.');
    console.log(
      'Add actions and triggers under lifecycle: in openspec/config.yaml to attach agent instructions to workflow hooks.'
    );
    return;
  }
  console.log(`Lifecycle actions (${root.path})`);
  for (const { hook, actions } of hooks) {
    console.log();
    console.log(hook);
    actions.forEach((action, index) => printAction(action, index, false));
  }
  console.log();
  console.log(
    `Show one hook with its instructions: ${withStoreFlag(root, 'openspec lifecycle actions --at <hook>')}`
  );
}
