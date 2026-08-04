import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'child_process';
import { promises as fs, realpathSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { runCLI } from '../helpers/run-cli.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';

const execFileAsync = promisify(execFile);

/**
 * Slice 1.3 journey: prove the standalone repo lifecycle end to end across
 * two simulated machines (separate XDG homes). Machine A sets up a store and
 * works a change through archive; machine B clones, registers, and continues.
 *
 * Git config is fully isolated so user gitconfig (signing, hooks, identity)
 * cannot leak in; identity comes from explicit env vars.
 */

const STORE_ID = 'team-context';
const JOURNEY_TIMEOUT_MS = 60_000;

let base: string;
let storeRoot: string;
let cloneRoot: string;
let projectDir: string;
let emptyGitConfig: string;

let machineA: NodeJS.ProcessEnv;
let machineB: NodeJS.ProcessEnv;

let projectSnapshot: Map<string, string>;

function machineEnv(home: string, gitConfigGlobal: string): NodeJS.ProcessEnv {
  return {
    XDG_CONFIG_HOME: path.join(home, 'config'),
    XDG_DATA_HOME: path.join(home, 'data'),
    XDG_STATE_HOME: path.join(home, 'state'),
    XDG_CACHE_HOME: path.join(home, 'cache'),
    OPENSPEC_TELEMETRY: '0',
    GIT_CONFIG_GLOBAL: gitConfigGlobal,
    GIT_CONFIG_SYSTEM: emptyGitConfig,
    GIT_AUTHOR_NAME: 'Journey Tester',
    GIT_AUTHOR_EMAIL: 'journey@example.com',
    GIT_COMMITTER_NAME: 'Journey Tester',
    GIT_COMMITTER_EMAIL: 'journey@example.com',
  };
}

// Same canonicalization the product uses (expands Windows 8.3 short names).
function canonical(target: string): string {
  return realpathSync.native(target);
}

async function git(cwd: string, env: NodeJS.ProcessEnv, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    env: { ...process.env, ...env },
  });
  return stdout;
}

async function snapshotDirectory(root: string): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (entry.isDirectory()) {
        snapshot.set(`${relative}/`, '');
        await walk(absolute);
      } else {
        snapshot.set(relative, await fs.readFile(absolute, 'utf-8'));
      }
    }
  }

  await walk(root);
  return snapshot;
}

async function listRelativeEntries(root: string, skipDirs: Set<string>): Promise<string[]> {
  const found: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        found.push(`${relative}/`);
        await walk(absolute);
      } else {
        found.push(relative);
      }
    }
  }

  await walk(root);
  return found.sort();
}

async function writeCompletedChangeArtifacts(
  changeDir: string,
  capability: string
): Promise<void> {
  await fs.writeFile(
    path.join(changeDir, 'proposal.md'),
    [
      '# Proposal',
      '',
      '## Why',
      '',
      'Prove the standalone store lifecycle end to end.',
      '',
      '## What Changes',
      '',
      `- Add the ${capability} capability.`,
      '',
      '## Capabilities',
      '',
      '### New Capabilities',
      '',
      `- \`${capability}\`: lifecycle proof capability.`,
      '',
      '### Modified Capabilities',
      '',
      '(none)',
      '',
      '## Impact',
      '',
      '- Test-only.',
      '',
    ].join('\n'),
    'utf-8'
  );

  await fs.mkdir(path.join(changeDir, 'specs', capability), { recursive: true });
  await fs.writeFile(
    path.join(changeDir, 'specs', capability, 'spec.md'),
    [
      `# ${capability} Spec Delta`,
      '',
      '## ADDED Requirements',
      '',
      `### Requirement: ${capability} SHALL work`,
      '',
      `The system SHALL support ${capability}.`,
      '',
      '#### Scenario: It works',
      '',
      '- **WHEN** the lifecycle runs',
      '- **THEN** the capability exists',
      '',
    ].join('\n'),
    'utf-8'
  );

  await fs.writeFile(
    path.join(changeDir, 'design.md'),
    '# Design\n\nMinimal journey design.\n',
    'utf-8'
  );

  await fs.writeFile(
    path.join(changeDir, 'tasks.md'),
    '# Tasks\n\n## 1. Work\n\n- [x] 1.1 Do the work\n',
    'utf-8'
  );
}

