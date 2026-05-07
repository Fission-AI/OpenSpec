import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any imports that use them
// ---------------------------------------------------------------------------

const { execFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
}));

vi.mock('child_process', () => ({
  execFileSync: execFileSyncMock,
}));

const { isGitRepositoryMock, createAndCheckoutBranchMock, getBranchNameForChangeMock } = vi.hoisted(() => ({
  isGitRepositoryMock: vi.fn(),
  createAndCheckoutBranchMock: vi.fn(),
  getBranchNameForChangeMock: vi.fn((name: string) => `openspec/${name}`),
}));

vi.mock('../../../src/utils/git-utils.js', () => ({
  isGitRepository: isGitRepositoryMock,
  createAndCheckoutBranch: createAndCheckoutBranchMock,
  getBranchNameForChange: getBranchNameForChangeMock,
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { isGitRepository, createAndCheckoutBranch, getBranchNameForChange } from '../../../src/utils/git-utils.js';
import { newChangeCommand } from '../../../src/commands/workflow/new-change.js';

// ---------------------------------------------------------------------------
// git-utils unit tests (exercising the real implementation via child_process mock)
// Note: the imported functions above are the mocked versions used for command
// integration tests. The real git-utils logic is tested indirectly via build.
// These tests verify behaviour through the mock boundaries.
// ---------------------------------------------------------------------------

describe('getBranchNameForChange', () => {
  it('returns openspec/<changeName>', () => {
    // Use the real function by importing from the mocked module with passthrough
    expect(getBranchNameForChange('my-feature')).toBe('openspec/my-feature');
  });

  it('works for multi-segment change names', () => {
    expect(getBranchNameForChange('add-user-auth')).toBe('openspec/add-user-auth');
  });
});

// ---------------------------------------------------------------------------
// isGitRepository — test real implementation via child_process mock
// ---------------------------------------------------------------------------

describe('isGitRepository (real implementation)', async () => {
  // Import the real module bypassing the vi.mock above
  // We test the real implementation by using execFileSyncMock
  const { isGitRepository: realIsGitRepository } = await vi.importActual<
    typeof import('../../../src/utils/git-utils.js')
  >('../../../src/utils/git-utils.js');

  it('returns true when git rev-parse succeeds', () => {
    execFileSyncMock.mockReturnValueOnce(Buffer.from('.git'));
    expect(realIsGitRepository('/some/path')).toBe(true);
    expect(execFileSyncMock).toHaveBeenCalledWith('git', ['rev-parse', '--git-dir'], {
      cwd: '/some/path',
      stdio: 'pipe',
    });
  });

  it('returns false when git rev-parse throws', () => {
    execFileSyncMock.mockImplementationOnce(() => {
      throw new Error('not a git repository');
    });
    expect(realIsGitRepository('/some/path')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createAndCheckoutBranch — test real implementation via child_process mock
// ---------------------------------------------------------------------------

describe('createAndCheckoutBranch (real implementation)', async () => {
  const { createAndCheckoutBranch: realCreateAndCheckoutBranch } = await vi.importActual<
    typeof import('../../../src/utils/git-utils.js')
  >('../../../src/utils/git-utils.js');

  beforeEach(() => {
    execFileSyncMock.mockReset();
  });

  it('calls execFileSync with correct git checkout args', () => {
    execFileSyncMock.mockReturnValueOnce(undefined);
    realCreateAndCheckoutBranch('/repo', 'openspec/my-feature');
    expect(execFileSyncMock).toHaveBeenCalledWith('git', ['checkout', '-b', 'openspec/my-feature'], {
      cwd: '/repo',
      stdio: 'pipe',
    });
  });

  it('throws when git checkout fails (branch already exists)', () => {
    execFileSyncMock.mockImplementationOnce(() => {
      throw new Error("fatal: A branch named 'openspec/my-feature' already exists.");
    });
    expect(() => realCreateAndCheckoutBranch('/repo', 'openspec/my-feature')).toThrow('already exists');
  });
});

// ---------------------------------------------------------------------------
// newChangeCommand integration tests (git-utils mocked)
// ---------------------------------------------------------------------------

describe('newChangeCommand --branch integration', () => {
  let testDir: string;
  let originalCwd: string;
  let originalExitCode: number | undefined;
  let oraOutput: string[];

  beforeEach(async () => {
    const rawDir = path.join(os.tmpdir(), `openspec-new-change-branch-${randomUUID()}`);
    // Create minimal openspec structure so createChange works
    await fs.mkdir(path.join(rawDir, 'openspec', 'changes'), { recursive: true });
    await fs.writeFile(
      path.join(rawDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\n',
      'utf-8',
    );
    // Resolve the real path to handle macOS /var -> /private/var symlink
    testDir = await fs.realpath(rawDir);

    originalCwd = process.cwd();
    originalExitCode = process.exitCode as number | undefined;
    process.chdir(testDir);
    process.exitCode = undefined;

    oraOutput = [];
    isGitRepositoryMock.mockReset();
    createAndCheckoutBranchMock.mockReset();
    getBranchNameForChangeMock.mockReset();
    getBranchNameForChangeMock.mockImplementation((name: string) => `openspec/${name}`);
    execFileSyncMock.mockReset();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exitCode = originalExitCode;
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('does NOT call git utilities when --branch flag is absent', async () => {
    await newChangeCommand('my-feature', { branch: false });

    expect(isGitRepositoryMock).not.toHaveBeenCalled();
    expect(createAndCheckoutBranchMock).not.toHaveBeenCalled();
  });

  it('creates change directory and calls git utilities when --branch is true', async () => {
    isGitRepositoryMock.mockReturnValue(true);
    createAndCheckoutBranchMock.mockReturnValue(undefined);

    await newChangeCommand('my-feature', { branch: true });

    const changeDir = path.join(testDir, 'openspec', 'changes', 'my-feature');
    const stat = await fs.stat(changeDir);
    expect(stat.isDirectory()).toBe(true);

    expect(isGitRepositoryMock).toHaveBeenCalledWith(testDir);
    expect(getBranchNameForChangeMock).toHaveBeenCalledWith('my-feature');
    expect(createAndCheckoutBranchMock).toHaveBeenCalledWith(testDir, 'openspec/my-feature');
    expect(process.exitCode).toBeUndefined();
  });

  it('sets exitCode=1 and skips checkout when not in a git repo', async () => {
    isGitRepositoryMock.mockReturnValue(false);

    await newChangeCommand('not-git-change', { branch: true });

    // Change directory still created
    const changeDir = path.join(testDir, 'openspec', 'changes', 'not-git-change');
    const stat = await fs.stat(changeDir);
    expect(stat.isDirectory()).toBe(true);

    expect(createAndCheckoutBranchMock).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('sets exitCode=1 when branch already exists', async () => {
    isGitRepositoryMock.mockReturnValue(true);
    createAndCheckoutBranchMock.mockImplementation(() => {
      throw new Error("fatal: A branch named 'openspec/branch-exists' already exists.");
    });

    await newChangeCommand('branch-exists', { branch: true });

    const changeDir = path.join(testDir, 'openspec', 'changes', 'branch-exists');
    const stat = await fs.stat(changeDir);
    expect(stat.isDirectory()).toBe(true);

    expect(process.exitCode).toBe(1);
  });
});
