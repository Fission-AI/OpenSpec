import * as fs from 'node:fs';
import * as path from 'node:path';

import { DEFAULT_OPENSPEC_SCHEMA } from '../../src/core/index.js';

/**
 * Shared fixtures for store tests that touch real Git.
 */

export function createHealthyOpenSpecRoot(root: string, configName = 'config.yaml'): void {
  fs.mkdirSync(path.join(root, 'openspec', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'openspec', 'changes', 'archive'), { recursive: true });
  fs.writeFileSync(path.join(root, 'openspec', configName), `schema: ${DEFAULT_OPENSPEC_SCHEMA}\n`);
}

/**
 * Isolates real git invocations from the host's gitconfig (signing, hooks,
 * templates) and provides a deterministic commit identity.
 */
export function isolatedGitEnv(tempDir: string): NodeJS.ProcessEnv {
  const emptyConfig = path.join(tempDir, 'gitconfig-empty');
  if (!fs.existsSync(emptyConfig)) {
    fs.writeFileSync(emptyConfig, '');
  }
  return {
    GIT_CONFIG_GLOBAL: emptyConfig,
    GIT_CONFIG_SYSTEM: emptyConfig,
    GIT_AUTHOR_NAME: 'Store Tester',
    GIT_AUTHOR_EMAIL: 'tester@example.com',
    GIT_COMMITTER_NAME: 'Store Tester',
    GIT_COMMITTER_EMAIL: 'tester@example.com',
  };
}
