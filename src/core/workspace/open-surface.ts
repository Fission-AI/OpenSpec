import * as nodeFs from 'node:fs';
import * as path from 'node:path';

import { FileSystemUtils } from '../../utils/file-system.js';
import {
  WorkspaceViewState,
  getWorkspaceContextInitiativeId,
  getWorkspaceCodeWorkspacePath,
  getWorkspacePortableIgnorePatterns,
} from './foundation.js';

const fs = nodeFs.promises;

export const WORKSPACE_GUIDANCE_START_MARKER = '<!-- OPENSPEC:WORKSPACE-GUIDANCE:START -->';
export const WORKSPACE_GUIDANCE_END_MARKER = '<!-- OPENSPEC:WORKSPACE-GUIDANCE:END -->';

export const WORKSPACE_GUIDANCE_BODY = `# OpenSpec Workspace Guidance

This directory is an OpenSpec workspace: a local working view over context stores, initiatives, repos, and folders.

- Use this workspace to open the local view of coordinated work.
- Use initiatives for durable cross-team or cross-repo intent, decisions, requirements, and coordination context.
- Use repo-local OpenSpec changes for implementation plans owned by a repo or team.
- Use linked repos and folders to inspect context, understand ownership, and make edits in the place that owns the work.
- Keep workspace-local files focused on local paths, opener state, agent setup, and other machine-specific view state.
- Use OpenSpec workspace commands instead of hand-editing \`workspace.yaml\`.
- If this workspace contains legacy or beta workspace-level planning files, treat them as compatibility context unless the user explicitly asks to use that beta flow.`;

export interface WorkspaceOpenResolvedContext {
  contextStore: {
    id: string;
    root: string;
  };
  initiative: {
    id: string;
    title: string;
    root: string;
    metadataPath: string;
    storePath: string;
  };
}

export interface WorkspaceOpenLink {
  name: string;
  path: string;
}

export interface WorkspaceSkippedOpenLink {
  name: string;
  path: string | null;
  reason: 'missing-local-path' | 'path-missing';
}

export interface WorkspaceOpenSurfaceLinks {
  links: WorkspaceOpenLink[];
  skipped: WorkspaceSkippedOpenLink[];
}

export interface WorkspaceOpenSurfaceGeneration {
  agentsPath: string;
  codeWorkspacePath: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    return (await fs.stat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}

function formatGuidancePathList(items: Array<{ label: string; path: string }>): string {
  if (items.length === 0) {
    return '- None selected yet.';
  }

  return items.map((item) => `- ${item.label}: ${item.path}`).join('\n');
}

function buildWorkspaceContextGuidance(
  viewState: WorkspaceViewState,
  resolvedContext?: WorkspaceOpenResolvedContext | null
): string {
  const linkedRoots = Object.entries(viewState.links)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, linkPath]) => ({ label: name, path: linkPath }));

  if (!viewState.context) {
    return `## Local View

This workspace is not bound to an initiative. It is still a first-class local view over selected repos or folders.

## Linked Implementation Context

${formatGuidancePathList(linkedRoots)}`;
  }

  const storedContextSelector = viewState.context.store.selector;
  const storedContextStore = viewState.context
    ? storedContextSelector?.kind === 'path'
      ? `${viewState.context.store.id} via ${storedContextSelector.path}`
      : viewState.context.store.id
    : null;
  const storedInitiativeId = viewState.context
    ? getWorkspaceContextInitiativeId(viewState.context)
    : null;
  const contextLines = resolvedContext
    ? [
        `- Context store: ${resolvedContext.contextStore.id} (${resolvedContext.contextStore.root})`,
        `- Initiative: ${resolvedContext.initiative.id} (${resolvedContext.initiative.root})`,
        `- Initiative title: ${resolvedContext.initiative.title}`,
        `- Initiative metadata: ${resolvedContext.initiative.metadataPath}`,
        '- Broader context may exist in the context store, but this workspace opens the selected initiative by default.',
      ].join('\n')
    : [
        `- Context store: ${storedContextStore}`,
        `- Initiative: ${storedInitiativeId}`,
        '- Run `openspec workspace open --json` to refresh resolved local paths for this view.',
      ].join('\n');

  return `## Selected Initiative Context

${contextLines}

## Advisory Edit Boundaries

- Treat initiative and context-store files as shared coordination context.
- Treat linked repos and folders as local implementation context when the user has selected them.
- These boundaries are advisory in this OpenSpec version; use judgment and repo ownership when editing.

## Linked Implementation Context

${formatGuidancePathList(linkedRoots)}`;
}

export function buildWorkspaceGuidanceBlock(
  viewState?: WorkspaceViewState,
  resolvedContext?: WorkspaceOpenResolvedContext | null
): string {
  const contextGuidance =
    viewState
      ? `\n\n${buildWorkspaceContextGuidance(viewState, resolvedContext)}`
      : '';

  return `${WORKSPACE_GUIDANCE_START_MARKER}
${WORKSPACE_GUIDANCE_BODY}${contextGuidance}
${WORKSPACE_GUIDANCE_END_MARKER}`;
}

