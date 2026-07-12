import * as nodeFs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import { getGlobalDataDir } from './global-config.js';
import { FileSystemUtils } from '../utils/file-system.js';
import {
  acquireFileLock,
  makeLockErrorFactory,
  pathIsFile,
  releaseFileLock,
  writeFileAtomically,
} from './file-state.js';
import { StoreError } from './store/errors.js';
import {
  folderStyleNameProblem,
  isKebabId,
  KEBAB_ID_DESCRIPTION,
  KEBAB_ID_FIX,
} from './id.js';
import { formatZodIssues } from './zod-issues.js';

const fs = nodeFs.promises;

/**
 * Personal worksets (slice 7.1): purely local, manually composed,
 * named working views. The whole feature's state lives under
 * <globalDataDir>/worksets/ - the saved-views file plus the generated
 * .code-workspace files - so deleting that one directory removes
 * every trace. Nothing here is committed, shared, or derived from
 * declarations, and nothing is ever written into a member folder.
 */

export const WORKSETS_DIR_NAME = 'worksets';
export const WORKSETS_FILE_NAME = 'worksets.yaml';
const CODE_WORKSPACE_EXTENSION = '.code-workspace';

export interface WorksetPathOptions {
  globalDataDir?: string;
}

export interface WorksetMember {
  /** Display label; the .code-workspace folder name. */
  name: string;
  /** Absolute path to the member directory. */
  path: string;
}

export interface Workset {
  name: string;
  /** Preferred opener id; validated only at open time. */
  tool?: string;
  /** Ordered; the first member is the primary (session cwd). */
  members: WorksetMember[];
}

export interface WorksetsState {
  version: 1;
  worksets: Record<string, { tool?: string; members: WorksetMember[] }>;
}

export function getWorksetsDir(options: WorksetPathOptions = {}): string {
  return FileSystemUtils.joinPath(
    options.globalDataDir ?? getGlobalDataDir(),
    WORKSETS_DIR_NAME
  );
}

export function getWorksetsFilePath(options: WorksetPathOptions = {}): string {
  return FileSystemUtils.joinPath(getWorksetsDir(options), WORKSETS_FILE_NAME);
}

export function getWorksetCodeWorkspacePath(
  name: string,
  options: WorksetPathOptions = {}
): string {
  return FileSystemUtils.joinPath(
    getWorksetsDir(options),
    `${name}${CODE_WORKSPACE_EXTENSION}`
  );
}

export function validateWorksetName(name: string): string {
  if (!isKebabId(name)) {
    throw new StoreError(
      `Workset name '${name}' ${KEBAB_ID_DESCRIPTION}.`,
      'invalid_workset_name',
      {
        target: 'workset.name',
        fix: KEBAB_ID_FIX,
      }
    );
  }

  return name;
}

/**
 * Returns a problem description for a member list, or null when valid.
 * Shared by the file parser (wrapping as invalid_workset_file) and the
 * compose flow (wrapping as workset_member_invalid).
 */
export function memberListProblem(members: WorksetMember[]): string | null {
  if (members.length === 0) {
    return 'members must not be empty';
  }

  const seen = new Set<string>();
  for (const member of members) {
    const labelProblem = memberLabelProblem(member.name);
    if (labelProblem !== null) {
      return labelProblem;
    }

    if (seen.has(member.name)) {
      return `duplicate member name '${member.name}' (use the name=path form to label members distinctly)`;
    }
    seen.add(member.name);

    if (!path.isAbsolute(member.path)) {
      return `member path '${member.path}' must be absolute`;
    }
  }

  return null;
}

export function memberLabelProblem(label: string): string | null {
  return folderStyleNameProblem(label, 'member name');
}

const WorksetMemberSchema = z
  .object({
    name: z.string(),
    path: z.string(),
  })
  .strict();

const WorksetEntrySchema = z
  .object({
    tool: z.string().min(1).optional(),
    members: z.array(WorksetMemberSchema),
  })
  .strict();

const WorksetsStateSchema = z
  .object({
    version: z.literal(1),
    worksets: z.record(z.string(), WorksetEntrySchema),
  })
  .strict();

function invalidWorksetsFileError(
  message: string,
  options: WorksetPathOptions
): StoreError {
  return new StoreError(
    `Invalid worksets file: ${message}`,
    'invalid_workset_file',
    {
      target: 'workset.file',
      fix: `Repair or remove ${getWorksetsFilePath(options)}.`,
    }
  );
}

