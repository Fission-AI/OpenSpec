/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

/**
 * Transforms colon-based command references to hyphen-based format.
 * Converts `/clsx:` patterns to `/clsx-` for tools that use hyphen syntax.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to hyphen format
 *
 * @example
 * transformToHyphenCommands('/clsx:new') // returns '/clsx-new'
 * transformToHyphenCommands('Use /clsx:apply to implement') // returns 'Use /clsx-apply to implement'
 */
export function transformToHyphenCommands(text: string): string {
  return text.replace(/\/clsx:/g, '/clsx-');
}
