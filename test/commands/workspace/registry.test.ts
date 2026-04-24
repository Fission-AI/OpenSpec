import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const { failMock } = vi.hoisted(() => ({
  failMock: vi.fn(),
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    fail: failMock,
  })),
}));

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

async function runWorkspaceCommand(args: string[], cwd: string): Promise<void> {
  const { registerWorkspaceCommand } = await import('../../../src/commands/workspace.js');
  const program = new Command();
  registerWorkspaceCommand(program);
  const originalCwd = process.cwd();

  try {
    process.chdir(cwd);
    await program.parseAsync(['node', 'openspec', 'workspace', ...args]);
  } finally {
    process.chdir(originalCwd);
  }
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

describe('workspace registry command integration', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    process.exitCode = undefined;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code})`);
    });
    failMock.mockReset();
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it('registers repos through the command surface and preserves committed-vs-local metadata split', async () => {
    const sandbox = await createSandbox();
    const appRepoRoot = await createRepoRoot(sandbox, 'app');
    const rawRepoPath = path.join('..', path.basename(sandbox.reposRoot), 'app');

    await runWorkspaceCommand(['add-repo', 'app', rawRepoPath], sandbox.workspaceRoot);

    const workspaceMetadata = parseYaml(
      await fs.readFile(sandbox.workspacePath('.openspec', 'workspace.yaml'), 'utf-8')
    );
    const localOverlay = parseYaml(
      await fs.readFile(sandbox.workspacePath('.openspec', 'local.yaml'), 'utf-8')
    );

    expect(consoleLogSpy).toHaveBeenCalledWith(`Registered repo alias 'app' -> ${appRepoRoot}`);
    expect(consoleLogSpy).toHaveBeenCalledWith('Updated: .openspec/workspace.yaml, .openspec/local.yaml');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
    expect(workspaceMetadata).toEqual({
      version: 1,
      name: 'empty-sandbox',
      repos: {
        app: {},
      },
    });
    expect(localOverlay).toEqual({
      version: 1,
      repoPaths: {
        app: appRepoRoot,
      },
    });
    expect(await fs.readFile(sandbox.workspacePath('.openspec', 'workspace.yaml'), 'utf-8'))
      .not.toContain(appRepoRoot);
  });

  it('records and updates repo owner or handoff guidance without touching local overlay state', async () => {
    const sandbox = await createSandbox();
    const appRepoRoot = await createRepoRoot(sandbox, 'app');

    await runWorkspaceCommand([
      'add-repo',
      'app',
      appRepoRoot,
      '--owner',
      'App Platform',
      '--handoff',
      'Materialize app after API review',
    ], sandbox.workspaceRoot);

    const localOverlayBeforeUpdate = await fs.readFile(
      sandbox.workspacePath('.openspec', 'local.yaml'),
      'utf-8'
    );
    consoleLogSpy.mockClear();

    await runWorkspaceCommand([
      'update-repo',
      'app',
      '--handoff',
      'Open the repo-local app change once the shared plan is approved',
    ], sandbox.workspaceRoot);

    const workspaceMetadata = parseYaml(
      await fs.readFile(sandbox.workspacePath('.openspec', 'workspace.yaml'), 'utf-8')
    );
    const localOverlayAfterUpdate = await fs.readFile(
      sandbox.workspacePath('.openspec', 'local.yaml'),
      'utf-8'
    );

    expect(consoleLogSpy).toHaveBeenCalledWith("Updated repo guidance for 'app'.");
    expect(consoleLogSpy).toHaveBeenCalledWith('Owner: App Platform');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Handoff: Open the repo-local app change once the shared plan is approved'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Updated: .openspec/workspace.yaml');
    expect(workspaceMetadata).toEqual({
      version: 1,
      name: 'empty-sandbox',
      repos: {
        app: {
          owner: 'App Platform',
          handoff: 'Open the repo-local app change once the shared plan is approved',
        },
      },
    });
    expect(localOverlayAfterUpdate).toBe(localOverlayBeforeUpdate);
    expect(await fs.readFile(sandbox.workspacePath('.openspec', 'workspace.yaml'), 'utf-8'))
      .not.toContain(appRepoRoot);
  });

  it('reports healthy registry state from the command surface', async () => {
    const sandbox = await createSandbox('happy-path');
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);

    await runWorkspaceCommand(['doctor'], sandbox.workspaceRoot);

    expect(consoleLogSpy).toHaveBeenCalledWith(`Workspace doctor passed for ${canonicalWorkspaceRoot}`);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Validated 3 registered aliases against 3 local overlay entries.'
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('exits non-zero and reports stale registry issues from the command surface', async () => {
    const sandbox = await createSandbox('dirty');
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);

    await runWorkspaceCommand(['doctor'], sandbox.workspaceRoot);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      `Workspace doctor found 1 issue in ${canonicalWorkspaceRoot}:`
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      `- Alias 'docs' points to a missing repo path: ${sandbox.overlayRepoPaths.docs}`
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Next step: repair '.openspec/local.yaml' for alias 'docs', then rerun 'openspec workspace doctor'."
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(failMock).not.toHaveBeenCalled();
    expect(process.exit).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
