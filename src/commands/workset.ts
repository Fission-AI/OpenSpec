/**
 * The `workset` command group (slice 7.1): compose, keep, and open
 * personal working views. A workset is purely local and personal -
 * never committed, never shared, never derived from declarations, and
 * never a membership truth. Opening hands the view to the user's tool:
 * editors get the generated .code-workspace; CLI agents take over this
 * terminal with every member attached and no starter prompt.
 */
import * as nodeFs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import type { spawn as nodeSpawn } from 'node:child_process';
import { Command, Option } from 'commander';

import {
  buildWorksetCodeWorkspaceJson,
  getWorkset,
  getWorksetCodeWorkspacePath,
  listWorksets,
  memberLabelProblem,
  memberListProblem,
  readWorksetsState,
  updateWorksetsState,
  validateWorksetName,
  withWorkset,
  withWorksetsLock,
  withoutWorkset,
  worksetNotFoundError,
  type Workset,
  type WorksetMember,
} from '../core/worksets.js';
import {
  buildLaunchCommand,
  findOpener,
  isOpenerCommandAvailable,
  listOpenerChoices,
  mergeOpenerTable,
  type LaunchCommand,
  type OpenerDefinition,
} from '../core/openers.js';
import { writeFileAtomically } from '../core/file-state.js';
import {
  getGlobalConfig,
  getGlobalConfigPath,
} from '../core/global-config.js';
import { expandUserPath } from '../core/store/operations.js';
import { StoreError, type StoreDiagnostic } from '../core/store/errors.js';
import { isInteractive } from '../utils/interactive.js';
import {
  asStatus,
  isPromptCancellationError,
  printJson,
} from './shared-output.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';

const require = createRequire(import.meta.url);
// cross-spawn ships no types; it is API-compatible with node's spawn.
const crossSpawn = require('cross-spawn') as typeof nodeSpawn;

const fs = nodeFs.promises;

interface WorksetCreateOptions {
  member?: string[];
  tool?: string;
  json?: boolean;
}

interface WorksetOpenOptions {
  tool?: string;
  json?: boolean;
}

interface WorksetRemoveOptions {
  yes?: boolean;
  json?: boolean;
}

interface WorksetOutput {
  name: string;
  tool?: string;
  members: WorksetMember[];
}

function toWorksetOutput(workset: Workset): WorksetOutput {
  return {
    name: workset.name,
    ...(workset.tool !== undefined ? { tool: workset.tool } : {}),
    members: workset.members,
  };
}

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function memberInvalidError(problem: string): StoreError {
  return new StoreError(`Invalid workset member: ${problem}.`, 'workset_member_invalid', {
    target: 'workset.member',
    fix: 'Pass --member <path> with an existing folder, or --member <name>=<path> to label it.',
  });
}

async function pathIsDirectory(candidate: string): Promise<boolean> {
  try {
    return (await fs.stat(candidate)).isDirectory();
  } catch {
    return false;
  }
}

/** `--member <path>` or `--member <name>=<path>` (first `=` splits). */
async function resolveMemberFlag(raw: string): Promise<WorksetMember> {
  const separator = raw.indexOf('=');
  const label = separator > 0 ? raw.slice(0, separator) : undefined;
  const rawPath = separator > 0 ? raw.slice(separator + 1) : raw;

  if (rawPath.length === 0) {
    throw memberInvalidError(`'${raw}' has no path`);
  }

  const resolvedPath = path.resolve(expandUserPath(rawPath));
  if (!(await pathIsDirectory(resolvedPath))) {
    throw memberInvalidError(`'${rawPath}' is not an existing folder`);
  }

  const name = label ?? path.basename(resolvedPath);
  const labelProblem = memberLabelProblem(name);
  if (labelProblem !== null) {
    throw memberInvalidError(labelProblem);
  }

  return { name, path: resolvedPath };
}

interface LaunchResult {
  code: number | null;
  signal: NodeJS.Signals | null;
}

export interface LaunchOptions {
  spawnFn?: typeof nodeSpawn;
}

/**
 * Spawns the opener with this terminal's stdio. Resolves with the
 * child's exit facts (never rejects for a nonzero exit - for a
 * terminal handoff, the session is the command); rejects with
 * workset_launch_failed only when the spawn itself fails.
 */
