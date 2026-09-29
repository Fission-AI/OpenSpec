import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { resolveCommandArtifactPath } from '../../../src/core/shared/command-paths.js';

describe('resolveCommandArtifactPath', () => {
  let root: string;
  let project: string;
  let shared: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-command-paths-'));
    project = path.join(root, 'project');
    shared = path.join(root, 'shared');
    await fs.mkdir(project);
    await fs.mkdir(shared);
    vi.stubEnv('OPENCODE_CONFIG_DIR', shared);
    vi.stubEnv('OPENSPEC_OPENCODE_SHARED_COMMANDS', '1');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.rm(root, { recursive: true, force: true });
  });

  it('allows only OpenCode commands inside the explicit shared root', () => {
    const command = path.join(shared, 'commands', 'opsx-explore.md');
    expect(resolveCommandArtifactPath(project, 'opencode', command)).toBe(command);
    expect(() => resolveCommandArtifactPath(project, 'claude', command)).toThrow();
    expect(() => resolveCommandArtifactPath(project, 'opencode', path.join(root, 'outside.md'))).toThrow();
    expect(() => resolveCommandArtifactPath(project, 'opencode', path.join(shared, 'config.json'))).toThrow();
    vi.stubEnv('OPENCODE_CONFIG_DIR', undefined);
    expect(() => resolveCommandArtifactPath(project, 'opencode', command)).toThrow();
  });

  it('rejects shared writes when OPENCODE_CONFIG_DIR is set without the OpenSpec opt-in', () => {
    vi.stubEnv('OPENSPEC_OPENCODE_SHARED_COMMANDS', undefined);
    const command = path.join(shared, 'commands', 'opsx-explore.md');
    expect(() => resolveCommandArtifactPath(project, 'opencode', command)).toThrow();
  });

  it('rejects a commands directory that escapes the shared root through a symlink', async () => {
    await fs.symlink(project, path.join(shared, 'commands'), process.platform === 'win32' ? 'junction' : 'dir');
    expect(() => resolveCommandArtifactPath(project, 'opencode', path.join(shared, 'commands', 'opsx-explore.md'))).toThrow();
  });

  it('accepts a shared root selected through a directory alias', async () => {
    const alias = path.join(root, 'alias');
    await fs.symlink(shared, alias, process.platform === 'win32' ? 'junction' : 'dir');
    vi.stubEnv('OPENCODE_CONFIG_DIR', alias);
    const command = path.join(alias, 'commands', 'opsx-explore.md');
    expect(resolveCommandArtifactPath(project, 'opencode', command)).toBe(command);
  });
});
