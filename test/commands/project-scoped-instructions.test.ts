import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCLI } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';

/**
 * The instructions command resolves references through a project-scoped
 * registry (task 5.3): the store is bound only in
 * <project>/.openspec-store/registry.yaml, never in the global registry,
 * so a resolved reference proves the project-registry directory reached
 * reference index assembly.
 */
describe('instructions command wiring (5.3)', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;
  let projRoot: string;
  let plugins: string;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-instructions-'))
    );
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };

    projRoot = path.join(tempDir, 'proj');
    fs.mkdirSync(path.join(projRoot, 'openspec', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(projRoot, 'openspec', 'changes'), { recursive: true });
    fs.writeFileSync(
      path.join(projRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - team-plugins\n'
    );

    plugins = path.join(projRoot, 'team-plugins');
    createOpenSpecRoot(plugins);
    fs.mkdirSync(path.join(plugins, '.openspec-store'), { recursive: true });
    fs.writeFileSync(
      path.join(plugins, '.openspec-store', 'store.yaml'),
      'version: 1\nid: team-plugins\n'
    );

    fs.mkdirSync(path.join(projRoot, '.openspec-store'), { recursive: true });
    fs.writeFileSync(
      path.join(projRoot, '.openspec-store', 'registry.yaml'),
      'version: 1\nstores:\n  team-plugins:\n    path: team-plugins\n'
    );
  });

  afterEach(() => {
    cleanupTempPath(tempDir);
  });

  it('resolves references from a project-scoped registry in instructions output', async () => {
    const changeDir = path.join(projRoot, 'openspec', 'changes', 'demo');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\n');

    const result = await runCLI(
      ['instructions', 'proposal', '--change', 'demo', '--json'],
      { cwd: projRoot, env }
    );
    expect(result.exitCode).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.references).toEqual([
      {
        store_id: 'team-plugins',
        root: plugins,
        fetch: 'openspec show <spec-id> --type spec --store team-plugins',
        specs: [],
        status: [],
      },
    ]);
  });
});
