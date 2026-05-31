import type { Delivery } from './global-config.js';
import {
  transformToCodexSkillReferences,
  transformToHyphenCommands,
} from '../utils/command-references.js';

export function shouldGenerateSkillsForTool(toolId: string, delivery: Delivery): boolean {
  return toolId === 'codex' || delivery !== 'commands';
}

export function shouldGenerateCommandsForTool(toolId: string, delivery: Delivery): boolean {
  return toolId !== 'codex' && delivery !== 'skills';
}

export function getSkillInstructionTransformer(
  toolId: string
): ((instructions: string) => string) | undefined {
  if (toolId === 'codex') return transformToCodexSkillReferences;
  if (toolId === 'opencode' || toolId === 'pi') return transformToHyphenCommands;
  return undefined;
}
