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

const WORKFLOW_TO_SKILL_REFERENCE: Record<string, string> = {
  explore: 'openspec-explore',
  new: 'openspec-new-change',
  continue: 'openspec-continue-change',
  apply: 'openspec-apply-change',
  ff: 'openspec-ff-change',
  sync: 'openspec-sync-specs',
  archive: 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  verify: 'openspec-verify-change',
  onboard: 'openspec-onboard',
  propose: 'openspec-propose',
};

/**
 * Transforms generated slash-command references to Agent Skill references.
 *
 * Adapterless tools can receive skills without matching command files. In that
 * mode, `/opsx:*` guidance points users at commands that were never generated.
 */
export function transformToSkillReferences(text: string, prefix = ''): string {
  return text.replace(/\/opsx:([a-z-]+)/g, (match, workflow: string) => {
    const skillReference = WORKFLOW_TO_SKILL_REFERENCE[workflow];
    return skillReference ? `${prefix}${skillReference}` : match;
  });
}

export function getSkillReferencePrefix(toolId: string): string {
  return toolId === 'kimi' ? '/skill:' : '';
}

export function transformToToolSkillReferences(text: string, toolId: string): string {
  return transformToSkillReferences(text, getSkillReferencePrefix(toolId));
}
