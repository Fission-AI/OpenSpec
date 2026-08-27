import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { z } from 'zod';

import { StoreError } from './store/errors.js';
import { formatZodIssues } from './zod-issues.js';
import type { WorksetMember } from './worksets.js';

/**
 * The workset opener table (slice 7.1). Supporting a new tool is
 * configuration, not code: every tool is an instance of one of exactly
 * two launch styles - 'workspace-file' (invoke with the generated
 * .code-workspace) or 'attach-dirs' (pre-args plus one attach flag per
 * member; no positional, ever - agent sessions open clean). Users add
 * tools or adjust parameters under the global config file's `openers`
 * key (the git difftool/mergetool pattern).
 */

export type OpenerStyle = 'workspace-file' | 'attach-dirs';

export interface OpenerDefinition {
  id: string;
  label: string;
  style: OpenerStyle;
  command: string;
  /** Pre-args before any attach flags or the workspace-file path. */
  args: string[];
  /** attach-dirs only; one flag + path pair per member. */
  attachFlag: string;
}

const DEFAULT_ATTACH_FLAG = '--add-dir';

/**
 * Temporary kill-switch (2026-06): worksets open only in IDE-style
 * ('workspace-file') tools while the CLI-agent ('attach-dirs') open flow
 * is reworked. The agents (Claude Code, codex) launch in a single primary
 * cwd rather than a true combined multi-root view, which makes "where does
 * my change land?" ambiguous. Default off; set
 * OPENSPEC_ENABLE_CLI_AGENT_OPENERS=1 to restore them (internal rollback seam).
 */
export function isCliAgentOpenersEnabled(): boolean {
  return process.env.OPENSPEC_ENABLE_CLI_AGENT_OPENERS === '1';
}

/** Whether a tool can be opened right now (CLI-agent styles are gated). */
export function isOpenerEnabled(opener: OpenerDefinition): boolean {
  return isCliAgentOpenersEnabled() || opener.style !== 'attach-dirs';
}

export const BUILTIN_OPENERS: readonly OpenerDefinition[] = [
  {
    id: 'code',
    label: 'VS Code',
    style: 'workspace-file',
    command: 'code',
    args: [],
    attachFlag: DEFAULT_ATTACH_FLAG,
  },
  {
    id: 'cursor',
    label: 'Cursor',
    style: 'workspace-file',
    command: 'cursor',
    args: [],
    attachFlag: DEFAULT_ATTACH_FLAG,
  },
  {
    id: 'claude',
    label: 'Claude Code',
    style: 'attach-dirs',
    command: 'claude',
    args: [],
    attachFlag: DEFAULT_ATTACH_FLAG,
  },
  {
    id: 'codex',
    label: 'codex',
    style: 'attach-dirs',
    command: 'codex',
    args: ['--sandbox', 'workspace-write'],
    attachFlag: DEFAULT_ATTACH_FLAG,
  },
];

const OPENER_STYLES = ['workspace-file', 'attach-dirs'] as const;

const OpenerConfigRowSchema = z
  .object({
    style: z.enum(OPENER_STYLES).optional(),
    label: z.string().min(1).optional(),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    attach_flag: z.string().min(1).optional(),
  })
  .strict();

const OpenersConfigSchema = z.record(z.string(), OpenerConfigRowSchema);

function invalidOpenerConfigError(message: string, configPath: string): StoreError {
  return new StoreError(
    `Invalid openers config: ${message}`,
    'invalid_opener_config',
    {
      target: 'openers.config',
      fix: `Each entry under "openers" in ${configPath} may set style ('workspace-file' or 'attach-dirs'), label, command, args, and attach_flag; new tools must set style.`,
    }
  );
}

/**
 * Merges the global config file's raw `openers` value over the
 * built-in table. A row keyed by a built-in id overrides only the
 * fields it sets; a new id adds a tool (style required, command and
 * label default to the id). Malformed rows fail typed - never
 * silently ignored.
 */
function cloneOpener(opener: OpenerDefinition): OpenerDefinition {
  return { ...opener, args: [...opener.args] };
}

export function mergeOpenerTable(
  rawOpeners: unknown,
  configPath: string
): OpenerDefinition[] {
  if (rawOpeners === undefined || rawOpeners === null) {
    return BUILTIN_OPENERS.map(cloneOpener);
  }

  const result = OpenersConfigSchema.safeParse(rawOpeners);
  if (!result.success) {
    throw invalidOpenerConfigError(
      formatZodIssues(result.error, 'openers'),
      configPath
    );
  }

  const table = BUILTIN_OPENERS.map(cloneOpener);
  for (const [id, row] of Object.entries(result.data)) {
    const builtinIndex = table.findIndex((opener) => opener.id === id);

    if (builtinIndex >= 0) {
      const builtin = table[builtinIndex];
      table[builtinIndex] = {
        ...builtin,
        ...(row.style !== undefined ? { style: row.style } : {}),
        ...(row.label !== undefined ? { label: row.label } : {}),
        ...(row.command !== undefined ? { command: row.command } : {}),
        ...(row.args !== undefined ? { args: row.args } : {}),
        ...(row.attach_flag !== undefined
          ? { attachFlag: row.attach_flag }
          : {}),
      };
      continue;
    }

    if (row.style === undefined) {
      throw invalidOpenerConfigError(
        `'${id}' adds a new tool and must set style ('workspace-file' or 'attach-dirs')`,
        configPath
      );
    }

    table.push({
      id,
      label: row.label ?? id,
      style: row.style,
      command: row.command ?? id,
      args: row.args ?? [],
      attachFlag: row.attach_flag ?? DEFAULT_ATTACH_FLAG,
    });
  }

  return table;
}

