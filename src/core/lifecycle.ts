/**
 * Lifecycle actions: named agent instructions a project attaches to workflow
 * hooks under `lifecycle:` in openspec/config.yaml.
 *
 * OpenSpec only resolves which actions are configured for a hook. It runs
 * nothing: the calling agent or orchestrator handles each action itself.
 *
 * The reader here is strict on purpose (unknown keys fail closed), and it is
 * separate from the forgiving `readProjectConfig`, so an invalid `lifecycle:`
 * block never affects commands that do not use it.
 */

import { readFileSync } from 'fs';
import { isMap, isScalar, isSeq, parseDocument } from 'yaml';

import { isKebabId } from './id.js';
import { resolveConfigFilePath, topLevelLifecyclePairs } from './project-config.js';
import {
  findDeclaringProjectRoot,
  isStoreSelectedRoot,
  withStoreFlag,
  type ResolvedOpenSpecRoot,
} from './root-selection.js';

/** The built-in hooks OpenSpec's own skills invoke. Tracked by name. */
export const LIFECYCLE_HOOKS = [
  'change.create.before',
  'change.apply.before',
  'change.apply.completed',
  'change.archive.before',
  'change.archive.completed',
] as const;

export const LIFECYCLE_MODES = ['suggest', 'auto'] as const;
export type LifecycleMode = (typeof LIFECYCLE_MODES)[number];

const CUSTOM_HOOK_PREFIX = 'custom.';
const LIFECYCLE_KEYS = ['actions', 'triggers'];
const ACTION_KEYS = ['instructions', 'title', 'description'];
const TRIGGER_KEYS = ['on', 'action', 'mode'];

export interface LifecycleActionConfig {
  instructions: string;
  title?: string;
  description?: string;
}

export interface LifecycleTriggerConfig {
  on: string;
  action: string;
  mode: LifecycleMode;
}

export interface LifecycleConfig {
  actions: Record<string, LifecycleActionConfig>;
  triggers: LifecycleTriggerConfig[];
}

/** One resolved action, as callers receive it. */
export interface LifecycleActionItem {
  id: string;
  mode: LifecycleMode;
  title: string;
  description?: string;
  instructions: string;
}

export type LifecycleConfigRead =
  | { status: 'unconfigured' }
  | { status: 'ok'; config: LifecycleConfig; filePath: string }
  | { status: 'invalid'; issues: string[]; filePath: string };

/** The `lifecycleError` payload attached to instruction reads. */
export interface LifecycleError {
  message: string;
  issues: string[];
  fix: string;
}

/**
 * Returns a problem description for a hook name, or null when it is valid.
 * Valid names are the built-in hooks and `custom.<segment>(.<segment>)*`
 * with kebab-case segments.
 */
export function lifecycleHookProblem(hook: string): string | null {
  if ((LIFECYCLE_HOOKS as readonly string[]).includes(hook)) {
    return null;
  }
  if (hook.startsWith(CUSTOM_HOOK_PREFIX)) {
    const segments = hook.slice(CUSTOM_HOOK_PREFIX.length).split('.');
    if (segments.every((segment) => isKebabId(segment))) {
      return null;
    }
    return `Invalid custom hook '${hook}': each segment after 'custom.' must be kebab-case (for example custom.security-review.completed).`;
  }
  return `Unknown hook '${hook}'. Use a built-in hook (${LIFECYCLE_HOOKS.join(', ')}) or a custom hook starting with 'custom.'.`;
}

/**
 * Strict reader for the `lifecycle:` block of one root's config file.
 * A file without `lifecycle:` (or no file at all) is unconfigured.
 */
