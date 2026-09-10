/**
 * Bounded run context for `command_completed`.
 *
 * Everything here reduces to a member of a list in `properties.ts`. Where a
 * value comes from a set the user can extend — a schema they forked, a store
 * they named — only the shape of it survives, never the name.
 *
 * Collection is best-effort by design: a context value that cannot be read
 * cheaply is omitted and the event is still sent. The outcome signal is the
 * point of the event; the context is decoration on it.
 */
import { promises as fs, statSync } from 'fs';
import path from 'path';
import { getGlobalConfig } from '../core/global-config.js';
import {
  bucketCount,
  bucketNodeMajor,
  bucketPlatform,
  bucketToolCount,
  type Invoker,
} from './properties.js';

/**
 * Markers that identify the agent driving this run. Presence only — no
 * variable name and no value is ever sent, and anything unlisted collapses to
 * `unknown`, so a new agent's marker cannot leak as free text.
 */
const INVOKER_MARKERS: ReadonlyArray<readonly [Invoker, readonly string[]]> = [
  ['claude_code', ['CLAUDECODE', 'CLAUDE_CODE']],
  ['cursor', ['CURSOR_TRACE_ID', 'CURSOR_AGENT']],
  ['github_copilot', ['COPILOT_AGENT_ID', 'GITHUB_COPILOT_AGENT']],
  ['codex', ['CODEX_SANDBOX', 'CODEX_THREAD_ID']],
  ['gemini', ['GEMINI_CLI']],
  ['opencode', ['OPENCODE_BIN_PATH', 'OPENCODE']],
  ['zed', ['ZED_TERM']],
  ['devin', ['DEVIN_SESSION_ID', 'WINDSURF_SESSION_ID']],
];

export function detectInvoker(
  env: NodeJS.ProcessEnv = process.env,
  stdoutIsTty: boolean = Boolean(process.stdout.isTTY)
): Invoker {
  for (const [invoker, markers] of INVOKER_MARKERS) {
    if (markers.some((marker) => env[marker] !== undefined && env[marker] !== '')) {
      return invoker;
    }
  }
  return stdoutIsTty ? 'terminal' : 'unknown';
}

/**
 * Count entries in one directory without recursing and without keeping the
 * names. The names are change and spec ids — user-authored text that must not
 * survive past this function.
 */
async function countEntries(dir: string): Promise<number | undefined> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter(
      (entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'archive'
    ).length;
  } catch {
    return undefined;
  }
}

/**
 * Nearest `openspec/` directory walking up from cwd.
 *
 * Deliberately not the CLI's real root resolution: that consults stores, can
 * throw, and can prompt. Telemetry gets a bounded stat walk instead, and null
 * when there is nothing local.
 */
export function findLocalRoot(from: string = process.cwd(), maxDepth = 24): string | null {
  let dir = from;
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const candidate = path.join(dir, 'openspec');
    try {
      if (statSync(candidate).isDirectory()) {
        return candidate;
      }
    } catch {
      // Not here; keep walking.
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

/**
 * Where the active schema was loaded from.
 *
 * A schema the user forked lives in the project; the bundled one ships with
 * the package. The schema's *name* is a directory the user named, so only the
 * source is reported.
 */
export function detectSchemaSource(
  localRoot: string | null
): 'package' | 'project' | 'user' | undefined {
  if (!localRoot) {
    return undefined;
  }
  try {
    const projectSchemas = path.join(localRoot, 'schemas');
    if (statSync(projectSchemas).isDirectory()) {
      return 'project';
    }
  } catch {
    // No project schemas directory: the bundled schema is in use.
  }
  return 'package';
}

/**
 * How this copy of the CLI was installed. `npx` runs out of a cache directory,
 * a clone runs out of a checkout, and everything else is a global install.
 * Answers whether upgrade advice is reachable, and how much of the userbase
 * is trying the tool through `npx` rather than installing it.
 */
export function detectInstallKind(
  installDir: string | null,
  env: NodeJS.ProcessEnv = process.env
): 'global' | 'npx' | 'source' | 'other' {
  if (env.npm_command === 'exec' || env.npm_lifecycle_event === 'npx') return 'npx';
  if (!installDir) return 'other';
  const normalized = installDir.replace(/\\/g, '/');
  if (normalized.includes('/_npx/')) return 'npx';
  if (normalized.endsWith('/src') || normalized.includes('/OpenSpec/')) return 'source';
  return 'global';
}

export interface RunContextInput {
  projectRoot?: string | null;
  installDir?: string | null;
  stdoutIsTty: boolean;
  jsonMode: boolean;
  prompted: boolean;
  firstRun: boolean;
  storeInUse: boolean;
  schemaSource?: 'package' | 'project' | 'user';
  toolCount?: number;
  env?: NodeJS.ProcessEnv;
}

export async function collectRunContext(
  input: RunContextInput
): Promise<Record<string, unknown>> {
  const env = input.env ?? process.env;
  const context: Record<string, unknown> = {
    platform: bucketPlatform(process.platform),
    node_major: bucketNodeMajor(process.versions.node),
    install_kind: detectInstallKind(input.installDir ?? null, env),
    invoker: detectInvoker(env, input.stdoutIsTty),
    stdout_tty: input.stdoutIsTty,
    json_mode: input.jsonMode,
    prompted: input.prompted,
    first_run: input.firstRun,
    store_in_use: input.storeInUse,
    schema_source: input.schemaSource,
  };

  try {
    const config = getGlobalConfig();
    context.profile = config.profile;
    context.delivery = config.delivery;
  } catch {
    // A config that cannot be read costs two properties, not the event.
  }

  if (input.toolCount !== undefined) {
    context.tools_count = bucketToolCount(input.toolCount);
  }

  if (input.projectRoot) {
    const changes = await countEntries(path.join(input.projectRoot, 'changes'));
    if (changes !== undefined) {
      context.changes = bucketCount(changes);
    }
  }

  return context;
}
