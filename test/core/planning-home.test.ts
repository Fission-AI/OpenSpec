import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  type PlanningHome,
  formatChangeLocation,
  getChangeDir,
  resolveCurrentPlanningHomeSync,
} from '../../src/core/planning-home.js';

describe('planning home paths', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('resolves repo-local projects with foreign workspace.yaml as repo planning homes', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-planning-home-'));
    tempDirs.push(tempDir);
    const repoRoot = path.join(tempDir, 'foreign-tool-repo');
    const changesDir = path.join(repoRoot, 'openspec', 'changes');

    fs.mkdirSync(changesDir, { recursive: true });
    fs.writeFileSync(
      path.join(repoRoot, 'workspace.yaml'),
      `tool_workspace:
  projects:
    - name: example
      path: ./service
`,
      'utf-8'
    );

    const planningHome = resolveCurrentPlanningHomeSync({
      startPath: changesDir,
      allowImplicitRepoRoot: false,
    });

    expect(planningHome.kind).toBe('repo');
    expect(planningHome.root).toBe(fs.realpathSync.native(repoRoot));
  });
});
