import path from 'path';
import * as fs from 'fs';
import { AI_TOOLS, OPENSPEC_SKILL_NAMES, type AIToolOption } from './config.js';
import { FileSystemUtils } from '../utils/file-system.js';

const TARGET_MARKER = '.openspec-target';

function markerPath(projectPath: string, skillsDir: string): string {
  return path.join(projectPath, skillsDir, 'skills', TARGET_MARKER);
}

export function readSharedSkillTarget(
  projectPath: string,
  skillsDir: string
): string | undefined {
  try {
    return fs.readFileSync(markerPath(projectPath, skillsDir), 'utf-8').trim() || undefined;
  } catch {
    return undefined;
  }
}

function hasLegacySkills(projectPath: string, tool: AIToolOption): boolean {
  return (tool.legacySkillsDirs ?? []).some((root) => {
    const skillsDir = path.join(projectPath, root, 'skills');
    try {
      return OPENSPEC_SKILL_NAMES.some((skillName) =>
        fs.existsSync(path.join(skillsDir, skillName, 'SKILL.md'))
      );
    } catch {
      return false;
    }
  });
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
