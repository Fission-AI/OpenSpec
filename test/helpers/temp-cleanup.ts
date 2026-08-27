import * as fs from 'node:fs';

export function cleanupTempPath(target: string | undefined): void {
  if (!target) {
    return;
  }

  fs.rmSync(target, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}