export function launchOpenerCommand(
  command: LaunchCommand,
  options: LaunchOptions = {}
): Promise<LaunchResult> {
  const spawnFn = options.spawnFn ?? crossSpawn;

  return new Promise((resolve, reject) => {
    const child = spawnFn(command.executable, command.args, {
      cwd: command.cwd,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', (error) => {
      reject(
        new StoreError(
          `Could not launch ${command.label}: ${asErrorMessage(error)}`,
          'workset_launch_failed',
          {
            target: 'workset.tool',
            fix: `Check that '${command.executable}' runs from this terminal, or pass --tool with another installed tool.`,
          }
        )
      );
    });

    child.on('close', (code, signal) => {
      resolve({ code, signal });
    });
  });
}

/** 130 for SIGINT, 143 for SIGTERM - the shell's 128+n convention. */
export function exitCodeForLaunch(result: LaunchResult): number {
  if (result.signal !== null) {
    const signalNumber =
      os.constants.signals[result.signal as keyof typeof os.constants.signals];
    return 128 + (signalNumber ?? 1);
  }

  return result.code ?? 0;
}

interface OpenFallback {
  codeWorkspacePath: string;
  members: WorksetMember[];
}

const FALLBACK_CODES = new Set([
  'workset_tool_unknown',
  'workset_tool_unavailable',
  'workset_launch_failed',
]);

function toolUnknownError(
  toolId: string,
  table: OpenerDefinition[]
): StoreError {
  const knownIds = table.map((opener) => opener.id).join(', ');
  return new StoreError(
    `Unknown tool '${toolId}'.`,
    'workset_tool_unknown',
    {
      target: 'workset.tool',
      fix: `Known tools: ${knownIds}. Add new tools under "openers" in ${getGlobalConfigPath()}.`,
    }
  );
}

function toolUnavailableError(
  opener: OpenerDefinition,
  table: OpenerDefinition[],
  worksetName: string,
  scan?: { env?: NodeJS.ProcessEnv; platform?: NodeJS.Platform }
): StoreError {
  const installedIds = table
    .filter(
      (candidate) =>
        candidate.id !== opener.id &&
        isOpenerCommandAvailable(candidate.command, scan)
    )
    .map((candidate) => candidate.id);

  return new StoreError(
    `${opener.label} ('${opener.command}') is not on PATH.`,
    'workset_tool_unavailable',
    {
      target: 'workset.tool',
      fix:
        installedIds.length > 0
          ? `Install '${opener.command}' or run: openspec workset open ${worksetName} --tool ${installedIds[0]}`
          : `Install '${opener.command}', then rerun: openspec workset open ${worksetName}`,
    }
  );
}

class WorksetCommand {
  async create(
    name: string | undefined,
    options: WorksetCreateOptions = {}
  ): Promise<void> {
    try {
      const interactive = !options.json && isInteractive();
      const table = mergeOpenerTable(
        getGlobalConfig().openers,
        getGlobalConfigPath()
      );

      let workset: Workset;
      if (interactive) {
        workset = await this.composeInteractively(name, options, table);
      } else {
        workset = await this.composeFromFlags(name, options, table);
      }

      await updateWorksetsState((state) => withWorkset(state, workset));

      if (options.json) {
        printJson({ workset: toWorksetOutput(workset), status: [] });
        return;
      }

      console.log('');
      console.log(
        `Saved workset '${workset.name}' (${workset.members.length} member${workset.members.length === 1 ? '' : 's'}) to your machine.`
      );

      if (interactive && workset.tool !== undefined) {
        const { confirm } = await import('@inquirer/prompts');
        const openNow = await confirm({
          message: `Open it now in ${findOpener(table, workset.tool)?.label ?? workset.tool}?`,
          default: true,
        });

        if (openNow) {
          console.log('');
          await this.open(workset.name, {});
          return;
        }
      }

      console.log(`Open it any time with: openspec workset open ${workset.name}`);
    } catch (error) {
      this.handleFailure(options.json, { workset: null, status: [] }, error);
    }
  }

  private async composeFromFlags(
    name: string | undefined,
    options: WorksetCreateOptions,
    table: OpenerDefinition[]
  ): Promise<Workset> {
    if (!name) {
      throw new StoreError('Pass a workset name.', 'workset_name_required', {
        target: 'workset.name',
        fix: 'openspec workset create <name> --member <path>',
      });
    }

    validateWorksetName(name);

    const memberFlags = options.member ?? [];
    if (memberFlags.length === 0) {
      throw new StoreError(
        'Pass at least one member folder.',
        'workset_members_required',
        {
          target: 'workset.member',
          fix: `openspec workset create ${name} --member <path> --member <name>=<path>`,
        }
      );
    }

    const members: WorksetMember[] = [];
    for (const flag of memberFlags) {
      members.push(await resolveMemberFlag(flag));
    }

    const problem = memberListProblem(members);
    if (problem !== null) {
      throw memberInvalidError(problem);
    }

    if (options.tool !== undefined && findOpener(table, options.tool) === null) {
      throw toolUnknownError(options.tool, table);
    }

    return {
      name,
      ...(options.tool !== undefined ? { tool: options.tool } : {}),
      members,
    };
  }

