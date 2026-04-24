import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readChangeMetadata } from '../../../src/utils/change-metadata.js';
import { FileSystemUtils } from '../../../src/utils/file-system.js';
import { runCLI } from '../../helpers/run-cli.js';
import {
  assertMaterializationInvariants,
  assertWorkspaceChangeLayout,
  assertWorkspaceLayout,
} from '../../helpers/workspace-assertions.js';
import {
  WORKSPACE_POC_FIXTURES_ROOT,
  workspaceSandbox,
  type WorkspaceSandbox,
} from '../../helpers/workspace-sandbox.js';

const sandboxes: WorkspaceSandbox[] = [];
const tempRoots: string[] = [];

function cliEnv(extraEnv: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    OPEN_SPEC_TELEMETRY_DISABLED: '1',
    ...extraEnv,
  };
}

async function createSandbox(
  fixture: 'happy-path' | 'dirty' = 'happy-path'
): Promise<WorkspaceSandbox> {
  const sandbox = await workspaceSandbox({ fixture });
  sandboxes.push(sandbox);
  return sandbox;
}

async function createIsolatedEnv(): Promise<{ env: NodeJS.ProcessEnv; root: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-workspace-poc-phase19-'));
  tempRoots.push(root);

  return {
    root,
    env: cliEnv({
      XDG_CONFIG_HOME: path.join(root, 'xdg-config'),
      XDG_DATA_HOME: path.join(root, 'xdg-data'),
    }),
  };
}

async function copyFixtureRepos(
  destinationRoot: string,
  fixture: 'happy-path' | 'dirty',
  aliases: string[]
): Promise<Record<string, string>> {
  const fixtureReposRoot = path.join(WORKSPACE_POC_FIXTURES_ROOT, fixture, 'repos');
  const repoRoots: Record<string, string> = {};

  await fs.mkdir(destinationRoot, { recursive: true });

  for (const alias of aliases) {
    const source = path.join(fixtureReposRoot, alias);
    const destination = path.join(destinationRoot, alias);
    await fs.cp(source, destination, { recursive: true });
    repoRoots[alias] = FileSystemUtils.canonicalizeExistingPath(destination);
  }

  return repoRoots;
}

async function writeWorkspaceCoordinationTasks(
  workspaceRoot: string,
  changeId: string,
  completed: number,
  total: number
): Promise<void> {
  const tasks = Array.from({ length: total }, (_, index) => (
    `- [${index < completed ? 'x' : ' '}] Coordination task ${index + 1}`
  ));
  await fs.writeFile(
    path.join(workspaceRoot, 'changes', changeId, 'tasks', 'coordination.md'),
    `## Coordination Tasks\n${tasks.join('\n')}\n`,
    'utf-8'
  );
}

async function writeRepoTasks(
  repoRoot: string,
  changeId: string,
  completed: number,
  total: number,
  alias: string
): Promise<void> {
  const tasks = Array.from({ length: total }, (_, index) => (
    `- [${index < completed ? 'x' : ' '}] ${alias} task ${index + 1}`
  ));
  await fs.writeFile(
    path.join(repoRoot, 'openspec', 'changes', changeId, 'tasks.md'),
    `## ${alias} Tasks\n${tasks.join('\n')}\n`,
    'utf-8'
  );
}

async function findArchivedRepoChangeDir(repoRoot: string, changeId: string): Promise<string | null> {
  const archiveRoot = path.join(repoRoot, 'openspec', 'changes', 'archive');

  try {
    const entries = await fs.readdir(archiveRoot, { withFileTypes: true });
    const match = entries
      .filter((entry) => entry.isDirectory() && entry.name.endsWith(`-${changeId}`))
      .map((entry) => path.join(archiveRoot, entry.name))
      .sort((left, right) => left.localeCompare(right))
      .pop();

    return match ?? null;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => sandbox.cleanup()));
});

