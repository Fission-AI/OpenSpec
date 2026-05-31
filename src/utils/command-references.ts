/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

/**
 * Transforms colon-based command references to hyphen-based format.
 * Converts `/ps:` patterns to `/ps-` for tools that use hyphen syntax.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to hyphen format
 *
 * @example
 * transformToHyphenCommands('/ps:new') // returns '/ps-new'
 * transformToHyphenCommands('Use /ps:apply to implement') // returns 'Use /ps-apply to implement'
 */
export function transformToHyphenCommands(text: string): string {
  return text.replace(/\/ps:/g, '/ps-');
}
