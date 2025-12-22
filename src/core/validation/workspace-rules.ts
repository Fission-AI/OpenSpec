import { promises as fs } from 'fs';
import path from 'path';
import type { Workspace } from '../workspace.js';
import type { ValidationIssue, ValidationReport } from './types.js';
import { OPENSPEC_DIR_NAME } from '../config.js';

/**
 * Parse Impact section from proposal.md content
 */
function parseImpactSection(content: string): {
  hasImpact: boolean;
  affectedRepos: string[];
  hasImplementationOrder: boolean;
} {
  const impactMatch = content.match(/## Impact\s*\n([\s\S]*?)(?=\n##|\n$|$)/);
  if (!impactMatch) {
    return { hasImpact: false, affectedRepos: [], hasImplementationOrder: false };
  }

  const impactContent = impactMatch[1];

  // Extract repo names from "Affected repos:" or "- Affected repos:" section
  const repoMatches = impactContent.match(/(?:Affected repos|Affected code|Affected specs):\s*\n([\s\S]*?)(?=\n- Implementation|\n##|\n$|$)/i);
  const affectedRepos: string[] = [];

  if (repoMatches) {
    const repoSection = repoMatches[1];
    // Match repo names like "  - backend:" or "  - mobile: path/to/files"
    const repoLines = repoSection.match(/^\s*-\s*([a-zA-Z0-9_-]+):/gm);
    if (repoLines) {
      for (const line of repoLines) {
        const repoMatch = line.match(/^\s*-\s*([a-zA-Z0-9_-]+):/);
        if (repoMatch) {
          affectedRepos.push(repoMatch[1]);
        }
      }
    }
  }

  const hasImplementationOrder = /implementation order/i.test(impactContent);

  return {
    hasImpact: true,
    affectedRepos,
    hasImplementationOrder,
  };
}

/**
 * Validate a cross-repo change against workspace conventions
 */
export async function validateCrossRepoChange(
  changePath: string,
  workspace: Workspace
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const proposalPath = path.join(changePath, 'proposal.md');
  const changeId = path.basename(changePath);

  let proposalContent: string;
  try {
    proposalContent = await fs.readFile(proposalPath, 'utf-8');
  } catch {
    // No proposal.md - let standard validation handle this
    return issues;
  }

  const impact = parseImpactSection(proposalContent);
  const knownRepoNames = new Set(workspace.repos.map(r => r.name));

  // Check if this appears to be a cross-repo change
  const isCrossRepo = impact.affectedRepos.length > 1 ||
    (impact.affectedRepos.length === 1 && impact.hasImpact);

  if (!isCrossRepo) {
    return issues;
  }

  // Validate Impact section exists for cross-repo changes
  const requireImpact = workspace.conventions?.crossRepoChanges?.requireImpactSection ?? true;
  if (requireImpact && !impact.hasImpact) {
    issues.push({
      level: 'ERROR',
      path: proposalPath,
      message: `Cross-repo change '${changeId}' must include ## Impact section`,
    });
  }

  // Validate referenced repos exist in workspace
  for (const repoName of impact.affectedRepos) {
    if (!knownRepoNames.has(repoName)) {
      issues.push({
        level: 'WARNING',
        path: proposalPath,
        message: `Unknown repo '${repoName}' referenced in Impact section. Check workspace.yaml or fix typo.`,
      });
    }
  }

  // Check for implementation order
  const requireOrder = workspace.conventions?.crossRepoChanges?.requireImplementationOrder ?? false;
  if (impact.affectedRepos.length > 1 && !impact.hasImplementationOrder) {
    issues.push({
      level: requireOrder ? 'ERROR' : 'WARNING',
      path: proposalPath,
      message: `Cross-repo change '${changeId}' should specify implementation order (e.g., "Implementation order: backend first, then mobile")`,
    });
  }

  return issues;
}

/**
 * Validate all changes in workspace for cross-repo conventions
 */
export async function validateWorkspaceChanges(
  workspace: Workspace
): Promise<ValidationReport> {
  const issues: ValidationIssue[] = [];
  const changesDir = path.join(workspace.root, OPENSPEC_DIR_NAME, 'changes');

  try {
    const entries = await fs.readdir(changesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'archive') {
        continue;
      }

      const changePath = path.join(changesDir, entry.name);
      const changeIssues = await validateCrossRepoChange(changePath, workspace);
      issues.push(...changeIssues);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      issues.push({
        level: 'ERROR',
        path: changesDir,
        message: `Failed to read changes directory: ${(error as Error).message}`,
      });
    }
  }

  const errors = issues.filter(i => i.level === 'ERROR').length;
  const warnings = issues.filter(i => i.level === 'WARNING').length;
  const info = issues.filter(i => i.level === 'INFO').length;

  return {
    valid: errors === 0,
    issues,
    summary: { errors, warnings, info },
  };
}
