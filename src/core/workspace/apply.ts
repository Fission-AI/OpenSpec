import { promises as fs } from 'node:fs';
import path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { writeChangeMetadata } from '../../utils/change-metadata.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { resolveWorkspaceChange } from './change.js';
import { readWorkspaceMetadata } from './metadata.js';
import {
  normalizeWorkspaceRepoAlias,
  resolveWorkspaceRepoTargets,
  resolveWorkspaceRoot,
  type WorkspaceRepoResolutionIssue,
} from './registry.js';

const MATERIALIZATION_TRACE_FILENAME = '.openspec.materialization.yaml';

interface WorkspaceMaterializationSources {
  proposalPath: string;
  designPath: string;
  tasksPath: string;
  specsPath: string;
}

interface WorkspaceMaterializationTrace {
  source: 'workspace';
  workspaceName: string;
  targetAlias: string;
  materializedAt: string;
}

export interface ApplyWorkspaceChangeOptions {
  cwd?: string;
  change: string;
  repo: string;
}

export interface ApplyWorkspaceChangeResult {
  workspaceRoot: string;
  workspaceName: string;
  change: {
    id: string;
    path: string;
    schema: string;
  };
  target: {
    alias: string;
    repoRoot: string;
    changePath: string;
    tracePath: string;
  };
  materializedAt: string;
  authority: {
    before: string;
    after: string;
  };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function formatWorkspaceArtifactPath(changePath: string, targetPath: string): string {
  return path.relative(changePath, targetPath).replace(/\\/g, '/');
}

async function ensureFileExists(
  changePath: string,
  filePath: string,
  changeId: string,
  alias: string
): Promise<void> {
  let stats;

  try {
    stats = await fs.stat(filePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Source artifact error: workspace change '${changeId}' is missing required file '${formatWorkspaceArtifactPath(changePath, filePath)}'.`
      );
    }

    throw error;
  }

  if (!stats.isFile()) {
    throw new Error(
      `Source artifact error: workspace change '${changeId}' expected '${formatWorkspaceArtifactPath(changePath, filePath)}' to be a file for repo alias '${alias}'.`
    );
  }
}

async function ensureDirectoryExists(
  changePath: string,
  dirPath: string,
  changeId: string,
  alias: string
): Promise<void> {
  let stats;

  try {
    stats = await fs.stat(dirPath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Source artifact error: workspace change '${changeId}' is missing required directory '${formatWorkspaceArtifactPath(changePath, dirPath)}'.`
      );
    }

    throw error;
  }

  if (!stats.isDirectory()) {
    throw new Error(
      `Source artifact error: workspace change '${changeId}' expected '${formatWorkspaceArtifactPath(changePath, dirPath)}' to be a directory for repo alias '${alias}'.`
    );
  }
}

function buildUnknownAliasError(alias: string, registeredAliases: string[]): Error {
  const registeredLabel = registeredAliases.length === 0
    ? "This workspace has no registered repos yet. Add one with 'openspec workspace add-repo <alias> <path>'."
    : `Registered aliases: ${registeredAliases.join(', ')}`;

  return new Error(
    `Target selection error: repo alias '${alias}' is not registered in this workspace. ${registeredLabel}`
  );
}

function buildUntargetedAliasError(changeId: string, alias: string, targetAliases: string[]): Error {
  return new Error(
    `Target selection error: workspace change '${changeId}' does not target repo alias '${alias}'. Targeted aliases: ${targetAliases.join(', ')}`
  );
}

function buildRepoResolutionError(
  changeId: string,
  alias: string,
  issues: WorkspaceRepoResolutionIssue[]
): Error {
  const lines = [
    `Repo resolution error: could not materialize workspace change '${changeId}' into repo alias '${alias}':`,
    ...issues.map((issue) => `- ${issue.message}`),
    `Run 'openspec workspace doctor' and repair the failing alias before retrying.`,
  ];

  return new Error(lines.join('\n'));
}

function buildCreateOnlyCollisionError(changeId: string, alias: string, destinationPath: string): Error {
  return new Error(
    `Create-only collision: repo-local change '${changeId}' already exists in target repo '${alias}' at ${destinationPath}. OpenSpec v0 apply will not overwrite an existing materialization.`
  );
}