  private async composeInteractively(
    givenName: string | undefined,
    options: WorksetCreateOptions,
    table: OpenerDefinition[]
  ): Promise<Workset> {
    const { input, select } = await import('@inquirer/prompts');

    console.log('[1/3] Name the workset');
    let name: string;
    if (givenName !== undefined) {
      name = validateWorksetName(givenName);
      console.log(`  Workset name: ${name}`);
    } else {
      name = await input({
        message: 'Workset name:',
        required: true,
        validate(value: string) {
          try {
            validateWorksetName(value);
            return true;
          } catch (error) {
            return asErrorMessage(error);
          }
        },
      });
    }

    console.log('');
    console.log(
      '[2/3] Add member folders (the first one is the primary - sessions start there)'
    );
    const members: WorksetMember[] = [];
    if (options.member !== undefined) {
      for (const flag of options.member) {
        members.push(await resolveMemberFlag(flag));
      }
    }

    while (true) {
      if (members.length > 0) {
        const next = await select({
          message: 'Add another folder or finish:',
          choices: [
            { name: 'Finish', value: 'finish' },
            { name: 'Add another folder', value: 'add' },
          ],
          default: 'finish',
        });
        if (next === 'finish') {
          break;
        }
      }

      const rawPath = await input({
        message: 'Folder path:',
        ...(members.length === 0 ? { default: '.', prefill: 'editable' } : {}),
        required: true,
        async validate(value: string) {
          const resolved = path.resolve(expandUserPath(value));
          if (!(await pathIsDirectory(resolved))) {
            return `'${value}' is not an existing folder`;
          }
          return true;
        },
      });

      const resolvedPath = path.resolve(expandUserPath(rawPath));
      let label = path.basename(resolvedPath);
      const collision = members.some((member) => member.name === label);
      if (memberLabelProblem(label) !== null || collision) {
        label = await input({
          message: `Name this member (the folder label):`,
          required: true,
          validate(value: string) {
            const problem = memberLabelProblem(value);
            if (problem !== null) {
              return problem;
            }
            if (members.some((member) => member.name === value)) {
              return `duplicate member name '${value}'`;
            }
            return true;
          },
        });
      }

      members.push({ name: label, path: resolvedPath });
      console.log(`  Added '${label}' (${resolvedPath})`);
    }

    const problem = memberListProblem(members);
    if (problem !== null) {
      throw memberInvalidError(problem);
    }

    console.log('');
    console.log('[3/3] Choose your tool');
    let tool = options.tool;
    if (tool !== undefined && findOpener(table, tool) === null) {
      throw toolUnknownError(tool, table);
    }
    if (tool === undefined) {
      const choices = listOpenerChoices(table);
      const available = choices.filter((choice) => choice.available);
      if (available.length === 0) {
        console.log(
          '  None of the known tools is on PATH; not saving a preference.'
        );
        console.log(
          `  (Known tools: ${choices.map((choice) => `${choice.opener.id} ${choice.note ?? ''}`.trim()).join(', ')})`
        );
      } else {
        tool = await select({
          message: 'Open this workset with:',
          choices: available.map((choice) => ({
            name: choice.opener.label,
            value: choice.opener.id,
          })),
        });
      }
    }

    return {
      name,
      ...(tool !== undefined ? { tool } : {}),
      members,
    };
  }

  async list(options: { json?: boolean } = {}): Promise<void> {
    try {
      const state = await readWorksetsState();
      const worksets = listWorksets(state);

      if (options.json) {
        printJson({ worksets: worksets.map(toWorksetOutput), status: [] });
        return;
      }

      if (worksets.length === 0) {
        console.log(
          'No worksets saved. Create one with: openspec workset create'
        );
        return;
      }

      const table = mergeOpenerTable(
        getGlobalConfig().openers,
        getGlobalConfigPath()
      );
      for (const workset of worksets) {
        const toolLabel =
          workset.tool !== undefined
            ? `  (opens in ${findOpener(table, workset.tool)?.label ?? workset.tool})`
            : '';
        console.log(`${workset.name}${toolLabel}`);
        const width = Math.max(
          ...workset.members.map((member) => member.name.length)
        );
        for (const member of workset.members) {
          console.log(`  ${member.name.padEnd(width)}  ${member.path}`);
        }
      }
    } catch (error) {
      this.handleFailure(options.json, { worksets: [], status: [] }, error);
    }
  }