export function parseWorksetsState(
  content: string,
  options: WorksetPathOptions = {}
): WorksetsState {
  let raw: unknown;
  try {
    raw = parseYaml(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw invalidWorksetsFileError(message, options);
  }

  const result = WorksetsStateSchema.safeParse(raw);
  if (!result.success) {
    throw invalidWorksetsFileError(formatZodIssues(result.error), options);
  }

  for (const [name, entry] of Object.entries(result.data.worksets)) {
    if (!isKebabId(name)) {
      throw invalidWorksetsFileError(
        `workset name '${name}' ${KEBAB_ID_DESCRIPTION}`,
        options
      );
    }

    const problem = memberListProblem(entry.members);
    if (problem !== null) {
      throw invalidWorksetsFileError(`workset '${name}': ${problem}`, options);
    }
  }

  return result.data;
}

export function serializeWorksetsState(
  state: WorksetsState,
  options: WorksetPathOptions = {}
): string {
  const result = WorksetsStateSchema.safeParse(state);
  if (!result.success) {
    throw invalidWorksetsFileError(formatZodIssues(result.error), options);
  }

  // The strict schema already guarantees the entry shape; the sort is
  // the only real work here.
  return stringifyYaml({
    version: 1,
    worksets: Object.fromEntries(
      Object.entries(result.data.worksets).sort(([a], [b]) =>
        a.localeCompare(b)
      )
    ),
  });
}

/** Absent file reads as the empty state; a corrupt file throws. */
export async function readWorksetsState(
  options: WorksetPathOptions = {}
): Promise<WorksetsState> {
  const filePath = getWorksetsFilePath(options);

  if (!(await pathIsFile(filePath))) {
    return { version: 1, worksets: {} };
  }

  return parseWorksetsState(await fs.readFile(filePath, 'utf-8'), options);
}

const worksetsLockError = makeLockErrorFactory({
  createSubject: 'the worksets lock file',
  busyMessage: 'The worksets file is busy.',
  code: 'workset_file_busy',
  target: 'workset.file',
});

export async function updateWorksetsState(
  updater: (state: WorksetsState) => WorksetsState | Promise<WorksetsState>,
  options: WorksetPathOptions = {}
): Promise<WorksetsState> {
  return withWorksetsLock(async (state) => {
    const next = await updater(state);
    await writeFileAtomically(
      getWorksetsFilePath(options),
      serializeWorksetsState(next, options)
    );
    return next;
  }, options);
}

/**
 * Lock-scoped read without a write-back of the saved-views file.
 * `open` uses this to read the state and regenerate the derived
 * .code-workspace coherently; the lock is released before any spawn.
 */
export async function withWorksetsLock<T>(
  fn: (state: WorksetsState) => T | Promise<T>,
  options: WorksetPathOptions = {}
): Promise<T> {
  const lockPath = `${getWorksetsFilePath(options)}.lock`;
  const lock = await acquireFileLock({
    lockPath,
    errorFor: worksetsLockError,
  });

  try {
    return await fn(await readWorksetsState(options));
  } finally {
    await releaseFileLock(lock, lockPath);
  }
}

export function worksetNotFoundError(
  name: string,
  state: WorksetsState
): StoreError {
  const savedNames = Object.keys(state.worksets).sort((a, b) =>
    a.localeCompare(b)
  );
  return new StoreError(
    `Workset '${name}' is not saved on this machine.`,
    'workset_not_found',
    {
      target: 'workset.name',
      fix:
        savedNames.length > 0
          ? `Saved worksets: ${savedNames.join(', ')}. See them with: openspec workset list`
          : `Create it first: openspec workset create ${name}`,
    }
  );
}

export function withWorkset(
  state: WorksetsState,
  workset: Workset
): WorksetsState {
  if (state.worksets[workset.name] !== undefined) {
    throw new StoreError(
      `Workset '${workset.name}' already exists.`,
      'workset_exists',
      {
        target: 'workset.name',
        fix: `Choose another name, or remove it first: openspec workset remove ${workset.name}`,
      }
    );
  }

  return {
    version: 1,
    worksets: {
      ...state.worksets,
      [workset.name]: {
        ...(workset.tool !== undefined ? { tool: workset.tool } : {}),
        members: workset.members,
      },
    },
  };
}

export function withoutWorkset(
  state: WorksetsState,
  name: string
): WorksetsState {
  if (state.worksets[name] === undefined) {
    throw worksetNotFoundError(name, state);
  }

  const remaining = { ...state.worksets };
  delete remaining[name];
  return { version: 1, worksets: remaining };
}

/**
 * Removes a saved workset and its derived .code-workspace under one
 * lock. The derived-file cleanup runs AFTER the durable write (a
 * failed write must not have already destroyed the artifact); a
 * never-opened workset has no file - ENOENT is fine.
 */
export async function removeWorkset(
  name: string,
  options: WorksetPathOptions = {}
): Promise<void> {
  await withWorksetsLock(async (state) => {
    const next = withoutWorkset(state, name);
    await writeFileAtomically(
      getWorksetsFilePath(options),
      serializeWorksetsState(next, options)
    );
    await fs.rm(getWorksetCodeWorkspacePath(name, options), { force: true });
  }, options);
}

function toWorkset(
  name: string,
  entry: WorksetsState['worksets'][string]
): Workset {
  return {
    name,
    ...(entry.tool !== undefined ? { tool: entry.tool } : {}),
    members: entry.members,
  };
}

export function listWorksets(state: WorksetsState): Workset[] {
  return Object.entries(state.worksets)
    .map(([name, entry]) => toWorkset(name, entry))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getWorkset(state: WorksetsState, name: string): Workset | null {
  const entry = state.worksets[name];
  return entry === undefined ? null : toWorkset(name, entry);
}

/**
 * The generated .code-workspace content: members in saved order with
 * their saved names, absolute paths, two-space JSON, trailing newline
 * (the working-set builder's conventions).
 */
export function buildWorksetCodeWorkspaceJson(
  members: WorksetMember[]
): string {
  return (
    JSON.stringify(
      {
        folders: members.map((member) => ({
          name: member.name,
          path: member.path,
        })),
      },
      null,
      2
    ) + '\n'
  );
}
