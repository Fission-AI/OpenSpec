import { describe, expect, it } from 'vitest';

import {
  type PlanningHome,
  formatChangeLocation,
  getChangeDir,
} from '../../src/core/planning-home.js';

describe('planning home paths', () => {
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
});
