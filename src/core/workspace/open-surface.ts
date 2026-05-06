import * as nodeFs from 'node:fs';
import * as path from 'node:path';

import { FileSystemUtils } from '../../utils/file-system.js';
import {
  WorkspaceLocalState,
  WorkspaceSharedState,
  getWorkspaceCodeWorkspacePath,
  getWorkspacePortableIgnorePatterns,
} from './foundation.js';

const fs = nodeFs.promises;

export const WORKSPACE_GUIDANCE_START_MARKER = '<!-- OPENSPEC:WORKSPACE-GUIDANCE:START -->';
export const WORKSPACE_GUIDANCE_END_MARKER = '<!-- OPENSPEC:WORKSPACE-GUIDANCE:END -->';

export const WORKSPACE_GUIDANCE_BODY = `# OpenSpec Workspace Guidance

This directory is an OpenSpec workspace for planning across linked repos or folders.

- Use \`changes/\` for workspace-level planning.
- Linked repos and folders are available for exploration and planning.
- Repo or folder visibility supports exploration and planning.
- Make implementation edits after the user explicitly asks for implementation work.
- Treat linked repos and folders as the implementation homes for their owned code.
- Use OpenSpec workspace commands instead of hand-editing \`.openspec-workspace/*.yaml\`.`;

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

export function buildWorkspaceGuidanceBlock(): string {
  return `${WORKSPACE_GUIDANCE_START_MARKER}
${WORKSPACE_GUIDANCE_BODY}
${WORKSPACE_GUIDANCE_END_MARKER}`;
}

export function applyWorkspaceGuidanceBlock(existingContent: string): string {
  const block = buildWorkspaceGuidanceBlock();
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
  links: WorkspaceOpenLink[]
): string {
  const folders = [
    {
      path: '.',
    },
    ...links.map((link) => ({
      name: link.name,
      path: link.path,
    })),
  ];

  return `${JSON.stringify({ folders }, null, 2)}\n`;
}

export async function writeWorkspaceCodeWorkspaceFile(
  codeWorkspacePath: string,
  links: WorkspaceOpenLink[]
): Promise<void> {
  await FileSystemUtils.writeFile(codeWorkspacePath, buildWorkspaceCodeWorkspaceContent(links));
}

export async function resolveWorkspaceOpenLinks(
  sharedState: WorkspaceSharedState,
  localState: WorkspaceLocalState
): Promise<WorkspaceOpenSurfaceLinks> {
  const links: WorkspaceOpenLink[] = [];
  const skipped: WorkspaceSkippedOpenLink[] = [];

  for (const linkName of Object.keys(sharedState.links).sort((a, b) => a.localeCompare(b))) {
    const localPath = localState.paths[linkName] ?? null;

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

async function syncWorkspaceGuidance(workspaceRoot: string): Promise<void> {
  const agentsPath = path.join(workspaceRoot, 'AGENTS.md');
  const existingContent = (await fileExists(agentsPath))
    ? await fs.readFile(agentsPath, 'utf-8')
    : '';

  await FileSystemUtils.writeFile(agentsPath, applyWorkspaceGuidanceBlock(existingContent));
}

async function syncWorkspaceCodeWorkspace(
  workspaceRoot: string,
  sharedState: WorkspaceSharedState,
  links: WorkspaceOpenLink[]
): Promise<void> {
  await writeWorkspaceCodeWorkspaceFile(
    getWorkspaceCodeWorkspacePath(workspaceRoot, sharedState.name),
    links
  );
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
  sharedState: WorkspaceSharedState,
  localState: WorkspaceLocalState
): Promise<WorkspaceOpenSurfaceLinks> {
  const openLinks = await resolveWorkspaceOpenLinks(sharedState, localState);

  await syncWorkspaceGuidance(workspaceRoot);
  await syncWorkspaceCodeWorkspace(workspaceRoot, sharedState, openLinks.links);
  await syncWorkspaceIgnoreRules(workspaceRoot, sharedState.name);

  return openLinks;
}