export function readLifecycleConfig(projectRoot: string): LifecycleConfigRead {
  const filePath = resolveConfigFilePath(projectRoot);
  if (filePath === null) {
    return { status: 'unconfigured' };
  }

  let doc;
  try {
    doc = parseDocument(readFileSync(filePath, 'utf-8'), { uniqueKeys: false });
  } catch (error) {
    return {
      status: 'invalid',
      issues: [`Could not read ${filePath} (${error instanceof Error ? error.message : String(error)}).`],
      filePath,
    };
  }
  if (doc.errors.length > 0) {
    return {
      status: 'invalid',
      issues: [`Could not parse ${filePath} (${doc.errors[0].message.split('\n')[0]}).`],
      filePath,
    };
  }

  const lifecyclePairs = topLevelLifecyclePairs(doc);
  if (lifecyclePairs.length === 0) {
    return { status: 'unconfigured' };
  }
  if (lifecyclePairs.length > 1) {
    return {
      status: 'invalid',
      issues: [
        `Duplicate top-level 'lifecycle' key in ${filePath}. Combine all actions and triggers under one 'lifecycle:' block.`,
      ],
      filePath,
    };
  }

  let raw: Record<string, unknown>;
  try {
    raw = doc.toJS() as Record<string, unknown>;
  } catch (error) {
    // Unresolved aliases and alias bombs only fail here, not at parse time.
    return {
      status: 'invalid',
      issues: [`Could not load ${filePath} (${error instanceof Error ? error.message.split('\n')[0] : String(error)}).`],
      filePath,
    };
  }

  const issues: string[] = [];
  collectDuplicateKeys(lifecyclePairs[0].value, 'lifecycle', issues);

  const lifecycle = raw.lifecycle;
  let config: LifecycleConfig = { actions: Object.create(null), triggers: [] };
  if (lifecycle !== null && !isPlainObject(lifecycle)) {
    issues.push(`lifecycle must be a mapping with 'actions' and 'triggers'.`);
  } else if (isPlainObject(lifecycle)) {
    const extra = unknownKeys(lifecycle, LIFECYCLE_KEYS);
    if (extra.length > 0) {
      issues.push(`Unknown key(s) in lifecycle: ${extra.join(', ')}. Supported keys: ${LIFECYCLE_KEYS.join(', ')}.`);
    }
    const actions = validateActions(lifecycle.actions, issues);
    const triggers = validateTriggers(lifecycle.triggers, new Set(Object.keys(actions)), issues);
    config = { actions, triggers };
  }

  return issues.length > 0
    ? { status: 'invalid', issues, filePath }
    : { status: 'ok', config, filePath };
}

/**
 * Lifecycle config for a resolved root. A Store root's own config decides,
 * with no repo-plus-store merging. A `lifecycle:` block in the pointer-only
 * repo config that selected the Store would otherwise be silently ignored,
 * so it is reported as invalid instead.
 */
export function readLifecycleConfigForRoot(
  root: ResolvedOpenSpecRoot,
  startPath: string = process.cwd()
): LifecycleConfigRead {
  if (isStoreSelectedRoot(root)) {
    const pointerRepo = findDeclaringProjectRoot(root.storeId, startPath);
    const filePath = pointerRepo ? resolveConfigFilePath(pointerRepo) : null;
    if (filePath && hasLifecycleKey(filePath)) {
      return {
        status: 'invalid',
        issues: [
          `${filePath} only points at store '${root.storeId}', so its lifecycle: block would be ignored. Move lifecycle: into the store's openspec/config.yaml (${root.path}).`,
        ],
        filePath,
      };
    }
  }
  return readLifecycleConfig(root.path);
}

/** Actions configured for one hook, in trigger order. Empty when none match. */
export function resolveLifecycleActions(
  config: LifecycleConfig,
  hook: string
): LifecycleActionItem[] {
  return config.triggers
    .filter((trigger) => trigger.on === hook)
    .map((trigger) => {
      const action = config.actions[trigger.action];
      return {
        id: trigger.action,
        mode: trigger.mode,
        title: action.title ?? trigger.action,
        ...(action.description !== undefined ? { description: action.description } : {}),
        instructions: action.instructions,
      };
    });
}

export function toLifecycleError(
  read: Extract<LifecycleConfigRead, { status: 'invalid' }>,
  root: ResolvedOpenSpecRoot
): LifecycleError {
  return {
    message: `Invalid lifecycle config in ${read.filePath} (${read.issues.length} ${read.issues.length === 1 ? 'problem' : 'problems'}). Lifecycle actions were not loaded.`,
    issues: read.issues,
    fix: `Fix lifecycle: in ${read.filePath}, then check it with ${withStoreFlag(root, 'openspec lifecycle actions')}.`,
  };
}

// -----------------------------------------------------------------------------
// Delivery on built-in operation reads (openspec instructions <operation>)
// -----------------------------------------------------------------------------

