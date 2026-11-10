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
import type { FileView } from '../file-view.js';
import type { UpdateFileOps } from '../update-plan.js';
import { transformToSharedSkillReferences } from '../../utils/command-references.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { formatSkillToolList, hasSkillToolList, readKeptSharedSkills, skillToolListPath } from '../shared-skill-target.js';
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
  const { projectPath, ops, view } = input;
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
  const workflows = [...new Set(tools.flatMap((tool) => [...input.workflowsFor(tool.value)]))];
  // Wanted skills as written now; any other skill as a full install renders it,
  // only to recognize a copy of it.
  const contents = new Map([
    ...sharedSkillContents(input.version),
    ...(workflows.length > 0 ? sharedSkillContents(input.version, workflows) : []),
  ]);
  const wanted = new Set(getSkillTemplates(workflows).map(({ dirName }) => dirName));
  const relative = (p: string) => toPosix(path.relative(projectPath, p));

  // What the shared copy held before this run: a plain copy made where a link
  // couldn't be is still OpenSpec's when it matches that, after a profile
  // change or a new wording.
  const previous = new Map<string, string>();
  for (const skillName of OPENSPEC_SKILL_NAMES) {
    try {
      previous.set(skillName, view.read(path.join(sharedDir, skillName, 'SKILL.md')));
    } catch {
      // No shared copy of this skill yet.
    }
  }
  // Until a project lists its tools, `.agents/skills` is not yet OpenSpec's:
  // an `openspec-*` skill already there (from `npx skills`, or written by
  // hand) is the user's unless it is text OpenSpec wrote. Such a skill is
  // recorded in the list, so later runs keep leaving it alone; deleting it
  // hands the name back to OpenSpec.
  const sharedIsOurs = hasSkillToolList(projectPath, view);
  const previouslyKept = readKeptSharedSkills(projectPath, view);
  // The previous shared text is OpenSpec's only once the folder is, and never
  // for a skill kept as the user's.
  const oursFor = (skillName: string) =>
    [
      contents.get(skillName),
      sharedIsOurs && !previouslyKept.has(skillName) ? previous.get(skillName) : undefined,
    ].filter((text): text is string => text !== undefined);
  const keptShared = new Set<string>();
  const keepAsUsers = (skillName: string) => {
    keptShared.add(skillName);
    if (!previouslyKept.has(skillName)) result.kept.push(relative(path.join(sharedDir, skillName)));
  };
  for (const skillName of OPENSPEC_SKILL_NAMES) {
    const skillDir = path.join(sharedDir, skillName);
    // OpenSpec never links a shared skill: a link there is the user's (a
    // team's skill kept elsewhere), and nothing is written through it.
    if (view.linkTarget?.(skillDir) !== undefined || view.linkTarget?.(path.join(skillDir, 'SKILL.md')) !== undefined) {
      keepAsUsers(skillName);
      continue;
    }
    if (!view.exists(path.join(skillDir, 'SKILL.md'))) continue;
    if (previouslyKept.has(skillName)) {
      keptShared.add(skillName);
    } else if (!sharedIsOurs && classifySkillFile(skillDir, oursFor(skillName), view) === 'user') {
      keepAsUsers(skillName);
    }
  }
  const sharedSpotIsUsers = (skillName: string): boolean => keptShared.has(skillName);
  // A skill's text depends on which workflows are installed beside it, so a
  // skill this run drops is recognized against the set that was installed
  // before: the skills the shared folder held (with and without those kept as
  // the user's).
  const workflowsHeld = (skip: ReadonlySet<string>) =>
    getSkillTemplates()
      .filter(({ dirName }) => previous.has(dirName) && !skip.has(dirName))
      .map(({ workflowId }) => workflowId);
  const renderedBefore = [
    sharedSkillContents(input.version, workflowsHeld(new Set())),
    sharedSkillContents(input.version, workflowsHeld(keptShared)),
  ];

  // 1. The one shared copy, and the list of tools set up here.
  for (const dirName of wanted) {
    if (sharedSpotIsUsers(dirName)) continue;
    const skillFile = path.join(sharedDir, dirName, 'SKILL.md');
    FileSystemUtils.assertPathWithin(projectPath, skillFile);
    await ops.writeFile(skillFile, contents.get(dirName)!, 'openspec');
    result.writtenSkillCount += 1;
  }
  for (const skillName of OPENSPEC_SKILL_NAMES) {
    if (wanted.has(skillName)) continue;
    const skillDir = path.join(sharedDir, skillName);
    if (!view.exists(skillDir) || sharedSpotIsUsers(skillName)) continue;
    // A deselected skill goes; any other file the user keeps beside its
    // SKILL.md stays, and so does a SKILL.md the user edited (it is theirs
    // from now on, recorded as kept).
    // Judged against OpenSpec's text alone, never against what the file held
    // before this run (which it always equals).
    const generated = [contents.get(skillName), ...renderedBefore.map((texts) => texts.get(skillName))].filter(
      (text): text is string => text !== undefined
    );
    if (
      view.isDirectory(skillDir) &&
      view.exists(path.join(skillDir, 'SKILL.md')) &&
      classifySkillFile(skillDir, generated, view) === 'user'
    ) {
      keepAsUsers(skillName);
      continue;
    }
    const spot = classifySkillLinkSpot(skillDir, skillDir, generated, view);
    if (spot === 'user' && view.isDirectory(skillDir)) {
      if (view.exists(path.join(skillDir, 'SKILL.md'))) {
        await ops.removeFile(path.join(skillDir, 'SKILL.md'), 'openspec');
        result.removedSkillCount += 1;
        if (input.writesToDisk) removeIfEmpty(skillDir);
      }
      continue;
    }
    await ops.removeDirectory(skillDir, 'openspec');
    result.removedSkillCount += 1;
  }
  const listPath = skillToolListPath(projectPath);
  // Kept as long as it records a skill of the user's in the shared folder.
  if (wanted.size > 0 || keptShared.size > 0) {
    // Tools that get files of their own this run: links.
    const withOwnFiles = new Set(
      tools
        .filter((tool) => resolveSkillLinkDir(projectPath, tool) !== undefined)
        .map((tool) => tool.value)
    );
    await ops.writeFile(listPath, formatSkillToolList(tools.map((tool) => tool.value), keptShared, withOwnFiles), 'openspec');
  } else if (view.exists(listPath)) {
    // No workflows selected and nothing of the user's to record.
    await ops.removeFile(listPath, 'openspec');
  }

  // 2. Each tool's own skills folder: links for the tools that need them, and
  //    old copies out of the way everywhere else.
  for (const tool of tools) {
    const linkDir = resolveSkillLinkDir(projectPath, tool);
    const ownDir = linkDir ?? resolveFormerOwnSkillsDir(projectPath, tool);
    if (!ownDir) continue;
    // A tool whose own skills folder is the shared one (a link the user made
    // in 1.x to share skills) already reads the shared copy through it.
    if (isSameFolderTree(ownDir, sharedDir)) continue;
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
    const linksWanted = linkDir !== undefined;
    for (const skillName of OPENSPEC_SKILL_NAMES) {
      const spotPath = path.join(ownDir, skillName);
      const spot = classifySkillLinkSpot(spotPath, path.join(sharedDir, skillName), oursFor(skillName), view);
      if (spot === 'missing') {
        if (linksWanted && wanted.has(skillName)) {
          await ops.linkSkill(spotPath, path.join(sharedDir, skillName), tool.value);
        }
        continue;
      }
      if (spot === 'user') {
        // A tool that reads `.agents/skills` would load an untouched old
        // SKILL.md here a second time; the user's other files stay.
        const skillFile = classifySkillFile(spotPath, oursFor(skillName), view);
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
    if (input.writesToDisk) {
      removeIfEmpty(ownDir);
      // The tool's folder too (`.cline/` once `.cline/skills/` is gone), when
      // OpenSpec's skills were all it held. Never the project itself.
      const toolDir = path.dirname(ownDir);
      if (path.resolve(toolDir) !== path.resolve(projectPath)) removeIfEmpty(toolDir);
    }
  }

  if (input.writesToDisk && wanted.size === 0) {
    removeIfEmpty(sharedDir);
    removeIfEmpty(path.dirname(sharedDir));
  }
  return result;
}

/**
 * Whether two folders are, through links, the same folder or one inside the
 * other. Then a tool's own skills folder is the shared one, and settling it
 * would remove the very copy every tool reads.
 */
export function isSameFolderTree(a: string, b: string): boolean {
  let realA: string;
  let realB: string;
  try {
    realA = fs.realpathSync(a);
    realB = fs.realpathSync(b);
  } catch {
    return false;
  }
  return realA === realB || realA.startsWith(realB + path.sep) || realB.startsWith(realA + path.sep);
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
  if (isSameFolderTree(ownDir, sharedDir)) return false;
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
