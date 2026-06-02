import * as fs from 'fs';

import { FileSystemUtils } from '../utils/file-system.js';
import { AI_TOOLS } from './config.js';
import {
  getOpenSpecManagedSkillDirNames,
  getToolLegacySkillDirectories,
} from './shared/index.js';

const CODEX_TOOL_ID = 'codex';

function getCodexTool() {
  return AI_TOOLS.find((tool) => tool.value === CODEX_TOOL_ID);
}

export function getManagedLegacyCodexSkillDirectories(projectPath: string): string[] {
  const codexTool = getCodexTool();
  if (!codexTool) return [];

  return getToolLegacySkillDirectories(projectPath, codexTool).flatMap((skillsDir) =>
    getOpenSpecManagedSkillDirNames().map((dirName) =>
      FileSystemUtils.joinPath(skillsDir, dirName)
    )
  );
}

export function hasManagedLegacyCodexSkills(projectPath: string): boolean {
  return getManagedLegacyCodexSkillDirectories(projectPath).some((skillDir) =>
    fs.existsSync(skillDir)
  );
}

export async function removeManagedLegacyCodexSkills(projectPath: string): Promise<number> {
  let removed = 0;

  for (const skillDir of getManagedLegacyCodexSkillDirectories(projectPath)) {
    if (!fs.existsSync(skillDir)) continue;
    await fs.promises.rm(skillDir, { recursive: true, force: true });
    removed++;
  }

  return removed;
}
