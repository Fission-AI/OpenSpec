/**
 * Finds and removes files an earlier OpenSpec release generated at a path the
 * current release never writes — a command folder a tool stopped reading, a
 * prompt format a tool dropped — when the file is still exactly what that
 * release wrote AND the tool it belongs to already has its current
 * replacement in place. Such a file holds nothing of the user's and does
 * nothing the replacement does not, and without this sweep it would sit in
 * the project forever, often as a second, stale copy of a workflow.
 */
import path from 'path';
import { promises as fs } from 'fs';
import { AI_TOOLS, SKILL_LINKED_TOOL_IDS } from './config.js';
import { CommandAdapterRegistry } from './command-generation/index.js';
import { ALL_WORKFLOWS } from './profiles.js';
import { WORKFLOW_TO_SKILL_DIR } from './profile-sync-drift.js';
import { COMMAND_IDS } from './shared/tool-detection.js';
import { isReleasedGeneratedContent } from './shared/generated-fingerprint.js';
import { RELEASED_GENERATED_PATHS } from './shared/released-generated-fingerprints.js';
import { LEGACY_TOOL_ROOTS, legacyCommandPath } from './migration.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { DISK_VIEW, type FileView } from './file-view.js';
import { isToolListed } from './shared-skill-target.js';
import { SHARED_SKILLS_ROOT, usesSharedSkills } from './shared/skill-paths.js';

const SHARED_TARGET_MARKER = '.openspec-target';

const toPosix = (p: string) => p.split(path.sep).join('/').replace(/\\/g, '/');
const topFolder = (rel: string) => rel.split('/')[0];

/**
 * Project-relative paths the current release writes for one tool and no other:
 * its links (or its own skills, for a tool that keeps its own folder) and its
 * commands. The shared copy in `.agents/skills/` belongs to every tool, so it
 * is not evidence that any one of them is set up.
 */
function toolSpecificPathsForTool(toolId: string): string[] {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool) return [];
  const paths: string[] = [];
  const ownSkillsRoot = !tool.skillsDir || tool.globalSkillsDir
    ? undefined
    : !usesSharedSkills(tool)
      ? tool.skillsDir
      : SKILL_LINKED_TOOL_IDS.has(tool.value) && tool.skillsDir !== SHARED_SKILLS_ROOT
        ? tool.skillsDir
        : undefined;
  if (ownSkillsRoot) {
    for (const workflow of ALL_WORKFLOWS) {
      const skillDir = `${ownSkillsRoot}/skills/${WORKFLOW_TO_SKILL_DIR[workflow]}`;
      // A link, or the plain copy made where a link can't be.
      paths.push(skillDir, `${skillDir}/SKILL.md`);
    }
  }
  const adapter = CommandAdapterRegistry.get(tool.value);
  if (adapter) {
    for (const commandId of COMMAND_IDS) {
      const file = adapter.getFilePath(commandId);
      if (!path.isAbsolute(file)) paths.push(toPosix(file));
    }
  }
  return paths;
}

/** Project-relative paths the current release can write for one tool. */
function currentPathsForTool(toolId: string): string[] {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool) return [];
  const paths = toolSpecificPathsForTool(toolId);
  if (usesSharedSkills(tool)) {
    for (const workflow of ALL_WORKFLOWS) {
      paths.push(`${SHARED_SKILLS_ROOT}/skills/${WORKFLOW_TO_SKILL_DIR[workflow]}/SKILL.md`);
    }
  }
  return paths;
}

/**
 * Every project-relative path the current release can write for any tool,
 * workflow and delivery. The sweep never touches these, whatever they hold.
 */
export function currentGeneratablePaths(): Set<string> {
  const paths = new Set<string>();
  for (const tool of AI_TOOLS) {
    for (const p of currentPathsForTool(tool.value)) paths.add(p);
  }
  paths.add(`${SHARED_SKILLS_ROOT}/skills/${SHARED_TARGET_MARKER}`);
  for (const tool of AI_TOOLS) {
    // Releases before 2.0 kept this file in every shared skills root.
    if (tool.skillsDir && !tool.globalSkillsDir && !usesSharedSkills(tool)) {
      paths.add(`${tool.skillsDir}/skills/${SHARED_TARGET_MARKER}`);
    }
  }
  return paths;
}

