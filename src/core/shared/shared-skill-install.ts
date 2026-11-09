/**
 * Writes the one shared copy of OpenSpec's skills to `.agents/skills/`, links
 * it into the own folder of each tool that doesn't read that folder, and moves
 * skills earlier releases wrote into each tool's own folder out of the way.
 *
 * Nothing the user wrote or changed is removed: a link spot or an old copy is
 * replaced only when it is empty, already a link to the shared copy, equal to
 * the shared copy, or untouched output of an earlier release.
 */
import path from 'path';
import * as fs from 'fs';
import { OPENSPEC_SKILL_NAMES, type AIToolOption } from '../config.js';
import { shouldGenerateSkillsForTool } from '../command-surface.js';
import type { Delivery } from '../global-config.js';
import type { FileView } from '../file-view.js';
import type { UpdateFileOps } from '../update-plan.js';
import { transformToSharedSkillReferences } from '../../utils/command-references.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { formatSkillToolList, skillToolListPath } from '../shared-skill-target.js';
import { generateSkillContent, getSkillTemplates } from './skill-generation.js';
import { classifySkillFile, classifySkillLinkSpot } from './skill-links.js';
import { resolveFormerOwnSkillsDir, resolveSharedSkillsDir, resolveSkillLinkDir, usesSharedSkills } from './skill-paths.js';

/**
 * The shared copy's content for each skill of the given workflows (every
 * workflow when omitted), by folder name. A skill's text depends on which
 * other workflows are installed, so render it for the set actually written.
 */
export function sharedSkillContents(version: string, workflows?: readonly string[]): Map<string, string> {
  return new Map(
    getSkillTemplates(workflows).map(({ template, dirName }) => [
      dirName,
      generateSkillContent(template, version, transformToSharedSkillReferences),
    ])
  );
}

export interface SharedSkillInstallInput {
  projectPath: string;
  /** Every tool set up in the project; tools that keep their own folder are ignored. */
  tools: readonly AIToolOption[];
  delivery: Delivery;
  /** The OpenSpec version stamped into each skill. */
  version: string;
  /** The workflows a tool should have, from its profile (or a legacy override). */
  workflowsFor: (toolId: string) => readonly string[];
  ops: UpdateFileOps;
  /** The tree as this run has it so far. */
  view: FileView;
  /** Whether this run writes to disk (false for a dry run). */
  writesToDisk: boolean;
}

export interface SharedSkillInstallResult {
  /** Skills written to `.agents/skills/`. */
  writtenSkillCount: number;
  /** Shared skills removed because no set-up tool needs them any more. */
  removedSkillCount: number;
  /** Untouched copies earlier releases left in tools' own folders, removed or replaced by a link. */
  replacedOldCopyCount: number;
  /** Project-relative folders kept because they hold something of the user's. */
  kept: string[];
  /**
   * Tools whose own skills folder could not be brought up to date (for
   * example it is a link out of the project). The shared copy is still
   * written; only these tools fail.
   */
  toolFailures: Map<string, Error>;
}

const toPosix = (p: string) => p.split(path.sep).join('/');

/**
 * Brings `.agents/skills/` and the tools' own skill folders to the state the
 * set-up tools need. Run once per `init` or `update`, before any tool's
 * former-root migration (which needs the shared copy in place).
 */
