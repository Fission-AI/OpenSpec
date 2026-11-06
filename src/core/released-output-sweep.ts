/**
 * Finds and removes files an earlier OpenSpec release generated at a path the
 * current release never writes — a command folder a tool stopped reading, a
 * prompt format a tool dropped — when the file is still exactly what that
 * release wrote. Such a file holds nothing of the user's, and without this
 * sweep it would sit in the project forever, often as a second, stale copy of
 * a skill the agent now loads from somewhere else.
 */
import path from 'path';
import { promises as fs } from 'fs';
import { AI_TOOLS } from './config.js';
import { CommandAdapterRegistry } from './command-generation/index.js';
import { ALL_WORKFLOWS } from './profiles.js';
import { WORKFLOW_TO_SKILL_DIR } from './profile-sync-drift.js';
import { COMMAND_IDS } from './shared/tool-detection.js';
import { isReleasedGeneratedContent } from './shared/generated-fingerprint.js';
import { RELEASED_GENERATED_PATHS } from './shared/released-generated-fingerprints.js';
import { LEGACY_TOOL_ROOTS } from './migration.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { DISK_VIEW, type FileView } from './file-view.js';

const SHARED_TARGET_MARKER = '.openspec-target';

const toPosix = (p: string) => p.split(path.sep).join('/').replace(/\\/g, '/');

/**
 * Every project-relative path the current release can write for any tool,
 * workflow and delivery. The sweep never touches these, whatever they hold.
 */
export function currentGeneratablePaths(): Set<string> {
  const paths = new Set<string>();
  for (const tool of AI_TOOLS) {
    if (tool.skillsDir && !tool.globalSkillsDir) {
      for (const workflow of ALL_WORKFLOWS) {
        paths.add(`${tool.skillsDir}/skills/${WORKFLOW_TO_SKILL_DIR[workflow]}/SKILL.md`);
      }
      paths.add(`${tool.skillsDir}/skills/${SHARED_TARGET_MARKER}`);
    }
    const adapter = CommandAdapterRegistry.get(tool.value);
    if (!adapter) continue;
    for (const commandId of COMMAND_IDS) {
      const file = adapter.getFilePath(commandId);
      if (!path.isAbsolute(file)) paths.add(toPosix(file));
    }
  }
  return paths;
}

/**
 * Paths the sweep leaves to the former-root migration, which moves files a
 * tool still needs and asks before leaving a root that may still be live:
 * every former root's skills, and everything under a root whose move needs
 * consent until that move has happened (no OpenSpec skill is left there).
 */
function isLeftToMigration(projectPath: string, rel: string, view: FileView): boolean {
  for (const roots of Object.values(LEGACY_TOOL_ROOTS)) {
    for (const legacy of roots) {
      if (!rel.startsWith(`${legacy.root}/`)) continue;
      if (rel.startsWith(`${legacy.root}/skills/`)) return true;
      if (legacy.needsConsent && hasOpenSpecSkills(path.join(projectPath, legacy.root, 'skills'), view)) {
        return true;
      }
    }
  }
  return false;
}

function hasOpenSpecSkills(skillsDir: string, view: FileView): boolean {
  return Object.values(WORKFLOW_TO_SKILL_DIR).some((dir) =>
    view.exists(path.join(skillsDir, dir, 'SKILL.md'))
  );
}

/**
 * Project-relative paths of files left by an earlier release that the current
 * release no longer writes and that nobody has edited since. A path that
 * passes through a link anywhere — to outside the project, or from a former
 * root to the current one — is never reported, so removing what this returns
 * can only ever remove that literal file. `view` is the tree as this update
 * has it so far, so a dry run sees the moves it has already planned.
 */
export async function findStaleReleasedFiles(
  projectPath: string,
  view: FileView = DISK_VIEW
): Promise<string[]> {
  const current = currentGeneratablePaths();
  const root = FileSystemUtils.canonicalizeExistingPath(projectPath);
  const stale: string[] = [];
  for (const rel of RELEASED_GENERATED_PATHS) {
    if (current.has(rel) || isLeftToMigration(projectPath, rel, view)) continue;
    const file = path.join(projectPath, ...rel.split('/'));
    const literal = path.join(root, ...rel.split('/'));
    try {
      if (!view.exists(file)) continue;
      if (!(await fs.lstat(literal)).isFile()) continue;
      if (FileSystemUtils.canonicalizeExistingPath(literal) !== literal) continue;
      if (isReleasedGeneratedContent(view.read(file))) stale.push(rel);
    } catch {
      // Missing or unreadable: nothing to remove.
    }
  }
  return stale;
}

/**
 * Removes every folder the given removals left empty, walking up from each
 * file toward (never including) the project root. A folder that still holds
 * anything else stops the walk and is kept.
 */
export async function pruneEmptyParents(projectPath: string, removed: readonly string[]): Promise<void> {
  const root = FileSystemUtils.canonicalizeExistingPath(projectPath);
  for (const rel of removed) {
    let dir = path.dirname(path.join(root, ...rel.split('/')));
    while (dir !== root && dir.startsWith(root + path.sep)) {
      try {
        await fs.rmdir(dir); // fails unless empty
      } catch {
        break;
      }
      dir = path.dirname(dir);
    }
  }
}
