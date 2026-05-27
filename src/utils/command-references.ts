/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

/**
 * Transforms colon-based command references to hyphen-based format.
 * Converts `/pstl:` patterns to `/pstl-` for tools that use hyphen syntax.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to hyphen format
 *
 * @example
 * transformToHyphenCommands('/pstl:new') // returns '/pstl-new'
 * transformToHyphenCommands('Use /pstl:apply to implement') // returns 'Use /pstl-apply to implement'
 */
export function transformToHyphenCommands(text: string): string {
  return text.replace(/\/pstl:/g, '/pstl-');
}
