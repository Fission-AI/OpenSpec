/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

// Type-only import: a value import would close a module cycle
// (command-generation adapters import this file).
import type { CommandSurfaceCapability } from '../core/command-surface.js';

/**
 * Transforms colon-based command references to hyphen-based format.
 * Converts `/opsx:` patterns to `/opsx-` for tools that use hyphen syntax.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to hyphen format
 *
 * @example
 * transformToHyphenCommands('/opsx:new') // returns '/opsx-new'
 * transformToHyphenCommands('Use /opsx:apply to implement') // returns 'Use /opsx-apply to implement'
 */
export function transformToHyphenCommands(text: string): string {
  return text.replace(/\/opsx:/g, '/opsx-');
}

/**
 * Maps command short names to their skill names.
 * Keep in sync with WORKFLOW_TO_SKILL_DIR, which exists in both
 * src/core/profile-sync-drift.ts (exported) and src/core/init.ts (local copy).
 */
const COMMAND_TO_SKILL_NAME: Record<string, string> = {
  'explore': 'openspec-explore',
  'new': 'openspec-new-change',
  'continue': 'openspec-continue-change',
  'apply': 'openspec-apply-change',
  'update': 'openspec-update-change',
  'ff': 'openspec-ff-change',
  'sync': 'openspec-sync-specs',
  'archive': 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  'verify': 'openspec-verify-change',
  'onboard': 'openspec-onboard',
  'propose': 'openspec-propose',
};

/**
 * Tools whose skill invocation uses a non-default prefix. The default is `/`
 * (e.g. `/openspec-propose`); Kimi Code invokes skills as `/skill:<name>`
 * (see docs/supported-tools.md).
 */
const SKILL_INVOCATION_PREFIX: Record<string, string> = {
  kimi: '/skill:',
};

function replaceCommandsWithSkillReferences(text: string, prefix: string): string {
  return text.replace(/\/opsx:([a-z-]+)/g, (match, commandId: string) => {
    const skillName = COMMAND_TO_SKILL_NAME[commandId];
    return skillName === undefined ? match : `${prefix}${skillName}`;
  });
}

/**
 * Transforms command references to skill references using the default `/`
 * invocation prefix. Converts `/opsx:<command>` patterns to
 * `/openspec-<skill>` so that generated skills do not reference commands
 * that were never generated. Used for channels that are not tied to one
 * tool (e.g. the skills.sh distribution); tool-targeted generation should
 * go through getSkillReferenceTransformer instead.
 *
 * Unknown command references are left unchanged.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to skill references
 *
 * @example
 * transformToSkillReferences('/opsx:apply') // returns '/openspec-apply-change'
 * transformToSkillReferences('Use /opsx:archive next') // returns 'Use /openspec-archive-change next'
 */
export function transformToSkillReferences(text: string): string {
  return replaceCommandsWithSkillReferences(text, '/');
}

/**
 * Returns the skill-reference transformer for a specific tool, honoring the
 * tool's documented skill invocation syntax (e.g. Kimi Code's
 * `/skill:openspec-propose`). Falls back to the default `/openspec-*` form.
 *
 * @param toolId - The AI tool identifier (e.g. 'kimi', 'vibe')
 * @returns A transformer converting `/opsx:*` references to skill invocations
 */
export function getSkillReferenceTransformer(toolId: string): (text: string) => string {
  const prefix = SKILL_INVOCATION_PREFIX[toolId];
  if (prefix === undefined) {
    return transformToSkillReferences;
  }
  return (text: string) => replaceCommandsWithSkillReferences(text, prefix);
}

/**
 * Selects the command-reference transformer for a skill generation target.
 *
 * Skill references are used whenever the tool ends up without `/opsx:*`
 * commands — either because delivery is skills-only (for every tool) or
 * because the tool has no command surface at all (capability 'none', e.g.
 * Kimi Code or Mistral Vibe) — so those skills never point at commands
 * that were not generated. When commands are generated, tools where the
 * command filename doubles as the command name (oh-my-pi, opencode, pi) use
 * hyphen-based command references. All other cases keep the default
 * `/opsx:*` references; notably skills-invocable tools (codex) are left
 * untouched here because their reference rewriting is handled separately.
 *
 * @param toolId - The AI tool identifier (e.g. 'claude', 'opencode', 'pi')
 * @param delivery - The configured delivery mode
 * @param capability - The tool's command surface capability
 * @returns The transformer to pass to generateSkillContent, or undefined
 */
export function getTransformerForTool(
  toolId: string,
  delivery: 'both' | 'skills' | 'commands',
  capability: CommandSurfaceCapability
): ((text: string) => string) | undefined {
  if (delivery === 'skills' || capability === 'none') {
    return getSkillReferenceTransformer(toolId);
  }
  if (toolId === 'opencode' || toolId === 'pi' || toolId === 'oh-my-pi') {
    return transformToHyphenCommands;
  }
  return undefined;
}
