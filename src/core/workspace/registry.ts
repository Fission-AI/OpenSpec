import { promises as fs } from 'node:fs';
import path from 'node:path';
import { validateChangeName } from '../../utils/change-utils.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import {
  WORKSPACE_METADATA_DIRNAME,
  WORKSPACE_METADATA_FILENAME,
  WORKSPACE_METADATA_VERSION,
  getWorkspaceRepoGuidance,
  readWorkspaceLocalOverlay,
  readWorkspaceMetadata,
  type WorkspaceRepoEntry,
  writeWorkspaceLocalOverlay,
  writeWorkspaceMetadata,
} from './metadata.js';

const REPO_LOCAL_OPENSPEC_DIRNAME = 'openspec';

export interface WorkspaceAddRepoResult {
  workspaceRoot: string;
  alias: string;
  canonicalPath: string;
  owner?: string;
  handoff?: string;
}

export interface WorkspaceUpdateRepoResult {
  workspaceRoot: string;
  alias: string;
  owner?: string;
  handoff?: string;
}

export type WorkspaceDoctorIssueCode =
  | 'extra-local-alias'
  | 'missing-local-path'
  | 'missing-repo-path'
  | 'non-canonical-path'
  | 'repo-not-directory'
  | 'missing-openspec-state';

export interface WorkspaceDoctorIssue {
  code: WorkspaceDoctorIssueCode;
  alias: string;
  message: string;
  storedPath?: string;
  resolvedPath?: string;
  expectedPath?: string;
}

export interface WorkspaceDoctorResult {
  workspaceRoot: string;
  registeredAliasCount: number;
  localAliasCount: number;
  issues: WorkspaceDoctorIssue[];
}

export type WorkspaceRepoResolutionIssueCode =
  | 'unknown-alias'
  | 'missing-local-path'
  | 'missing-repo-path'
  | 'repo-not-directory'
  | 'missing-openspec-state';

export interface WorkspaceRepoResolutionIssue {
  code: WorkspaceRepoResolutionIssueCode;
  alias: string;
  message: string;
  storedPath?: string;
  resolvedPath?: string;
}

export interface ResolvedWorkspaceRepo {
  alias: string;
  storedPath: string;
  resolvedPath: string;
}

export interface WorkspaceRepoResolutionResult {
  resolvedRepos: ResolvedWorkspaceRepo[];
  issues: WorkspaceRepoResolutionIssue[];
}

