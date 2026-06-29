import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCLI } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';

/**
 * End-to-end regression for the silent-spec-drop family:
 *   - issue #1212: spec-driven fast path silently archives without specs
 *   - PR #1250:   apply should fail (exit 1) when blocked, with a spec-driven hint
 *
 * Each test drives the real built CLI against a spec-driven project. The change
 * has proposal + design + tasks but (initially) NO delta specs — exactly the
 * #1212 reproduction — and asserts the workflow now refuses to drop specs.
 */
describe('issue #1212 / PR #1250 — silent spec drop is caught end-to-end', () => {
  let root: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-1212-')));
    createOpenSpecRoot(root); // config.yaml => schema: spec-driven
    env = {
      XDG_DATA_HOME: path.join(root, 'data'),
      XDG_CONFIG_HOME: path.join(root, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function writeChange(name: string, opts: { specs: boolean }): string {
    const dir = path.join(root, 'openspec', 'changes', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'proposal.md'),
      [
        '## Why',
        'The spec-driven fast path used to archive while leaving specs stale; this exercises the guard.',
        '',
        '## What Changes',
        '- Add a data export capability',
        '',
        '## Capabilities',
        '### New Capabilities',
        '- `data-export`: export user data as CSV',
        '',
        '## Impact',
        '- code',
        '',
      ].join('\n')
    );
    fs.writeFileSync(path.join(dir, 'design.md'), '# Design\n\nTechnical design.\n');
    fs.writeFileSync(path.join(dir, 'tasks.md'), '## 1. Implementation\n- [x] 1.1 Implement export\n');
    if (opts.specs) {
      const sd = path.join(dir, 'specs', 'data-export');
      fs.mkdirSync(sd, { recursive: true });
      fs.writeFileSync(
        path.join(sd, 'spec.md'),
        [
          '## ADDED Requirements',
          '',
          '### Requirement: Data export',
          'The system SHALL export user data as CSV.',
          '',
          '#### Scenario: Successful export',
          '- **WHEN** the user requests an export',
          '- **THEN** a CSV file is produced',
          '',
        ].join('\n')
      );
    }
    return dir;
  }

  const archiveDir = () => path.join(root, 'openspec', 'changes', 'archive');
  const mainSpec = () => path.join(root, 'openspec', 'specs', 'data-export', 'spec.md');

  it('PR #1250: `instructions apply` exits 1 and reports specs missing with the spec-driven hint', async () => {
    writeChange('add-export', { specs: false });

    const r = await runCLI(['instructions', 'apply', '--change', 'add-export', '--json'], {
      cwd: root,
      env,
    });

    expect(r.exitCode).toBe(1);
    const json = JSON.parse(r.stdout);
    expect(json.state).toBe('blocked');
    expect(json.missingArtifacts).toContain('specs');
    expect(json.instruction).toContain('Delta specs must exist');
  });

  it('issue #1212: `archive` refuses to silently drop specs — nothing is moved or synced', async () => {
    const dir = writeChange('add-export', { specs: false });

    const r = await runCLI(['archive', 'add-export', '--json', '--yes'], { cwd: root, env });

    expect(r.exitCode).not.toBe(0);
    // The change is NOT archived...
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.readdirSync(archiveDir()).filter((a) => a.includes('add-export'))).toEqual([]);
    // ...and the main spec was NOT silently created/left stale.
    expect(fs.existsSync(mainSpec())).toBe(false);
  });

  it('issue #1212: once the delta spec exists, apply is ready and archive syncs the main spec', async () => {
    const dir = writeChange('add-export', { specs: true });

    const apply = await runCLI(['instructions', 'apply', '--change', 'add-export', '--json'], {
      cwd: root,
      env,
    });
    expect(apply.exitCode).toBe(0);
    // Unblocked once the delta spec exists (ready to implement, or all_done when
    // tasks are already complete) — the key point is it is no longer "blocked".
    expect(['ready', 'all_done']).toContain(JSON.parse(apply.stdout).state);

    const archive = await runCLI(['archive', 'add-export', '--json', '--yes'], { cwd: root, env });
    expect(archive.exitCode).toBe(0);
    // The main spec is now synced, and the change moved to the archive.
    expect(fs.existsSync(mainSpec())).toBe(true);
    expect(fs.readFileSync(mainSpec(), 'utf-8')).toContain('Requirement: Data export');
    expect(fs.existsSync(dir)).toBe(false);
  });

  it('recovery: `validate --archived` detects an already-archived change whose capability never synced', async () => {
    // Simulate a change archived before the guard existed: it declared a
    // capability but the main spec was never written.
    const old = path.join(archiveDir(), '2026-01-01-legacy-export');
    fs.mkdirSync(old, { recursive: true });
    fs.writeFileSync(
      path.join(old, 'proposal.md'),
      '## Why\nlegacy\n\n## Capabilities\n### New Capabilities\n- `legacy-export`: never synced\n'
    );

    const r = await runCLI(['validate', '--archived'], { cwd: root, env });
    expect(r.exitCode).toBe(1);
    expect(r.stdout + r.stderr).toContain('legacy-export');
  });
});
