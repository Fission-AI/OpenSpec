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
 * Transforms command references to Codex prompt format.
 * Converts `/opsx:` or `/opsx-` patterns to `/prompts:opsx-`.
 *
 * @param text - The text containing command references
 * @returns Text with command references transformed to Codex format
 *
 * @example
 * transformToCodexCommands('/opsx:new') // returns '/prompts:opsx-new'
 * transformToCodexCommands('Use /opsx-apply to implement') // returns 'Use /prompts:opsx-apply to implement'
 */
export function transformToCodexCommands(text: string): string {
  return text.replace(/\/opsx:/g, '/prompts:opsx-').replace(/\/opsx-/g, '/prompts:opsx-');
}
