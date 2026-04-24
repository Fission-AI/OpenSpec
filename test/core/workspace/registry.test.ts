import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  addWorkspaceRepo,
  runWorkspaceDoctor,
  updateWorkspaceRepoGuidance,
} from '../../../src/core/workspace/registry.js';
import {
  readWorkspaceLocalOverlay,
  readWorkspaceMetadata,
  writeWorkspaceLocalOverlay,
  writeWorkspaceMetadata,
} from '../../../src/core/workspace/metadata.js';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(
  fixture: 'empty' | 'happy-path' | 'dirty' = 'empty'
): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture });
  sandboxes.push(sandbox);
  return sandbox;
}

async function createRepoRoot(
  sandbox: WorkspaceSandbox,
  alias: string,
  options: { withOpenspec?: boolean } = {}
): Promise<string> {
  const repoRoot = path.join(sandbox.reposRoot, alias);
  await fs.mkdir(repoRoot, { recursive: true });
  await fs.writeFile(path.join(repoRoot, 'README.md'), `# ${alias}\n`, 'utf-8');

  if (options.withOpenspec !== false) {
    await fs.mkdir(path.join(repoRoot, 'openspec', 'changes'), { recursive: true });
    await fs.mkdir(path.join(repoRoot, 'openspec', 'specs'), { recursive: true });
  }

  return FileSystemUtils.canonicalizeExistingPath(repoRoot);
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace repo registry core behavior', () => {
  it('trims valid aliases, rejects invalid aliases, and canonicalizes stored repo paths', async () => {
    const sandbox = await createSandbox();
    const repoRoot = await createRepoRoot(sandbox, 'app');
    const rawRepoPath = path.join('..', path.basename(sandbox.reposRoot), 'app', '..', 'app');

    const result = await addWorkspaceRepo('  app-ui  ', rawRepoPath, {
      cwd: sandbox.workspaceRoot,
    });

    expect(result.alias).toBe('app-ui');
    expect(result.canonicalPath).toBe(FileSystemUtils.canonicalizeExistingPath(repoRoot));

    const metadata = await readWorkspaceMetadata(sandbox.workspaceRoot);
    const localOverlay = await readWorkspaceLocalOverlay(sandbox.workspaceRoot);

    expect(metadata.repos).toEqual({
      'app-ui': {},
    });
    expect(localOverlay.repoPaths).toEqual({
      'app-ui': result.canonicalPath,
    });

    await expect(
      addWorkspaceRepo('App UI', rawRepoPath, { cwd: sandbox.workspaceRoot })
    ).rejects.toThrow("Invalid repo alias 'App UI'");
  });

  it('keeps committed workspace metadata stable when local repo paths change', async () => {
    const sandbox = await createSandbox();
    const originalRepoRoot = await createRepoRoot(sandbox, 'app');

    await addWorkspaceRepo('app', originalRepoRoot, { cwd: sandbox.workspaceRoot });

    const workspaceMetadataPath = sandbox.workspacePath('.openspec', 'workspace.yaml');
    const initialCommittedContent = await fs.readFile(workspaceMetadataPath, 'utf-8');
    const originalOverlay = await readWorkspaceLocalOverlay(sandbox.workspaceRoot);

    const relocatedRepoRoot = await createRepoRoot(sandbox, 'app-relocated');
    await writeWorkspaceLocalOverlay(sandbox.workspaceRoot, {
      ...originalOverlay,
      repoPaths: {
        ...originalOverlay.repoPaths,
        app: relocatedRepoRoot,
      },
    });

    const nextCommittedContent = await fs.readFile(workspaceMetadataPath, 'utf-8');
    const nextCommittedMetadata = parseYaml(nextCommittedContent);
    const nextLocalOverlay = await readWorkspaceLocalOverlay(sandbox.workspaceRoot);

    expect(nextCommittedContent).toBe(initialCommittedContent);
    expect(nextCommittedMetadata).toEqual({
      version: 1,
      name: 'empty-sandbox',
      repos: {
        app: {},
      },
    });
    expect(nextLocalOverlay.repoPaths.app).toBe(relocatedRepoRoot);
  });

  it('stores owner or handoff guidance in committed metadata and updates it without touching local paths', async () => {
    const sandbox = await createSandbox();
    const repoRoot = await createRepoRoot(sandbox, 'app');

    const addResult = await addWorkspaceRepo('app', repoRoot, {
      cwd: sandbox.workspaceRoot,
      owner: ' Platform Team ',
      handoff: ' Hand off repo-local execution after contract review ',
    });

    expect(addResult).toMatchObject({
      alias: 'app',
      canonicalPath: repoRoot,
      owner: 'Platform Team',
      handoff: 'Hand off repo-local execution after contract review',
    });

    const overlayBeforeUpdate = await readWorkspaceLocalOverlay(sandbox.workspaceRoot);
    const updateResult = await updateWorkspaceRepoGuidance('app', {
      cwd: sandbox.workspaceRoot,
      handoff: 'Open the repo-local change in app once planning is approved',
    });

    expect(updateResult).toEqual({
      workspaceRoot: sandbox.workspaceRoot,
      alias: 'app',
      owner: 'Platform Team',
      handoff: 'Open the repo-local change in app once planning is approved',
    });

    const metadata = await readWorkspaceMetadata(sandbox.workspaceRoot);
    const overlayAfterUpdate = await readWorkspaceLocalOverlay(sandbox.workspaceRoot);

    expect(metadata.repos).toEqual({
      app: {
        owner: 'Platform Team',
        handoff: 'Open the repo-local change in app once planning is approved',
      },
    });
    expect(overlayAfterUpdate).toEqual(overlayBeforeUpdate);
    expect(await fs.readFile(sandbox.workspacePath('.openspec', 'workspace.yaml'), 'utf-8'))
      .not.toContain(repoRoot);
  });

  it('reports doctor diagnostics for missing local paths, repo drift, missing repos, missing openspec state, and extra aliases', async () => {
    const sandbox = await createSandbox();
    const appRoot = await createRepoRoot(sandbox, 'app');
    const apiRoot = await createRepoRoot(sandbox, 'api', { withOpenspec: false });
    const ghostRoot = await createRepoRoot(sandbox, 'ghost');

    const metadata = await readWorkspaceMetadata(sandbox.workspaceRoot);
    metadata.repos = {
      app: {},
      api: {},
      docs: {},
      web: {},
    };
    await writeWorkspaceMetadata(sandbox.workspaceRoot, metadata);

    await writeWorkspaceLocalOverlay(sandbox.workspaceRoot, {
      version: 1,
      repoPaths: {
        app: path.join('..', path.basename(sandbox.reposRoot), 'app'),
        api: apiRoot,
        docs: path.join(sandbox.reposRoot, 'docs-missing'),
        ghost: ghostRoot,
      },
    });

    const result = await runWorkspaceDoctor({ cwd: sandbox.workspaceRoot });
    expect(result.registeredAliasCount).toBe(4);
    expect(result.localAliasCount).toBe(4);
    expect(result.issues).toHaveLength(5);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ alias: 'app', code: 'non-canonical-path' }),
      expect.objectContaining({ alias: 'api', code: 'missing-openspec-state' }),
      expect.objectContaining({ alias: 'docs', code: 'missing-repo-path' }),
      expect.objectContaining({ alias: 'web', code: 'missing-local-path' }),
      expect.objectContaining({ alias: 'ghost', code: 'extra-local-alias' }),
    ]));

    expect(result.issues.find((issue) => issue.alias === 'app' && issue.code === 'non-canonical-path'))
      .toMatchObject({
        storedPath: path.join('..', path.basename(sandbox.reposRoot), 'app'),
        expectedPath: appRoot,
      });

    expect(result.issues.find((issue) => issue.alias === 'docs' && issue.code === 'missing-repo-path'))
      .toMatchObject({
        resolvedPath: path.join(sandbox.reposRoot, 'docs-missing'),
      });

    expect(result.issues.find((issue) => issue.alias === 'api' && issue.code === 'missing-openspec-state'))
      .toMatchObject({
        resolvedPath: apiRoot,
      });
  });
});
