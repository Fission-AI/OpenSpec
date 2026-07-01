import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCLI } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';

describe('openspec new initiative', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-new-initiative-'))
    );
    createOpenSpecRoot(tempDir);
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function initiativePath(id: string, ...rest: string[]): string {
    return path.join(tempDir, 'openspec', 'initiatives', id, ...rest);
  }

  it('scaffolds a manifest and brief, derives a title, and lists it', async () => {
    const created = await runCLI(['new', 'initiative', 'smoother-setup'], {
      cwd: tempDir,
      env,
    });
    expect(created.exitCode).toBe(0);
    expect(fs.existsSync(initiativePath('smoother-setup', 'initiative.yaml'))).toBe(true);
    expect(fs.existsSync(initiativePath('smoother-setup', 'brief.md'))).toBe(true);
    expect(
      fs.readFileSync(initiativePath('smoother-setup', 'initiative.yaml'), 'utf-8')
    ).toContain('title: Smoother setup');

    const list = await runCLI(['list', '--initiatives'], { cwd: tempDir, env });
    expect(list.stdout).toContain('smoother-setup');
  });

  it('honors an explicit --title and emits JSON', async () => {
    const created = await runCLI(
      ['new', 'initiative', 'payments', '--title', 'Payments Revamp', '--json'],
      { cwd: tempDir, env }
    );
    expect(created.exitCode).toBe(0);
    const payload = JSON.parse(created.stdout);
    expect(payload.initiative.id).toBe('payments');
    expect(payload.initiative.title).toBe('Payments Revamp');
    expect(
      fs.readFileSync(initiativePath('payments', 'initiative.yaml'), 'utf-8')
    ).toContain('title: Payments Revamp');
  });

  it('refuses to overwrite an existing initiative', async () => {
    await runCLI(['new', 'initiative', 'dup'], { cwd: tempDir, env });
    const second = await runCLI(['new', 'initiative', 'dup'], { cwd: tempDir, env });
    expect(second.exitCode).toBe(1);
    expect(second.stderr + second.stdout).toContain('already exists');
  });
});
