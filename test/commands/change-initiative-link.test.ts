import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { readChangeMetadata } from '../../src/utils/change-metadata.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';

/**
 * Initiative-link creation was removed from normal change flows in the
 * store-root-selection slice: `new change` no longer accepts `--initiative`
 * and `openspec set change` is gone. Existing initiative metadata from the
 * beta remains readable and untouched; this suite covers that legacy
 * behavior.
 */
describe('legacy repo-local change initiative metadata', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-change-initiative-link-'))
    );
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    fs.mkdirSync(path.join(tempDir, 'openspec', 'changes'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function parseJson(result: RunCLIResult): any {
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(
        `Could not parse JSON.\nCommand: ${result.command}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\n${String(error)}`
      );
    }
  }

  function changeDir(id: string): string {
    return path.join(tempDir, 'openspec', 'changes', id);
  }

  function createLegacyLinkedChange(id: string): string {
    const dir = changeDir(id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'proposal.md'),
      '## Why\nLegacy change.\n\n## What Changes\n- **billing:** Something\n'
    );
    fs.writeFileSync(
      path.join(dir, '.openspec.yaml'),
      'schema: spec-driven\ninitiative:\n  store: platform\n  id: billing-launch\n'
    );
    return dir;
  }

  it('keeps reading existing initiative metadata without modifying it', async () => {
    const dir = createLegacyLinkedChange('legacy-change');
    const metadataPath = path.join(dir, '.openspec.yaml');
    const before = fs.readFileSync(metadataPath, 'utf-8');

    const status = await runCLI(['status', '--change', 'legacy-change', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(status.exitCode).toBe(0);
    const statusJson = parseJson(status);
    // The legacy link is parsed (user data tolerated) but no longer
    // re-emitted on any user-facing surface (capstone vocabulary fix).
    expect('initiative' in statusJson).toBe(false);

    const list = await runCLI(['list', '--json'], { cwd: tempDir, env });
    expect(list.exitCode).toBe(0);
    expect(parseJson(list).changes.map((c: any) => c.name)).toContain('legacy-change');

    expect(fs.readFileSync(metadataPath, 'utf-8')).toBe(before);
    expect(readChangeMetadata(changeDir('legacy-change'), tempDir)?.initiative).toEqual({
      store: 'platform',
      id: 'billing-launch',
    });
  });

  it('creates no initiative metadata for new changes', async () => {
    const result = await runCLI(['new', 'change', 'fresh-change', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(result.exitCode).toBe(0);
    const json = parseJson(result);
    expect(json.initiative).toBeUndefined();

    const metadata = readChangeMetadata(changeDir('fresh-change'), tempDir);
    expect(metadata?.initiative).toBeUndefined();
  });

  it('rejects new change --initiative without writing files', async () => {
    const result = await runCLI(
      ['new', 'change', 'linked-change', '--initiative', 'billing-launch', '--json'],
      { cwd: tempDir, env }
    );
    expect(result.exitCode).toBe(1);
    const json = parseJson(result);
    expect(json.change).toBeNull();
    expect(json.status[0].code).toBe('initiative_option_removed');
    expect(fs.existsSync(changeDir('linked-change'))).toBe(false);
  });

  it('no longer provides openspec set change', async () => {
    createLegacyLinkedChange('legacy-change');

    const result = await runCLI(
      ['set', 'change', 'legacy-change', '--initiative', 'other-initiative'],
      { cwd: tempDir, env }
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout + result.stderr).toContain('unknown command');

    // Metadata untouched.
    expect(readChangeMetadata(changeDir('legacy-change'), tempDir)?.initiative).toEqual({
      store: 'platform',
      id: 'billing-launch',
    });
  });
});
