import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { snapshotDirectory as snapshot } from '../helpers/fs-snapshot.js';
import { createOpenSpecRoot, writeSpec } from '../helpers/openspec-fixtures.js';

describe('store references in instructions (3.1)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;
  let appRepo: string;
  let storeRoot: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-store-refs-'));
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });

    storeRoot = path.join(tempDir, 'team-context');
    createOpenSpecRoot(storeRoot);
    writeSpec(storeRoot, 'billing', '## Purpose\n\nUsage-based invoicing.\n\n## Requirements\n\n- r\n');
    await registerStore({ id: 'team-context', localPath: storeRoot, globalDataDir });

    appRepo = path.join(tempDir, 'app-repo');
    createOpenSpecRoot(appRepo);
    fs.writeFileSync(
      path.join(appRepo, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - team-context\n'
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  async function createChange(cwd: string, name: string, extraArgs: string[] = []) {
    const result = await runCLI(['new', 'change', name, '--json', ...extraArgs], { cwd, env });
    expect(result.exitCode).toBe(0);
  }

  it('carries the live index in both instruction surfaces, both modes', async () => {
    await createChange(appRepo, 'billing-rework');

    const artifactJson = await runCLI(
      ['instructions', 'proposal', '--change', 'billing-rework', '--json'],
      { cwd: appRepo, env }
    );
    expect(artifactJson.exitCode).toBe(0);
    const payload = parseJson(artifactJson);
    expect(payload.references).toEqual([
      {
        store_id: 'team-context',
        root: fs.realpathSync.native(storeRoot),
        specs: [{ id: 'billing', summary: 'Usage-based invoicing.' }],
        fetch: 'openspec show <spec-id> --type spec --store team-context',
        status: [],
      },
    ]);
    // Index, not inline: the spec body never appears in the output.
    expect(artifactJson.stdout).not.toContain('## Requirements');

    const artifactHuman = await runCLI(
      ['instructions', 'proposal', '--change', 'billing-rework'],
      { cwd: appRepo, env }
    );
    expect(artifactHuman.stdout).toContain('<referenced_stores>');
    expect(artifactHuman.stdout).toContain('  - billing: Usage-based invoicing.');

    const applyJson = await runCLI(
      ['instructions', 'apply', '--change', 'billing-rework', '--json'],
      { cwd: appRepo, env }
    );
    expect(parseJson(applyJson).references[0].store_id).toBe('team-context');

    const applyHuman = await runCLI(['instructions', 'apply', '--change', 'billing-rework'], {
      cwd: appRepo,
      env,
    });
    expect(applyHuman.stdout).toContain('### Referenced Stores');
  });

  it('reflects live store edits on every run - nothing is frozen', async () => {
    await createChange(appRepo, 'billing-rework');

    writeSpec(storeRoot, 'billing', '## Purpose\n\nRewritten upstream truth.\n');
    const result = await runCLI(
      ['instructions', 'proposal', '--change', 'billing-rework', '--json'],
      { cwd: appRepo, env }
    );

    expect(parseJson(result).references[0].specs[0].summary).toBe('Rewritten upstream truth.');
  });

  it('omits the references field entirely when none are declared', async () => {
    fs.writeFileSync(path.join(appRepo, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    await createChange(appRepo, 'plain-change');

    const result = await runCLI(
      ['instructions', 'proposal', '--change', 'plain-change', '--json'],
      { cwd: appRepo, env }
    );

    expect('references' in parseJson(result)).toBe(false);
  });

  it('omits the references field when the only declaration is a self-reference', async () => {
    // A store whose config copy-pasted its own id: the omitted-not-empty
    // contract must hold so field presence stays a reliable signal.
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - team-context\n'
    );
    await createChange(appRepo, 'self-ref-change', ['--store', 'team-context']);

    const result = await runCLI(
      ['instructions', 'proposal', '--change', 'self-ref-change', '--store', 'team-context', '--json'],
      { cwd: appRepo, env }
    );

    expect(result.exitCode).toBe(0);
    expect('references' in parseJson(result)).toBe(false);
  });

  it('reads the resolved root config for --store sessions (symmetric declarations)', async () => {
    // The store declares its own upstream reference; the cwd declares a
    // different one. With --store, the index must be the store's.
    const upstreamRoot = path.join(tempDir, 'upstream-context');
    createOpenSpecRoot(upstreamRoot);
    writeSpec(upstreamRoot, 'platform-rules', '## Purpose\n\nPlatform rules.\n');
    await registerStore({ id: 'upstream-context', localPath: upstreamRoot, globalDataDir });
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - upstream-context\n'
    );

    await createChange(appRepo, 'store-scoped', ['--store', 'team-context']);
    const result = await runCLI(
      ['instructions', 'proposal', '--change', 'store-scoped', '--store', 'team-context', '--json'],
      { cwd: appRepo, env }
    );

    const refs = parseJson(result).references;
    expect(refs.map((entry: any) => entry.store_id)).toEqual(['upstream-context']);
  });

  it('never follows a referenced store\'s own references (one level deep)', async () => {
    const upstreamRoot = path.join(tempDir, 'upstream-context');
    createOpenSpecRoot(upstreamRoot);
    await registerStore({ id: 'upstream-context', localPath: upstreamRoot, globalDataDir });
    // team-context references upstream-context; the app repo references
    // only team-context. upstream-context must not appear.
    fs.writeFileSync(
      path.join(storeRoot, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - upstream-context\n'
    );

    await createChange(appRepo, 'billing-rework');
    const result = await runCLI(
      ['instructions', 'proposal', '--change', 'billing-rework', '--json'],
      { cwd: appRepo, env }
    );

    const refs = parseJson(result).references;
    expect(refs.map((entry: any) => entry.store_id)).toEqual(['team-context']);
  });

  it('keeps non-instruction commands byte-identical and the store untouched', async () => {
    const plainRepo = path.join(tempDir, 'plain-repo');
    createOpenSpecRoot(plainRepo);

    const storeBefore = snapshot(storeRoot);
    const outputs: Record<string, string[]> = {};

    for (const [label, repo] of [
      ['referenced', appRepo],
      ['plain', plainRepo],
    ] as const) {
      await createChange(repo, 'parity-check');
      const status = await runCLI(['status', '--change', 'parity-check', '--json'], {
        cwd: repo,
        env,
      });
      expect(status.exitCode).toBe(0);
      const payload = parseJson(status);
      // Normalize the only legitimately differing content (the repo path).
      // The needle must match the JSON-escaped spelling (backslashes are
      // doubled in serialized Windows paths).
      const normalize = (value: unknown) =>
        JSON.stringify(value)
          .split(JSON.stringify(fs.realpathSync.native(repo)).slice(1, -1))
          .join('<root>');
      outputs[label] = [
        normalize(payload.artifacts),
        normalize(payload.actionContext),
        String('references' in payload),
      ];
    }

    expect(outputs.referenced).toEqual(outputs.plain);
    expect(snapshot(storeRoot)).toEqual(storeBefore);
    // No per-change link metadata in the app repo's change.
    const metadataPath = path.join(
      appRepo,
      'openspec',
      'changes',
      'parity-check',
      '.openspec.yaml'
    );
    if (fs.existsSync(metadataPath)) {
      expect(fs.readFileSync(metadataPath, 'utf-8')).not.toContain('reference');
    }
  });

  it('completes the PM-to-dev layered flow end to end', async () => {
    await createChange(appRepo, 'billing-rework');

    // The agent reads the index and runs the printed fetch verbatim.
    const instructions = await runCLI(
      ['instructions', 'proposal', '--change', 'billing-rework', '--json'],
      { cwd: appRepo, env }
    );
    const fetch = parseJson(instructions).references[0].fetch.replace('<spec-id>', 'billing');
    const fetchResult = await runCLI(fetch.split(' ').slice(1), { cwd: appRepo, env });
    expect(fetchResult.exitCode).toBe(0);
    expect(fetchResult.stdout).toContain('Usage-based invoicing.');

    // The design lands in the app repo's own root, citing the store spec.
    const changeDir = path.join(appRepo, 'openspec', 'changes', 'billing-rework');
    fs.writeFileSync(
      path.join(changeDir, 'proposal.md'),
      '## Why\n\nDerives from team-context/billing (see referenced stores).\n\n## What Changes\n\n- **invoicing:** Rework invoicing\n'
    );
    const deltaDir = path.join(changeDir, 'specs', 'invoicing');
    fs.mkdirSync(deltaDir, { recursive: true });
    fs.writeFileSync(
      path.join(deltaDir, 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: Invoicing SHALL follow team-context/billing\nThe system SHALL invoice per the upstream requirement (team-context/billing).\n\n#### Scenario: Invoices\n- **WHEN** a period ends\n- **THEN** an invoice is created\n'
    );

    const storeBefore = snapshot(storeRoot);
    const validate = await runCLI(['validate', 'billing-rework', '--json', '--no-interactive'], {
      cwd: appRepo,
      env,
    });
    expect(validate.exitCode).toBe(0);
    const status = await runCLI(['status', '--change', 'billing-rework', '--json'], {
      cwd: appRepo,
      env,
    });
    expect(status.exitCode).toBe(0);
    expect(snapshot(storeRoot)).toEqual(storeBefore);
  });

});
