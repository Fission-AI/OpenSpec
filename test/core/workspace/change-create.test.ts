import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readChangeMetadata } from '../../../src/utils/change-metadata.js';
import {
  createWorkspaceChange,
  parseWorkspaceTargets,
} from '../../../src/core/workspace/change-create.js';
import {
  assertWorkspaceChangeLayout,
  assertTargetMembership,
} from '../../helpers/workspace-assertions.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture: 'happy-path' });
  sandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace targeted change creation core behavior', () => {
  describe('parseWorkspaceTargets', () => {
    it('trims comma-separated aliases and preserves the requested order', () => {
      expect(parseWorkspaceTargets(' app , api,docs ')).toEqual(['app', 'api', 'docs']);
    });

    it('rejects empty target segments', () => {
      expect(() => parseWorkspaceTargets('app,,api')).toThrow(
        "Invalid --targets value 'app,,api'. Target aliases must be comma-separated non-empty values."
      );
    });

    it('rejects duplicate aliases after normalization', () => {
      expect(() => parseWorkspaceTargets('app, api,app')).toThrow(
        "Duplicate target alias 'app' in --targets. Remove duplicates and retry."
      );
    });
  });

  describe('createWorkspaceChange', () => {
    it('writes workspace metadata and only the central planning layout for the selected targets', async () => {
      const sandbox = await createSandbox();
      const result = await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
        description: 'Refresh shared contracts across the selected repos.',
        targets: ' app,api ',
      });
      const changeDir = sandbox.workspacePath('changes', 'shared-refresh');
      const metadata = readChangeMetadata(changeDir, sandbox.workspaceRoot);

      expect(result.workspaceRoot).toBe(sandbox.workspaceRoot);
      expect(result.changeDir).toBe(changeDir);
      expect(result.schema).toBe('spec-driven');
      assertTargetMembership(['app', 'api'], result.targets);
      expect(metadata).not.toBeNull();
      expect(metadata?.schema).toBe('spec-driven');
      expect(metadata?.created).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      assertTargetMembership(['app', 'api'], metadata?.targets ?? []);

      await assertWorkspaceChangeLayout(changeDir, ['app', 'api']);
      await expect(fs.access(path.join(changeDir, 'targets', 'docs'))).rejects.toThrow();
      await expect(fs.access(path.join(changeDir, 'specs'))).rejects.toThrow();
      await expect(fs.access(path.join(changeDir, 'tasks.md'))).rejects.toThrow();
    });

    it('rejects aliases that are not registered in the workspace registry', async () => {
      const sandbox = await createSandbox();

      await expect(
        createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
          targets: 'app,unknown',
        })
      ).rejects.toThrow('Unknown target alias: unknown. Registered aliases: api, app, docs');
    });
  });
});
