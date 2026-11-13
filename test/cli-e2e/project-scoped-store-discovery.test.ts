import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { promises as fs, realpathSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';

/**
 * E2e: project-scoped store registry discovery.
 * A project with .openspec-store/registry.yaml resolves a store
 * without global registration.
 */

let base: string;

beforeAll(async () => {
  base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-e2e-project-scoped-'));
});

afterAll(async () => {
  await cleanupTempPath(base);
});

describe('project-scoped store registry e2e', () => {
  it('resolves a store from project-scoped registry without global registration', async () => {
    const storeDir = path.join(base, 'my-store');
    const projectDir = path.join(base, 'my-project');

    // Create a store with openspec root and identity
    await fs.mkdir(path.join(storeDir, 'openspec', 'specs'), { recursive: true });
    await fs.mkdir(path.join(storeDir, 'openspec', 'changes', 'archive'), { recursive: true });
    await fs.writeFile(
      path.join(storeDir, 'openspec', 'config.yaml'),
      'schema: spec-driven\n'
    );
    await fs.mkdir(path.join(storeDir, '.openspec-store'), { recursive: true });
    await fs.writeFile(
      path.join(storeDir, '.openspec-store', 'store.yaml'),
      'version: 1\nid: my-store\n'
    );

    // Create project with project-scoped registry
    await fs.mkdir(path.join(projectDir, '.openspec-store'), { recursive: true });
    await fs.writeFile(
      path.join(projectDir, '.openspec-store', 'registry.yaml'),
      'version: 1\nstores:\n  my-store:\n    path: ../my-store\n'
    );

    // Run openspec status --store my-store from the project directory
    const result = await runCLI(
      ['status', '--store', 'my-store', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.root.source).toBe('project_store');
    expect(output.root.store_id).toBe('my-store');
    expect(realpathSync(output.root.path)).toBe(realpathSync(storeDir));
  }, 30_000);

  it('falls back to global registry when project-scoped registry is absent', async () => {
    const projectDir = path.join(base, 'no-registry-project');
    await fs.mkdir(projectDir, { recursive: true });

    // No .openspec-store/registry.yaml — should not find a store
    const result = await runCLI(
      ['status', '--store', 'nonexistent', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(1);
  }, 30_000);
});