  async open(name: string, options: WorksetOpenOptions = {}): Promise<void> {
    let fallback: OpenFallback | undefined;

    try {
      if (options.json) {
        throw new StoreError(
          'workset open hands this terminal to the chosen tool and has no JSON mode.',
          'workset_open_json_unsupported',
          {
            target: 'workset.tool',
            fix: 'Inspect worksets with: openspec workset list --json',
          }
        );
      }

      // Regenerate the derived file FIRST (under the lock), so every
      // cannot-drive failure below can name an existing, current file.
      const prepared = await withWorksetsLock(async (state) => {
        const workset = getWorkset(state, name);
        if (workset === null) {
          throw worksetNotFoundError(name, state);
        }

        const surviving: WorksetMember[] = [];
        const skipped: WorksetMember[] = [];
        for (const member of workset.members) {
          if (await pathIsDirectory(member.path)) {
            surviving.push(member);
          } else {
            skipped.push(member);
          }
        }

        if (surviving.length === 0) {
          throw new StoreError(
            `No member folder of workset '${name}' exists on this machine.`,
            'workset_no_members_available',
            {
              target: 'workset.member',
              fix: `Recompose it: openspec workset remove ${name} --yes && openspec workset create ${name} --member <path>`,
            }
          );
        }

        const codeWorkspacePath = getWorksetCodeWorkspacePath(name);
        await writeFileAtomically(
          codeWorkspacePath,
          buildWorksetCodeWorkspaceJson(surviving)
        );

        return { workset, surviving, skipped, codeWorkspacePath };
      });

      fallback = {
        codeWorkspacePath: prepared.codeWorkspacePath,
        members: prepared.workset.members,
      };

      for (const member of prepared.skipped) {
        console.error(
          `Skipped '${member.name}' (${member.path} is not available).`
        );
      }

      const table = mergeOpenerTable(
        getGlobalConfig().openers,
        getGlobalConfigPath()
      );

      let toolId = options.tool ?? prepared.workset.tool;
      if (toolId === undefined) {
        if (!isInteractive()) {
          throw new StoreError(
            `Workset '${name}' has no saved tool.`,
            'workset_tool_required',
            {
              target: 'workset.tool',
              fix: `openspec workset open ${name} --tool <id>`,
            }
          );
        }

        const available = listOpenerChoices(table).filter(
          (choice) => choice.available
        );
        if (available.length === 0) {
          throw toolUnavailableError(table[0], table, name);
        }

        const { select } = await import('@inquirer/prompts');
        toolId = await select({
          message: 'Open with:',
          choices: available.map((choice) => ({
            name: choice.opener.label,
            value: choice.opener.id,
          })),
        });
      }

      const opener = findOpener(table, toolId);
      if (opener === null) {
        throw toolUnknownError(toolId, table);
      }

      if (!isOpenerCommandAvailable(opener.command)) {
        throw toolUnavailableError(opener, table, name);
      }

      const launch = buildLaunchCommand(opener, {
        members: prepared.surviving,
        codeWorkspacePath: prepared.codeWorkspacePath,
      });

      if (opener.style === 'workspace-file') {
        console.log(
          `Opening '${name}' in ${opener.label} (a window opens; this command returns).`
        );
      } else {
        console.log(
          `Handing this terminal to ${opener.label} for '${name}' (the session ends when you exit).`
        );
      }

      const result = await launchOpenerCommand(launch);
      const exitCode = exitCodeForLaunch(result);
      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    } catch (error) {
      this.handleFailure(options.json, { status: [] }, error);

      // Never strand the user: the failure path carries the manual
      // route for every cannot-drive-or-launch error.
      if (
        !options.json &&
        fallback !== undefined &&
        error instanceof StoreError &&
        FALLBACK_CODES.has(error.diagnostic.code)
      ) {
        console.error('Open manually:');
        console.error(`  Workspace file: ${fallback.codeWorkspacePath}`);
        console.error('  Members:');
        const width = Math.max(
          ...fallback.members.map((member) => member.name.length)
        );
        for (const member of fallback.members) {
          console.error(`    ${member.name.padEnd(width)}  ${member.path}`);
        }
      }
    }
  }