beforeAll(async () => {
  base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-store-lifecycle-'));
  storeRoot = path.join(base, 'machine-a', 'team-context');
  cloneRoot = path.join(base, 'machine-b', 'team-context');
  projectDir = path.join(base, 'machine-a', 'app-repo');
  emptyGitConfig = path.join(base, 'empty-gitconfig');

  await fs.writeFile(emptyGitConfig, '', 'utf-8');
  machineA = machineEnv(path.join(base, 'machine-a', 'home'), emptyGitConfig);
  machineB = machineEnv(path.join(base, 'machine-b', 'home'), emptyGitConfig);

  await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
  await fs.writeFile(path.join(projectDir, 'README.md'), '# app\n', 'utf-8');
  await fs.writeFile(path.join(projectDir, 'src', 'main.ts'), 'export {};\n', 'utf-8');
  projectSnapshot = await snapshotDirectory(projectDir);
}, 120_000);

afterAll(async () => {
  cleanupTempPath(base);
});

describe('standalone store lifecycle journey', () => {
  it('machine A: setup produces a committed, clonable repo', async () => {
    const result = await runCLI(
      ['store', 'setup', STORE_ID, '--path', storeRoot, '--json'],
      { env: machineA }
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.git).toEqual({
      is_repository: true,
      initialized: true,
      committed: true,
    });
    expect(payload.created_files).toEqual(
      expect.arrayContaining([
        'openspec/config.yaml',
        'openspec/specs/.gitkeep',
        'openspec/changes/archive/.gitkeep',
        '.openspec-store/store.yaml',
      ])
    );

    const log = await git(storeRoot, machineA, ['log', '--format=%s']);
    expect(log.trim().split('\n')).toHaveLength(1);
    expect(log).toContain(`Initialize OpenSpec store ${STORE_ID}`);

    const committedFiles = await git(storeRoot, machineA, [
      'show',
      '--name-only',
      '--format=',
      'HEAD',
    ]);
    expect(committedFiles).toContain('.openspec-store/store.yaml');
    expect(committedFiles).toContain('openspec/specs/.gitkeep');
    expect(committedFiles).toContain('openspec/changes/archive/.gitkeep');

    const status = await git(storeRoot, machineA, ['status', '--porcelain']);
    expect(status.trim()).toBe('');
  });

  it('machine A: doctor and list see a healthy store with git facts', async () => {
    const list = await runCLI(['store', 'list', '--json'], { env: machineA });
    expect(list.exitCode).toBe(0);
    expect(JSON.parse(list.stdout).stores).toHaveLength(1);

    const doctor = await runCLI(['store', 'doctor', STORE_ID, '--json'], {
      env: machineA,
    });
    expect(doctor.exitCode).toBe(0);
    const store = JSON.parse(doctor.stdout).stores[0];
    expect(store.openspec_root.healthy).toBe(true);
    expect(store.git).toEqual({
      is_repository: true,
      has_commits: true,
      has_uncommitted_changes: false,
      has_remote: false,
      origin_url: null,
    });
    expect(store.status).toEqual([]);

    // Human output surfaces the same Git facts.
    const humanDoctor = await runCLI(['store', 'doctor', STORE_ID], { env: machineA });
    expect(humanDoctor.exitCode).toBe(0);
    expect(humanDoctor.stdout).toContain(
      'Git: repository detected (commits: yes, uncommitted changes: no, remote: none)'
    );
  });

  it('machine A: works a change through archive from the project repo', async () => {
    const changeId = 'add-billing';

    const created = await runCLI(
      ['new', 'change', changeId, '--store', STORE_ID, '--json'],
      { env: machineA, cwd: projectDir }
    );
    expect(created.exitCode).toBe(0);
    const createdPayload = JSON.parse(created.stdout);
    expect(createdPayload.root).toEqual({
      path: canonical(storeRoot),
      source: 'store',
      store_id: STORE_ID,
    });
    expect(path.isAbsolute(createdPayload.change.path)).toBe(true);

    const status = await runCLI(
      ['status', '--change', changeId, '--store', STORE_ID],
      { env: machineA, cwd: projectDir }
    );
    expect(status.exitCode).toBe(0);
    expect(status.stderr).toContain(`Using OpenSpec root: ${STORE_ID}`);
    expect(status.stdout).not.toContain('Planning home');

    const instructions = await runCLI(
      ['instructions', 'proposal', '--change', changeId, '--store', STORE_ID],
      { env: machineA, cwd: projectDir }
    );
    expect(instructions.exitCode).toBe(0);
    expect(instructions.stdout).toContain(
      path.join(canonical(storeRoot), 'openspec', 'changes', changeId, 'proposal.md')
    );

    // The test acts as the agent and writes the artifacts.
    const changeDir = path.join(storeRoot, 'openspec', 'changes', changeId);
    await writeCompletedChangeArtifacts(changeDir, 'billing');

    const validated = await runCLI(
      ['validate', changeId, '--store', STORE_ID],
      { env: machineA, cwd: projectDir }
    );
    expect(validated.exitCode).toBe(0);
    expect(validated.stdout).toContain('is valid');

    const listed = await runCLI(
      ['list', '--store', STORE_ID, '--json'],
      { env: machineA, cwd: projectDir }
    );
    expect(listed.exitCode).toBe(0);
    expect(JSON.parse(listed.stdout).changes.map((c: { name: string }) => c.name)).toContain(
      changeId
    );

    const shown = await runCLI(
      ['show', changeId, '--store', STORE_ID],
      { env: machineA, cwd: projectDir }
    );
    expect(shown.exitCode).toBe(0);
    expect(shown.stdout).toContain('# Proposal');

    const archived = await runCLI(
      ['archive', changeId, '--store', STORE_ID, '--yes', '--json'],
      { env: machineA, cwd: projectDir }
    );
    expect(archived.exitCode).toBe(0);
    const archivePayload = JSON.parse(archived.stdout);
    expect(archivePayload.archive.change).toBe(changeId);
    expect(archivePayload.root.store_id).toBe(STORE_ID);

    const specPath = path.join(storeRoot, 'openspec', 'specs', 'billing', 'spec.md');
    await expect(fs.readFile(specPath, 'utf-8')).resolves.toContain('billing SHALL work');

    const archiveEntries = await fs.readdir(
      path.join(storeRoot, 'openspec', 'changes', 'archive')
    );
    expect(archiveEntries.some((entry) => entry.endsWith(`-${changeId}`))).toBe(true);
  }, JOURNEY_TIMEOUT_MS);

  it('machine A: the project repo is byte-identical after the lifecycle', async () => {
    const after = await snapshotDirectory(projectDir);
    expect(after).toEqual(projectSnapshot);
  });

  it('machine B: a clone registers without ceremony and reads promoted specs', async () => {
    // The test acts as the user: commit machine A's work before sharing.
    await git(storeRoot, machineA, ['add', '-A']);
    await git(storeRoot, machineA, ['commit', '-m', 'Work the add-billing change']);
    await fs.mkdir(path.dirname(cloneRoot), { recursive: true });
    await git(path.dirname(cloneRoot), machineB, ['clone', storeRoot, cloneRoot]);

    const commitsBeforeRegister = (
      await git(cloneRoot, machineB, ['rev-list', '--count', 'HEAD'])
    ).trim();

    const registered = await runCLI(
      ['store', 'register', cloneRoot, '--json'],
      { env: machineB }
    );
    expect(registered.exitCode).toBe(0);
    const payload = JSON.parse(registered.stdout);
    expect(payload.store.id).toBe(STORE_ID);
    expect(payload.created_files).toEqual([]);

    // Register never commits.
    const commitsAfterRegister = (
      await git(cloneRoot, machineB, ['rev-list', '--count', 'HEAD'])
    ).trim();
    expect(commitsAfterRegister).toBe(commitsBeforeRegister);

    const doctor = await runCLI(['store', 'doctor', STORE_ID, '--json'], {
      env: machineB,
    });
    expect(doctor.exitCode).toBe(0);
    expect(JSON.parse(doctor.stdout).stores[0].openspec_root.healthy).toBe(true);

    const specs = await runCLI(
      ['list', '--specs', '--store', STORE_ID, '--json'],
      { env: machineB, cwd: base }
    );
    expect(specs.exitCode).toBe(0);
    const specsPayload = JSON.parse(specs.stdout);
    expect(specsPayload.specs.map((spec: { id: string }) => spec.id)).toContain('billing');
    expect(specsPayload.root.store_id).toBe(STORE_ID);

    const shownSpec = await runCLI(
      ['show', 'billing', '--store', STORE_ID],
      { env: machineB, cwd: base }
    );
    expect(shownSpec.exitCode).toBe(0);
    expect(shownSpec.stdout).toContain('billing SHALL work');
  }, JOURNEY_TIMEOUT_MS);

  it('machine B: completes its own change through archive in the clone', async () => {
    const changeId = 'add-invoicing';

    const created = await runCLI(
      ['new', 'change', changeId, '--store', STORE_ID],
      { env: machineB, cwd: base }
    );
    expect(created.exitCode).toBe(0);
    expect(created.stderr).toContain(`Using OpenSpec root: ${STORE_ID}`);
    expect(created.stdout).toContain(`--store ${STORE_ID}`);

    const instructions = await runCLI(
      ['instructions', 'proposal', '--change', changeId, '--store', STORE_ID],
      { env: machineB, cwd: base }
    );
    expect(instructions.exitCode).toBe(0);
    expect(instructions.stdout).toContain(
      path.join(canonical(cloneRoot), 'openspec', 'changes', changeId, 'proposal.md')
    );

    const changeDir = path.join(cloneRoot, 'openspec', 'changes', changeId);
    await writeCompletedChangeArtifacts(changeDir, 'invoicing');

    const status = await runCLI(
      ['status', '--change', changeId, '--store', STORE_ID],
      { env: machineB, cwd: base }
    );
    expect(status.exitCode).toBe(0);
    expect(status.stdout).toContain('All artifacts complete!');

    const validated = await runCLI(
      ['validate', changeId, '--store', STORE_ID],
      { env: machineB, cwd: base }
    );
    expect(validated.exitCode).toBe(0);
    expect(validated.stdout).toContain('is valid');

    const archived = await runCLI(
      ['archive', changeId, '--store', STORE_ID, '--yes', '--json'],
      { env: machineB, cwd: base }
    );
    expect(archived.exitCode).toBe(0);
    expect(JSON.parse(archived.stdout).archive.change).toBe(changeId);

    const specPath = path.join(cloneRoot, 'openspec', 'specs', 'invoicing', 'spec.md');
    await expect(fs.readFile(specPath, 'utf-8')).resolves.toContain('invoicing SHALL work');

    // Post-resolution failures keep the banner, and the hint keeps the store:
    // with everything archived, instructions apply fails after the root
    // resolved successfully.
    const failedApply = await runCLI(
      ['instructions', 'apply', '--store', STORE_ID],
      { env: machineB, cwd: base }
    );
    expect(failedApply.exitCode).not.toBe(0);
    expect(failedApply.stderr).toContain(`Using OpenSpec root: ${STORE_ID}`);
    expect(failedApply.stderr).toContain(`openspec new change <name> --store ${STORE_ID}`);
  }, JOURNEY_TIMEOUT_MS);

  it('end state is just normal OpenSpec files in both checkouts', async () => {
    for (const root of [storeRoot, cloneRoot]) {
      const entries = await listRelativeEntries(root, new Set(['.git']));

      for (const entry of entries) {
        expect(entry).toMatch(/^(\.openspec-store(\/|\/store\.yaml)?|openspec(\/.*)?)$/);
        expect(entry).not.toMatch(/initiative|workspace/i);
      }

      expect(entries).toContain('.openspec-store/store.yaml');
      expect(entries).toContain('openspec/config.yaml');
    }

    // Global state holds only registry/config metadata, no planning files.
    for (const env of [machineA, machineB]) {
      const dataEntries = await listRelativeEntries(
        path.join(env.XDG_DATA_HOME as string, 'openspec'),
        new Set()
      );
      expect(dataEntries).toEqual(['stores/', 'stores/registry.yaml']);
    }
  });

  it('setup fails before creating anything when Git identity is missing', async () => {
    const strictConfig = path.join(base, 'strict-gitconfig');
    await fs.writeFile(strictConfig, '[user]\n\tuseConfigOnly = true\n', 'utf-8');

    const noIdentity: NodeJS.ProcessEnv = {
      ...machineEnv(path.join(base, 'machine-c', 'home'), strictConfig),
      GIT_AUTHOR_NAME: '',
      GIT_AUTHOR_EMAIL: '',
      GIT_COMMITTER_NAME: '',
      GIT_COMMITTER_EMAIL: '',
    };
    const target = path.join(base, 'machine-c', 'no-identity-store');

    const result = await runCLI(
      ['store', 'setup', 'no-identity', '--path', target, '--json'],
      { env: noIdentity }
    );
    expect(result.exitCode).toBe(1);
    const payload = JSON.parse(result.stdout);
    expect(payload.status[0].code).toBe('store_git_identity_missing');
    expect(payload.status[0].fix).toContain('git config --global user.name');

    await expect(fs.access(target)).rejects.toThrow();

    // --no-init-git needs no identity and creates no repo.
    const optOut = await runCLI(
      ['store', 'setup', 'no-identity', '--path', target, '--no-init-git', '--json'],
      { env: noIdentity }
    );
    expect(optOut.exitCode).toBe(0);
    const optOutPayload = JSON.parse(optOut.stdout);
    expect(optOutPayload.git).toEqual({
      is_repository: false,
      initialized: false,
      committed: false,
    });
    await expect(fs.access(path.join(target, '.git'))).rejects.toThrow();
  });
});
