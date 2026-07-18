/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

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
 * Maps command short names to their skill directory references.
 * Keep in sync with WORKFLOW_TO_SKILL_DIR, which exists in both
 * src/core/profile-sync-drift.ts (exported) and src/core/init.ts (local copy).
 */
const COMMAND_TO_SKILL_REFERENCE: Record<string, string> = {
  'explore': '/openspec-explore',
  'new': '/openspec-new-change',
  'continue': '/openspec-continue-change',
  'apply': '/openspec-apply-change',
  'update': '/openspec-update-change',
  'ff': '/openspec-ff-change',
  'sync': '/openspec-sync-specs',
  'archive': '/openspec-archive-change',
  'bulk-archive': '/openspec-bulk-archive-change',
  'verify': '/openspec-verify-change',
  'onboard': '/openspec-onboard',
  'propose': '/openspec-propose',
};

/**
 * Transforms command references to skill references for skills-only delivery.
 * Converts `/opsx:<command>` patterns to `/openspec-<skill>` so that
 * generated skills do not reference commands that were never generated.
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
  return text.replace(/\/opsx:([a-z-]+)/g, (match, commandId: string) => {
    return COMMAND_TO_SKILL_REFERENCE[commandId] ?? match;
  });
}

/**
 * Selects the command-reference transformer for a skill generation target.
 *
 * Skills-only delivery always uses skill references — for every tool — so
 * generated skills never point at commands that were not generated. When
 * commands are generated, tools where the command filename doubles as the
 * command name (oh-my-pi, opencode, pi) use hyphen-based command references.
 * All other cases keep the default `/opsx:*` references.
 *
 * @param toolId - The AI tool identifier (e.g. 'claude', 'opencode', 'pi')
 * @param delivery - The configured delivery mode
 * @returns The transformer to pass to generateSkillContent, or undefined
 */
export function getTransformerForTool(
  toolId: string,
  delivery: 'both' | 'skills' | 'commands'
): ((text: string) => string) | undefined {
  if (delivery === 'skills') {
    return transformToSkillReferences;
  }
  if (toolId === 'opencode' || toolId === 'pi' || toolId === 'oh-my-pi') {
    return transformToHyphenCommands;
  }
  return undefined;
}
