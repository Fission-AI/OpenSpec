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
  /**
   * Project-relative paths left on disk because they could not be checked or
   * removed: unreadable, undeletable, or a symlink that cannot be proven to stay
   * inside the project. Reported apart from `kept`, since no edit was found.
   */
  unchecked: string[];
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
  const unchecked: string[] = [];

  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) return { removed, kept, unchecked };

  const present: { workflow: string; cmdPath: string; fullPath: string }[] = [];
  for (const workflow of ALL_WORKFLOWS) {
    const cmdPath = adapter.getFilePath(workflow);
    let fullPath: string;
    try {
      fullPath = FileSystemUtils.resolveProjectArtifactPath(projectPath, cmdPath);
    } catch {
      // A symlink that escapes the project or dangles cannot be proven
      // confined. Never read or delete through it, and do not let one such
      // entry abort cleanup of the tool's other command files.
      unchecked.push(cmdPath);
      continue;
    }
    if (fs.existsSync(fullPath)) {
      present.push({ workflow, cmdPath, fullPath });
    }
  }

  if (present.length === 0) return { removed, kept, unchecked };

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
      unchecked.push(cmdPath);
    }
  }

  return { removed, kept, unchecked };
}

/**
 * Formats the report for command files `reconcileCommandFiles` left on disk.
 * Each block is a headline, its paths, then what to do; edits and files that
 * could not be checked are told apart, because the fix for each differs.
 * Returns an empty array when nothing was left behind.
 */
export function formatKeptCommandFiles(
  result: Pick<CommandReconcileResult, 'kept' | 'unchecked'>
): string[][] {
  const blocks: string[][] = [];
  const files = (count: number) => `command ${count === 1 ? 'file' : 'files'}`;

  if (result.kept.length > 0) {
    blocks.push([
      `Kept ${result.kept.length} ${files(result.kept.length)} that ${
        result.kept.length === 1 ? 'does' : 'do'
      } not match generated output:`,
      ...result.kept.map((cmdPath) => `  ${cmdPath}`),
      'Move anything worth keeping into the skill, then delete by hand.',
    ]);
  }

  if (result.unchecked.length > 0) {
    blocks.push([
      `Left ${result.unchecked.length} ${files(result.unchecked.length)} in place because ${
        result.unchecked.length === 1 ? 'it' : 'they'
      } could not be read or removed:`,
      ...result.unchecked.map((cmdPath) => `  ${cmdPath}`),
      'Check the file permissions or symbolic links, then delete by hand.',
    ]);
  }

  return blocks;
}