  async remove(name: string, options: WorksetRemoveOptions = {}): Promise<void> {
    try {
      const state = await readWorksetsState();
      const workset = getWorkset(state, name);
      if (workset === null) {
        throw worksetNotFoundError(name, state);
      }

      if (!options.yes) {
        if (options.json || !isInteractive()) {
          throw new StoreError(
            'Pass --yes to remove a workset non-interactively.',
            'workset_remove_confirmation_required',
            {
              target: 'workset.name',
              fix: `openspec workset remove ${name} --yes`,
            }
          );
        }

        const { confirm } = await import('@inquirer/prompts');
        const confirmed = await confirm({
          message: `Remove workset '${name}'? (member folders are never touched)`,
          default: false,
        });

        if (!confirmed) {
          throw new StoreError(
            'Workset remove cancelled.',
            'workset_remove_cancelled',
            {
              target: 'workset.name',
              fix: 'Rerun remove when you are ready.',
            }
          );
        }
      }

      await updateWorksetsState(async (current) => {
        const updated = withoutWorkset(current, name);
        // Derived-file cleanup rides the same lock; a never-opened
        // workset has no file - ENOENT is fine.
        await fs.rm(getWorksetCodeWorkspacePath(name), { force: true });
        return updated;
      });

      if (options.json) {
        printJson({ removed: { name }, status: [] });
        return;
      }

      console.log(`Removed workset '${name}'. Member folders were not touched.`);
    } catch (error) {
      this.handleFailure(options.json, { removed: null, status: [] }, error);
    }
  }

  private handleFailure(
    json: boolean | undefined,
    payload: Record<string, unknown>,
    error: unknown
  ): void {
    if (!json && isPromptCancellationError(error)) {
      console.error('Cancelled.');
      process.exitCode = 130;
      return;
    }

    const status = asStatus(error, 'workset_error');
    if (json) {
      const prior = Array.isArray(payload.status) ? payload.status : [];
      printJson({ ...payload, status: [...prior, status] });
      process.exitCode = 1;
      return;
    }

    console.error(`Error: ${status.message}`);
    if (status.fix) {
      console.error(`Fix: ${status.fix}`);
    }
    process.exitCode = 1;
  }
}

function collectMember(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function registerWorksetCommand(program: Command): void {
  const worksetCommand = new WorksetCommand();
  const groupDescription =
    COMMAND_REGISTRY.find((entry) => entry.name === 'workset')?.description ??
    'Compose, keep, and open personal working views (purely local)';
  const workset = program.command('workset').description(groupDescription);

  workset
    .command('create [name]')
    .description('Compose and save a named working view of folders you choose')
    .option(
      '--member <member>',
      'Member folder as <path> or <name>=<path>; repeatable, first is the primary',
      collectMember,
      [] as string[]
    )
    .option('--tool <id>', 'Preferred tool to open this workset with')
    .option('--json', 'Output as JSON')
    .action(async (name: string | undefined, options: WorksetCreateOptions) => {
      await worksetCommand.create(name, options);
    });

  workset
    .command('list')
    .alias('ls')
    .description('Show saved worksets with their members')
    .option('--json', 'Output as JSON')
    .action(async (options: { json?: boolean }) => {
      await worksetCommand.list(options);
    });

  workset
    .command('open <name>')
    .description('Open a saved workset in your tool (editor window or agent session)')
    .option('--tool <id>', 'Open with this tool just this once')
    .addOption(
      // Parsed so Commander never owns the error; rejected in the
      // action with one JSON document. Hidden because help should not
      // advertise a mode that only rejects.
      new Option('--json', 'Not supported for open').hideHelp()
    )
    .action(async (name: string, options: WorksetOpenOptions) => {
      await worksetCommand.open(name, options);
    });

  workset
    .command('remove <name>')
    .description('Delete a saved workset (member folders are never touched)')
    .option('--yes', 'Confirm removal non-interactively')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options: WorksetRemoveOptions) => {
      await worksetCommand.remove(name, options);
    });

  const subcommandsLine = workset.commands
    .map((subcommand) => {
      const aliases = subcommand.aliases();
      return aliases.length > 0
        ? `${subcommand.name()} (${aliases.join(', ')})`
        : subcommand.name();
    })
    .join(', ');
  workset.on('command:*', (operands: string[], unknown: string[]) => {
    const attempted = operands.filter((operand) => !operand.startsWith('-'));
    const message =
      attempted.length > 0
        ? `Unknown command '${attempted[0]}' for 'openspec workset'. Workset subcommands: ${subcommandsLine}.`
        : `Missing subcommand for 'openspec workset'. Workset subcommands: ${subcommandsLine}.`;
    if (operands.includes('--json') || unknown.includes('--json')) {
      printJson({
        status: [
          {
            severity: 'error',
            code: 'unknown_workset_subcommand',
            message,
            fix: 'Run one of the workset subcommands.',
          } satisfies StoreDiagnostic,
        ],
      });
      process.exitCode = 1;
      return;
    }
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  });
}
