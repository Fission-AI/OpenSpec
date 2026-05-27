/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

/**
 * Transforms colon-based command references to hyphen-based format.
 * Converts `/pastel:` patterns to `/pastel-` for tools that use hyphen syntax.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to hyphen format
 *
 * @example
 * transformToHyphenCommands('/pastel:new') // returns '/pastel-new'
 * transformToHyphenCommands('Use /pastel:apply to implement') // returns 'Use /pastel-apply to implement'
 */
export function transformToHyphenCommands(text: string): string {
  return text.replace(/\/pastel:/g, '/pastel-');
}
