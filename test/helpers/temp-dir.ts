import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

function isInsideGitRepository(dirPath: string): boolean {
  try {
    execFileSync('git', ['-C', dirPath, 'rev-parse', '--show-toplevel'], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

export function mkdtempOutsideGit(prefix: string): string {
  const defaultTmp = os.tmpdir();
  const rootTmp = path.join(path.parse(defaultTmp).root, 'openspec-test-temp');
  const candidates = Array.from(new Set([defaultTmp, rootTmp]));

  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      const tempDir = fs.mkdtempSync(path.join(candidate, prefix));
      if (!isInsideGitRepository(tempDir)) {
        return tempDir;
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Try the next candidate.
    }
  }

  return fs.mkdtempSync(path.join(defaultTmp, prefix));
}
