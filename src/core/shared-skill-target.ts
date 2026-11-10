import path from 'path';
import { AI_TOOLS, OPENSPEC_SKILL_NAMES, type AIToolOption } from './config.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { DISK_VIEW, type FileView } from './file-view.js';
import { isReleasedGeneratedContent } from './shared/generated-fingerprint.js';
import { SHARED_SKILLS_ROOT, resolveFormerOwnSkillsDir } from './shared/skill-paths.js';

/**
 * `.agents/skills/.openspec-target` lists every tool set up in the project,
 * one id per line. Every tool's skills live in that one folder, so the list is
 * how `update` still knows which tools to keep. Releases before 2.0 wrote a
 * single id there (the one tool that rendered the shared folder); a one-line
 * file reads the same way.
 */
const TOOL_LIST_FILE = '.openspec-target';

/** Path of the list of tools set up in the project. */
export function skillToolListPath(projectPath: string): string {
  return path.join(projectPath, SHARED_SKILLS_ROOT, 'skills', TOOL_LIST_FILE);
}

/**
 * The list file's content: tool ids, sorted, one per line; then a
 * `keep <skill>` line for each `openspec-*` skill in `.agents/skills/` that is
 * the user's (it was there before OpenSpec used the folder), which OpenSpec
 * never writes over or removes.
 */
export function formatSkillToolList(
  toolIds: Iterable<string>,
  keptSkills: Iterable<string> = [],
  toolsWithOwnFiles: ReadonlySet<string> = new Set()
): string {
  return [
    // `own-files`: OpenSpec gave the tool files of its own (commands or
    // links), so deleting them all removes the tool.
    ...[...new Set(toolIds)].sort().map((id) => (toolsWithOwnFiles.has(id) ? `${id} own-files` : id)),
    ...[...new Set(keptSkills)].sort().map((name) => `keep ${name}`),
  ].map((line) => `${line}\n`).join('');
}

/** The listed tools OpenSpec gave files of their own (commands or links). */
export function readListedToolsWithOwnFiles(projectPath: string, view: FileView = DISK_VIEW): Set<string> {
  const listPath = skillToolListPath(projectPath);
  try {
    FileSystemUtils.assertProjectArtifactPath(projectPath, listPath);
    if (!view.exists(listPath)) return new Set();
    return new Set(
      view
        .read(listPath)
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/))
        .filter((tokens) => tokens[1] === 'own-files')
        .map((tokens) => tokens[0])
    );
  } catch {
    return new Set();
  }
}

/** The `openspec-*` skills in `.agents/skills/` recorded as the user's. */
export function readKeptSharedSkills(projectPath: string, view: FileView = DISK_VIEW): Set<string> {
  const listPath = skillToolListPath(projectPath);
  try {
    FileSystemUtils.assertProjectArtifactPath(projectPath, listPath);
    if (!view.exists(listPath)) return new Set();
    const names = new Set<string>(OPENSPEC_SKILL_NAMES);
    return new Set(
      view
        .read(listPath)
        .split(/\r?\n/)
        .map((line) => line.trim().match(/^keep\s+(\S+)$/)?.[1])
        .filter((name): name is string => name !== undefined && names.has(name))
    );
  } catch {
    return new Set();
  }
}

/**
 * Infers the tool that rendered a shared folder written before any list file
 * existed, from its invocation syntax. Preserves generic `.agents` trees and
 * Codex trees users moved there by hand.
 */
function inferPreListTool(projectPath: string, view: FileView): string | undefined {
  let foundGenericReference = false;
  for (const skillName of OPENSPEC_SKILL_NAMES) {
    const skillFile = path.join(projectPath, SHARED_SKILLS_ROOT, 'skills', skillName, 'SKILL.md');
    try {
      FileSystemUtils.assertProjectArtifactPath(projectPath, skillFile);
      const content = view.read(skillFile);
      // Only a release's own output says which tool wrote the folder; a skill
      // the user wrote (or `npx skills` installed) says nothing.
      if (!isReleasedGeneratedContent(content)) continue;
      if (content.includes('$openspec-')) return 'codex';
      if (content.includes('/openspec-')) foundGenericReference = true;
    } catch {
      // Missing, unreadable, or out-of-project files give no signal.
    }
  }
  return foundGenericReference ? 'agents' : undefined;
}

/** The known tools the list file names, or none when there is no such file. */
function readListFileTools(projectPath: string, view: FileView): string[] {
  const listPath = skillToolListPath(projectPath);
  try {
    FileSystemUtils.assertProjectArtifactPath(projectPath, listPath);
    if (!view.exists(listPath)) return [];
    const known = new Set(AI_TOOLS.map((tool) => tool.value));
    return view
      .read(listPath)
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/)[0])
      .filter((id) => known.has(id));
  } catch {
    return [];
  }
}

/**
 * Whether a list file names a tool. Only then is `.agents/skills` known to be
 * OpenSpec's; guessing from skill wording never decides whose a skill is.
 */
export function hasSkillToolList(projectPath: string, view: FileView = DISK_VIEW): boolean {
  return readListFileTools(projectPath, view).length > 0;
}

/**
 * The tools listed as set up in this project. A project from before the list
 * existed yields the one tool its shared folder was written for, if any.
 */
export function readSkillToolList(projectPath: string, view: FileView = DISK_VIEW): string[] {
  const listed = readListFileTools(projectPath, view);
  // An empty or unrecognized file (an older release's, or hand-edited) says
  // nothing: fall back to the folder's wording, as before.
  if (listed.length > 0) return listed;
  const inferred = inferPreListTool(projectPath, view);
  return inferred ? [inferred] : [];
}

/** Whether a tool is listed as set up in this project. */
export function isToolListed(projectPath: string, toolId: string, view: FileView = DISK_VIEW): boolean {
  return readSkillToolList(projectPath, view).includes(toolId);
}

function hasOpenSpecSkillIn(projectPath: string, skillsDir: string, view: FileView): boolean {
  return OPENSPEC_SKILL_NAMES.some((skillName) => {
    try {
      const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
      FileSystemUtils.assertProjectArtifactPath(projectPath, skillFile);
      return view.exists(skillFile);
    } catch {
      return false;
    }
  });
}

/** Whether a tool still has an allowlisted managed skill under an old root. */
export function hasLegacySkills(
  projectPath: string,
  tool: AIToolOption,
  view: FileView = DISK_VIEW
): boolean {
  return (tool.legacySkillsDirs ?? []).some((root) =>
    hasOpenSpecSkillIn(projectPath, path.join(projectPath, root, 'skills'), view)
  );
}

/**
 * Whether a tool has OpenSpec skills in its own `skills/` folder: copies an
 * earlier release wrote there, or, for a tool that gets links, its links.
 */
export function hasOwnFolderSkills(
  projectPath: string,
  tool: AIToolOption,
  view: FileView = DISK_VIEW
): boolean {
  const ownDir = resolveFormerOwnSkillsDir(projectPath, tool);
  return ownDir !== undefined && hasOpenSpecSkillIn(projectPath, ownDir, view);
}
