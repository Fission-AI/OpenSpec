import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export const WORKSPACE_METADATA_VERSION = 1;
export const WORKSPACE_METADATA_DIRNAME = '.openspec';
export const WORKSPACE_METADATA_FILENAME = 'workspace.yaml';
export const WORKSPACE_LOCAL_OVERLAY_FILENAME = 'local.yaml';
export const WORKSPACE_CHANGES_DIRNAME = 'changes';

export interface WorkspaceRepoEntry {
  description?: string;
  owner?: string;
  handoff?: string;
  [key: string]: unknown;
}

export interface WorkspaceRepoGuidance {
  owner?: string;
  handoff?: string;
}

export interface WorkspaceMetadata {
  version: number;
  name: string;
  repos: Record<string, WorkspaceRepoEntry>;
}

export interface WorkspaceLocalOverlay {
  version: number;
  repoPaths: Record<string, string>;
  preferredAgent?: string;
}

export interface WorkspaceMetadataPaths {
  metadataDir: string;
  metadataPath: string;
  localOverlayPath: string;
  changesPath: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function parseYamlObject(rawContent: string, filePath: string): Record<string, unknown> {
  const parsed = rawContent.trim() ? parseYaml(rawContent) : {};

  if (!isRecord(parsed)) {
    throw new Error(`Invalid workspace metadata in ${filePath}: expected a YAML object`);
  }

  return parsed;
}

function normalizeWorkspaceRepoStringField(
  value: unknown,
  alias: string,
  fieldName: keyof WorkspaceRepoGuidance | 'description',
  filePath: string
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `Invalid repo entry for alias '${alias}' in ${filePath}: expected '${fieldName}' to be a non-empty string`
    );
  }

  return value.trim();
}

function normalizeWorkspaceRepoEntry(
  alias: string,
  repoEntry: Record<string, unknown>,
  filePath: string
): WorkspaceRepoEntry {
  const normalizedRepoEntry: WorkspaceRepoEntry = { ...repoEntry };

  if (repoEntry.description !== undefined) {
    normalizedRepoEntry.description = normalizeWorkspaceRepoStringField(
      repoEntry.description,
      alias,
      'description',
      filePath
    );
  }

  if (repoEntry.owner !== undefined) {
    normalizedRepoEntry.owner = normalizeWorkspaceRepoStringField(
      repoEntry.owner,
      alias,
      'owner',
      filePath
    );
  }

  if (repoEntry.handoff !== undefined) {
    normalizedRepoEntry.handoff = normalizeWorkspaceRepoStringField(
      repoEntry.handoff,
      alias,
      'handoff',
      filePath
    );
  }

  return normalizedRepoEntry;
}

function normalizeWorkspaceRepos(rawRepos: unknown, filePath: string): Record<string, WorkspaceRepoEntry> {
  if (rawRepos === undefined) {
    return {};
  }

  if (!isRecord(rawRepos)) {
    throw new Error(`Invalid repo registry in ${filePath}: expected 'repos' to be a mapping`);
  }

  const normalizedRepos: Record<string, WorkspaceRepoEntry> = {};

  for (const [alias, repoEntry] of Object.entries(rawRepos)) {
    if (!isRecord(repoEntry)) {
      throw new Error(`Invalid repo entry for alias '${alias}' in ${filePath}: expected a mapping`);
    }

    normalizedRepos[alias] = normalizeWorkspaceRepoEntry(alias, repoEntry, filePath);
  }

  return normalizedRepos;
}

function normalizeRepoPaths(rawRepoPaths: unknown, filePath: string): Record<string, string> {
  if (rawRepoPaths === undefined) {
    return {};
  }

  if (!isRecord(rawRepoPaths)) {
    throw new Error(`Invalid local overlay in ${filePath}: expected 'repoPaths' to be a mapping`);
  }

  const normalizedRepoPaths: Record<string, string> = {};

  for (const [alias, storedPath] of Object.entries(rawRepoPaths)) {
    if (typeof storedPath !== 'string' || storedPath.trim().length === 0) {
      throw new Error(`Invalid repo path for alias '${alias}' in ${filePath}: expected a non-empty string`);
    }

    normalizedRepoPaths[alias] = storedPath.trim();
  }

  return normalizedRepoPaths;
}

function normalizePreferredAgent(rawPreferredAgent: unknown, filePath: string): string | undefined {
  if (rawPreferredAgent === undefined) {
    return undefined;
  }

  if (typeof rawPreferredAgent !== 'string' || rawPreferredAgent.trim().length === 0) {
    throw new Error(`Invalid local overlay in ${filePath}: expected 'preferredAgent' to be a non-empty string`);
  }

  return rawPreferredAgent.trim();
}