export type LifecycleOperation = 'create' | 'apply' | 'archive';
type Checkpoint = 'before' | 'completed';

const OPERATION_CHECKPOINTS: Record<LifecycleOperation, Checkpoint[]> = {
  create: ['before'],
  apply: ['before', 'completed'],
  archive: ['before', 'completed'],
};

export interface OperationLifecycle {
  before?: LifecycleActionItem[];
  completed?: LifecycleActionItem[];
  handling: string;
}

export interface OperationLifecycleFields {
  lifecycle?: OperationLifecycle;
  lifecycleError?: LifecycleError;
}

const CHECKPOINT_HANDLING: Record<Checkpoint, string> = {
  before: 'Handle `before` actions once, before you change any files for this operation.',
  completed: 'Handle `completed` actions once, after the operation finishes.',
};

function describeHandling(lifecycle: Omit<OperationLifecycle, 'handling'>): string {
  const checkpoints = (Object.keys(CHECKPOINT_HANDLING) as Checkpoint[]).filter(
    (checkpoint) => lifecycle[checkpoint] !== undefined
  );
  const modes = new Set(checkpoints.flatMap((checkpoint) => lifecycle[checkpoint]!.map((a) => a.mode)));
  const parts = [
    ...checkpoints.map((checkpoint) => CHECKPOINT_HANDLING[checkpoint]),
    'Keep the listed order.',
  ];
  if (modes.has('suggest')) {
    parts.push(
      '`suggest`: offer the action by its title and description, then stop and wait for the user\'s answer before doing anything else, including later actions and any file changes. Follow its instructions only if the user accepts.'
    );
  }
  if (modes.has('auto')) {
    parts.push(
      '`auto`: follow its instructions without asking first. Your normal tool permissions still apply.'
    );
  }
  return parts.join(' ');
}

/**
 * The optional `lifecycle` / `lifecycleError` fields for an operation read
 * against a resolved root. Both are omitted when no trigger matches the
 * operation's hooks.
 */
export function loadOperationLifecycle(
  root: ResolvedOpenSpecRoot,
  operation: LifecycleOperation,
  startPath: string = process.cwd()
): OperationLifecycleFields {
  const read = readLifecycleConfigForRoot(root, startPath);
  if (read.status === 'unconfigured') {
    return {};
  }
  if (read.status === 'invalid') {
    return { lifecycleError: toLifecycleError(read, root) };
  }

  const lifecycle: Omit<OperationLifecycle, 'handling'> = {};
  for (const checkpoint of OPERATION_CHECKPOINTS[operation]) {
    const actions = resolveLifecycleActions(read.config, `change.${operation}.${checkpoint}`);
    if (actions.length > 0) {
      lifecycle[checkpoint] = actions;
    }
  }
  if (Object.keys(lifecycle).length === 0) {
    return {};
  }
  return { lifecycle: { ...lifecycle, handling: describeHandling(lifecycle) } };
}

// -----------------------------------------------------------------------------
// Validation helpers
// -----------------------------------------------------------------------------

/** Checks the AST, not toJS(), so a broken alias inside lifecycle: still counts. */
function hasLifecycleKey(filePath: string): boolean {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return false;
  }
  return topLevelLifecyclePairs(parseDocument(content, { uniqueKeys: false })).length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unknownKeys(value: Record<string, unknown>, allowed: string[]): string[] {
  return Object.keys(value).filter((key) => !allowed.includes(key));
}

/** Names every key that appears twice in one mapping inside `node`. */
function collectDuplicateKeys(node: unknown, at: string, issues: string[]): void {
  if (isMap(node)) {
    const seen = new Set<string>();
    for (const pair of node.items) {
      const key = isScalar(pair.key) ? String(pair.key.value) : String(pair.key);
      if (seen.has(key)) {
        issues.push(
          at === 'lifecycle.actions'
            ? `Duplicate action id '${key}' in lifecycle.actions.`
            : `Duplicate key '${key}' in ${at}.`
        );
      }
      seen.add(key);
      collectDuplicateKeys(pair.value, `${at}.${key}`, issues);
    }
  } else if (isSeq(node)) {
    node.items.forEach((item, index) => collectDuplicateKeys(item, `${at}[${index}]`, issues));
  }
}

