import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';
import {
  readWorkspaceMetadata,
  writeWorkspaceMetadata,
} from '../../../src/core/workspace/metadata.js';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import { runCLI } from '../../helpers/run-cli.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];
const tempRoots: string[] = [];

async function createIsolatedEnv(): Promise<{ env: NodeJS.ProcessEnv; root: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-open-cli-e2e-'));
  tempRoots.push(root);

  return {
    root,
    env: {
      OPEN_SPEC_TELEMETRY_DISABLED: '1',
      XDG_CONFIG_HOME: path.join(root, 'xdg-config'),
      XDG_DATA_HOME: path.join(root, 'xdg-data'),
    },
  };
}

async function createSandbox(
  fixture: 'happy-path' | 'dirty' = 'dirty'
): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture });
  sandboxes.push(sandbox);
  return sandbox;
}

function cliEnv(): NodeJS.ProcessEnv {
  return {
    OPEN_SPEC_TELEMETRY_DISABLED: '1',
  };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
  await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('workspace open CLI e2e', () => {
  it('auto-selects the only managed workspace when run outside a workspace root', async () => {
    const { env, root } = await createIsolatedEnv();
    const workspaceRoot = path.join(root, 'xdg-data', 'openspec', 'workspaces', 'solo-open');

    const createResult = await runCLI(['workspace', 'create', 'solo-open'], { env });
    expect(createResult.exitCode).toBe(0);

    const result = await runCLI(['workspace', 'open', '--json'], {
      cwd: root,
      env: {
        ...cliEnv(),
        XDG_CONFIG_HOME: env.XDG_CONFIG_HOME,
        XDG_DATA_HOME: env.XDG_DATA_HOME,
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const output = JSON.parse(result.stdout);
    expect(output.workspaceRoot).toBe(FileSystemUtils.canonicalizeExistingPath(workspaceRoot));
    expect(output.mode).toBe('workspace-root');
    expect(output.agent).toBe('claude');
  });

  it('uses the stored preferred agent when selecting a managed workspace outside the workspace root', async () => {
    const { env, root } = await createIsolatedEnv();
    const workspaceRoot = path.join(root, 'xdg-data', 'openspec', 'workspaces', 'codex-home-open');
    const localOverlayPath = path.join(workspaceRoot, '.openspec', 'local.yaml');
    const codexHome = path.join(root, 'codex-home');

    const createResult = await runCLI(['workspace', 'create', 'codex-home-open'], { env });
    expect(createResult.exitCode).toBe(0);

    const localOverlay = parseYaml(await fs.readFile(localOverlayPath, 'utf-8')) as {
      version: number;
      repoPaths: Record<string, string>;
      preferredAgent?: string;
    };
    await fs.writeFile(localOverlayPath, stringifyYaml({
      ...localOverlay,
      preferredAgent: 'codex',
    }), 'utf-8');

    const result = await runCLI(['workspace', 'open', '--json'], {
      cwd: root,
      env: {
        ...cliEnv(),
        XDG_CONFIG_HOME: env.XDG_CONFIG_HOME,
        XDG_DATA_HOME: env.XDG_DATA_HOME,
        CODEX_HOME: codexHome,
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const output = JSON.parse(result.stdout);
    expect(output.workspaceRoot).toBe(FileSystemUtils.canonicalizeExistingPath(workspaceRoot));
    expect(output.agent).toBe('codex');
    expect(output.instructionSurface.path).toBe(path.join(codexHome, 'prompts', 'opsx-workspace-open.md'));
  });

  it('fails clearly when multiple managed workspaces exist outside the workspace root and no name is provided', async () => {
    const { env, root } = await createIsolatedEnv();

    expect((await runCLI(['workspace', 'create', 'alpha-open'], { env })).exitCode).toBe(0);
    expect((await runCLI(['workspace', 'create', 'beta-open'], { env })).exitCode).toBe(0);

    const result = await runCLI(['workspace', 'open'], {
      cwd: root,
      env: {
        ...cliEnv(),
        XDG_CONFIG_HOME: env.XDG_CONFIG_HOME,
        XDG_DATA_HOME: env.XDG_DATA_HOME,
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('\n');
    expect(result.stderr).toContain('Multiple managed workspaces found: alpha-open, beta-open.');
    expect(result.stderr).toContain("Re-run with '--name <workspace-name>' or from inside the target workspace.");
  });

  it('uses --name to choose a managed workspace outside the workspace root', async () => {
    const { env, root } = await createIsolatedEnv();
    const betaWorkspaceRoot = path.join(root, 'xdg-data', 'openspec', 'workspaces', 'beta-open');

    expect((await runCLI(['workspace', 'create', 'alpha-open'], { env })).exitCode).toBe(0);
    expect((await runCLI(['workspace', 'create', 'beta-open'], { env })).exitCode).toBe(0);

    const result = await runCLI(['workspace', 'open', '--name', 'beta-open', '--json'], {
      cwd: root,
      env: {
        ...cliEnv(),
        XDG_CONFIG_HOME: env.XDG_CONFIG_HOME,
        XDG_DATA_HOME: env.XDG_DATA_HOME,
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const output = JSON.parse(result.stdout);
    expect(output.workspaceRoot).toBe(FileSystemUtils.canonicalizeExistingPath(betaWorkspaceRoot));
    expect(output.mode).toBe('workspace-root');
  });

  it('returns a workspace-root JSON surface with ready registered repo attachments', async () => {
    const sandbox = await createSandbox('dirty');
    const result = await runCLI(['workspace', 'open', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const output = JSON.parse(result.stdout);
    expect(output.mode).toBe('workspace-root');
    expect(output.agent).toBe('claude');
    expect(output.change).toBeNull();
    expect(output.attachedRepos).toEqual([
      { alias: 'api', path: sandbox.repoPaths.api },
      { alias: 'app', path: sandbox.repoPaths.app },
    ]);
    expect(output.instructionSurface.path).toContain('.claude/commands/opsx/workspace-open.md');
    expect(output.instructionSurface.content).toContain('Mode: workspace-root');
    expect(output.instructionSurface.content).toContain(`- api: ${sandbox.repoPaths.api}`);
    expect(output.instructionSurface.content).toContain(`- app: ${sandbox.repoPaths.app}`);
    expect(output.instructionSurface.content).toContain('Registered repos:');
    expect(output.registeredRepos).toEqual([
      { alias: 'api', path: sandbox.repoPaths.api, status: 'ready' },
      { alias: 'app', path: sandbox.repoPaths.app, status: 'ready' },
      {
        alias: 'docs',
        path: sandbox.overlayRepoPaths.docs,
        status: 'missing-repo-path',
        note: expect.stringContaining(`Target alias 'docs' points to a missing repo path`),
      },
    ]);
  });

  it('covers the Claude demo path without writing a multi-root command file to disk', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });

    const result = await runCLI(['workspace', 'open', '--change', 'shared-refresh', '--agent', 'claude', '--prepare-only'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Prepared change-scoped open surface for claude.');
    expect(result.stdout).toContain('Instruction surface (.claude/commands/opsx/workspace-open.md):');
    expect(result.stdout).toContain('Mode: change-scoped');
    expect(result.stdout).toContain(`- app: ${sandbox.repoPaths.app}`);
    expect(result.stdout).toContain(`- api: ${sandbox.repoPaths.api}`);
    expect(result.stdout).not.toContain(`- docs: ${sandbox.overlayRepoPaths.docs}`);
    expect(result.stdout).toContain("Repo-local materialization still happens with 'openspec apply --change shared-refresh --repo <alias>'.");

    expect(
      await pathExists(path.join(sandbox.workspaceRoot, '.claude', 'commands', 'opsx', 'workspace-open.md'))
    ).toBe(false);
    expect(await pathExists(sandbox.repoPath('app', 'openspec', 'changes', 'shared-refresh'))).toBe(false);
    expect(await pathExists(sandbox.repoPath('api', 'openspec', 'changes', 'shared-refresh'))).toBe(false);
  });

  it('returns a codex prompt surface without writing a prompt file to disk', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });
    const codexHome = sandbox.workspacePath('.codex-home');
    const result = await runCLI(['workspace', 'open', '--change', 'shared-refresh', '--agent', 'codex', '--prepare-only'], {
      cwd: sandbox.workspaceRoot,
      env: {
        ...cliEnv(),
        CODEX_HOME: codexHome,
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Prepared change-scoped open surface for codex.');
    expect(result.stdout).toContain(
      `Instruction surface (${path.join(codexHome, 'prompts', 'opsx-workspace-open.md')}):`
    );
    expect(result.stdout).toContain('description: Prepare a change-scoped workspace session for shared-refresh');
    expect(result.stdout).toContain(`- app: ${sandbox.repoPaths.app}`);
    expect(result.stdout).toContain(`- api: ${sandbox.repoPaths.api}`);
    expect(await pathExists(path.join(codexHome, 'prompts', 'opsx-workspace-open.md'))).toBe(false);
  });

  it('returns a github copilot prompt surface and writes a vscode workspace file', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });
    const canonicalWorkspaceRoot = FileSystemUtils.canonicalizeExistingPath(sandbox.workspaceRoot);
    const workspaceFilePath = path.join(
      canonicalWorkspaceRoot,
      '.openspec',
      'workspace-open',
      'github-copilot',
      'shared-refresh.code-workspace'
    );
    const promptFilePath = path.join(canonicalWorkspaceRoot, '.github', 'prompts', 'opsx-workspace-open.prompt.md');
    const result = await runCLI(['workspace', 'open', '--change', 'shared-refresh', '--agent', 'github-copilot', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const output = JSON.parse(result.stdout);
    expect(output.agent).toBe('github-copilot');
    expect(output.instructionSurface.path).toBe(path.join('.github', 'prompts', 'opsx-workspace-open.prompt.md'));
    expect(output.instructionSurface.content).toContain(
      'description: Prepare a change-scoped workspace session for shared-refresh'
    );
    expect(output.editorSurface).toEqual({
      kind: 'vscode-workspace',
      path: workspaceFilePath,
      content: expect.any(String),
    });
    expect(output.editorSurface.content).toContain(`"name": "workspace"`);
    expect(output.editorSurface.content).toContain(`"path": "${canonicalWorkspaceRoot}"`);
    expect(output.editorSurface.content).toContain(`"name": "app"`);
    expect(output.editorSurface.content).toContain(`"path": "${sandbox.repoPaths.app}"`);
    expect(output.editorSurface.content).toContain(`"name": "api"`);
    expect(output.editorSurface.content).toContain(`"path": "${sandbox.repoPaths.api}"`);
    expect(output.editorSurface.content).not.toContain(sandbox.overlayRepoPaths.docs);

    expect(await fs.readFile(promptFilePath, 'utf-8')).toBe(output.instructionSurface.content);
    expect(await fs.readFile(workspaceFilePath, 'utf-8')).toBe(output.editorSurface.content);
    expect(await fs.readFile(path.join(sandbox.workspaceRoot, '.gitignore'), 'utf-8')).toContain(
      '/.openspec/workspace-open/'
    );
    expect(await pathExists(sandbox.repoPath('app', 'openspec', 'changes', 'shared-refresh'))).toBe(false);
    expect(await pathExists(sandbox.repoPath('api', 'openspec', 'changes', 'shared-refresh'))).toBe(false);
  });

  it('attaches only targeted repos and fails clearly for stale targets', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-broken', {
      targets: 'app,docs',
    });

    const successResult = await runCLI(['workspace', 'open', '--change', 'shared-refresh', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(successResult.exitCode).toBe(0);
    expect(successResult.stderr).toBe('');

    const successOutput = JSON.parse(successResult.stdout);
    const canonicalChangePath = FileSystemUtils.canonicalizeExistingPath(
      sandbox.workspacePath('changes', 'shared-refresh')
    );
    expect(successOutput.mode).toBe('change-scoped');
    expect(successOutput.change).toEqual({
      id: 'shared-refresh',
      path: canonicalChangePath,
    });
    expect(successOutput.attachedRepos).toEqual([
      { alias: 'app', path: sandbox.repoPaths.app },
      { alias: 'api', path: sandbox.repoPaths.api },
    ]);

    const failureResult = await runCLI(['workspace', 'open', '--change', 'shared-broken'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(failureResult.exitCode).toBe(1);
    expect(failureResult.stdout).toBe('\n');
    expect(failureResult.stderr).toContain(`Could not open workspace change 'shared-broken' because 1 targeted repo is unresolved:`);
    expect(failureResult.stderr).toContain(`Target alias 'docs' points to a missing repo path: ${sandbox.overlayRepoPaths.docs}`);
    expect(failureResult.stderr).toContain(`Run 'openspec workspace doctor' and repair the failing alias before retrying.`);
  });

  it('surfaces configured repo owner or handoff guidance in workspace open text and JSON', async () => {
    const sandbox = await createSandbox('dirty');
    await createWorkspaceChange(sandbox.workspaceRoot, 'shared-refresh', {
      targets: 'app,api',
    });

    const metadata = await readWorkspaceMetadata(sandbox.workspaceRoot);
    metadata.repos.app = {
      ...metadata.repos.app,
      owner: 'App Platform',
      handoff: 'Open the app repo-local change once the shared plan is approved',
    };
    metadata.repos.api = {
      ...metadata.repos.api,
      owner: 'API Platform',
    };
    await writeWorkspaceMetadata(sandbox.workspaceRoot, metadata);

    const textResult = await runCLI(['workspace', 'open', '--change', 'shared-refresh', '--prepare-only'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const jsonResult = await runCLI(['workspace', 'open', '--change', 'shared-refresh', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(textResult.exitCode).toBe(0);
    expect(textResult.stderr).toBe('');
    expect(textResult.stdout).toContain(
      `- app: ${sandbox.repoPaths.app} (owner: App Platform; handoff: Open the app repo-local change once the shared plan is approved)`
    );
    expect(textResult.stdout).toContain(
      `- api: ${sandbox.repoPaths.api} (owner: API Platform)`
    );
    expect(textResult.stdout).toContain('owner: App Platform');
    expect(textResult.stdout).toContain('owner: API Platform');

    expect(jsonResult.exitCode).toBe(0);
    expect(jsonResult.stderr).toBe('');

    expect(JSON.parse(jsonResult.stdout).attachedRepos).toEqual([
      {
        alias: 'app',
        path: sandbox.repoPaths.app,
        owner: 'App Platform',
        handoff: 'Open the app repo-local change once the shared plan is approved',
      },
      {
        alias: 'api',
        path: sandbox.repoPaths.api,
        owner: 'API Platform',
      },
    ]);
  });

  it('keeps older ownerless workspace fixtures readable without guidance fields', async () => {
    const sandbox = await createSandbox('happy-path');
    await createWorkspaceChange(sandbox.workspaceRoot, 'ownerless-open', {
      targets: 'app,docs',
    });

    const textResult = await runCLI(['workspace', 'open', '--change', 'ownerless-open', '--prepare-only'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const jsonResult = await runCLI(['workspace', 'open', '--change', 'ownerless-open', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(textResult.exitCode).toBe(0);
    expect(textResult.stderr).toBe('');
    expect(textResult.stdout).toContain(`- app: ${sandbox.repoPaths.app}`);
    expect(textResult.stdout).toContain(`- docs: ${sandbox.repoPaths.docs}`);
    expect(textResult.stdout).not.toContain('owner:');
    expect(textResult.stdout).not.toContain('handoff:');

    expect(jsonResult.exitCode).toBe(0);
    expect(jsonResult.stderr).toBe('');
    expect(JSON.parse(jsonResult.stdout).attachedRepos).toEqual([
      {
        alias: 'app',
        path: sandbox.repoPaths.app,
      },
      {
        alias: 'docs',
        path: sandbox.repoPaths.docs,
      },
    ]);
    expect(jsonResult.stdout).not.toContain('"owner"');
    expect(jsonResult.stdout).not.toContain('"handoff"');
  });

  it('fails with the documented error for unsupported agents', async () => {
    const sandbox = await createSandbox('dirty');
    const result = await runCLI(['workspace', 'open', '--agent', 'cursor'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('\n');
    expect(result.stderr).toContain("Unsupported agent 'cursor' for workspace open. Supported agents: claude, codex, github-copilot.");
  });
});