export interface OpenerScanOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  /** Stat seam for tests (win32 candidate paths on posix hosts). */
  isExecutableFile?: (candidatePath: string) => boolean;
}

function getPathValue(env: NodeJS.ProcessEnv): string {
  return env.PATH ?? env.Path ?? env.path ?? '';
}

function getPathExtensions(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv
): string[] {
  if (platform !== 'win32') {
    return [''];
  }

  return (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .map((extension) => extension.trim())
    .filter((extension) => extension.length > 0);
}

function defaultIsExecutableFile(
  candidatePath: string,
  platform: NodeJS.Platform
): boolean {
  try {
    if (!nodeFs.statSync(candidatePath).isFile()) {
      return false;
    }
  } catch {
    return false;
  }

  if (platform === 'win32') {
    return true;
  }

  try {
    nodeFs.accessSync(candidatePath, nodeFs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * PATH availability scan (ported from the deleted workspace openers
 * at f858c19^, sharpened for injectability: the path module is keyed
 * by the injected platform, and a command already carrying a known
 * executable extension matches as-is).
 */
export function isOpenerCommandAvailable(
  command: string,
  options: OpenerScanOptions = {}
): boolean {
  const env = options.env ?? process.env;
  const platform = options.platform ?? os.platform();
  const pathModule = platform === 'win32' ? path.win32 : path.posix;
  const isExecutable =
    options.isExecutableFile ??
    ((candidate: string) => defaultIsExecutableFile(candidate, platform));

  const extensions = getPathExtensions(platform, env);
  const lowerCommand = command.toLowerCase();
  const carriesKnownExtension = extensions.some(
    (extension) =>
      extension.length > 0 && lowerCommand.endsWith(extension.toLowerCase())
  );
  // One suffix policy: a command already carrying a known executable
  // extension matches as-is and never gets a second extension appended
  // - agreeing with spawn-time resolution.
  const suffixes = carriesKnownExtension ? [''] : extensions;

  if (/[\\/]/u.test(command)) {
    // Direct paths additionally match bare even on win32 (the spawn
    // call receives the literal path).
    const directSuffixes = Array.from(new Set(['', ...suffixes]));
    return directSuffixes.some((suffix) => isExecutable(command + suffix));
  }

  for (const directory of getPathValue(env).split(pathModule.delimiter)) {
    if (directory.length === 0) {
      continue;
    }

    if (
      suffixes.some((suffix) =>
        isExecutable(pathModule.join(directory, command + suffix))
      )
    ) {
      return true;
    }
  }

  return false;
}

export interface OpenerChoice {
  opener: OpenerDefinition;
  available: boolean;
  /** `(<command> not found on PATH)` when unavailable. */
  note: string | null;
}

/** Table order preserved, available tools first (stable sort). */
export function listOpenerChoices(
  table: OpenerDefinition[],
  options: OpenerScanOptions = {}
): OpenerChoice[] {
  return table
    .filter((opener) => isOpenerEnabled(opener))
    .map((opener) => {
      const available = isOpenerCommandAvailable(opener.command, options);
      return {
        opener,
        available,
        note: available ? null : `(${opener.command} not found on PATH)`,
      };
    })
    .sort((a, b) => {
      if (a.available === b.available) {
        return 0;
      }
      return a.available ? -1 : 1;
    });
}

export function findOpener(
  table: OpenerDefinition[],
  id: string
): OpenerDefinition | null {
  return table.find((opener) => opener.id === id) ?? null;
}

export interface LaunchCommand {
  executable: string;
  args: string[];
  /** The surviving primary member's path. */
  cwd: string;
  label: string;
  style: OpenerStyle;
}

/**
 * Pure argv builder. workspace-file: pre-args + the generated file's
 * absolute path (which also defuses the cursor shim's `agent`
 * first-arg hijack). attach-dirs: pre-args + one attach flag + path
 * pair per surviving member, the primary included (the locked "one
 * attach flag per member"); never a trailing positional - both agent
 * CLIs would read one as a starter prompt, which 7.1 locks out.
 */
export function buildLaunchCommand(
  opener: OpenerDefinition,
  input: { members: WorksetMember[]; codeWorkspacePath: string }
): LaunchCommand {
  if (input.members.length === 0) {
    throw new Error('buildLaunchCommand requires at least one member.');
  }

  // The no-hijack and no-positional guarantees lean on absolute paths
  // (the child resolves relative argv against its own cwd) - keep the
  // invariant local instead of three modules away.
  if (!path.isAbsolute(input.codeWorkspacePath)) {
    throw new Error(
      `buildLaunchCommand requires an absolute workspace-file path (got '${input.codeWorkspacePath}').`
    );
  }

  const cwd = input.members[0].path;

  if (opener.style === 'workspace-file') {
    return {
      executable: opener.command,
      args: [...opener.args, input.codeWorkspacePath],
      cwd,
      label: opener.label,
      style: opener.style,
    };
  }

  return {
    executable: opener.command,
    args: [
      ...opener.args,
      ...input.members.flatMap((member) => [opener.attachFlag, member.path]),
    ],
    cwd,
    label: opener.label,
    style: opener.style,
  };
}
