import { promises as fs } from 'node:fs';
import path from 'node:path';

interface AbsolutePathCheckOptions {
  forbiddenPaths?: string[];
}

interface MaterializationInvariantOptions {
  workspaceChangeId: string;
  repoRoots: Record<string, string>;
  targetAliases: string[];
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursively(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursively(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function listEntriesRecursively(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    const normalizedRelativePath = path.relative(rootDir, entryPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      results.push(`${normalizedRelativePath}/`);
      results.push(...(await listEntriesRecursively(entryPath)).map((child) => `${normalizedRelativePath}/${child}`));
      continue;
    }

    if (entry.isFile()) {
      results.push(normalizedRelativePath);
    }
  }

  return results.sort((left, right) => left.localeCompare(right));
}

const ABSOLUTE_PATH_PATTERN = /(^|[\s"'=:([])(?:[A-Za-z]:[\\/]|\/(?:Users|home|private|tmp|var|opt|etc|mnt|srv|Volumes|workspace|workspaces)[\\/])[^\s"'`)\]]+/mu;

export async function assertWorkspaceLayout(workspaceRoot: string): Promise<void> {
  const openspecMetadataDir = path.join(workspaceRoot, '.openspec');
  const changesDir = path.join(workspaceRoot, 'changes');
  const nestedRepoLocalOpenspecDir = path.join(workspaceRoot, 'openspec');

  if (!await pathExists(openspecMetadataDir)) {
    throw new Error(`Expected workspace metadata directory at ${openspecMetadataDir}`);
  }

  if (!await pathExists(changesDir)) {
    throw new Error(`Expected workspace changes directory at ${changesDir}`);
  }

  if (await pathExists(nestedRepoLocalOpenspecDir)) {
    throw new Error(`Workspace root must not contain repo-local openspec/ at ${nestedRepoLocalOpenspecDir}`);
  }
}

export async function assertWorkspaceChangeLayout(changeDir: string, targetAliases: string[]): Promise<void> {
  const expectedEntries = [
    '.openspec.yaml',
    'design.md',
    'proposal.md',
    'targets/',
    'tasks/',
    'tasks/coordination.md',
    ...targetAliases.flatMap((alias) => [
      `targets/${alias}/`,
      `targets/${alias}/specs/`,
      `targets/${alias}/tasks.md`,
    ]),
  ].sort((left, right) => left.localeCompare(right));
  const actualEntries = await listEntriesRecursively(changeDir);

  if (expectedEntries.length !== actualEntries.length) {
    throw new Error(
      `Workspace change layout mismatch in ${changeDir}.\nExpected:\n${expectedEntries.join('\n')}\nActual:\n${actualEntries.join('\n')}`
    );
  }

  for (let index = 0; index < expectedEntries.length; index += 1) {
    if (expectedEntries[index] !== actualEntries[index]) {
      throw new Error(
        `Workspace change layout mismatch in ${changeDir}.\nExpected:\n${expectedEntries.join('\n')}\nActual:\n${actualEntries.join('\n')}`
      );
    }
  }
}

export async function assertNoAbsoluteRepoPaths(
  rootDir: string,
  options: AbsolutePathCheckOptions = {}
): Promise<void> {
  const files = await listFilesRecursively(rootDir);
  const forbiddenPaths = (options.forbiddenPaths ?? [])
    .map((entry) => entry.replace(/\\/g, '/'))
    .sort((left, right) => right.length - left.length);

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8');
    const normalizedContent = content.replace(/\\/g, '/');

    for (const forbiddenPath of forbiddenPaths) {
      if (forbiddenPath && normalizedContent.includes(forbiddenPath)) {
        throw new Error(`Found forbidden absolute path '${forbiddenPath}' in ${filePath}`);
      }
    }

    const lines = normalizedContent.split(/\r?\n/u);
    const offendingLine = lines.find((line) => ABSOLUTE_PATH_PATTERN.test(line));
    if (offendingLine) {
      throw new Error(`Found absolute path leak in ${filePath}: ${offendingLine.trim()}`);
    }
  }
}

export function assertTargetMembership(expectedAliases: string[], actualAliases: string[]): void {
  const expected = [...new Set(expectedAliases)].sort((left, right) => left.localeCompare(right));
  const actual = [...new Set(actualAliases)].sort((left, right) => left.localeCompare(right));

  if (expected.length !== actual.length) {
    throw new Error(`Target alias count mismatch. Expected ${expected.join(', ')}, received ${actual.join(', ')}`);
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== actual[index]) {
      throw new Error(`Target alias mismatch. Expected ${expected.join(', ')}, received ${actual.join(', ')}`);
    }
  }
}

export async function assertMaterializationInvariants(
  options: MaterializationInvariantOptions
): Promise<void> {
  const targetAliases = new Set(options.targetAliases);

  for (const [alias, repoRoot] of Object.entries(options.repoRoots)) {
    const materializedChangeDir = path.join(repoRoot, 'openspec', 'changes', options.workspaceChangeId);
    const exists = await pathExists(materializedChangeDir);

    if (targetAliases.has(alias) && !exists) {
      throw new Error(`Expected materialized change '${options.workspaceChangeId}' in target repo '${alias}'`);
    }

    if (!targetAliases.has(alias) && exists) {
      throw new Error(`Unexpected materialized change '${options.workspaceChangeId}' in non-target repo '${alias}'`);
    }
  }
}