async function resolveMaterializationSources(
  changePath: string,
  changeId: string,
  alias: string
): Promise<WorkspaceMaterializationSources> {
  const proposalPath = path.join(changePath, 'proposal.md');
  const designPath = path.join(changePath, 'design.md');
  const tasksPath = path.join(changePath, 'targets', alias, 'tasks.md');
  const specsPath = path.join(changePath, 'targets', alias, 'specs');

  await ensureFileExists(changePath, proposalPath, changeId, alias);
  await ensureFileExists(changePath, designPath, changeId, alias);
  await ensureFileExists(changePath, tasksPath, changeId, alias);
  await ensureDirectoryExists(changePath, specsPath, changeId, alias);

  return {
    proposalPath,
    designPath,
    tasksPath,
    specsPath,
  };
}

async function writeMaterializationTrace(
  tracePath: string,
  trace: WorkspaceMaterializationTrace
): Promise<void> {
  await fs.writeFile(tracePath, stringifyYaml(trace), 'utf-8');
}

export async function applyWorkspaceChange(
  options: ApplyWorkspaceChangeOptions
): Promise<ApplyWorkspaceChangeResult> {
  const workspaceRoot = FileSystemUtils.canonicalizeExistingPath(
    await resolveWorkspaceRoot(options.cwd ?? process.cwd())
  );
  const metadata = await readWorkspaceMetadata(workspaceRoot);
  const repoAlias = normalizeWorkspaceRepoAlias(options.repo);
  const change = await resolveWorkspaceChange(workspaceRoot, options.change);
  const registeredAliases = Object.keys(metadata.repos).sort((left, right) => left.localeCompare(right));

  if (!metadata.repos[repoAlias]) {
    throw buildUnknownAliasError(repoAlias, registeredAliases);
  }

  if (!change.targets.includes(repoAlias)) {
    throw buildUntargetedAliasError(change.id, repoAlias, change.targets);
  }

  const repoResolution = await resolveWorkspaceRepoTargets(workspaceRoot, [repoAlias]);
  if (repoResolution.issues.length > 0) {
    throw buildRepoResolutionError(change.id, repoAlias, repoResolution.issues);
  }

  const targetRepo = repoResolution.resolvedRepos[0];
  if (!targetRepo) {
    throw new Error(
      `Repo resolution error: could not resolve repo alias '${repoAlias}' for workspace change '${change.id}'.`
    );
  }

  const sources = await resolveMaterializationSources(change.path, change.id, repoAlias);
  const repoChangesRoot = path.join(targetRepo.resolvedPath, 'openspec', 'changes');
  const destinationPath = path.join(repoChangesRoot, change.id);

  if (await pathExists(destinationPath)) {
    throw buildCreateOnlyCollisionError(change.id, repoAlias, destinationPath);
  }

  await fs.mkdir(repoChangesRoot, { recursive: true });

  const stagedRoot = await fs.mkdtemp(path.join(repoChangesRoot, `.${change.id}.materializing-`));
  const materializedAt = new Date().toISOString();
  const createdDate = materializedAt.split('T')[0];
  let stagedMoved = false;

  try {
    writeChangeMetadata(stagedRoot, {
      schema: change.schema,
      created: createdDate,
    }, targetRepo.resolvedPath);

    await fs.copyFile(sources.proposalPath, path.join(stagedRoot, 'proposal.md'));
    await fs.copyFile(sources.designPath, path.join(stagedRoot, 'design.md'));
    await fs.copyFile(sources.tasksPath, path.join(stagedRoot, 'tasks.md'));
    await fs.cp(sources.specsPath, path.join(stagedRoot, 'specs'), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
    await writeMaterializationTrace(
      path.join(stagedRoot, MATERIALIZATION_TRACE_FILENAME),
      {
        source: 'workspace',
        workspaceName: metadata.name,
        targetAlias: repoAlias,
        materializedAt,
      }
    );

    await fs.rename(stagedRoot, destinationPath);
    stagedMoved = true;
  } catch (error) {
    if (!stagedMoved) {
      await fs.rm(stagedRoot, { recursive: true, force: true });
    }

    throw error;
  }

  return {
    workspaceRoot,
    workspaceName: metadata.name,
    change: {
      id: change.id,
      path: change.path,
      schema: change.schema,
    },
    target: {
      alias: repoAlias,
      repoRoot: targetRepo.resolvedPath,
      changePath: destinationPath,
      tracePath: path.join(destinationPath, MATERIALIZATION_TRACE_FILENAME),
    },
    materializedAt,
    authority: {
      before: `workspace draft for target alias '${repoAlias}'`,
      after: `repo-local change '${change.id}' in ${targetRepo.resolvedPath}`,
    },
  };
}
