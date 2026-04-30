import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ArchiveCommand } from '../../../src/core/archive.js';
import { applyWorkspaceChange } from '../../../src/core/workspace/apply.js';
import { createWorkspaceChange } from '../../../src/core/workspace/change-create.js';
import {
  readWorkspaceLocalOverlay,
  readWorkspaceMetadata,
  writeWorkspaceLocalOverlay,
  writeWorkspaceMetadata,
} from '../../../src/core/workspace/metadata.js';
import {
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const { startMock, stopMock } = vi.hoisted(() => ({
  startMock: vi.fn(),
  stopMock: vi.fn(),
}));

vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: startMock,
  })),
}));

const sandboxes: WorkspaceSandbox[] = [];

async function createSandbox(): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture: 'happy-path' });
  sandboxes.push(sandbox);
  return sandbox;
}

async function addRepoAlias(sandbox: WorkspaceSandbox, alias: string): Promise<string> {
  const repoRoot = path.join(sandbox.reposRoot, alias);
  await fs.mkdir(path.join(repoRoot, 'openspec', 'changes'), { recursive: true });
  await fs.writeFile(path.join(repoRoot, 'README.md'), `# ${alias} fixture\n`, 'utf-8');

  const metadata = await readWorkspaceMetadata(sandbox.workspaceRoot);
  metadata.repos[alias] = { description: `${alias} repo` };
  await writeWorkspaceMetadata(sandbox.workspaceRoot, metadata);

  const overlay = await readWorkspaceLocalOverlay(sandbox.workspaceRoot);
  overlay.repoPaths[alias] = repoRoot;
  await writeWorkspaceLocalOverlay(sandbox.workspaceRoot, overlay);

  return repoRoot;
}

async function archiveRepoLocalChange(repoRoot: string, changeId: string): Promise<void> {
  const archiveCommand = new ArchiveCommand();
  const originalCwd = process.cwd();

  try {
    process.chdir(repoRoot);
    await archiveCommand.execute(changeId, {
      yes: true,
      skipSpecs: true,
      noValidate: true,
    });
  } finally {
    process.chdir(originalCwd);
  }
}

async function seedMixedWorkspaceStatus(sandbox: WorkspaceSandbox): Promise<void> {
  await addRepoAlias(sandbox, 'ops');

  await createWorkspaceChange(sandbox.workspaceRoot, 'multi-surface', {
    description: 'Exercise workspace-aware status output.',
    targets: 'app,api,docs,ops',
  });

  await applyWorkspaceChange({
    cwd: sandbox.workspaceRoot,
    change: 'multi-surface',
    repo: 'app',
  });
  await applyWorkspaceChange({
    cwd: sandbox.workspaceRoot,
    change: 'multi-surface',
    repo: 'api',
  });
  await archiveRepoLocalChange(sandbox.repoPaths.app, 'multi-surface');
  await fs.rm(sandbox.repoPaths.docs, { recursive: true, force: true });
}

async function runStatusCommand(
  cwd: string,
  options: { change?: string; schema?: string; json?: boolean }
): Promise<void> {
  const { statusCommand } = await import('../../../src/commands/workflow/status.js');
  const originalCwd = process.cwd();

  try {
    process.chdir(cwd);
    await statusCommand(options);
  } finally {
    process.chdir(originalCwd);
  }
}

describe('status command in a managed workspace', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    startMock.mockReset();
    stopMock.mockReset();
    startMock.mockReturnValue({
      stop: stopMock,
    });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
    vi.restoreAllMocks();
  });

  it('prints workspace-aware mixed target status in text mode', async () => {
    const sandbox = await createSandbox();
    await seedMixedWorkspaceStatus(sandbox);
    consoleLogSpy.mockClear();

    await runStatusCommand(sandbox.workspaceRoot, {
      change: 'multi-surface',
    });

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(output).toContain('Workspace change: multi-surface');
    expect(output).toContain('State: blocked');
    expect(output).toContain('Coordination: planned (0/2 tasks)');
    expect(output).toContain('- api: materialized via repo (0/2 tasks)');
    expect(output).toContain('- app: archived via repo (0/2 tasks)');
    expect(output).toContain('- docs: blocked via workspace (0/2 tasks)');
    expect(output).toContain("problem: repo alias 'docs' points to a missing repo path");
    expect(output).toContain('- ops: planned via workspace (0/2 tasks)');
    expect(output).toContain(
      "Next step: run 'openspec workspace doctor' and repair repo alias 'docs' before resuming 'multi-surface'."
    );
  });

  it('emits parseable workspace status JSON without starting a spinner', async () => {
    const sandbox = await createSandbox();
    await seedMixedWorkspaceStatus(sandbox);
    consoleLogSpy.mockClear();

    await runStatusCommand(sandbox.workspaceRoot, {
      change: 'multi-surface',
      json: true,
    });

    const output = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    const status = JSON.parse(output);

    expect(startMock).not.toHaveBeenCalled();
    expect(stopMock).not.toHaveBeenCalled();
    expect(status.change).toEqual({
      id: 'multi-surface',
      state: 'blocked',
    });
    expect(status.coordination).toEqual({
      state: 'planned',
      tasks: { completed: 0, total: 2 },
      problems: [],
    });
    expect(status.targets).toEqual([
      {
        alias: 'api',
        state: 'materialized',
        source: 'repo',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      {
        alias: 'app',
        state: 'archived',
        source: 'repo',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      {
        alias: 'docs',
        state: 'blocked',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: ["repo alias 'docs' points to a missing repo path"],
      },
      {
        alias: 'ops',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
    ]);
    expect(output).not.toContain('\u001b');
    expect(output).not.toContain('Loading change status...');
  });

  it('shows configured repo owner or handoff guidance in workspace-aware status text and JSON', async () => {
    const sandbox = await createSandbox();

    await createWorkspaceChange(sandbox.workspaceRoot, 'guided-status', {
      description: 'Exercise owner and handoff visibility in status output.',
      targets: 'app',
    });

    const metadata = await readWorkspaceMetadata(sandbox.workspaceRoot);
    metadata.repos.app = {
      ...metadata.repos.app,
      owner: 'App Platform',
      handoff: 'Materialize the app slice after the shared review is signed off',
    };
    await writeWorkspaceMetadata(sandbox.workspaceRoot, metadata);

    consoleLogSpy.mockClear();
    await runStatusCommand(sandbox.workspaceRoot, {
      change: 'guided-status',
    });

    const textOutput = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(textOutput).toContain(
      '- app: planned via workspace (0/2 tasks) [owner: App Platform; handoff: Materialize the app slice after the shared review is signed off]'
    );

    consoleLogSpy.mockClear();
    await runStatusCommand(sandbox.workspaceRoot, {
      change: 'guided-status',
      json: true,
    });

    const jsonOutput = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(JSON.parse(jsonOutput).targets).toEqual([
      {
        alias: 'app',
        state: 'planned',
        source: 'workspace',
        tasks: { completed: 0, total: 2 },
        problems: [],
        owner: 'App Platform',
        handoff: 'Materialize the app slice after the shared review is signed off',
      },
    ]);
  });
});
