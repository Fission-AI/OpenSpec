/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

/**
 * Explicit mapping from `/opsx:<workflow>` to `/openspec-<skill-name>`.
 * Mirrors WORKFLOW_TO_SKILL_DIR from profile-sync-drift.ts.
 * Defined inline to avoid circular dependency (utils → core → utils).
 */
const OPSX_TO_SKILL: Record<string, string> = {
  '/opsx:explore': '/openspec-explore',
  '/opsx:new': '/openspec-new-change',
  '/opsx:continue': '/openspec-continue-change',
  '/opsx:apply': '/openspec-apply-change',
  '/opsx:ff': '/openspec-ff-change',
  '/opsx:sync': '/openspec-sync-specs',
  '/opsx:archive': '/openspec-archive-change',
  '/opsx:bulk-archive': '/openspec-bulk-archive-change',
  '/opsx:verify': '/openspec-verify-change',
  '/opsx:onboard': '/openspec-onboard',
  '/opsx:propose': '/openspec-propose',
};

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
 * Transforms `/opsx:*` command references to `/openspec-*` skill references.
 * Used for skills-only delivery where commands don't exist.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to skill references
 *
 * @example
 * transformToSkillReferences('/opsx:apply') // returns '/openspec-apply-change'
 * transformToSkillReferences('/opsx:explore') // returns '/openspec-explore'
 */
export function transformToSkillReferences(text: string): string {
  let result = text;
  for (const [from, to] of Object.entries(OPSX_TO_SKILL)) {
    result = result.replaceAll(from, to);
  }
  return result;
}
