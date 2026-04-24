import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  assertMaterializationInvariants,
  assertNoAbsoluteRepoPaths,
  assertTargetMembership,
  assertWorkspaceLayout,
} from '../../helpers/workspace-assertions.js';
import {
  WORKSPACE_POC_FIXTURES_ROOT,
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(
  fixture: 'empty' | 'happy-path' | 'dirty'
): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture });
  sandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace sandbox helper', () => {
  it('creates a managed workspace root without repo-local openspec nesting', async () => {
    const sandbox = await createSandbox('empty');

    await expect(assertWorkspaceLayout(sandbox.workspaceRoot)).resolves.toBeUndefined();
    expect(await fs.readdir(path.join(sandbox.workspaceRoot, '.openspec'))).toContain('workspace.yaml');
    expect(await fs.readdir(sandbox.workspaceRoot)).toContain('changes');
  });

  it('clones fixture state per sandbox so mutations do not bleed across tests', async () => {
    const first = await createSandbox('happy-path');
    const second = await createSandbox('happy-path');
    const appReadmePath = first.repoPath('app', 'README.md');
    const secondAppReadmePath = second.repoPath('app', 'README.md');

    await fs.writeFile(appReadmePath, 'mutated in one sandbox\n', 'utf-8');

    const firstContent = await fs.readFile(appReadmePath, 'utf-8');
    const secondContent = await fs.readFile(secondAppReadmePath, 'utf-8');

    expect(firstContent).toContain('mutated in one sandbox');
    expect(secondContent).toContain('Happy path app fixture');
  });

  it('keeps committed fixtures free of absolute repo paths', async () => {
    await expect(assertNoAbsoluteRepoPaths(WORKSPACE_POC_FIXTURES_ROOT)).resolves.toBeUndefined();
  });

  it('rewrites local overlay repo paths to canonical absolute paths inside the sandbox', async () => {
    const sandbox = await createSandbox('happy-path');

    assertTargetMembership(['app', 'api', 'docs'], Object.keys(sandbox.repoPaths));
    assertTargetMembership(['app', 'api', 'docs'], Object.keys(sandbox.overlayRepoPaths));

    for (const [alias, repoRoot] of Object.entries(sandbox.repoPaths)) {
      expect(path.isAbsolute(repoRoot)).toBe(true);
      expect(sandbox.overlayRepoPaths[alias]).toBe(repoRoot);
    }
  });

  it('supports dirty fixtures with stale overlays and partial materialization checks', async () => {
    const sandbox = await createSandbox('dirty');

    assertTargetMembership(['app', 'api', 'docs'], Object.keys(sandbox.overlayRepoPaths));
    expect(path.isAbsolute(sandbox.overlayRepoPaths.docs)).toBe(true);
    await expect(
      assertMaterializationInvariants({
        workspaceChangeId: 'shared-cleanup',
        repoRoots: sandbox.repoPaths,
        targetAliases: ['app'],
      })
    ).resolves.toBeUndefined();
  });
});
