/**
 * Tools OpenSpec no longer supports. A retired tool is not offered by `init`,
 * is not set up, and is not counted as configured. Projects that still hold
 * the files an earlier release wrote for it have those files cleaned up the
 * same way as everything else: what OpenSpec generated is removed, anything
 * the user edited is kept and listed.
 */
import path from 'path';
import { OPENSPEC_SKILL_NAMES, RETIRED_TOOLS, type RetiredTool } from './config.js';
import { reconcileCommandFiles } from './shared/command-reconcile.js';
import { classifySkillFile } from './shared/skill-links.js';
import { reachesWithoutLink } from './legacy-cleanup.js';
import { pruneEmptyParents } from './released-output-sweep.js';
import { ALL_WORKFLOWS } from './profiles.js';
import type { FileView } from './file-view.js';

export { RETIRED_TOOLS, findRetiredTool, formatRetiredToolError, type RetiredTool } from './config.js';

export interface RetiredToolCleanup {
  tool: RetiredTool;
  /** Project-relative files removed (or, in a dry run, planned). */
  removed: string[];
  /** Project-relative files kept because they were edited or could not be checked. */
  kept: string[];
}

export interface RetiredToolIo {
  view: FileView;
  /** Deletes one file. `update --dry-run` passes its recorder. */
  remove(fullPath: string): Promise<void>;
  /** Whether empty folders left behind are removed (false in a dry run). */
  prune: boolean;
}

/**
 * Removes the files earlier releases generated for every retired tool still
 * present in the project: its command files (equal to what OpenSpec generated
 * for it, in any release) and its skill copies (exactly as a release wrote
 * them). Anything else in the tool's folder is the user's and stays. Nothing
 * is read or removed through a link.
 */
export async function cleanUpRetiredTools(
  projectPath: string,
  io: RetiredToolIo
): Promise<RetiredToolCleanup[]> {
  const results: RetiredToolCleanup[] = [];
  for (const tool of RETIRED_TOOLS) {
    const folder = path.join(projectPath, tool.folder);
    if (!io.view.exists(folder) || !(await reachesWithoutLink(projectPath, tool.folder))) continue;

    const commands = await reconcileCommandFiles(projectPath, tool.id, ALL_WORKFLOWS, {
      view: io.view,
      remove: io.remove,
    });
    const removed = [...commands.removed];
    const kept = [...commands.kept, ...commands.unchecked];

    for (const skillName of OPENSPEC_SKILL_NAMES) {
      const rel = `${tool.folder}/skills/${skillName}`;
      const skillDir = path.join(projectPath, ...rel.split('/'));
      if (!io.view.exists(skillDir)) continue;
      if (!(await reachesWithoutLink(projectPath, rel))) {
        kept.push(rel);
        continue;
      }
      // No current copy exists for a retired tool: only a release's own
      // output counts as untouched.
      const spot = classifySkillFile(skillDir, [], io.view);
      if (spot === 'released') {
        await io.remove(path.join(skillDir, 'SKILL.md'));
        removed.push(`${rel}/SKILL.md`);
      } else if (spot !== 'missing') {
        kept.push(`${rel}/SKILL.md`);
      }
    }

    if (removed.length === 0 && kept.length === 0) continue;
    if (io.prune) {
      await pruneEmptyParents(projectPath, removed.map((rel) => rel.split(path.sep).join('/')));
    }
    results.push({ tool, removed, kept });
  }
  return results;
}

/** What `init` and `update` print after cleaning up a retired tool. */
export function formatRetiredToolCleanup(result: RetiredToolCleanup): string[] {
  const { tool, removed, kept } = result;
  const lines = [
    `${tool.name} is no longer supported: ${tool.reason}. Set up ${tool.successor} instead: openspec init --tools ${tool.successor}`,
  ];
  if (removed.length > 0) {
    lines.push(
      `  Removed ${removed.length} OpenSpec ${removed.length === 1 ? 'file' : 'files'} from ${tool.folder}/.`
    );
  }
  if (kept.length > 0) {
    lines.push(
      `  Kept ${kept.length} ${kept.length === 1 ? 'file' : 'files'} in ${tool.folder}/ that ${
        kept.length === 1 ? 'differs' : 'differ'
      } from what OpenSpec generated (likely edited); delete ${kept.length === 1 ? 'it' : 'them'} when you're done:`,
      ...kept.map((rel) => `    ${rel}`)
    );
  }
  return lines;
}

