import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runCLI } from '../helpers/run-cli.js';

/**
 * `openspec config edit` runs $EDITOR (or $VISUAL). Those variables hold a
 * command line such as `code --wait` or `"/path with spaces/subl" -w`, not a
 * bare program name. Passing the whole value to spawn as the executable made
 * every such setting fail with an uncaught ENOENT and a Node stack trace.
 */

// A stand-in editor: records the arguments it was given, optionally rewrites
// the file it was asked to edit, then exits with the requested status.
const FAKE_EDITOR = [
  "const fs = require('fs');",
  'const args = process.argv.slice(2);',
  'fs.writeFileSync(process.env.OPENSPEC_TEST_EDITOR_LOG, JSON.stringify(args));',
  'if (process.env.OPENSPEC_TEST_EDITOR_WRITE !== undefined) {',
  '  fs.writeFileSync(args[args.length - 1], process.env.OPENSPEC_TEST_EDITOR_WRITE);',
  '}',
  "process.exit(Number(process.env.OPENSPEC_TEST_EDITOR_EXIT || '0'));",
  '',
].join('\n');

const MISSING_EDITOR = 'openspec-test-missing-editor --wait';

// Each test starts a real editor process; allow for slow CI runners.
const T = 30_000;

const quote = (value: string) => `"${value}"`;

async function runConfigCommand(args: string[]): Promise<void> {
  const { registerConfigCommand } = await import('../../src/commands/config.js');
  const program = new Command();
  registerConfigCommand(program);
  await program.parseAsync(['node', 'openspec', 'config', ...args]);
}

/** A temp dir whose name contains spaces, holding the fake editor. */
function makeFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec config edit '));
  const editorDir = path.join(tempDir, 'fake editor');
  fs.mkdirSync(editorDir);
  const editorScript = path.join(editorDir, 'editor.cjs');
  fs.writeFileSync(editorScript, FAKE_EDITOR);
  const configHome = path.join(tempDir, 'config home');
  return {
    tempDir,
    editorDir,
    configHome,
    configPath: path.join(configHome, 'openspec', 'config.json'),
    logPath: path.join(tempDir, 'editor-args.json'),
    /** An EDITOR value running the fake editor, with its paths quoted. */
    nodeEditor: (...args: string[]) => [quote(process.execPath), quote(editorScript), ...args].join(' '),
  };
}

