/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

/**
 * Transforms colon-based command references to hyphen-based format.
 * Converts `/openspec:` patterns to `/openspec-` for tools that use hyphen syntax.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to hyphen format
 *
 * @example
 * transformToHyphenCommands('/openspec:new') // returns '/openspec-new'
 * transformToHyphenCommands('Use /openspec:apply to implement') // returns 'Use /openspec-apply to implement'
 */
export function transformToHyphenCommands(text: string): string {
  return text.replace(/\/openspec:/g, '/openspec-');
}
