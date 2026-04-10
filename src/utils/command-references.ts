/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

const OPSX_TO_SKILL_REFERENCE: Record<string, string> = {
  'apply': '/openspec-apply-change',
  'archive': '/openspec-archive-change',
  'verify': '/openspec-verify-change',
  'continue': '/openspec-continue-change',
  'propose': '/openspec-propose',
  'explore': '/openspec-explore',
  'ff': '/openspec-ff-change',
  'new': '/openspec-new-change',
  'sync': '/openspec-sync-specs',
  'bulk-archive': '/openspec-bulk-archive-change',
  'onboard': '/openspec-onboard',
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
 * Transforms `/opsx:*` command references to skill references for skills-only delivery.
 *
 * @param text - The text containing command references
 * @returns Text with known command references replaced by skill references
 */
export function transformToSkillReferences(text: string): string {
  return text.replace(/\/opsx:([a-z-]+)/g, (match, workflowId: string) => {
    return OPSX_TO_SKILL_REFERENCE[workflowId] ?? match;
  });
}
