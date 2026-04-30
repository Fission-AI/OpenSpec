import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import { runCLI } from '../../helpers/run-cli.js';
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
  }

  return FileSystemUtils.canonicalizeExistingPath(repoRoot);
}

function cliEnv(): NodeJS.ProcessEnv {
  return {
    OPEN_SPEC_TELEMETRY_DISABLED: '1',
  };
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace repo registry CLI e2e', () => {
  it('supports repeated repo additions and a clean doctor pass in a real workspace sandbox', async () => {
    const sandbox = await createSandbox();
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);
    const aliases = ['app', 'api', 'docs'] as const;

    for (const alias of aliases) {
      const repoRoot = await createRepoRoot(sandbox, alias);
      const result = await runCLI(['workspace', 'add-repo', alias, repoRoot, '--json'], {
        cwd: sandbox.workspaceRoot,
        env: cliEnv(),
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');

      const output = JSON.parse(result.stdout);
      expect(output.alias).toBe(alias);
      expect(output.canonicalPath).toBe(repoRoot);
    }

    const doctorResult = await runCLI(['workspace', 'doctor', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const workspaceMetadata = parseYaml(
      await fs.readFile(sandbox.workspacePath('.openspec', 'workspace.yaml'), 'utf-8')
    );

    expect(doctorResult.exitCode).toBe(0);
    expect(doctorResult.stderr).toBe('');
    expect(JSON.parse(doctorResult.stdout)).toEqual({
      workspaceRoot: canonicalWorkspaceRoot,
      registeredAliasCount: 3,
      localAliasCount: 3,
      issues: [],
      status: 'ok',
    });
    expect(workspaceMetadata).toEqual({
      version: 1,
      name: 'empty-sandbox',
      repos: {
        api: {},
        app: {},
        docs: {},
      },
    });

    const workspaceYaml = await fs.readFile(sandbox.workspacePath('.openspec', 'workspace.yaml'), 'utf-8');
    expect(workspaceYaml).not.toContain(sandbox.reposRoot);
  });

  it('records and updates repo owner or handoff guidance without leaking local paths into committed metadata', async () => {
    const sandbox = await createSandbox();
    const repoRoot = await createRepoRoot(sandbox, 'app');
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);

    const addResult = await runCLI([
      'workspace',
      'add-repo',
      'app',
      repoRoot,
      '--owner',
      'App Platform',
      '--handoff',
      'Materialize app after the shared review',
      '--json',
    ], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(addResult.exitCode).toBe(0);
    expect(addResult.stderr).toBe('');
    expect(JSON.parse(addResult.stdout)).toEqual({
      workspaceRoot: canonicalWorkspaceRoot,
      alias: 'app',
      canonicalPath: repoRoot,
      owner: 'App Platform',
      handoff: 'Materialize app after the shared review',
    });

    const updateResult = await runCLI([
      'workspace',
      'update-repo',
      'app',
      '--handoff',
      'Open the app repo-local change once the workspace plan is approved',
      '--json',
    ], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(updateResult.exitCode).toBe(0);
    expect(updateResult.stderr).toBe('');
    expect(JSON.parse(updateResult.stdout)).toEqual({
      workspaceRoot: canonicalWorkspaceRoot,
      alias: 'app',
      owner: 'App Platform',
      handoff: 'Open the app repo-local change once the workspace plan is approved',
    });

    const workspaceMetadata = parseYaml(
      await fs.readFile(sandbox.workspacePath('.openspec', 'workspace.yaml'), 'utf-8')
    );
    const localOverlay = parseYaml(
      await fs.readFile(sandbox.workspacePath('.openspec', 'local.yaml'), 'utf-8')
    );

    expect(workspaceMetadata).toEqual({
      version: 1,
      name: 'empty-sandbox',
      repos: {
        app: {
          owner: 'App Platform',
          handoff: 'Open the app repo-local change once the workspace plan is approved',
        },
      },
    });
    expect(localOverlay).toEqual({
      version: 1,
      repoPaths: {
        app: repoRoot,
      },
    });
    expect(await fs.readFile(sandbox.workspacePath('.openspec', 'workspace.yaml'), 'utf-8'))
      .not.toContain(repoRoot);
  });

  it('reports stale local overlay paths and returns to success after local.yaml is repaired', async () => {
    const sandbox = await createSandbox('dirty');
    const docsRepoRoot = await createRepoRoot(sandbox, 'docs');
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);

    const staleDoctor = await runCLI(['workspace', 'doctor', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(staleDoctor.exitCode).toBe(1);
    expect(staleDoctor.stderr).toBe('');

    const staleOutput = JSON.parse(staleDoctor.stdout);
    expect(staleOutput.status).toBe('issues');
    expect(staleOutput.issues).toEqual([
      {
        code: 'missing-repo-path',
        alias: 'docs',
        storedPath: sandbox.overlayRepoPaths.docs,
        resolvedPath: sandbox.overlayRepoPaths.docs,
        message: `Alias 'docs' points to a missing repo path: ${sandbox.overlayRepoPaths.docs}`,
      },
    ]);

    const localOverlayPath = sandbox.workspacePath('.openspec', 'local.yaml');
    const localOverlay = parseYaml(await fs.readFile(localOverlayPath, 'utf-8')) as {
      version: number;
      repoPaths: Record<string, string>;
    };
    const repairedOverlay = {
      ...localOverlay,
      repoPaths: {
        ...localOverlay.repoPaths,
        docs: docsRepoRoot,
      },
    };

    await fs.writeFile(localOverlayPath, stringifyYaml(repairedOverlay), 'utf-8');

    const repairedDoctor = await runCLI(['workspace', 'doctor', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(repairedDoctor.exitCode).toBe(0);
    expect(repairedDoctor.stderr).toBe('');
    expect(JSON.parse(repairedDoctor.stdout)).toEqual({
      workspaceRoot: canonicalWorkspaceRoot,
      registeredAliasCount: 3,
      localAliasCount: 3,
      issues: [],
      status: 'ok',
    });
  });
});
