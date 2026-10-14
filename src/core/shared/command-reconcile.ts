/**
 * Command File Reconciliation
 *
 * Removing generated command files when delivery becomes skills-only.
 */

import * as fs from 'fs';
import { FileSystemUtils } from '../../utils/file-system.js';
import {
  generateCommands,
  CommandAdapterRegistry,
} from '../command-generation/index.js';
import type { GeneratedCommand } from '../command-generation/types.js';
import { ALL_WORKFLOWS } from '../profiles.js';
import { getCommandContents } from './skill-generation.js';
import { normalizeCommandContent } from './tool-detection.js';

export interface CommandReconcileResult {
  /** Project-relative paths of generated command files that were deleted. */
  removed: string[];
  /** Project-relative paths left on disk because they are not our output. */
  kept: string[];
}

/**
 * Deletes a tool's generated command files, keeping back any the user owns.
 *
 * Command files carry no version stamp, so content equality is the only signal
 * for "this is still our generated output". A file that does not match is left
 * on disk and reported, so moving to skills-only delivery can never silently
 * discard a hand-edited command.
 *
 * Content depends on which workflows were installed when a file was written,
 * because cross-workflow references resolve against that set. Three candidate
 * sets are therefore compared: the workflows whose command files are on disk
 * (the closest reconstruction of the original inputs), the set this run is
 * using, and the full set. A file written under a wider or narrower profile
 * than the one now configured still matches.
 */
export async function reconcileCommandFiles(
  projectPath: string,
  toolId: string,
  workflows: readonly string[]
): Promise<CommandReconcileResult> {
  const removed: string[] = [];
  const kept: string[] = [];

  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) return { removed, kept };

  const present = ALL_WORKFLOWS.map((workflow) => {
    const cmdPath = adapter.getFilePath(workflow);
    return {
      workflow,
      cmdPath,
      fullPath: FileSystemUtils.resolveProjectArtifactPath(projectPath, cmdPath),
    };
  }).filter((candidate) => fs.existsSync(candidate.fullPath));

  if (present.length === 0) return { removed, kept };

  const candidateSets = [present.map((entry) => entry.workflow), workflows, ALL_WORKFLOWS];
  const generatedByPath = new Map<string, string[]>();

  for (const workflowSet of candidateSets) {
    let generated: GeneratedCommand[];
    try {
      generated = generateCommands(getCommandContents(workflowSet), adapter);
    } catch {
      // A workflow set this CLI cannot render leaves nothing to compare
      // against; files it would have covered are kept rather than guessed at.
      continue;
    }
    for (const cmd of generated) {
      const variants = generatedByPath.get(cmd.path) ?? [];
      variants.push(normalizeCommandContent(cmd.fileContent));
      generatedByPath.set(cmd.path, variants);
    }
  }

  for (const { cmdPath, fullPath } of present) {
    try {
      const onDisk = normalizeCommandContent(await fs.promises.readFile(fullPath, 'utf-8'));
      if (!(generatedByPath.get(cmdPath) ?? []).includes(onDisk)) {
        kept.push(cmdPath);
        continue;
      }

      await fs.promises.unlink(fullPath);
      removed.push(cmdPath);
    } catch {
      // A file that cannot be read, or cannot be deleted once matched, is still
      // on disk. Report it rather than passing over it in silence: the user
      // needs to know the directory was not fully cleared.
      kept.push(cmdPath);
    }
  }

  return { removed, kept };
}

/**
 * Formats the report for command files `reconcileCommandFiles` kept back.
 * Returns an empty array when nothing was kept.
 */
export function formatKeptCommandFiles(kept: readonly string[]): string[] {
  if (kept.length === 0) return [];

  const plural = kept.length === 1 ? 'file' : 'files';
  return [
    `Kept ${kept.length} command ${plural} that ${
      kept.length === 1 ? 'does' : 'do'
    } not match generated output:`,
    ...kept.map((cmdPath) => `  ${cmdPath}`),
    'Move anything worth keeping into the skill, then delete by hand.',
  ];
}
