import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';

/**
 * `openspec view` used to hard-code '.' as its target, so a project whose
 * openspec/config.yaml points at an external store rendered an empty dashboard
 * while `openspec list` read the store correctly. These cover the fix and the
 * cwd-fallback behavior view shares with list/status.
 */

const STORE_ID = 'view-store';
const TIMEOUT_MS = 60_000;

let base: string;
let storeRoot: string;
let pointerProject: string;
let env: NodeJS.ProcessEnv;

const SPEC = `# billing

## Purpose

Billing rules.

## Requirements

### Requirement: Charge a card
The system SHALL charge a card.

#### Scenario: card is charged
- **WHEN** a payment is due
- **THEN** the card is charged
`;

beforeAll(async () => {
  base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-view-store-'));
  storeRoot = path.join(base, 'store');
  pointerProject = path.join(base, 'project');

  env = {
    XDG_CONFIG_HOME: path.join(base, 'home', 'config'),
    XDG_DATA_HOME: path.join(base, 'home', 'data'),
    XDG_STATE_HOME: path.join(base, 'home', 'state'),
    XDG_CACHE_HOME: path.join(base, 'home', 'cache'),
    OPENSPEC_TELEMETRY: '0',
  };

  await fs.mkdir(storeRoot, { recursive: true });
  const setup = await runCLI(
    ['store', 'setup', STORE_ID, '--path', storeRoot, '--no-init-git'],
    { cwd: base, env, timeoutMs: TIMEOUT_MS }
  );
  expect(setup.exitCode, setup.stderr).toBe(0);

  const specDir = path.join(storeRoot, 'openspec', 'specs', 'billing');
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(path.join(specDir, 'spec.md'), SPEC);

  const archiveDir = path.join(storeRoot, 'openspec', 'changes', 'archive', '2026-08-27-store-history');
  await fs.mkdir(archiveDir, { recursive: true });
  await fs.writeFile(path.join(archiveDir, 'tasks.md'), '- [x] Shipped\n');

  await fs.mkdir(path.join(pointerProject, 'openspec'), { recursive: true });
  await fs.writeFile(
    path.join(pointerProject, 'openspec', 'config.yaml'),
    `store: ${STORE_ID}\n`
  );
}, TIMEOUT_MS);

afterAll(async () => {
  await cleanupTempPath(base);
});

describe('openspec view root resolution', () => {
  it(
    'follows a store pointer declared in openspec/config.yaml',
    async () => {
      const result = await runCLI(['view'], {
        cwd: pointerProject,
        env,
        timeoutMs: TIMEOUT_MS,
      });

      expect(result.exitCode, result.stderr).toBe(0);
      expect(result.stdout).toContain('1 specs, 1 requirements');
      expect(result.stdout).toContain('billing');
      expect(result.stdout).toContain('Archived Changes: 1');
      expect(result.stdout).toContain('2026-08-27-store-history');
    },
    TIMEOUT_MS
  );

  it(
    'targets a registered store when --store is passed',
    async () => {
      const outside = path.join(base, 'outside');
      await fs.mkdir(outside, { recursive: true });

      const result = await runCLI(['view', '--store', STORE_ID], {
        cwd: outside,
        env,
        timeoutMs: TIMEOUT_MS,
      });

      expect(result.exitCode, result.stderr).toBe(0);
      expect(result.stdout).toContain('1 specs, 1 requirements');
      expect(result.stdout).toContain('2026-08-27-store-history');
    },
    TIMEOUT_MS
  );

  it.each([{ flags: [] }, { flags: ['--store', STORE_ID] }])(
    'lists archive entries from the selected store with flags $flags',
    async ({ flags }) => {
      const result = await runCLI(['list', '--archived', '--json', ...flags], {
        cwd: pointerProject,
        env,
        timeoutMs: TIMEOUT_MS,
      });

      expect(result.exitCode, result.stderr).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.changes).toEqual([
        expect.objectContaining({ name: '2026-08-27-store-history', archived: true, totalTasks: 1 }),
      ]);
      expect(await fs.realpath(output.root.path)).toBe(await fs.realpath(storeRoot));
    },
    TIMEOUT_MS
  );

  it(
    'still renders an openspec/ directory that predates config.yaml',
    async () => {
      // Regression guard: a pre-config.yaml openspec/ resolves no root, so
      // view has to fall back to the cwd rather than refusing outright.
      // Isolated home: no store is registered, which is the common case.
      const legacy = path.join(base, 'legacy');
      await fs.mkdir(path.join(legacy, 'openspec'), { recursive: true });
      await fs.writeFile(
        path.join(legacy, 'openspec', 'project.md'),
        '# Project\n'
      );

      const storeless: NodeJS.ProcessEnv = {
        ...env,
        XDG_CONFIG_HOME: path.join(base, 'storeless', 'config'),
        XDG_DATA_HOME: path.join(base, 'storeless', 'data'),
      };

      const view = await runCLI(['view'], {
        cwd: legacy,
        env: storeless,
        timeoutMs: TIMEOUT_MS,
      });
      const list = await runCLI(['list'], {
        cwd: legacy,
        env: storeless,
        timeoutMs: TIMEOUT_MS,
      });

      expect(list.exitCode, list.stderr).toBe(0);
      expect(view.exitCode, view.stderr).toBe(0);
      expect(view.stdout).toContain('OpenSpec Dashboard');
    },
    TIMEOUT_MS
  );

  it(
    'refuses a rootless directory exactly when list does',
    async () => {
      // view is no longer the odd command out: where a registered store makes
      // list demand --store, view now gives the same actionable error.
      const legacy = path.join(base, 'legacy-with-store');
      await fs.mkdir(path.join(legacy, 'openspec'), { recursive: true });
      await fs.writeFile(
        path.join(legacy, 'openspec', 'project.md'),
        '# Project\n'
      );

      const view = await runCLI(['view'], {
        cwd: legacy,
        env,
        timeoutMs: TIMEOUT_MS,
      });
      const list = await runCLI(['list'], {
        cwd: legacy,
        env,
        timeoutMs: TIMEOUT_MS,
      });

      expect(view.exitCode).toBe(list.exitCode);
      expect(view.stderr).toContain(STORE_ID);
    },
    TIMEOUT_MS
  );

  it(
    'reports a missing openspec directory outside any project',
    async () => {
      const bare = path.join(base, 'bare');
      await fs.mkdir(bare, { recursive: true });

      const result = await runCLI(['view'], {
        cwd: bare,
        env,
        timeoutMs: TIMEOUT_MS,
      });

      expect(result.exitCode).toBe(1);
    },
    TIMEOUT_MS
  );
});