interface WorkspaceRepoGuidanceOptions {
  owner?: string;
  handoff?: string;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function formatRepoAliasValidationError(message: string): string {
  if (message.startsWith('Change name')) {
    return message.replace('Change name', 'Repo alias');
  }

  return message;
}

function validateRepoAlias(alias: string): string {
  const trimmedAlias = alias.trim();
  const validation = validateChangeName(trimmedAlias);

  if (!validation.valid) {
    throw new Error(
      `Invalid repo alias '${alias}': ${formatRepoAliasValidationError(validation.error ?? 'Invalid alias')}`
    );
  }

  return trimmedAlias;
}

export function normalizeWorkspaceRepoAlias(alias: string): string {
  return validateRepoAlias(alias);
}

function normalizeWorkspaceRepoGuidance(
  guidance: WorkspaceRepoGuidanceOptions
): WorkspaceRepoGuidanceOptions {
  const normalizedGuidance: WorkspaceRepoGuidanceOptions = {};

  if (guidance.owner !== undefined) {
    if (guidance.owner.trim().length === 0) {
      throw new Error('Repo owner cannot be empty');
    }

    normalizedGuidance.owner = guidance.owner.trim();
  }

  if (guidance.handoff !== undefined) {
    if (guidance.handoff.trim().length === 0) {
      throw new Error('Repo handoff cannot be empty');
    }

    normalizedGuidance.handoff = guidance.handoff.trim();
  }

  return normalizedGuidance;
}

function applyWorkspaceRepoGuidance(
  repoEntry: WorkspaceRepoEntry,
  guidance: WorkspaceRepoGuidanceOptions
): WorkspaceRepoEntry {
  const nextRepoEntry: WorkspaceRepoEntry = { ...repoEntry };

  if (guidance.owner !== undefined) {
    nextRepoEntry.owner = guidance.owner;
  }

  if (guidance.handoff !== undefined) {
    nextRepoEntry.handoff = guidance.handoff;
  }

  return nextRepoEntry;
}

export async function resolveWorkspaceRoot(startDir = process.cwd()): Promise<string> {
  const workspaceRoot = await findWorkspaceRoot(startDir);

  if (workspaceRoot) {
    return workspaceRoot;
  }

  throw new Error(
    `Could not find a managed workspace from ${path.resolve(startDir)}. Run this command inside a workspace created with 'openspec workspace setup' or 'openspec workspace create'.`
  );
}

export async function findWorkspaceRoot(startDir = process.cwd()): Promise<string | null> {
  let currentDir = path.resolve(startDir);

  while (true) {
    const metadataPath = path.join(currentDir, WORKSPACE_METADATA_DIRNAME, WORKSPACE_METADATA_FILENAME);

    if (await pathExists(metadataPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
}

export async function validateWorkspaceRepoPath(repoPath: string, cwd: string): Promise<string> {
  const trimmedPath = repoPath.trim();

  if (!trimmedPath) {
    throw new Error('Repo path cannot be empty');
  }

  const resolvedPath = path.resolve(cwd, trimmedPath);
  let stats;

  try {
    stats = await fs.stat(resolvedPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Repo path does not exist: ${resolvedPath}`);
    }

    throw error;
  }

  if (!stats.isDirectory()) {
    throw new Error(`Repo path is not a directory: ${resolvedPath}`);
  }

  const canonicalPath = FileSystemUtils.canonicalizeExistingPath(resolvedPath);
  const openspecPath = path.join(canonicalPath, REPO_LOCAL_OPENSPEC_DIRNAME);

  if (!await FileSystemUtils.directoryExists(openspecPath)) {
    throw new Error(
      `Repo path '${canonicalPath}' does not contain repo-local OpenSpec state (missing ${REPO_LOCAL_OPENSPEC_DIRNAME}/)`
    );
  }

  return canonicalPath;
}

export async function addWorkspaceRepo(
  alias: string,
  repoPath: string,
  options: { cwd?: string; owner?: string; handoff?: string } = {}
): Promise<WorkspaceAddRepoResult> {
  const cwd = options.cwd ?? process.cwd();
  const workspaceRoot = await resolveWorkspaceRoot(cwd);
  const normalizedAlias = normalizeWorkspaceRepoAlias(alias);
  const normalizedGuidance = normalizeWorkspaceRepoGuidance(options);
  const metadata = await readWorkspaceMetadata(workspaceRoot);
  const localOverlay = await readWorkspaceLocalOverlay(workspaceRoot);

  if (metadata.repos[normalizedAlias] || localOverlay.repoPaths[normalizedAlias]) {
    throw new Error(`Repo alias '${normalizedAlias}' is already registered in this workspace`);
  }

  const canonicalPath = await validateWorkspaceRepoPath(repoPath, cwd);

  metadata.repos = {
    ...metadata.repos,
    [normalizedAlias]: applyWorkspaceRepoGuidance({}, normalizedGuidance),
  };
  metadata.version = metadata.version || WORKSPACE_METADATA_VERSION;

  localOverlay.repoPaths = {
    ...localOverlay.repoPaths,
    [normalizedAlias]: canonicalPath,
  };
  localOverlay.version = localOverlay.version || WORKSPACE_METADATA_VERSION;

  await writeWorkspaceMetadata(workspaceRoot, metadata);
  await writeWorkspaceLocalOverlay(workspaceRoot, localOverlay);

  return {
    workspaceRoot,
    alias: normalizedAlias,
    canonicalPath,
    ...getWorkspaceRepoGuidance(metadata.repos[normalizedAlias]),
  };
}

export async function updateWorkspaceRepoGuidance(
  alias: string,
  options: { cwd?: string; owner?: string; handoff?: string } = {}
): Promise<WorkspaceUpdateRepoResult> {
  const workspaceRoot = await resolveWorkspaceRoot(options.cwd ?? process.cwd());
  const normalizedAlias = normalizeWorkspaceRepoAlias(alias);
  const normalizedGuidance = normalizeWorkspaceRepoGuidance(options);
  const metadata = await readWorkspaceMetadata(workspaceRoot);
  const existingRepoEntry = metadata.repos[normalizedAlias];

  if (!existingRepoEntry) {
    throw new Error(`Repo alias '${normalizedAlias}' is not registered in this workspace`);
  }

  if (normalizedGuidance.owner === undefined && normalizedGuidance.handoff === undefined) {
    throw new Error("Provide at least one of '--owner' or '--handoff' to update repo guidance.");
  }

  metadata.repos = {
    ...metadata.repos,
    [normalizedAlias]: applyWorkspaceRepoGuidance(existingRepoEntry, normalizedGuidance),
  };
  metadata.version = metadata.version || WORKSPACE_METADATA_VERSION;

  await writeWorkspaceMetadata(workspaceRoot, metadata);

  return {
    workspaceRoot,
    alias: normalizedAlias,
    ...getWorkspaceRepoGuidance(metadata.repos[normalizedAlias]),
  };
}

export async function runWorkspaceDoctor(
  options: { cwd?: string } = {}
): Promise<WorkspaceDoctorResult> {
  const workspaceRoot = await resolveWorkspaceRoot(options.cwd ?? process.cwd());
  const metadata = await readWorkspaceMetadata(workspaceRoot);
  const localOverlay = await readWorkspaceLocalOverlay(workspaceRoot);
  const issues: WorkspaceDoctorIssue[] = [];
  const registeredAliases = Object.keys(metadata.repos).sort((left, right) => left.localeCompare(right));
  const localAliases = Object.keys(localOverlay.repoPaths).sort((left, right) => left.localeCompare(right));
  const registeredAliasSet = new Set(registeredAliases);

  for (const alias of registeredAliases) {
    const storedPath = localOverlay.repoPaths[alias];

    if (!storedPath) {
      issues.push({
        code: 'missing-local-path',
        alias,
        message: `Alias '${alias}' is registered in .openspec/workspace.yaml but missing from .openspec/local.yaml`,
      });
      continue;
    }

    const resolvedPath = path.isAbsolute(storedPath)
      ? storedPath
      : path.resolve(workspaceRoot, storedPath);
    const expectedPath = FileSystemUtils.canonicalizeExistingPath(resolvedPath);

    if (storedPath !== expectedPath) {
      issues.push({
        code: 'non-canonical-path',
        alias,
        storedPath,
        resolvedPath,
        expectedPath,
        message: `Alias '${alias}' has local overlay drift: stored path '${storedPath}' should be '${expectedPath}'`,
      });
    }

    if (!await pathExists(expectedPath)) {
      issues.push({
        code: 'missing-repo-path',
        alias,
        storedPath,
        resolvedPath: expectedPath,
        message: `Alias '${alias}' points to a missing repo path: ${expectedPath}`,
      });
      continue;
    }

    const stats = await fs.stat(expectedPath);
    if (!stats.isDirectory()) {
      issues.push({
        code: 'repo-not-directory',
        alias,
        storedPath,
        resolvedPath: expectedPath,
        message: `Alias '${alias}' points to a non-directory path: ${expectedPath}`,
      });
      continue;
    }

    const openspecPath = path.join(expectedPath, REPO_LOCAL_OPENSPEC_DIRNAME);
    if (!await FileSystemUtils.directoryExists(openspecPath)) {
      issues.push({
        code: 'missing-openspec-state',
        alias,
        storedPath,
        resolvedPath: expectedPath,
        message: `Alias '${alias}' resolves to ${expectedPath} but repo-local OpenSpec state is missing (${REPO_LOCAL_OPENSPEC_DIRNAME}/)`,
      });
    }
  }

  for (const alias of localAliases) {
    if (!registeredAliasSet.has(alias)) {
      issues.push({
        code: 'extra-local-alias',
        alias,
        storedPath: localOverlay.repoPaths[alias],
        message: `Alias '${alias}' exists only in .openspec/local.yaml and is not registered in .openspec/workspace.yaml`,
      });
    }
  }

  return {
    workspaceRoot,
    registeredAliasCount: registeredAliases.length,
    localAliasCount: localAliases.length,
    issues,
  };
}

export async function resolveWorkspaceRepoTargets(
  workspaceRoot: string,
  aliases: string[]
): Promise<WorkspaceRepoResolutionResult> {
  const metadata = await readWorkspaceMetadata(workspaceRoot);
  const localOverlay = await readWorkspaceLocalOverlay(workspaceRoot);
  const resolvedRepos: ResolvedWorkspaceRepo[] = [];
  const issues: WorkspaceRepoResolutionIssue[] = [];

  for (const alias of aliases) {
    if (!metadata.repos[alias]) {
      issues.push({
        code: 'unknown-alias',
        alias,
        message: `Target alias '${alias}' is not registered in .openspec/workspace.yaml`,
      });
      continue;
    }

    const storedPath = localOverlay.repoPaths[alias];
    if (!storedPath) {
      issues.push({
        code: 'missing-local-path',
        alias,
        message: `Target alias '${alias}' is registered in .openspec/workspace.yaml but missing from .openspec/local.yaml`,
      });
      continue;
    }

    const candidatePath = path.isAbsolute(storedPath)
      ? storedPath
      : path.resolve(workspaceRoot, storedPath);

    if (!await pathExists(candidatePath)) {
      issues.push({
        code: 'missing-repo-path',
        alias,
        storedPath,
        resolvedPath: candidatePath,
        message: `Target alias '${alias}' points to a missing repo path: ${candidatePath}`,
      });
      continue;
    }

    const stats = await fs.stat(candidatePath);
    if (!stats.isDirectory()) {
      issues.push({
        code: 'repo-not-directory',
        alias,
        storedPath,
        resolvedPath: candidatePath,
        message: `Target alias '${alias}' points to a non-directory path: ${candidatePath}`,
      });
      continue;
    }

    const canonicalPath = FileSystemUtils.canonicalizeExistingPath(candidatePath);
    const openspecPath = path.join(canonicalPath, REPO_LOCAL_OPENSPEC_DIRNAME);

    if (!await FileSystemUtils.directoryExists(openspecPath)) {
      issues.push({
        code: 'missing-openspec-state',
        alias,
        storedPath,
        resolvedPath: canonicalPath,
        message: `Target alias '${alias}' resolves to ${canonicalPath} but repo-local OpenSpec state is missing (${REPO_LOCAL_OPENSPEC_DIRNAME}/)`,
      });
      continue;
    }

    resolvedRepos.push({
      alias,
      storedPath,
      resolvedPath: canonicalPath,
    });
  }

  return {
    resolvedRepos,
    issues,
  };
}