export function getWorkspaceMetadataPaths(workspaceRoot: string): WorkspaceMetadataPaths {
  const metadataDir = path.join(workspaceRoot, WORKSPACE_METADATA_DIRNAME);

  return {
    metadataDir,
    metadataPath: path.join(metadataDir, WORKSPACE_METADATA_FILENAME),
    localOverlayPath: path.join(metadataDir, WORKSPACE_LOCAL_OVERLAY_FILENAME),
    changesPath: path.join(workspaceRoot, WORKSPACE_CHANGES_DIRNAME),
  };
}

export function isWorkspaceRoot(candidateRoot: string): boolean {
  return existsSync(path.join(candidateRoot, WORKSPACE_METADATA_DIRNAME, WORKSPACE_METADATA_FILENAME));
}

export function getChangeContainerPath(projectRoot: string): string {
  return isWorkspaceRoot(projectRoot)
    ? path.join(projectRoot, WORKSPACE_CHANGES_DIRNAME)
    : path.join(projectRoot, 'openspec', WORKSPACE_CHANGES_DIRNAME);
}

export function getChangePath(projectRoot: string, changeName: string): string {
  return path.join(getChangeContainerPath(projectRoot), changeName);
}

export function createWorkspaceMetadata(name: string): WorkspaceMetadata {
  return {
    version: WORKSPACE_METADATA_VERSION,
    name,
    repos: {},
  };
}

export function createWorkspaceLocalOverlay(): WorkspaceLocalOverlay {
  return {
    version: WORKSPACE_METADATA_VERSION,
    repoPaths: {},
  };
}

export function getWorkspaceRepoGuidance(
  repoEntry: WorkspaceRepoEntry | undefined
): WorkspaceRepoGuidance {
  if (!repoEntry) {
    return {};
  }

  const guidance: WorkspaceRepoGuidance = {};

  if (typeof repoEntry.owner === 'string' && repoEntry.owner.trim().length > 0) {
    guidance.owner = repoEntry.owner.trim();
  }

  if (typeof repoEntry.handoff === 'string' && repoEntry.handoff.trim().length > 0) {
    guidance.handoff = repoEntry.handoff.trim();
  }

  return guidance;
}

export async function readWorkspaceMetadata(workspaceRoot: string): Promise<WorkspaceMetadata> {
  const { metadataPath } = getWorkspaceMetadataPaths(workspaceRoot);

  if (!await pathExists(metadataPath)) {
    throw new Error(`Managed workspace metadata is missing: ${metadataPath}`);
  }

  const parsed = parseYamlObject(await fs.readFile(metadataPath, 'utf-8'), metadataPath);
  const name = parsed.name;

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error(`Invalid workspace metadata in ${metadataPath}: expected a non-empty 'name'`);
  }

  return {
    version: typeof parsed.version === 'number' ? parsed.version : WORKSPACE_METADATA_VERSION,
    name: name.trim(),
    repos: normalizeWorkspaceRepos(parsed.repos, metadataPath),
  };
}

export async function readWorkspaceLocalOverlay(workspaceRoot: string): Promise<WorkspaceLocalOverlay> {
  const { localOverlayPath } = getWorkspaceMetadataPaths(workspaceRoot);

  if (!await pathExists(localOverlayPath)) {
    return createWorkspaceLocalOverlay();
  }

  const parsed = parseYamlObject(await fs.readFile(localOverlayPath, 'utf-8'), localOverlayPath);

  return {
    version: typeof parsed.version === 'number' ? parsed.version : WORKSPACE_METADATA_VERSION,
    repoPaths: normalizeRepoPaths(parsed.repoPaths, localOverlayPath),
    preferredAgent: normalizePreferredAgent(parsed.preferredAgent, localOverlayPath),
  };
}

export async function writeWorkspaceMetadata(
  workspaceRoot: string,
  metadata: WorkspaceMetadata
): Promise<void> {
  const { metadataPath } = getWorkspaceMetadataPaths(workspaceRoot);
  await fs.writeFile(metadataPath, stringifyYaml(metadata), 'utf-8');
}

export async function writeWorkspaceLocalOverlay(
  workspaceRoot: string,
  localOverlay: WorkspaceLocalOverlay
): Promise<void> {
  const { localOverlayPath } = getWorkspaceMetadataPaths(workspaceRoot);
  await fs.writeFile(localOverlayPath, stringifyYaml(localOverlay), 'utf-8');
}