describe('config edit', () => {
  let fixture: ReturnType<typeof makeFixture>;
  let originalEnv: NodeJS.ProcessEnv;
  let originalExitCode: typeof process.exitCode;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  // Load the command module once, outside any single test's timeout: it pulls
  // in a large module graph. The config path is read from the environment on
  // every call, so the module does not need reloading between tests.
  beforeAll(async () => {
    await import('../../src/commands/config.js');
  }, 60_000);

  beforeEach(() => {
    fixture = makeFixture();
    originalEnv = { ...process.env };
    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    process.env.XDG_CONFIG_HOME = fixture.configHome;
    process.env.OPENSPEC_TEST_EDITOR_LOG = fixture.logPath;
    delete process.env.EDITOR;
    delete process.env.VISUAL;
    delete process.env.OPENSPEC_TEST_EDITOR_EXIT;
    delete process.env.OPENSPEC_TEST_EDITOR_WRITE;

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exitCode = originalExitCode;
    fs.rmSync(fixture.tempDir, { recursive: true, force: true });
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  const editorArgs = () => JSON.parse(fs.readFileSync(fixture.logPath, 'utf-8')) as string[];
  const errors = () => consoleErrorSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  it('passes the arguments in EDITOR through to the editor', async () => {
    process.env.EDITOR = fixture.nodeEditor('--wait');

    await runConfigCommand(['edit']);

    expect(process.exitCode).toBeUndefined();
    expect(editorArgs()).toEqual(['--wait', fixture.configPath]);
  }, T);

  it('runs a quoted editor path with spaces on a config path with spaces', async () => {
    process.env.EDITOR = fixture.nodeEditor('-w');

    await runConfigCommand(['edit']);

    expect(fixture.editorDir).toContain(' ');
    expect(fixture.configPath).toContain(' ');
    expect(process.exitCode).toBeUndefined();
    expect(editorArgs()).toEqual(['-w', fixture.configPath]);
  }, T);

  it('uses VISUAL when EDITOR is unset', async () => {
    process.env.VISUAL = fixture.nodeEditor('--from-visual');

    await runConfigCommand(['edit']);

    expect(process.exitCode).toBeUndefined();
    expect(editorArgs()).toEqual(['--from-visual', fixture.configPath]);
  }, T);

  it('prefers EDITOR when EDITOR and VISUAL are both set', async () => {
    process.env.EDITOR = fixture.nodeEditor('--from-editor');
    process.env.VISUAL = fixture.nodeEditor('--from-visual');

    await runConfigCommand(['edit']);

    expect(editorArgs()).toEqual(['--from-editor', fixture.configPath]);
  }, T);

  it('reports an editor that cannot be found instead of throwing', async () => {
    process.env.EDITOR = MISSING_EDITOR;

    await expect(runConfigCommand(['edit'])).resolves.toBeUndefined();

    expect(process.exitCode).toBe(1);
    expect(errors()).toContain(MISSING_EDITOR);
  }, T);

  it('reports an editor that exits non-zero instead of throwing', async () => {
    process.env.EDITOR = fixture.nodeEditor('--wait');
    process.env.OPENSPEC_TEST_EDITOR_EXIT = '3';

    await expect(runConfigCommand(['edit'])).resolves.toBeUndefined();

    expect(process.exitCode).toBe(1);
    expect(errors()).toContain('exited with code 3');
  }, T);

  it('still validates the file once the editor closes', async () => {
    process.env.EDITOR = fixture.nodeEditor('--wait');
    process.env.OPENSPEC_TEST_EDITOR_WRITE = '{ not json';

    await runConfigCommand(['edit']);

    expect(process.exitCode).toBe(1);
    expect(errors()).toContain('Invalid JSON');
  }, T);

  it('reports when no editor is configured', async () => {
    await runConfigCommand(['edit']);

    expect(process.exitCode).toBe(1);
    expect(errors()).toContain('No editor configured');
  }, T);

  it.skipIf(process.platform === 'win32')('still runs an unquoted absolute editor path with spaces', async () => {
    const editor = path.join(fixture.editorDir, 'ed');
    fs.writeFileSync(editor, '#!/bin/sh\nprintf \'%s\\n\' "$@" > "$OPENSPEC_TEST_EDITOR_LOG"\n', { mode: 0o755 });
    process.env.EDITOR = editor;

    await runConfigCommand(['edit']);

    expect(process.exitCode).toBeUndefined();
    expect(fs.readFileSync(fixture.logPath, 'utf-8')).toBe(`${fixture.configPath}\n`);
  }, T);

  it.skipIf(process.platform === 'win32')('still runs a bare command name', async () => {
    process.env.EDITOR = 'true';

    await runConfigCommand(['edit']);

    expect(process.exitCode).toBeUndefined();
  }, T);
});

describe('openspec config edit (end to end)', () => {
  let fixture: ReturnType<typeof makeFixture>;

  beforeEach(() => {
    fixture = makeFixture();
  });

  afterEach(() => {
    fs.rmSync(fixture.tempDir, { recursive: true, force: true });
  });

  const env = (editor: string) => ({
    XDG_CONFIG_HOME: fixture.configHome,
    OPENSPEC_TEST_EDITOR_LOG: fixture.logPath,
    EDITOR: editor,
    VISUAL: '',
  });

  it('opens the config with an EDITOR that carries arguments', async () => {
    const result = await runCLI(['config', 'edit'], { env: env(fixture.nodeEditor('--wait')), timeoutMs: 60_000 });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(fs.readFileSync(fixture.logPath, 'utf-8'))).toEqual(['--wait', fixture.configPath]);
  }, 120_000);

  it('reports an editor that cannot be found without a stack trace', async () => {
    const result = await runCLI(['config', 'edit'], { env: env(MISSING_EDITOR), timeoutMs: 60_000 });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(MISSING_EDITOR);
    expect(result.stderr).not.toMatch(/node:internal/);
    expect(result.stderr).not.toMatch(/^\s+at /m);
  }, 120_000);
});
