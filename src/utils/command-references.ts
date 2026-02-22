/**
 * Command Reference Utilities
 *
 * Utilities for transforming command references to tool-specific formats.
 */

/**
 * Supported command invocation styles across tools.
 */
export type CommandReferenceStyle = 'opsx-colon' | 'opsx-hyphen' | 'openspec-hyphen';

const OPSX_COMMAND_ID_PATTERN = /\/opsx:([a-z][a-z-]*)/g;

const OPSX_TO_OPENSPEC_COMMAND: Record<string, string> = {
  'explore': '/openspec-explore',
  'new': '/openspec-new-change',
  'continue': '/openspec-continue-change',
  'apply': '/openspec-apply-change',
  'ff': '/openspec-ff-change',
  'sync': '/openspec-sync-specs',
  'archive': '/openspec-archive-change',
  'bulk-archive': '/openspec-bulk-archive-change',
  'verify': '/openspec-verify-change',
  'onboard': '/openspec-onboard',
  'propose': '/openspec-propose',
};

/**
 * Formats a command invocation string for a workflow command ID.
 */
export function formatCommandInvocation(commandId: string, style: CommandReferenceStyle): string {
  switch (style) {
    case 'opsx-colon':
      return `/opsx:${commandId}`;
    case 'opsx-hyphen':
      return `/opsx-${commandId}`;
    case 'openspec-hyphen':
      return OPSX_TO_OPENSPEC_COMMAND[commandId] ?? `/openspec-${commandId}`;
    default:
      return `/opsx:${commandId}`;
  }
}

/**
 * Formats the wildcard/family syntax used in UI hints.
 */
export function formatCommandFamily(style: CommandReferenceStyle): string {
  switch (style) {
    case 'opsx-colon':
      return '/opsx:*';
    case 'opsx-hyphen':
      return '/opsx-*';
    case 'openspec-hyphen':
      return '/openspec-*';
    default:
      return '/opsx:*';
  }
}

/**
 * Transforms command references from canonical `/opsx:<id>` form to a tool style.
 */
export function transformCommandReferences(text: string, style: CommandReferenceStyle): string {
  if (style === 'opsx-colon') {
    return text;
  }

  return text.replace(OPSX_COMMAND_ID_PATTERN, (_match, commandId: string) =>
    formatCommandInvocation(commandId, style)
  );
}

/**
 * Returns a text transformer for the given command-reference style.
 */
export function getCommandReferenceTransformer(
  style: CommandReferenceStyle
): ((text: string) => string) | undefined {
  if (style === 'opsx-colon') {
    return undefined;
  }

  return (text: string) => transformCommandReferences(text, style);
}

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
  return transformCommandReferences(text, 'opsx-hyphen');
}