/** Every former root of a tool, from both lists that record one. */
function formerRoots(toolId: string): string[] {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  return [
    ...new Set([
      ...(LEGACY_TOOL_ROOTS[toolId] ?? []).map((legacy) => legacy.root),
      ...(tool?.legacySkillsDirs ?? []),
    ]),
  ];
}

/** Which tools a top-level folder belongs to, now or formerly. */
function folderOwners(): Map<string, Set<string>> {
  const owners = new Map<string, Set<string>>();
  const add = (folder: string | undefined, toolId: string) => {
    if (!folder) return;
    if (!owners.has(folder)) owners.set(folder, new Set());
    owners.get(folder)!.add(toolId);
  };
  for (const tool of AI_TOOLS) {
    add(tool.skillsDir, tool.value);
    for (const root of formerRoots(tool.value)) add(root, tool.value);
    for (const p of toolSpecificPathsForTool(tool.value)) add(topFolder(p), tool.value);
  }
  return owners;
}

/**
 * Files under a former root that the root migration manages: it moves them
 * when a tool still needs them, and asks first where the old root may still
 * be live. While any is still there, the sweep leaves that whole root alone.
 */
function migrationManagedPaths(toolId: string, root: string): string[] {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  const paths = Object.values(WORKFLOW_TO_SKILL_DIR).map((dir) => `${root}/skills/${dir}/SKILL.md`);
  const adapter = CommandAdapterRegistry.get(toolId);
  if (adapter && tool?.skillsDir) {
    for (const commandId of COMMAND_IDS) {
      const legacy = legacyCommandPath(adapter.getFilePath(commandId), tool.skillsDir, root);
      if (legacy) paths.push(toPosix(legacy));
    }
  }
  return paths;
}

/**
 * Project-relative paths of files left by an earlier release that the current
 * release no longer writes, that nobody has edited since, and whose tool
 * already has its replacement. Every tool that owns the file's top-level
 * folder must have current OpenSpec output in the project; a former root is
 * left alone while the root migration still has files to move there. A path
 * that passes through a link anywhere is never reported, so removing what
 * this returns can only ever remove that literal file. `view` is the tree as
 * this update has it so far, so a dry run sees what it has already planned.
 */
export async function findStaleReleasedFiles(
  projectPath: string,
  view: FileView = DISK_VIEW
): Promise<string[]> {
  const current = currentGeneratablePaths();
  const owners = folderOwners();
  const exists = (rel: string) => view.exists(path.join(projectPath, ...rel.split('/')));
  const hasReplacement = new Map<string, boolean>();
  const replaced = (toolId: string) => {
    if (!hasReplacement.has(toolId)) {
      // Its own current files, or being listed as set up (a skills-only tool
      // that reads `.agents/skills` has nothing else of its own).
      hasReplacement.set(
        toolId,
        toolSpecificPathsForTool(toolId).some(exists) || isToolListed(projectPath, toolId, view)
      );
    }
    return hasReplacement.get(toolId)!;
  };
  const migrationPending = (folder: string) =>
    AI_TOOLS.some(
      (tool) =>
        formerRoots(tool.value).includes(folder) &&
        migrationManagedPaths(tool.value, folder).some(exists)
    );

  const root = FileSystemUtils.canonicalizeExistingPath(projectPath);
  const stale: string[] = [];
  for (const rel of RELEASED_GENERATED_PATHS) {
    if (current.has(rel)) continue;
    const folderOwnerIds = owners.get(topFolder(rel));
    if (!folderOwnerIds || folderOwnerIds.size === 0) continue;
    if (![...folderOwnerIds].every(replaced)) continue;
    if (migrationPending(topFolder(rel))) continue;
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