export async function installSharedSkills(input: SharedSkillInstallInput): Promise<SharedSkillInstallResult> {
  const { projectPath, delivery, ops, view } = input;
  const tools = input.tools.filter(usesSharedSkills);
  const result: SharedSkillInstallResult = {
    writtenSkillCount: 0,
    removedSkillCount: 0,
    replacedOldCopyCount: 0,
    kept: [],
    toolFailures: new Map(),
  };
  if (tools.length === 0) return result;

  const sharedDir = resolveSharedSkillsDir(projectPath);
  const skillTools = tools.filter((tool) => shouldGenerateSkillsForTool(tool.value, delivery));
  const workflows = [...new Set(skillTools.flatMap((tool) => [...input.workflowsFor(tool.value)]))];
  // Wanted skills as written now; any other skill as a full install renders it,
  // only to recognize a copy of it.
  const contents = new Map([
    ...sharedSkillContents(input.version),
    ...(workflows.length > 0 ? sharedSkillContents(input.version, workflows) : []),
  ]);
  const wanted = new Set(getSkillTemplates(workflows).map(({ dirName }) => dirName));
  const relative = (p: string) => toPosix(path.relative(projectPath, p));

  // 1. The one shared copy, and the list of tools set up here.
  for (const dirName of wanted) {
    const skillFile = path.join(sharedDir, dirName, 'SKILL.md');
    FileSystemUtils.assertPathWithin(projectPath, skillFile);
    await ops.writeFile(skillFile, contents.get(dirName)!, 'openspec');
    result.writtenSkillCount += 1;
  }
  for (const skillName of OPENSPEC_SKILL_NAMES) {
    if (wanted.has(skillName)) continue;
    const skillDir = path.join(sharedDir, skillName);
    if (view.exists(skillDir)) {
      await ops.removeDirectory(skillDir, 'openspec');
      result.removedSkillCount += 1;
    }
  }
  const listPath = skillToolListPath(projectPath);
  if (wanted.size > 0) {
    await ops.writeFile(listPath, formatSkillToolList(tools.map((tool) => tool.value)), 'openspec');
  } else if (view.exists(listPath)) {
    // No tool needs skills (commands-only delivery): each tool's command files
    // already show it is set up.
    await ops.removeFile(listPath, 'openspec');
  }

  // 2. Each tool's own skills folder: links for the tools that need them, and
  //    old copies out of the way everywhere else.
  for (const tool of tools) {
    const linkDir = resolveSkillLinkDir(projectPath, tool);
    const ownDir = linkDir ?? resolveFormerOwnSkillsDir(projectPath, tool);
    if (!ownDir) continue;
    try {
      await settleOwnSkillsFolder(tool, ownDir, linkDir);
    } catch (error) {
      result.toolFailures.set(tool.value, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function settleOwnSkillsFolder(tool: AIToolOption, ownDir: string, linkDir: string | undefined) {
    // The folder itself must stay in the project: one linked elsewhere is
    // refused, as every other write is. A single skill's link is the user's
    // business and is classified (and kept) below.
    FileSystemUtils.assertPathWithin(projectPath, ownDir);
    const linksWanted = linkDir !== undefined && skillTools.includes(tool);
    for (const skillName of OPENSPEC_SKILL_NAMES) {
      const spotPath = path.join(ownDir, skillName);
      const spot = classifySkillLinkSpot(spotPath, path.join(sharedDir, skillName), contents.get(skillName) ?? '', view);
      if (spot === 'missing') {
        if (linksWanted && wanted.has(skillName)) {
          await ops.linkSkill(spotPath, path.join(sharedDir, skillName), tool.value);
        }
        continue;
      }
      if (spot === 'user') {
        // A tool that reads `.agents/skills` would load an untouched old
        // SKILL.md here a second time; the user's other files stay.
        const skillFile = classifySkillFile(spotPath, contents.get(skillName) ?? '', view);
        if (!linkDir && (skillFile === 'copy' || skillFile === 'released')) {
          await ops.removeFile(path.join(spotPath, 'SKILL.md'), tool.value);
          if (skillFile === 'released') result.replacedOldCopyCount += 1;
          continue;
        }
        result.kept.push(relative(spotPath));
        continue;
      }
      if (linksWanted && wanted.has(skillName)) {
        // A link already in place stays; an old or fallback copy becomes one.
        if (spot !== 'link') {
          await ops.linkSkill(spotPath, path.join(sharedDir, skillName), tool.value);
          if (spot === 'released') result.replacedOldCopyCount += 1;
        }
        continue;
      }
      // Not wanted here: a tool that reads `.agents/skills` would load an old
      // copy twice, and a deselected skill's link points at nothing.
      if (spot === 'link' && !linkDir) continue; // someone else's link; not ours to remove
      await ops.removeDirectory(spotPath, tool.value);
      if (spot === 'released') result.replacedOldCopyCount += 1;
    }
    if (input.writesToDisk) removeIfEmpty(ownDir);
  }

  if (input.writesToDisk && wanted.size === 0) {
    removeIfEmpty(sharedDir);
    removeIfEmpty(path.dirname(sharedDir));
  }
  return result;
}

function removeIfEmpty(dir: string): void {
  try {
    if (fs.lstatSync(dir).isDirectory() && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {
    // Missing or not removable: nothing to tidy.
  }
}

/**
 * Whether a tool's own skills folder is not yet how `installSharedSkills`
 * leaves it: a link missing or still an old copy for a skill the tool needs,
 * a link or untouched copy left for one it doesn't, or an untouched old copy
 * in a tool that reads `.agents/skills` (which would load it twice). A folder
 * holding the user's own changes is never reported, so a kept edit does not
 * make every update think there is work to do.
 */
export function ownSkillFolderNeedsWork(
  projectPath: string,
  tool: AIToolOption,
  linkedSkillNames: ReadonlySet<string>,
  view: FileView
): boolean {
  if (!usesSharedSkills(tool)) return false;
  const linkDir = resolveSkillLinkDir(projectPath, tool);
  const ownDir = linkDir ?? resolveFormerOwnSkillsDir(projectPath, tool);
  if (!ownDir) return false;
  const sharedDir = resolveSharedSkillsDir(projectPath);
  for (const skillName of OPENSPEC_SKILL_NAMES) {
    let sharedContent = '';
    try {
      sharedContent = view.read(path.join(sharedDir, skillName, 'SKILL.md'));
    } catch {
      // No shared copy of this skill: nothing at the spot can equal it.
    }
    const spot = classifySkillLinkSpot(path.join(ownDir, skillName), path.join(sharedDir, skillName), sharedContent, view);
    if (spot === 'user') {
      const skillFile = classifySkillFile(path.join(ownDir, skillName), sharedContent, view);
      if (!linkDir && (skillFile === 'copy' || skillFile === 'released')) return true;
      continue;
    }
    const wanted = linkDir !== undefined && linkedSkillNames.has(skillName);
    if (wanted ? spot === 'missing' || spot === 'released' : spot !== 'missing' && !(spot === 'link' && !linkDir)) {
      return true;
    }
  }
  return false;
}
