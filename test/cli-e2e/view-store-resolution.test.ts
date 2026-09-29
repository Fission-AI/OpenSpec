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
const SCHEMA_NAME = 'store-billing';
const TIMEOUT_MS = 60_000;

const STORE_SCHEMA = `name: ${SCHEMA_NAME}
version: 1
description: Billing workflow owned by the registered store
artifacts:
  - id: proposal
    generates: planning/proposal.md
    description: Billing change proposal
    template: proposal.md
    requires: []
  - id: specs
    generates: specs/**/*.md
    description: Billing behavior
    template: spec.md
    requires: [proposal]
  - id: design
    generates: planning/design.md
    description: Billing implementation design
    template: design.md
    requires: [specs]
  - id: tasks
    generates: execution/tasks.md
    description: Implementation checklist
    template: tasks.md
    requires: [design]
apply:
  requires: [tasks]
  tracks: execution/tasks.md
`;

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

  const schemaDir = path.join(storeRoot, 'openspec', 'schemas', SCHEMA_NAME);
  await fs.mkdir(path.join(schemaDir, 'templates'), { recursive: true });
  await fs.writeFile(path.join(schemaDir, 'schema.yaml'), STORE_SCHEMA);
  for (const template of ['proposal.md', 'spec.md', 'design.md', 'tasks.md']) {
    await fs.writeFile(path.join(schemaDir, 'templates', template), '# Billing\n');
  }
  await fs.writeFile(
    path.join(storeRoot, 'openspec', 'config.yaml'),
    `schema: ${SCHEMA_NAME}\n`
  );

  for (const changeName of ['billing-update', 'billing-refactor']) {
    const changeDir = path.join(storeRoot, 'openspec', 'changes', changeName);
    await fs.mkdir(path.join(changeDir, 'planning'), { recursive: true });
    await fs.mkdir(path.join(changeDir, 'execution'), { recursive: true });
    await fs.writeFile(path.join(changeDir, 'planning', 'proposal.md'), '# Update billing\n');
    // A written tasks artifact is done even while its checklist is unfinished.
    await fs.writeFile(
      path.join(changeDir, 'execution', 'tasks.md'),
      '- [x] Audit billing\n- [ ] Implement billing change\n'
    );
    if (changeName === 'billing-refactor') {
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        `schema: ${SCHEMA_NAME}\nskip_specs: true\n`
      );
    }
    // billing-update deliberately inherits the store's schema from config.yaml.
  }

  await fs.mkdir(path.join(pointerProject, 'openspec'), { recursive: true });
  await fs.writeFile(
    path.join(pointerProject, 'openspec', 'config.yaml'),
    `store: ${STORE_ID}\nschema: spec-driven\n`
  );
}, TIMEOUT_MS);

afterAll(async () => {
  await cleanupTempPath(base);
});

describe('openspec view root resolution', () => {
  it.each([
    { route: 'a declared store pointer', directory: 'project', storeArgs: [] },
    { route: 'explicit --store', directory: 'outside', storeArgs: ['--store', STORE_ID] },
  ])(
    'resolves workflow schemas and artifacts from the store via $route',
    async ({ directory, storeArgs }) => {
      const cwd = path.join(base, directory);
      await fs.mkdir(cwd, { recursive: true });
      const options = { cwd, env, timeoutMs: TIMEOUT_MS };
      const result = await runCLI(['view', ...storeArgs], options);

      expect(result.exitCode, result.stderr).toBe(0);
      expect(result.stdout).toContain('1 specs, 1 requirements');
      expect(result.stdout).toContain('billing');
      expect(result.stdout).toContain('Active Changes: 2 in progress');
      expect(result.stdout).toContain('Task Progress: 2/4 (50% complete)');
      const lines = result.stdout.split(/\r?\n/);

      for (const changeName of ['billing-update', 'billing-refactor']) {
        const skipped = changeName === 'billing-refactor';
        const statusResult = await runCLI(
          ['status', '--change', changeName, '--json', ...storeArgs],
          options
        );
        expect(statusResult.exitCode, statusResult.stderr).toBe(0);
        const status = JSON.parse(statusResult.stdout);
        expect(status.schemaName).toBe(SCHEMA_NAME);
        expect(status.artifacts).toMatchObject([
          { id: 'proposal', status: 'done' },
          { id: 'specs', status: skipped ? 'skipped' : 'ready' },
          { id: 'design', status: skipped ? 'ready' : 'blocked' },
          { id: 'tasks', status: 'done' },
        ]);

        const changeLine = lines.findIndex((line) => line.includes(`◉ ${changeName}`));
        expect(changeLine).toBeGreaterThanOrEqual(0);
        expect.soft(lines[changeLine + 1]).toBe(
          `    └─ [${SCHEMA_NAME}] proposal✓ ${skipped ? 'specs (skipped) design→' : 'specs→ design'} tasks✓`
        );
      }
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