export function applyWorkspaceGuidanceBlock(
  existingContent: string,
  viewState?: WorkspaceViewState,
  resolvedContext?: WorkspaceOpenResolvedContext | null
): string {
  const block = buildWorkspaceGuidanceBlock(viewState, resolvedContext);
  const startIndex = existingContent.indexOf(WORKSPACE_GUIDANCE_START_MARKER);
  const endIndex = existingContent.indexOf(WORKSPACE_GUIDANCE_END_MARKER);

  if (startIndex !== -1 || endIndex !== -1) {
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      throw new Error('Invalid OpenSpec workspace guidance marker state in AGENTS.md.');
    }

    const before = existingContent.slice(0, startIndex).trimEnd();
    const after = existingContent
      .slice(endIndex + WORKSPACE_GUIDANCE_END_MARKER.length)
      .trimStart();
    const prefix = before.length > 0 ? `${before}\n\n` : '';
    const suffix = after.length > 0 ? `\n\n${after.trimEnd()}\n` : '\n';
    return `${prefix}${block}${suffix}`;
  }

  if (existingContent.trim().length === 0) {
    return `${block}\n`;
  }

  return `${existingContent.trimEnd()}\n\n${block}\n`;
}

export function buildWorkspaceCodeWorkspaceContent(
  links: WorkspaceOpenLink[],
  resolvedContext?: WorkspaceOpenResolvedContext | null
): string {
  const folders = [
    {
      path: '.',
    },
    ...(resolvedContext
      ? [
          {
            name: `initiative:${resolvedContext.initiative.id}`,
            path: resolvedContext.initiative.root,
          },
        ]
      : []),
    ...links.map((link) => ({
      name: link.name,
      path: link.path,
    })),
  ];

  return `${JSON.stringify({ folders }, null, 2)}\n`;
}

export async function writeWorkspaceCodeWorkspaceFile(
  codeWorkspacePath: string,
  links: WorkspaceOpenLink[],
  resolvedContext?: WorkspaceOpenResolvedContext | null
): Promise<void> {
  await FileSystemUtils.writeFile(
    codeWorkspacePath,
    buildWorkspaceCodeWorkspaceContent(links, resolvedContext)
  );
}

export async function resolveWorkspaceOpenLinks(
  viewState: WorkspaceViewState
): Promise<WorkspaceOpenSurfaceLinks> {
  const links: WorkspaceOpenLink[] = [];
  const skipped: WorkspaceSkippedOpenLink[] = [];

  for (const linkName of Object.keys(viewState.links).sort((a, b) => a.localeCompare(b))) {
    const localPath = viewState.links[linkName] ?? null;

    if (!localPath) {
      skipped.push({
        name: linkName,
        path: null,
        reason: 'missing-local-path',
      });
      continue;
    }

    if (!(await directoryExists(localPath))) {
      skipped.push({
        name: linkName,
        path: localPath,
        reason: 'path-missing',
      });
      continue;
    }

    links.push({
      name: linkName,
      path: localPath,
    });
  }

  return { links, skipped };
}

async function syncWorkspaceGuidance(
  workspaceRoot: string,
  viewState: WorkspaceViewState,
  resolvedContext?: WorkspaceOpenResolvedContext | null
): Promise<string> {
  const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
  const existingContent = (await fileExists(agentsPath))
    ? await fs.readFile(agentsPath, 'utf-8')
    : '';

  await FileSystemUtils.writeFile(
    agentsPath,
    applyWorkspaceGuidanceBlock(existingContent, viewState, resolvedContext)
  );

  return agentsPath;
}

async function syncWorkspaceCodeWorkspace(
  workspaceRoot: string,
  viewState: WorkspaceViewState,
  links: WorkspaceOpenLink[],
  resolvedContext?: WorkspaceOpenResolvedContext | null
): Promise<string> {
  const codeWorkspacePath = getWorkspaceCodeWorkspacePath(workspaceRoot, viewState.name);
  await writeWorkspaceCodeWorkspaceFile(codeWorkspacePath, links, resolvedContext);

  return codeWorkspacePath;
}

async function syncWorkspaceIgnoreRules(
  workspaceRoot: string,
  workspaceName: string
): Promise<void> {
  const gitignorePath = path.join(workspaceRoot, '.gitignore');
  const patterns = getWorkspacePortableIgnorePatterns(workspaceName);
  const existingContent = (await fileExists(gitignorePath))
    ? await fs.readFile(gitignorePath, 'utf-8')
    : '';
  const existingLines = new Set(
    existingContent
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );
  const missingPatterns = patterns.filter((pattern) => !existingLines.has(pattern));

  if (missingPatterns.length === 0) {
    return;
  }

  const prefix = existingContent.length > 0 && !existingContent.endsWith('\n') ? '\n' : '';
  await FileSystemUtils.writeFile(
    gitignorePath,
    `${existingContent}${prefix}${missingPatterns.join('\n')}\n`
  );
}

export async function syncWorkspaceOpenSurface(
  workspaceRoot: string,
  viewState: WorkspaceViewState,
  resolvedContext?: WorkspaceOpenResolvedContext | null
): Promise<WorkspaceOpenSurfaceLinks & { generated: WorkspaceOpenSurfaceGeneration }> {
  const openLinks = await resolveWorkspaceOpenLinks(viewState);
  const agentsPath = await syncWorkspaceGuidance(
    workspaceRoot,
    viewState,
    resolvedContext
  );
  const codeWorkspacePath = await syncWorkspaceCodeWorkspace(
    workspaceRoot,
    viewState,
    openLinks.links,
    resolvedContext
  );

  await syncWorkspaceIgnoreRules(workspaceRoot, viewState.name);

  return {
    ...openLinks,
    generated: {
      agentsPath,
      codeWorkspacePath,
    },
  };
}