function validateActions(raw: unknown, issues: string[]): Record<string, LifecycleActionConfig> {
  const actions: Record<string, LifecycleActionConfig> = Object.create(null);
  if (raw === undefined || raw === null) {
    return actions;
  }
  if (!isPlainObject(raw)) {
    issues.push(`lifecycle.actions must be a mapping of action ids to actions.`);
    return actions;
  }

  for (const [id, value] of Object.entries(raw)) {
    const at = `lifecycle.actions.${id}`;
    if (!isKebabId(id)) {
      issues.push(`Invalid action id '${id}': action ids must be kebab-case (for example requirements-review).`);
    }
    if (!isPlainObject(value)) {
      issues.push(`${at} must be a mapping with an 'instructions' field.`);
      continue;
    }
    const extra = unknownKeys(value, ACTION_KEYS);
    if (extra.length > 0) {
      issues.push(`Unknown key(s) in ${at}: ${extra.join(', ')}. Supported keys: ${ACTION_KEYS.join(', ')}.`);
    }
    const { instructions, title, description } = value;
    if (typeof instructions !== 'string' || instructions.trim().length === 0) {
      issues.push(`${at}.instructions is required and must be a non-empty string.`);
    }
    for (const [field, fieldValue] of [['title', title], ['description', description]] as const) {
      if (fieldValue !== undefined && (typeof fieldValue !== 'string' || fieldValue.trim().length === 0)) {
        issues.push(`${at}.${field} must be a non-empty string when set.`);
      }
    }
    if (typeof instructions === 'string') {
      actions[id] = {
        instructions: instructions.trim(),
        ...(typeof title === 'string' && title.trim() ? { title: title.trim() } : {}),
        ...(typeof description === 'string' && description.trim()
          ? { description: description.trim() }
          : {}),
      };
    }
  }
  return actions;
}

function validateTriggers(
  raw: unknown,
  actionIds: Set<string>,
  issues: string[]
): LifecycleTriggerConfig[] {
  const triggers: LifecycleTriggerConfig[] = [];
  if (raw === undefined || raw === null) {
    return triggers;
  }
  if (!Array.isArray(raw)) {
    issues.push(`lifecycle.triggers must be a list of triggers.`);
    return triggers;
  }

  const seenPairs = new Set<string>();
  raw.forEach((value, index) => {
    const at = `lifecycle.triggers[${index}]`;
    if (!isPlainObject(value)) {
      issues.push(`${at} must be a mapping with 'on', 'action', and 'mode'.`);
      return;
    }
    if ('policy' in value) {
      issues.push(
        `${at} sets 'policy', which is not supported yet. Remove it: triggers support 'mode' (suggest or auto) only.`
      );
    }
    const extra = unknownKeys(value, TRIGGER_KEYS).filter((key) => key !== 'policy');
    if (extra.length > 0) {
      issues.push(`Unknown key(s) in ${at}: ${extra.join(', ')}. Supported keys: ${TRIGGER_KEYS.join(', ')}.`);
    }

    const { on, action, mode } = value;
    let valid = true;
    if (typeof on !== 'string') {
      issues.push(`${at}.on is required and must be a hook name.`);
      valid = false;
    } else {
      const problem = lifecycleHookProblem(on);
      if (problem) {
        issues.push(`${at}.on: ${problem}`);
        valid = false;
      }
    }
    if (typeof action !== 'string') {
      issues.push(`${at}.action is required and must be an action id.`);
      valid = false;
    } else if (!actionIds.has(action)) {
      issues.push(`${at}.action '${action}' does not match any action in lifecycle.actions.`);
      valid = false;
    }
    if (typeof mode !== 'string' || !(LIFECYCLE_MODES as readonly string[]).includes(mode)) {
      issues.push(
        mode === undefined
          ? `${at}.mode is required: use suggest or auto.`
          : `${at}.mode '${String(mode)}' is not supported: use suggest or auto.`
      );
      valid = false;
    }
    if (!valid) {
      return;
    }

    const pair = `${on}\u0000${action}`;
    if (seenPairs.has(pair)) {
      issues.push(`${at} duplicates an earlier trigger for action '${action}' on '${on}'.`);
      return;
    }
    seenPairs.add(pair);
    triggers.push({ on: on as string, action: action as string, mode: mode as LifecycleMode });
  });
  return triggers;
}
