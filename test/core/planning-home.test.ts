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

  it('builds workspace change paths with the planning home path style', () => {
    const workspacePlanningHome: PlanningHome = {
      kind: 'workspace',
      root: 'D:\\repos\\platform-workspace',
      changesDir: 'D:\\repos\\platform-workspace\\changes',
      defaultSchema: 'workspace-planning',
      workspace: {
        name: 'platform',
        links: ['api', 'web'],
      },
    };

    expect(getChangeDir(workspacePlanningHome, 'cross-repo-login')).toBe(
      'D:\\repos\\platform-workspace\\changes\\cross-repo-login'
    );
    expect(formatChangeLocation(workspacePlanningHome, 'cross-repo-login')).toBe(
      'changes\\cross-repo-login'
    );
  });

  it('keeps a canonical workspace root comparable with an aliased start path', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-planning-home-'));
    tempDirs.push(tempDir);
    const realWorkspaceRoot = path.join(tempDir, 'real-workspace');
    const aliasWorkspaceRoot = path.join(tempDir, 'alias-workspace');

    fs.mkdirSync(path.join(realWorkspaceRoot, '.openspec-workspace'), { recursive: true });
    fs.writeFileSync(
      path.join(realWorkspaceRoot, '.openspec-workspace', 'workspace.yaml'),
      'version: 1\nname: platform\nlinks: {}\n',
      'utf-8'
    );
    fs.symlinkSync(
      realWorkspaceRoot,
      aliasWorkspaceRoot,
      process.platform === 'win32' ? 'junction' : 'dir'
    );

    const planningHome = resolveCurrentPlanningHomeSync({
      startPath: aliasWorkspaceRoot,
      allowImplicitRepoRoot: false,
    });

    expect(planningHome.kind).toBe('workspace');
    expect(planningHome.root).toBe(fs.realpathSync.native(realWorkspaceRoot));
  });
});
