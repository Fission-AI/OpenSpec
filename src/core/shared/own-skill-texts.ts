/**
 * Whether a skill in a tool's own folder (MiniMax's `~/.minimax/skills`) is
 * OpenSpec's or the user's. Only text this version writes for that tool, or a
 * release wrote, is OpenSpec's; a link, a file where the folder goes, or an
 * edited SKILL.md is the user's.
 */
import path from 'path';
import { createRequire } from 'module';
import { getTransformerForTool } from '../../utils/command-references.js';
import { resolveCommandInvocation, resolveCommandSurfaceCapability } from '../command-surface.js';
import type { FileView } from '../file-view.js';
import { everySkillRendering } from './skill-generation.js';
import { classifySkillFile } from './skill-links.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../../package.json') as { version: string };

/** Every text this version writes for `dirName` in `toolId`'s own folder. */
export function ownSkillTexts(toolId: string, dirName: string, version: string = OPENSPEC_VERSION): string[] {
  const transformer = getTransformerForTool(
    toolId,
    'skills',
    resolveCommandSurfaceCapability(toolId),
    resolveCommandInvocation(toolId)
  );
  return everySkillRendering(dirName, version, transformer);
}

/**
 * What sits at a skill's spot in a tool's own folder: `link` and `user` are
 * the user's; `ours` is OpenSpec's SKILL.md (with or without the user's other
 * files beside it); `missing` is a folder without SKILL.md.
 */
export function classifyOwnSkill(
  skillDir: string,
  toolId: string,
  dirName: string,
  view: FileView,
  version?: string
): 'link' | 'user' | 'ours' | 'missing' {
  if (view.linkTarget?.(skillDir) !== undefined || view.linkTarget?.(path.join(skillDir, 'SKILL.md')) !== undefined) {
    return 'link';
  }
  if (!view.isDirectory(skillDir)) return 'user';
  const spot = classifySkillFile(skillDir, ownSkillTexts(toolId, dirName, version), view);
  if (spot === 'missing') return 'missing';
  return spot === 'user' ? 'user' : 'ours';
}
