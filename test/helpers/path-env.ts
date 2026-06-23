import * as path from 'node:path';

function pathEnvKey(env: NodeJS.ProcessEnv): string {
  return Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
}

/**
 * Prepends a directory to the env's PATH. The key is chosen from the
 * base env FIRST (falling back to the host's key) so a test that pins
 * a controlled `PATH` never gains a second case-variant key seeded
 * from the host's real value (win32 hazard: duplicate Path/PATH with
 * undefined precedence in the child).
 */
export function withPrependedPathEnv(
  baseEnv: NodeJS.ProcessEnv,
  dir: string
): NodeJS.ProcessEnv {
  const baseHasPathKey = Object.keys(baseEnv).some(
    (key) => key.toLowerCase() === 'path'
  );
  const key = baseHasPathKey ? pathEnvKey(baseEnv) : pathEnvKey(process.env);
  return {
    ...baseEnv,
    [key]: prependPathValue(dir, baseEnv[key] ?? process.env[key]),
  };
}

function prependPathValue(dir: string, currentPath: string | undefined): string {
  return currentPath ? `${dir}${path.delimiter}${currentPath}` : dir;
}
