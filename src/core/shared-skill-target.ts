import path from 'path';
import * as fs from 'fs';
import { AI_TOOLS, OPENSPEC_SKILL_NAMES, type AIToolOption } from './config.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { resolveCommandSurfaceCapability } from './command-surface.js';

const TARGET_MARKER = '.openspec-target';

/** Returns the ownership-marker path for one shared skills root. */
function markerPath(projectPath: string, skillsDir: string): string {
  return path.join(projectPath, skillsDir, 'skills', TARGET_MARKER);
}

/** Reads a valid-looking marker value without letting linked roots escape. */
export function readSharedSkillTarget(
  projectPath: string,
  skillsDir: string
): string | undefined {
  try {
    const target = markerPath(projectPath, skillsDir);
    FileSystemUtils.assertProjectArtifactPath(projectPath, target);
    return fs.readFileSync(target, 'utf-8').trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Whether a tool still has an allowlisted managed skill under an old root. */
export function hasLegacySkills(projectPath: string, tool: AIToolOption): boolean {
  return (tool.legacySkillsDirs ?? []).some((root) => {
    const skillsDir = path.join(projectPath, root, 'skills');
    return OPENSPEC_SKILL_NAMES.some((skillName) => {
      try {
        const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
        FileSystemUtils.assertProjectArtifactPath(projectPath, skillFile);
        return fs.existsSync(skillFile);
      } catch {
        return false;
      }
    });
  });
}

/**
 * Infers pre-marker ownership from generated invocation syntax. This preserves
 * both existing generic `.agents` trees and Codex trees users moved manually.
 */
function inferSharedSkillTarget(projectPath: string, skillsDir: string): string | undefined {
  let foundGenericReference = false;

  for (const skillName of OPENSPEC_SKILL_NAMES) {
    const skillFile = path.join(projectPath, skillsDir, 'skills', skillName, 'SKILL.md');
    try {
      FileSystemUtils.assertProjectArtifactPath(projectPath, skillFile);
      const content = fs.readFileSync(skillFile, 'utf-8');
      if (content.includes('$openspec-')) return 'codex';
      if (content.includes('/openspec-')) foundGenericReference = true;
    } catch {
      // Missing, unreadable, or out-of-project files provide no ownership signal.
    }
  }

  return foundGenericReference ? 'agents' : undefined;
}

/** Whether the canonical shared root already contains an OpenSpec skill. */
function hasCurrentSkills(projectPath: string, skillsDir: string): boolean {
  return OPENSPEC_SKILL_NAMES.some((skillName) => {
    const skillFile = path.join(projectPath, skillsDir, 'skills', skillName, 'SKILL.md');
    try {
      FileSystemUtils.assertProjectArtifactPath(projectPath, skillFile);
      return fs.existsSync(skillFile);
    } catch {
      return false;
    }
  });
}

/**
 * Chooses the one selected tool that may render each physical skills root.
 * Command files are not part of this arbitration: tools that share a skills
 * root can still write their own command surface elsewhere under that root.
 *
 * Existing compatible owners win. On a new root, prefer a skills-native
 * renderer over an adapter-backed renderer because its references remain
 * usable by every consumer of the shared tree. Codex is the best fresh owner
 * because its renderer includes both Codex and generic skill invocation forms.
 */
export function resolveSharedSkillWriters(
  projectPath: string,
  tools: AIToolOption[]
): Set<string> {
  const byRoot = new Map<string, AIToolOption[]>();
  const writers = new Set<string>();

  for (const tool of tools) {
    if (!tool.skillsDir) continue;
    const group = byRoot.get(tool.skillsDir) ?? [];
    group.push(tool);
    byRoot.set(tool.skillsDir, group);
  }

  for (const [root, unsortedGroup] of byRoot) {
    const group = [...unsortedGroup].sort(
      (left, right) => AI_TOOLS.indexOf(left) - AI_TOOLS.indexOf(right)
    );
    if (group.length === 1) {
      writers.add(group[0].value);
      continue;
    }

    const skillsNative = group.filter(
      (tool) => resolveCommandSurfaceCapability(tool.value) !== 'adapter-backed'
    );
    const preferredPool = skillsNative.length > 0 ? skillsNative : group;
    const marked = readSharedSkillTarget(projectPath, root);
    const inferred = inferSharedSkillTarget(projectPath, root);
    const owner =
      preferredPool.find((tool) => tool.value === marked) ??
      preferredPool.find((tool) => tool.value === inferred) ??
      (hasCurrentSkills(projectPath, root)
        ? preferredPool.find((tool) => tool.value === 'agents')
        : undefined) ??
      preferredPool.find((tool) => tool.value === 'codex') ??
      preferredPool[0];

    writers.add(owner.value);
  }

  return writers;
}

/**
 * A shared skill root can only hold one rendered variant of each skill.
 * Keep the writer recorded so later updates do not infer every tool that
 * happens to use the same directory.
 */
export function reconcileSharedSkillTargets(
  projectPath: string,
  tools: AIToolOption[]
): AIToolOption[] {
  const byRoot = new Map<string, AIToolOption[]>();
  for (const tool of tools) {
    if (!tool.skillsDir) continue;
    const group = byRoot.get(tool.skillsDir) ?? [];
    group.push(tool);
    byRoot.set(tool.skillsDir, group);
  }

  const reconciled: AIToolOption[] = [];
  for (const group of byRoot.values()) {
    if (group.length === 1) {
      reconciled.push(group[0]);
      continue;
    }

    const root = group[0].skillsDir!;
    const marked = readSharedSkillTarget(projectPath, root);
    const markedTool = group.find((tool) => tool.value === marked);
    if (markedTool) {
      reconciled.push(markedTool);
      continue;
    }

    const inferred = inferSharedSkillTarget(projectPath, root);
    const legacyCodex = group.find(
      (tool) => tool.value === 'codex' && hasLegacySkills(projectPath, tool)
    );
    if (inferred === 'agents' && legacyCodex) {
      // Before ownership markers existed, selecting both targets produced a
      // generic canonical tree plus a Codex-only legacy tree. Codex now emits
      // a dual-syntax canonical tree, so it can safely consolidate that state.
      reconciled.push(legacyCodex);
      continue;
    }
    const inferredTool = group.find((tool) => tool.value === inferred);
    if (inferredTool) {
      reconciled.push(inferredTool);
      continue;
    }

    // An unmarked canonical tree predates Codex's move into `.agents`; keep
    // that established agents target instead of overwriting it from `.codex`.
    if (hasCurrentSkills(projectPath, root)) {
      reconciled.push(group.find((tool) => tool.value === 'agents') ?? group[0]);
      continue;
    }

    const legacyTool = group.find((tool) => hasLegacySkills(projectPath, tool));
    if (legacyTool) {
      reconciled.push(legacyTool);
      continue;
    }

    // `.agents` existed as the vendor-neutral target before Codex adopted it.
    // Unmarked trees therefore retain that established meaning.
    reconciled.push(group.find((tool) => tool.value === 'agents') ?? group[0]);
  }

  return reconciled;
}

/**
 * Returns whether a tool is the active writer for its physical skills root.
 * Non-shared roots are always active.
 */
export function isSharedSkillTargetActive(projectPath: string, toolId: string): boolean {
  const tool = AI_TOOLS.find((candidate) => candidate.value === toolId);
  if (!tool?.skillsDir) return false;
  const sharingRoot = AI_TOOLS.filter((candidate) => candidate.skillsDir === tool.skillsDir);
  if (sharingRoot.length < 2) return true;
  return reconcileSharedSkillTargets(projectPath, sharingRoot)
    .some((candidate) => candidate.value === toolId);
}

/**
 * The tool that already owns `toolId`'s shared skills root, when a DIFFERENT
 * one does. Returns the owner's tool id only when the root already carries an
 * ownership signal (a marker or generated skills) AND reconciliation resolves
 * it to another tool. An empty or unclaimed root returns undefined, so a
 * genuine first-time legacy upgrade — e.g. a Codex-only user with no `.agents`
 * yet — is never reported as owned.
 */
export function sharedSkillRootOwner(projectPath: string, toolId: string): string | undefined {
  const tool = AI_TOOLS.find((candidate) => candidate.value === toolId);
  if (!tool?.skillsDir) return undefined;
  const sharingRoot = AI_TOOLS.filter((candidate) => candidate.skillsDir === tool.skillsDir);
  if (sharingRoot.length < 2) return undefined;

  const hasOwnerSignal =
    readSharedSkillTarget(projectPath, tool.skillsDir) !== undefined ||
    hasCurrentSkills(projectPath, tool.skillsDir);
  if (!hasOwnerSignal) return undefined;

  const owner = reconcileSharedSkillTargets(projectPath, sharingRoot)[0]?.value;
  return owner && owner !== toolId ? owner : undefined;
}

/**
 * Whether generating `toolId` into its shared skills root would clobber a tree
 * a DIFFERENT tool already owns — the guard the legacy-upgrade path uses before
 * writing skills. See {@link sharedSkillRootOwner} for the ownership rules.
 */
export function sharedSkillRootOwnedByOther(projectPath: string, toolId: string): boolean {
  return sharedSkillRootOwner(projectPath, toolId) !== undefined;
}

export function writeSharedSkillTarget(projectPath: string, toolId: string): void {
  const tool = AI_TOOLS.find((candidate) => candidate.value === toolId);
  if (!tool?.skillsDir) return;
  const sharingRoot = AI_TOOLS.filter((candidate) => candidate.skillsDir === tool.skillsDir);
  if (sharingRoot.length < 2) return;

  const target = markerPath(projectPath, tool.skillsDir);
  FileSystemUtils.assertProjectArtifactPath(projectPath, target);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${toolId}\n`, 'utf-8');
}
