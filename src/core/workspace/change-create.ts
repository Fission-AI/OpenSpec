import path from 'node:path';
import { writeChangeMetadata } from '../../utils/change-metadata.js';
import {
  FileSystemUtils,
} from '../../utils/file-system.js';
import {
  resolveNewChangeSchema,
  validateChangeName,
} from '../../utils/change-utils.js';
import { readWorkspaceMetadata } from './metadata.js';

export interface CreateWorkspaceChangeOptions {
  description?: string;
  schema?: string;
  targets: string;
}

export interface CreateWorkspaceChangeResult {
  workspaceRoot: string;
  changeDir: string;
  schema: string;
  targets: string[];
}

export function formatUnknownTargetError(
  unknownTargets: string[],
  registeredAliases: string[]
): string {
  const unknownLabel = unknownTargets.length === 1 ? 'alias' : 'aliases';
  const registeredLabel = registeredAliases.length === 0
    ? "This workspace has no registered repos yet. Add one with 'openspec workspace add-repo <alias> <path>'."
    : `Registered aliases: ${registeredAliases.join(', ')}`;

  return `Unknown target ${unknownLabel}: ${unknownTargets.join(', ')}. ${registeredLabel}`;
}

function buildProposalContent(name: string, description: string | undefined, targets: string[]): string {
  const why = description?.trim() || 'Describe why this cross-repo change is needed.';

  return `# ${name}

## Why
${why}

## What Changes
- **workspace:** Coordinate planning and rollout across the targeted repos.
- **targets:** ${targets.join(', ')}
`;
}

function buildDesignContent(targets: string[]): string {
  const targetList = targets.map((target) => `- ${target}`).join('\n');

  return `# Design

## Overview
Describe the shared design and rollout decisions for this workspace change.

## Target Repos
${targetList}
`;
}

function buildCoordinationTasksContent(targets: string[]): string {
  return `## Coordination Tasks
- [ ] Confirm shared rollout sequencing across: ${targets.join(', ')}
- [ ] Finalize repo-specific task and spec drafts before materialization
`;
}

export function buildWorkspaceTargetTasksContent(alias: string): string {
  return `## ${alias} Tasks
- [ ] Draft repo-local execution tasks for ${alias}
- [ ] Draft delta specs for ${alias} under specs/
`;
}

export async function scaffoldWorkspaceTargetDraft(changeDir: string, alias: string): Promise<void> {
  await FileSystemUtils.writeFile(
    path.join(changeDir, 'targets', alias, 'tasks.md'),
    buildWorkspaceTargetTasksContent(alias)
  );
  await FileSystemUtils.createDirectory(path.join(changeDir, 'targets', alias, 'specs'));
}

export function parseWorkspaceTargets(rawTargets: string): string[] {
  if (rawTargets.trim().length === 0) {
    throw new Error('Workspace changes require at least one target alias. Use --targets <a,b,c>.');
  }

  const normalizedTargets: string[] = [];
  const seenTargets = new Set<string>();

  for (const rawAlias of rawTargets.split(',')) {
    const alias = rawAlias.trim();

    if (alias.length === 0) {
      throw new Error(
        `Invalid --targets value '${rawTargets}'. Target aliases must be comma-separated non-empty values.`
      );
    }

    const validation = validateChangeName(alias);
    if (!validation.valid) {
      throw new Error(`Invalid target alias '${alias}': ${validation.error ?? 'Invalid target alias'}`);
    }

    if (seenTargets.has(alias)) {
      throw new Error(`Duplicate target alias '${alias}' in --targets. Remove duplicates and retry.`);
    }

    seenTargets.add(alias);
    normalizedTargets.push(alias);
  }

  return normalizedTargets;
}

export async function createWorkspaceChange(
  workspaceRoot: string,
  name: string,
  options: CreateWorkspaceChangeOptions
): Promise<CreateWorkspaceChangeResult> {
  const validation = validateChangeName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const metadata = await readWorkspaceMetadata(workspaceRoot);
  const targets = parseWorkspaceTargets(options.targets);
  const registeredAliases = Object.keys(metadata.repos).sort((left, right) => left.localeCompare(right));
  const registeredAliasSet = new Set(registeredAliases);
  const unknownTargets = targets.filter((target) => !registeredAliasSet.has(target));

  if (unknownTargets.length > 0) {
    throw new Error(formatUnknownTargetError(unknownTargets, registeredAliases));
  }

  const schema = resolveNewChangeSchema(workspaceRoot, { schema: options.schema });
  const changeDir = path.join(workspaceRoot, 'changes', name);

  if (await FileSystemUtils.directoryExists(changeDir)) {
    throw new Error(`Change '${name}' already exists at ${changeDir}`);
  }

  await FileSystemUtils.createDirectory(changeDir);

  const created = new Date().toISOString().split('T')[0];
  writeChangeMetadata(changeDir, { schema, created, targets }, workspaceRoot);

  await FileSystemUtils.writeFile(path.join(changeDir, 'proposal.md'), buildProposalContent(name, options.description, targets));
  await FileSystemUtils.writeFile(path.join(changeDir, 'design.md'), buildDesignContent(targets));
  await FileSystemUtils.writeFile(
    path.join(changeDir, 'tasks', 'coordination.md'),
    buildCoordinationTasksContent(targets)
  );

  for (const alias of targets) {
    await scaffoldWorkspaceTargetDraft(changeDir, alias);
  }

  return {
    workspaceRoot,
    changeDir,
    schema,
    targets,
  };
}
