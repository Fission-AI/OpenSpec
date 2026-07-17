import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI } from '../helpers/run-cli.js';
import { createOpenSpecRoot, writeSpec } from '../helpers/openspec-fixtures.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';

const JOURNEY_TIMEOUT_MS = 30_000;

/**
 * Capstone persona journeys (6.1). Journey 1 (fresh team) lives in
 * store-lifecycle.test.ts; journey 4 (cold-start agent) runs as a
 * headless dogfood outside vitest. These are journeys 2 and 3.
 */
describe('capstone persona journeys (6.1)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-capstone-'))
    );
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });
  });

  afterEach(() => {
    cleanupTempPath(tempDir);
  });

  it('journey 2 — layered flow: app-repo agent discovers, cites, designs locally', async () => {
    // Requirements live in a store.
    const storeRoot = path.join(tempDir, 'product-requirements');
    createOpenSpecRoot(storeRoot);
    writeSpec(
      storeRoot,
      'billing-rules',
      '## Purpose\n\nAll invoices are immutable after issue.\n'
    );
    await registerStore({
      id: 'product-requirements',
      localPath: storeRoot,
      globalDataDir,
    });

    // The app repo has its OWN root and declares the reference.
    const appRepo = path.join(tempDir, 'billing-service');
    createOpenSpecRoot(appRepo);
    fs.writeFileSync(
      path.join(appRepo, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - product-requirements\n'
    );

    // Discovery: the relationship comes from config, not insider
    // knowledge — instructions and context both surface it.
    const contextResult = await runCLI(['context', '--json'], { cwd: appRepo, env });
    expect(contextResult.exitCode).toBe(0);
    const member = JSON.parse(contextResult.stdout).members[0];
    expect(member).toEqual(
      expect.objectContaining({
        role: 'referenced_store',
        id: 'product-requirements',
        path: storeRoot,
        fetch: 'openspec show <spec-id> --type spec --store product-requirements',
      })
    );

    // Citation: the agent follows the fetch recipe verbatim.
    const fetch = member.fetch.replace('<spec-id>', 'billing-rules').split(' ').slice(1);
    const cited = await runCLI(fetch, { cwd: appRepo, env });
    expect(cited.exitCode).toBe(0);
    expect(cited.stdout).toContain('All invoices are immutable after issue.');

    // Low-level design lands in the app repo's own root, not the store.
    const created = await runCLI(
      ['new', 'change', 'implement-invoice-immutability', '--json'],
      { cwd: appRepo, env }
    );
    expect(created.exitCode).toBe(0);
    const changeDir = path.join(
      appRepo,
      'openspec',
      'changes',
      'implement-invoice-immutability'
    );
    expect(fs.existsSync(changeDir)).toBe(true);
    expect(
      fs.existsSync(path.join(storeRoot, 'openspec', 'changes', 'implement-invoice-immutability'))
    ).toBe(false);

    // The store stayed read-only context throughout.
    const storeChanges = fs.readdirSync(path.join(storeRoot, 'openspec', 'changes'));
    expect(storeChanges.filter((name) => name !== 'archive' && name !== '.gitkeep')).toEqual([]);
  }, JOURNEY_TIMEOUT_MS);

  it('journey 3 — externalized planning: pointer repo runs the lifecycle without --store', async () => {
    const storeRoot = path.join(tempDir, 'team-planning');
    createOpenSpecRoot(storeRoot);
    await registerStore({ id: 'team-planning', localPath: storeRoot, globalDataDir });

    // A code repo with NO local root, only the fallback declaration.
    const codeRepo = path.join(tempDir, 'api-server');
    fs.mkdirSync(path.join(codeRepo, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(codeRepo, 'openspec', 'config.yaml'),
      'store: team-planning\n'
    );

    // The whole lifecycle from the code repo, zero --store flags.
    const created = await runCLI(
      ['new', 'change', 'add-rate-limits', '--schema', 'spec-driven', '--json'],
      { cwd: codeRepo, env }
    );
    expect(created.exitCode).toBe(0);
    const changeDir = path.join(storeRoot, 'openspec', 'changes', 'add-rate-limits');
    expect(fs.existsSync(changeDir)).toBe(true);

    const status = await runCLI(['status', '--change', 'add-rate-limits', '--json'], {
      cwd: codeRepo,
      env,
    });
    expect(status.exitCode).toBe(0);
    expect(JSON.parse(status.stdout).changeName).toBe('add-rate-limits');

    const instructions = await runCLI(
      ['instructions', 'proposal', '--change', 'add-rate-limits', '--json'],
      { cwd: codeRepo, env }
    );
    expect(instructions.exitCode).toBe(0);

    // Work the change: write every artifact the schema requires. The
    // instructions outputPath is change-relative (specs is a glob), so
    // resolve concretely under the change dir.
    const artifacts = JSON.parse(status.stdout).artifacts as Array<{ id: string }>;
    for (const artifact of artifacts) {
      const artifactStatus = await runCLI(
        ['instructions', artifact.id, '--change', 'add-rate-limits', '--json'],
        { cwd: codeRepo, env }
      );
      expect(artifactStatus.exitCode).toBe(0);
      const target =
        artifact.id === 'specs'
          ? path.join(changeDir, 'specs', 'api', 'spec.md')
          : path.join(changeDir, `${artifact.id}.md`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(
        target,
        artifact.id === 'specs'
          ? '## ADDED Requirements\n\n### Requirement: Rate limits\nThe API SHALL rate-limit.\n\n#### Scenario: Limit hit\n- **WHEN** the limit is exceeded\n- **THEN** requests are rejected\n'
          : `# ${artifact.id}\n\nDone.\n`
      );
    }

    // Everything written landed inside the store's change dir.
    const writtenArtifacts = fs.readdirSync(changeDir).sort();
    expect(writtenArtifacts).toEqual(['.openspec.yaml', 'design.md', 'proposal.md', 'specs', 'tasks.md']);

    // Archive completes the lifecycle, still without --store.
    const archived = await runCLI(
      ['archive', 'add-rate-limits', '--yes', '--skip-specs', '--json'],
      { cwd: codeRepo, env }
    );
    expect(archived.exitCode).toBe(0);
    expect(fs.existsSync(changeDir)).toBe(false);
    const archiveDir = path.join(storeRoot, 'openspec', 'changes', 'archive');
    const archivedNames = fs.readdirSync(archiveDir);
    expect(archivedNames.some((name) => name.endsWith('add-rate-limits'))).toBe(true);

    // The code repo never grew planning state.
    expect(fs.readdirSync(path.join(codeRepo, 'openspec'))).toEqual(['config.yaml']);
  }, JOURNEY_TIMEOUT_MS);
});
