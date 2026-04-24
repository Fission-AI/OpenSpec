import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { FileSystemUtils } from '../../src/utils/file-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

export const WORKSPACE_POC_FIXTURES_ROOT = path.join(projectRoot, 'test', 'fixtures', 'workspace-poc');

export type WorkspaceSandboxFixtureName = 'empty' | 'happy-path' | 'dirty';

interface WorkspaceLocalOverlay {
  version?: number;
  repoPaths?: Record<string, string>;
  [key: string]: unknown;
}

export interface WorkspaceSandbox {
  fixtureName: WorkspaceSandboxFixtureName;
  rootDir: string;
  workspaceRoot: string;
  reposRoot: string;
  repoPaths: Record<string, string>;
  overlayRepoPaths: Record<string, string>;
  workspacePath: (...segments: string[]) => string;
  repoPath: (alias: string, ...segments: string[]) => string;
  cleanup: () => Promise<void>;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listChildDirectories(rootDir: string): Promise<string[]> {
  if (!await pathExists(rootDir)) {
    return [];
  }

  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function readOverlay(localOverlayPath: string): Promise<WorkspaceLocalOverlay> {
  if (!await pathExists(localOverlayPath)) {
    return { version: 1, repoPaths: {} };
  }

  const raw = await fs.readFile(localOverlayPath, 'utf-8');
  const parsed = raw.trim() ? YAML.parse(raw) : {};
  if (!parsed || typeof parsed !== 'object') {
    return { version: 1, repoPaths: {} };
  }

  return parsed as WorkspaceLocalOverlay;
}

function canonicalizeSandboxPath(candidatePath: string): string {
  return FileSystemUtils.canonicalizeExistingPath(candidatePath);
}

function resolveOverlayPath(workspaceRoot: string, rawPath: string): string {
  const resolved = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(workspaceRoot, rawPath);
  return canonicalizeSandboxPath(resolved);
}

export async function workspaceSandbox(
  options: { fixture?: WorkspaceSandboxFixtureName } = {}
): Promise<WorkspaceSandbox> {
  const fixtureName = options.fixture ?? 'empty';
  const fixtureRoot = path.join(WORKSPACE_POC_FIXTURES_ROOT, fixtureName);
  const fixtureWorkspaceRoot = path.join(fixtureRoot, 'workspace');
  const fixtureReposRoot = path.join(fixtureRoot, 'repos');

  if (!await pathExists(fixtureWorkspaceRoot)) {
    throw new Error(`Workspace fixture '${fixtureName}' is missing ${fixtureWorkspaceRoot}`);
  }

  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-sandbox-'));
  const workspaceRoot = path.join(rootDir, 'workspace');
  const reposRoot = path.join(rootDir, 'repos');

  await fs.cp(fixtureWorkspaceRoot, workspaceRoot, { recursive: true });

  if (await pathExists(fixtureReposRoot)) {
    await fs.cp(fixtureReposRoot, reposRoot, { recursive: true });
  } else {
    await fs.mkdir(reposRoot, { recursive: true });
  }

  const localOverlayPath = path.join(workspaceRoot, '.openspec', 'local.yaml');
  const overlay = await readOverlay(localOverlayPath);
  const discoveredAliases = await listChildDirectories(reposRoot);
  const configuredRepoPaths = overlay.repoPaths ?? {};
  const mergedRepoPaths: Record<string, string> = {};

  for (const alias of discoveredAliases) {
    mergedRepoPaths[alias] = path.relative(workspaceRoot, path.join(reposRoot, alias));
  }

  for (const [alias, rawPath] of Object.entries(configuredRepoPaths)) {
    mergedRepoPaths[alias] = rawPath;
  }

  const overlayRepoPaths = Object.fromEntries(
    Object.entries(mergedRepoPaths).map(([alias, rawPath]) => [alias, resolveOverlayPath(workspaceRoot, rawPath)])
  );

  const nextOverlay: WorkspaceLocalOverlay = {
    ...overlay,
    version: overlay.version ?? 1,
    repoPaths: overlayRepoPaths,
  };
  await fs.writeFile(localOverlayPath, YAML.stringify(nextOverlay), 'utf-8');

  const repoPaths = Object.fromEntries(
    discoveredAliases.map((alias) => [alias, canonicalizeSandboxPath(path.join(reposRoot, alias))])
  );

  return {
    fixtureName,
    rootDir,
    workspaceRoot,
    reposRoot,
    repoPaths,
    overlayRepoPaths,
    workspacePath: (...segments: string[]) => path.join(workspaceRoot, ...segments),
    repoPath: (alias: string, ...segments: string[]) => {
      const repoRoot = repoPaths[alias] ?? overlayRepoPaths[alias];
      if (!repoRoot) {
        throw new Error(`Unknown workspace sandbox repo alias '${alias}'`);
      }
      return path.join(repoRoot, ...segments);
    },
    cleanup: async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    },
  };
}
