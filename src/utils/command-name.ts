import path from 'path';

/**
 * Detect the CLI command name from the invocation path.
 * Returns 'plx' if invoked via plx, otherwise defaults to 'openspec'.
 */
export function getCommandName(): string {
  const scriptPath = process.argv[1] || '';
  const scriptName = path.basename(scriptPath).replace(/\.js$/, '');
  return scriptName === 'plx' ? 'plx' : 'openspec';
}

/**
 * The detected command name for the current invocation.
 */
export const commandName = getCommandName();