afterAll(async () => {
  await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('workspace POC acceptance CLI e2e', () => {
  it('runs the golden happy path end-to-end with central planning, local execution, and explicit workspace completion', async () => {
    const { env, root } = await createIsolatedEnv();
    const repoRoots = await copyFixtureRepos(path.join(root, 'repos'), 'happy-path', ['app', 'api', 'docs']);

    const createWorkspaceResult = await runCLI(['workspace', 'create', 'phase19-golden', '--json'], { env });
    expect(createWorkspaceResult.exitCode).toBe(0);
    expect(createWorkspaceResult.stderr).toBe('');

    const workspaceRoot = JSON.parse(createWorkspaceResult.stdout).workspaceRoot as string;
    await assertWorkspaceLayout(workspaceRoot);

    for (const alias of ['app', 'api', 'docs'] as const) {
      const addRepoResult = await runCLI(['workspace', 'add-repo', alias, repoRoots[alias], '--json'], {
        cwd: workspaceRoot,
        env,
      });

      expect(addRepoResult.exitCode).toBe(0);
      expect(addRepoResult.stderr).toBe('');
      expect(JSON.parse(addRepoResult.stdout)).toEqual(
        expect.objectContaining({
          alias,
          canonicalPath: repoRoots[alias],
        })
      );
    }

    const newChangeResult = await runCLI(['new', 'change', 'phase19-golden-change', '--targets', 'app,api'], {
      cwd: workspaceRoot,
      env,
    });
    expect(newChangeResult.exitCode).toBe(0);

    const workspaceMetadata = await fs.readFile(path.join(workspaceRoot, '.openspec', 'workspace.yaml'), 'utf-8');
    expect(workspaceMetadata).not.toContain(repoRoots.app);
    expect(workspaceMetadata).not.toContain(repoRoots.api);
    expect(workspaceMetadata).not.toContain(repoRoots.docs);

    const workspaceChangeDir = path.join(workspaceRoot, 'changes', 'phase19-golden-change');
    await assertWorkspaceChangeLayout(workspaceChangeDir, ['app', 'api']);

    const openResult = await runCLI(['workspace', 'open', '--change', 'phase19-golden-change', '--prepare-only'], {
      cwd: workspaceRoot,
      env,
    });
    expect(openResult.exitCode).toBe(0);
    expect(openResult.stderr).toBe('');
    expect(openResult.stdout).toContain('Prepared change-scoped open surface for claude.');
    expect(openResult.stdout).toContain(`- app: ${repoRoots.app}`);
    expect(openResult.stdout).toContain(`- api: ${repoRoots.api}`);
    expect(openResult.stdout).not.toContain(`- docs: ${repoRoots.docs}`);
    expect(openResult.stdout).not.toContain('owner:');
    expect(openResult.stdout).not.toContain('handoff:');

    const applyAppResult = await runCLI(
      ['apply', '--change', 'phase19-golden-change', '--repo', 'app', '--json'],
      {
        cwd: workspaceRoot,
        env,
      }
    );
    expect(applyAppResult.exitCode).toBe(0);
    expect(applyAppResult.stderr).toBe('');
    expect(JSON.parse(applyAppResult.stdout)).toEqual(
      expect.objectContaining({
        change: expect.objectContaining({ id: 'phase19-golden-change' }),
        target: expect.objectContaining({ alias: 'app' }),
      })
    );

    const afterFirstApplyStatusResult = await runCLI(['status', '--change', 'phase19-golden-change', '--json'], {
      cwd: workspaceRoot,
      env,
    });
    expect(afterFirstApplyStatusResult.exitCode).toBe(0);
    const afterFirstApplyStatus = JSON.parse(afterFirstApplyStatusResult.stdout);
    expect(afterFirstApplyStatus).toEqual({
      change: {
        id: 'phase19-golden-change',
        state: 'in-progress',
      },
      coordination: {
        state: 'planned',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      targets: [
        {
          alias: 'api',
          state: 'planned',
          source: 'workspace',
          tasks: { completed: 0, total: 2 },
          problems: [],
        },
        {
          alias: 'app',
          state: 'materialized',
          source: 'repo',
          tasks: { completed: 0, total: 2 },
          problems: [],
        },
      ],
    });

    await writeWorkspaceCoordinationTasks(workspaceRoot, 'phase19-golden-change', 2, 2);
    await writeRepoTasks(repoRoots.app, 'phase19-golden-change', 2, 2, 'app');

    const archiveAppResult = await runCLI(
      ['archive', 'phase19-golden-change', '--yes', '--skip-specs', '--no-validate'],
      {
        cwd: repoRoots.app,
        env,
      }
    );
    expect(archiveAppResult.exitCode).toBe(0);
    expect(archiveAppResult.stderr).toBe('');

    const applyApiResult = await runCLI(
      ['apply', '--change', 'phase19-golden-change', '--repo', 'api', '--json'],
      {
        cwd: workspaceRoot,
        env,
      }
    );
    expect(applyApiResult.exitCode).toBe(0);
    await writeRepoTasks(repoRoots.api, 'phase19-golden-change', 2, 2, 'api');

    const softDoneStatusResult = await runCLI(['status', '--change', 'phase19-golden-change', '--json'], {
      cwd: workspaceRoot,
      env,
    });
    expect(softDoneStatusResult.exitCode).toBe(0);
    const softDoneStatus = JSON.parse(softDoneStatusResult.stdout);
    expect(softDoneStatus.change).toEqual({
      id: 'phase19-golden-change',
      state: 'soft-done',
    });
    expect(softDoneStatus.targets).toEqual([
      {
        alias: 'api',
        state: 'complete',
        source: 'repo',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
      {
        alias: 'app',
        state: 'archived',
        source: 'repo',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
    ]);

    const workspaceArchiveResult = await runCLI(['archive', 'phase19-golden-change', '--workspace'], {
      cwd: workspaceRoot,
      env,
    });
    expect(workspaceArchiveResult.exitCode).toBe(0);
    expect(workspaceArchiveResult.stderr).toBe('');
    expect(workspaceArchiveResult.stdout).toContain(
      "Workspace change 'phase19-golden-change' marked hard-done"
    );

    const finalStatusResult = await runCLI(['status', '--change', 'phase19-golden-change', '--json'], {
      cwd: workspaceRoot,
      env,
    });
    expect(finalStatusResult.exitCode).toBe(0);
    const finalStatus = JSON.parse(finalStatusResult.stdout);
    expect(finalStatus.change).toEqual({
      id: 'phase19-golden-change',
      state: 'hard-done',
    });
    expect(finalStatus.targets).toEqual([
      {
        alias: 'api',
        state: 'complete',
        source: 'repo',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
      {
        alias: 'app',
        state: 'archived',
        source: 'repo',
        tasks: { completed: 2, total: 2 },
        problems: [],
      },
    ]);

    const workspaceChangeMetadata = readChangeMetadata(workspaceChangeDir, workspaceRoot);
    expect(workspaceChangeMetadata?.workspaceArchivedAt).toEqual(expect.any(String));
    expect(await findArchivedRepoChangeDir(repoRoots.app, 'phase19-golden-change')).not.toBeNull();
    await assertMaterializationInvariants({
      workspaceChangeId: 'phase19-golden-change',
      repoRoots,
      targetAliases: ['api'],
    });
  });

  it('supports interruption and re-entry with actionable status and doctor guidance', async () => {
    const sandbox = await createSandbox('dirty');

    const createResult = await runCLI(['new', 'change', 'phase19-resume', '--targets', 'app,api,docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(createResult.exitCode).toBe(0);

    const applyResult = await runCLI(['apply', '--change', 'phase19-resume', '--repo', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(applyResult.exitCode).toBe(0);
    await writeRepoTasks(sandbox.repoPaths.app, 'phase19-resume', 1, 2, 'app');

    const statusResult = await runCLI(['status', '--change', 'phase19-resume'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(statusResult.exitCode).toBe(0);
    expect(statusResult.stdout).toContain('Workspace change: phase19-resume');
    expect(statusResult.stdout).toContain('State: blocked');
    expect(statusResult.stdout).toContain('- app: in-progress via repo (1/2 tasks)');
    expect(statusResult.stdout).toContain('- docs: blocked via workspace (0/2 tasks)');
    expect(statusResult.stdout).toContain(
      "Next step: run 'openspec workspace doctor' and repair repo alias 'docs' before resuming 'phase19-resume'."
    );

    const doctorResult = await runCLI(['workspace', 'doctor'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const doctorOutput = doctorResult.stdout + doctorResult.stderr;

    expect(doctorResult.exitCode).toBe(1);
    expect(doctorOutput).toContain('Workspace doctor found 1 issue');
    expect(doctorOutput).toContain(`Alias 'docs' points to a missing repo path: ${sandbox.overlayRepoPaths.docs}`);
    expect(doctorOutput).toContain(
      "Next step: repair '.openspec/local.yaml' for alias 'docs', then rerun 'openspec workspace doctor'."
    );
  });

  it('fails loudly and preserves state across duplicate aliases, unknown targets, repeat apply, stale paths, and partial completion', async () => {
    const sandbox = await createSandbox('dirty');

    const duplicateAliasResult = await runCLI(['workspace', 'add-repo', 'app', sandbox.repoPaths.app], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const duplicateAliasOutput = duplicateAliasResult.stdout + duplicateAliasResult.stderr;
    expect(duplicateAliasResult.exitCode).toBe(1);
    expect(duplicateAliasOutput).toContain("Repo alias 'app' is already registered in this workspace");

    const unknownTargetsResult = await runCLI(['new', 'change', 'phase19-unknown', '--targets', 'app,missing'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const unknownTargetsOutput = unknownTargetsResult.stdout + unknownTargetsResult.stderr;
    expect(unknownTargetsResult.exitCode).toBe(1);
    expect(unknownTargetsOutput).toContain('Unknown target alias: missing. Registered aliases: api, app, docs');
    await expect(fs.access(path.join(sandbox.workspaceRoot, 'changes', 'phase19-unknown'))).rejects.toThrow();

    const createRecoveryChangeResult = await runCLI(
      ['new', 'change', 'phase19-recovery', '--targets', 'app,docs'],
      {
        cwd: sandbox.workspaceRoot,
        env: cliEnv(),
      }
    );
    expect(createRecoveryChangeResult.exitCode).toBe(0);

    const applyAppResult = await runCLI(['apply', '--change', 'phase19-recovery', '--repo', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(applyAppResult.exitCode).toBe(0);
    await writeRepoTasks(sandbox.repoPaths.app, 'phase19-recovery', 1, 2, 'app');

    const repeatApplyResult = await runCLI(['apply', '--change', 'phase19-recovery', '--repo', 'app'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const repeatApplyOutput = repeatApplyResult.stdout + repeatApplyResult.stderr;
    expect(repeatApplyResult.exitCode).toBe(1);
    expect(repeatApplyOutput).toContain(
      "Create-only collision: repo-local change 'phase19-recovery' already exists in target repo 'app'"
    );

    const staleDocsApplyResult = await runCLI(['apply', '--change', 'phase19-recovery', '--repo', 'docs'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    const staleDocsApplyOutput = staleDocsApplyResult.stdout + staleDocsApplyResult.stderr;
    expect(staleDocsApplyResult.exitCode).toBe(1);
    expect(staleDocsApplyOutput).toContain(
      `Target alias 'docs' points to a missing repo path: ${sandbox.overlayRepoPaths.docs}`
    );
    expect(staleDocsApplyOutput).toContain(
      "Run 'openspec workspace doctor' and repair the failing alias before retrying."
    );

    const statusResult = await runCLI(['status', '--change', 'phase19-recovery', '--json'], {
      cwd: sandbox.workspaceRoot,
      env: cliEnv(),
    });
    expect(statusResult.exitCode).toBe(0);
    expect(JSON.parse(statusResult.stdout)).toEqual({
      change: {
        id: 'phase19-recovery',
        state: 'blocked',
      },
      coordination: {
        state: 'planned',
        tasks: { completed: 0, total: 2 },
        problems: [],
      },
      targets: [
        {
          alias: 'app',
          state: 'in-progress',
          source: 'repo',
          tasks: { completed: 1, total: 2 },
          problems: [],
        },
        {
          alias: 'docs',
          state: 'blocked',
          source: 'workspace',
          tasks: { completed: 0, total: 2 },
          problems: ["repo alias 'docs' points to a missing repo path"],
        },
      ],
    });

    await assertMaterializationInvariants({
      workspaceChangeId: 'phase19-recovery',
      repoRoots: sandbox.repoPaths,
      targetAliases: ['app'],
    });
  });
});
