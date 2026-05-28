import * as path from 'node:path';

export function pathEnvKey(env: NodeJS.ProcessEnv = process.env): string {
  return Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
}

export function setProcessPathEnv(value: string): void {
  process.env[pathEnvKey()] = value;
}

export function prependProcessPathEnv(dir: string): void {
  const key = pathEnvKey();
  process.env[key] = prependPathValue(dir, process.env[key]);
}

export function withPrependedPathEnv(baseEnv: NodeJS.ProcessEnv, dir: string): NodeJS.ProcessEnv {
  const key = pathEnvKey({ ...process.env, ...baseEnv });
  return {
    ...baseEnv,
    [key]: prependPathValue(dir, baseEnv[key] ?? process.env[key]),
  };
}

function prependPathValue(dir: string, currentPath: string | undefined): string {
  return currentPath ? `${dir}${path.delimiter}${currentPath}` : dir;
}
