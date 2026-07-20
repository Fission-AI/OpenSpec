import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir } from '../../src/core/global-config.js';
import {
  getWorksetCodeWorkspacePath,
  getWorksetsFilePath,
} from '../../src/core/worksets.js';
import {
  exitCodeForLaunch,
  launchOpenerCommand,
} from '../../src/commands/workset.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createFakeTool, envWithFakeTools, readLaunchLog } from '../helpers/fake-tool.js';
import { snapshotDirectory as snapshot } from '../helpers/fs-snapshot.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';

describe('openspec workset (7.1)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;
  let memberA: string;
  let memberB: string;
  let memberC: string;

  beforeEach(() => {
    // These suites assert the CLI-agent (attach-dirs) open behavior, which
    // is gated off by default; enable it for the legacy coverage. The
    // disabled-by-default path is covered in its own describe below.
    process.env.OPENSPEC_ENABLE_CLI_AGENT_OPENERS = '1';
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workset-'))
    );
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
      // Fully controlled PATH: node (for the fake-tool shims) plus
      // whatever fakes each test prepends. Real editors/agents on the
      // host machine must never be reachable from these tests.
      PATH: path.dirname(process.execPath),
    };
    globalDataDir = getGlobalDataDir({ env });

    memberA = path.join(tempDir, 'team-context');
    memberB = path.join(tempDir, 'web-app');
    memberC = path.join(tempDir, 'api');
    for (const dir of [memberA, memberB, memberC]) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'marker.txt'), `marker for ${dir}\n`);
    }
  });

  afterEach(() => {
    delete process.env.OPENSPEC_ENABLE_CLI_AGENT_OPENERS;
    cleanupTempPath(tempDir);
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  const pathOptions = () => ({ globalDataDir });

  async function createPlatform(extra: string[] = []): Promise<RunCLIResult> {
    return runCLI(
      [
        'workset',
        'create',
        'platform',
        '--member',
        memberA,
        '--member',
        memberB,
        '--member',
        memberC,
        ...extra,
        '--json',
      ],
      { cwd: tempDir, env }
    );
  }

  function writeOpenersConfig(openers: unknown): void {
    const configDir = path.join(env.XDG_CONFIG_HOME!, 'openspec');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ openers }, null, 2)
    );
  }

  describe('CLI-agent openers are disabled by default', () => {
    beforeEach(() => {
      delete process.env.OPENSPEC_ENABLE_CLI_AGENT_OPENERS;
    });

    it('refuses to open a workset in a CLI agent, pointing at an IDE', async () => {
      await createPlatform();
      const result = await runCLI(
        ['workset', 'open', 'platform', '--tool', 'claude'],
        { cwd: tempDir, env }
      );
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('temporarily disabled');
      expect(result.stderr).toContain('--tool code');
    });

    it('refuses to save a CLI agent as a workset tool', async () => {
      const result = await runCLI(
        ['workset', 'create', 'cli-x', '--member', memberA, '--tool', 'codex'],
        { cwd: tempDir, env }
      );
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('temporarily disabled');
    });

    it('never presents a CLI agent as a known tool', async () => {
      await createPlatform();
      const result = await runCLI(
        ['workset', 'open', 'platform', '--tool', 'nope'],
        { cwd: tempDir, env }
      );
      expect(result.stderr).toContain('Known tools: code, cursor');
      expect(result.stderr).not.toMatch(/claude|codex/);
    });
  });

  describe('create', () => {
    it('saves an ordered workset and emits the JSON envelope', async () => {
      const result = await runCLI(
        [
          'workset',
          'create',
          'ci',
          '--member',
          memberA,
          '--member',
          `runner=${memberB}`,
          '--tool',
          'codex',
          '--json',
        ],
        { cwd: tempDir, env }
      );

      expect(result.exitCode).toBe(0);
      expect(parseJson(result)).toEqual({
        workset: {
          name: 'ci',
          tool: 'codex',
          members: [
            { name: 'team-context', path: memberA },
            { name: 'runner', path: memberB },
          ],
        },
        status: [],
      });
      expect(fs.existsSync(getWorksetsFilePath(pathOptions()))).toBe(true);
    });

    it('rejects a duplicate name with the remove fix and one JSON document', async () => {
      await createPlatform();
      const result = await createPlatform();

      expect(result.exitCode).toBe(1);
      const payload = parseJson(result);
      expect(payload.workset).toBeNull();
      expect(payload.status[0].code).toBe('workset_exists');
      expect(payload.status[0].fix).toBe(
        'Choose another name, or remove it first: openspec workset remove platform'
      );
    });

    it('requires members, a name, and existing folders non-interactively', async () => {
      const noMembers = await runCLI(
        ['workset', 'create', 'empty', '--json'],
        { cwd: tempDir, env }
      );
      expect(noMembers.exitCode).toBe(1);
      expect(parseJson(noMembers).status[0].code).toBe(
        'workset_members_required'
      );
      expect(parseJson(noMembers).status[0].fix).toBe(
        'openspec workset create empty --member <path> --member <name>=<path>'
      );

      const noName = await runCLI(
        ['workset', 'create', '--member', memberA, '--json'],
        { cwd: tempDir, env }
      );
      expect(noName.exitCode).toBe(1);
      expect(parseJson(noName).status[0].code).toBe('workset_name_required');

      const missing = await runCLI(
        [
          'workset',
          'create',
          'ghost',
          '--member',
          path.join(tempDir, 'absent'),
          '--json',
        ],
        { cwd: tempDir, env }
      );
      expect(missing.exitCode).toBe(1);
      expect(parseJson(missing).status[0].code).toBe('workset_member_invalid');
      expect(fs.existsSync(getWorksetsFilePath(pathOptions()))).toBe(false);
    });

    it('rejects grammar-invalid names and duplicate member labels', async () => {
      const badName = await runCLI(
        ['workset', 'create', 'My Stuff', '--member', memberA, '--json'],
        { cwd: tempDir, env }
      );
      expect(badName.exitCode).toBe(1);
      expect(parseJson(badName).status[0].code).toBe('invalid_workset_name');

      const duplicated = path.join(tempDir, 'nested', 'web-app');
      fs.mkdirSync(duplicated, { recursive: true });
      const collision = await runCLI(
        [
          'workset',
          'create',
          'dup',
          '--member',
          memberB,
          '--member',
          duplicated,
          '--json',
        ],
        { cwd: tempDir, env }
      );
      expect(collision.exitCode).toBe(1);
      const status = parseJson(collision).status[0];
      expect(status.code).toBe('workset_member_invalid');
      expect(status.message).toContain("duplicate member name 'web-app'");
      expect(status.fix).toContain('<name>=<path>');
    });

    it('rejects an unknown --tool against the merged table', async () => {
      const result = await createPlatform(['--tool', 'emacs']);

      expect(result.exitCode).toBe(1);
      const status = parseJson(result).status[0];
      expect(status.code).toBe('workset_tool_unknown');
      expect(status.fix).toContain('code, cursor, claude, codex');
    });

    it('never writes into member folders', async () => {
      const before = snapshot(memberA);
      await createPlatform(['--tool', 'claude']);
      await runCLI(['workset', 'list', '--json'], { cwd: tempDir, env });
      await runCLI(['workset', 'remove', 'platform', '--yes', '--json'], {
        cwd: tempDir,
        env,
      });

      expect(snapshot(memberA)).toEqual(before);
    });
  });

  describe('list', () => {
    it('shows saved views at a glance and sorts JSON by name', async () => {
      await createPlatform(['--tool', 'claude']);
      await runCLI(
        ['workset', 'create', 'alpha', '--member', memberC, '--json'],
        { cwd: tempDir, env }
      );

      const json = await runCLI(['workset', 'list', '--json'], {
        cwd: tempDir,
        env,
      });
      const payload = parseJson(json);
      expect(payload.status).toEqual([]);
      expect(payload.worksets.map((w: { name: string }) => w.name)).toEqual([
        'alpha',
        'platform',
      ]);
      expect(payload.worksets[1].tool).toBe('claude');

      const human = await runCLI(['workset', 'list'], { cwd: tempDir, env });
      expect(human.stdout).toContain('platform  (opens in Claude Code)');
      expect(human.stdout).toContain(memberA);
    });

    it('says so plainly when nothing is saved', async () => {
      const human = await runCLI(['workset', 'list'], { cwd: tempDir, env });
      expect(human.stdout).toContain(
        'No worksets saved. Create one with: openspec workset create'
      );

      const json = await runCLI(['workset', 'list', '--json'], {
        cwd: tempDir,
        env,
      });
      expect(parseJson(json)).toEqual({ worksets: [], status: [] });
    });
  });

  describe('remove', () => {
    it('requires --yes non-interactively and removes only workset state', async () => {
      await createPlatform();

      const refused = await runCLI(['workset', 'remove', 'platform', '--json'], {
        cwd: tempDir,
        env,
      });
      expect(refused.exitCode).toBe(1);
      expect(parseJson(refused).status[0].code).toBe(
        'workset_remove_confirmation_required'
      );
      expect(parseJson(refused).status[0].fix).toBe(
        'openspec workset remove platform --yes'
      );

      const removed = await runCLI(
        ['workset', 'remove', 'platform', '--yes', '--json'],
        { cwd: tempDir, env }
      );
      expect(removed.exitCode).toBe(0);
      expect(parseJson(removed)).toEqual({
        removed: { name: 'platform' },
        status: [],
      });
      expect(fs.existsSync(memberA)).toBe(true);
    });

    it('cleans up a generated file and tolerates its absence', async () => {
      await createPlatform(['--tool', 'code']);
      const fakeCode = createFakeTool(tempDir, 'code');
      await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeCode]),
      });
      const generated = getWorksetCodeWorkspacePath('platform', pathOptions());
      expect(fs.existsSync(generated)).toBe(true);

      const removed = await runCLI(
        ['workset', 'remove', 'platform', '--yes', '--json'],
        { cwd: tempDir, env }
      );
      expect(removed.exitCode).toBe(0);
      expect(fs.existsSync(generated)).toBe(false);

      // Never opened: no generated file to delete; removal succeeds the same way.
      await createPlatform();
      const neverOpened = await runCLI(
        ['workset', 'remove', 'platform', '--yes', '--json'],
        { cwd: tempDir, env }
      );
      expect(neverOpened.exitCode).toBe(0);
    });

    it('reports unknown names with saved names or the create command', async () => {
      const noneSaved = await runCLI(['workset', 'remove', 'ghost', '--json'], {
        cwd: tempDir,
        env,
      });
      expect(parseJson(noneSaved).status[0].code).toBe('workset_not_found');
      expect(parseJson(noneSaved).status[0].fix).toBe(
        'Create it first: openspec workset create ghost'
      );

      await createPlatform();
      const someSaved = await runCLI(['workset', 'remove', 'ghost', '--json'], {
        cwd: tempDir,
        env,
      });
      expect(parseJson(someSaved).status[0].fix).toBe(
        'Saved worksets: platform. See them with: openspec workset list'
      );
    });
  });

  describe('open', () => {
    it('workspace-file style: regenerates the file and launches with it', async () => {
      await createPlatform(['--tool', 'code']);
      const fakeCode = createFakeTool(tempDir, 'code');

      const result = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeCode]),
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(
        "Opening 'platform' in VS Code (a window opens; this command returns)."
      );

      const generated = getWorksetCodeWorkspacePath('platform', pathOptions());
      expect(JSON.parse(fs.readFileSync(generated, 'utf-8'))).toEqual({
        folders: [
          { name: 'team-context', path: memberA },
          { name: 'web-app', path: memberB },
          { name: 'api', path: memberC },
        ],
      });
      expect(fs.readFileSync(generated, 'utf-8')).toMatch(/\n$/);

      const launch = readLaunchLog(fakeCode.logPath);
      expect(launch.args).toEqual([generated]);
      expect(fs.realpathSync.native(launch.cwd)).toBe(memberA);
    });

    it('attach-dirs style: one attach pair per member, the primary included, no positional', async () => {
      await createPlatform(['--tool', 'claude']);
      const fakeClaude = createFakeTool(tempDir, 'claude');

      const result = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeClaude]),
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(
        "Handing this terminal to Claude Code for 'platform' (the session ends when you exit)."
      );
      const launch = readLaunchLog(fakeClaude.logPath);
      expect(launch.args).toEqual([
        '--add-dir',
        memberA,
        '--add-dir',
        memberB,
        '--add-dir',
        memberC,
      ]);
      expect(fs.realpathSync.native(launch.cwd)).toBe(memberA);
    });

    it('codex carries its sandbox pre-args; a single member attaches itself', async () => {
      await runCLI(
        ['workset', 'create', 'solo', '--member', memberA, '--tool', 'codex', '--json'],
        { cwd: tempDir, env }
      );
      const fakeCodex = createFakeTool(tempDir, 'codex');

      const result = await runCLI(['workset', 'open', 'solo'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeCodex]),
      });

      expect(result.exitCode).toBe(0);
      expect(readLaunchLog(fakeCodex.logPath).args).toEqual([
        '--sandbox',
        'workspace-write',
        '--add-dir',
        memberA,
      ]);
    });

    it('propagates the launched tool exit code with no error banner', async () => {
      await createPlatform(['--tool', 'claude']);
      const fakeClaude = createFakeTool(tempDir, 'claude', { exitCode: 7 });

      const result = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeClaude]),
      });

      expect(result.exitCode).toBe(7);
      expect(result.stderr).not.toContain('Error:');
    });

    it('skips a missing member and falls through to the next primary', async () => {
      await createPlatform(['--tool', 'claude']);
      const fakeClaude = createFakeTool(tempDir, 'claude');
      cleanupTempPath(memberB);

      const result = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeClaude]),
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain(
        `Skipped 'web-app' (${memberB} is not available).`
      );
      expect(readLaunchLog(fakeClaude.logPath).args).toEqual([
        '--add-dir',
        memberA,
        '--add-dir',
        memberC,
      ]);
      const generated = getWorksetCodeWorkspacePath('platform', pathOptions());
      expect(JSON.parse(fs.readFileSync(generated, 'utf-8')).folders).toEqual([
        { name: 'team-context', path: memberA },
        { name: 'api', path: memberC },
      ]);

      // Primary missing: the next surviving member becomes cwd, and
      // the reassignment is noted in the skip-line style.
      cleanupTempPath(memberA);
      const second = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeClaude]),
      });
      expect(second.exitCode).toBe(0);
      expect(second.stderr).toContain(
        `Using 'api' (${memberC}) as the primary for this open.`
      );
      expect(fs.realpathSync.native(readLaunchLog(fakeClaude.logPath).cwd)).toBe(
        memberC
      );

      // No member survives: a typed failure.
      cleanupTempPath(memberC);
      const third = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeClaude]),
      });
      expect(third.exitCode).toBe(1);
      expect(third.stderr).toContain('workset');
      expect(third.stderr).toContain('No member folder');
    });

    it('overrides the saved tool per open without rewriting the file', async () => {
      await createPlatform(['--tool', 'claude']);
      const fakeCode = createFakeTool(tempDir, 'code');
      const before = fs.readFileSync(getWorksetsFilePath(pathOptions()), 'utf-8');

      const result = await runCLI(
        ['workset', 'open', 'platform', '--tool', 'code'],
        { cwd: tempDir, env: envWithFakeTools(env, [fakeCode]) }
      );

      expect(result.exitCode).toBe(0);
      expect(readLaunchLog(fakeCode.logPath).args).toEqual([
        getWorksetCodeWorkspacePath('platform', pathOptions()),
      ]);
      expect(fs.readFileSync(getWorksetsFilePath(pathOptions()), 'utf-8')).toBe(
        before
      );
    });

    it('requires a tool non-interactively when none is saved', async () => {
      await createPlatform();

      const result = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Workset 'platform' has no saved tool.");
      expect(result.stderr).toContain(
        'openspec workset open platform --tool <id>'
      );
    });

    it('never strands: unavailable and unknown tools carry the manual fallback', async () => {
      await createPlatform(['--tool', 'cursor']);
      const fakeCode = createFakeTool(tempDir, 'code');

      const unavailable = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeCode]),
      });

      expect(unavailable.exitCode).toBe(1);
      expect(unavailable.stderr).toContain(
        "Error: Cursor ('cursor') is not on PATH."
      );
      expect(unavailable.stderr).toContain(
        'Fix: Install \'cursor\' or run: openspec workset open platform --tool code'
      );
      expect(unavailable.stderr).toContain('Open manually:');
      const generated = getWorksetCodeWorkspacePath('platform', pathOptions());
      expect(unavailable.stderr).toContain(`Workspace file: ${generated}`);
      expect(unavailable.stderr).toContain(memberA);
      // The named file exists with current content.
      expect(JSON.parse(fs.readFileSync(generated, 'utf-8')).folders).toHaveLength(3);

      const unknown = await runCLI(
        ['workset', 'open', 'platform', '--tool', 'emacs'],
        { cwd: tempDir, env }
      );
      expect(unknown.exitCode).toBe(1);
      expect(unknown.stderr).toContain("Unknown tool 'emacs'");
      expect(unknown.stderr).toContain('Open manually:');
    });

    it('reports an unknown workset name', async () => {
      const result = await runCLI(['workset', 'open', 'ghost'], {
        cwd: tempDir,
        env,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Workset 'ghost' is not saved");
    });

    it('rejects --json with exactly one JSON document', async () => {
      await createPlatform(['--tool', 'claude']);

      const result = await runCLI(['workset', 'open', 'platform', '--json'], {
        cwd: tempDir,
        env,
      });

      expect(result.exitCode).toBe(1);
      const payload = parseJson(result);
      expect(payload.status[0].code).toBe('workset_open_json_unsupported');
      expect(payload.status[0].fix).toBe(
        'Inspect worksets with: openspec workset list --json'
      );
    });
  });

  describe('opener config', () => {
    it('adds a new workspace-file tool from config', async () => {
      writeOpenersConfig({ zed: { style: 'workspace-file' } });
      await createPlatform(['--tool', 'zed']);
      const fakeZed = createFakeTool(tempDir, 'zed');

      const result = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeZed]),
      });

      expect(result.exitCode).toBe(0);
      expect(readLaunchLog(fakeZed.logPath).args).toEqual([
        getWorksetCodeWorkspacePath('platform', pathOptions()),
      ]);
    });

    it('renaming an attach flag is a one-line local fix', async () => {
      writeOpenersConfig({ claude: { attach_flag: '--dir' } });
      await createPlatform(['--tool', 'claude']);
      const fakeClaude = createFakeTool(tempDir, 'claude');

      const result = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: envWithFakeTools(env, [fakeClaude]),
      });

      expect(result.exitCode).toBe(0);
      expect(readLaunchLog(fakeClaude.logPath).args).toEqual([
        '--dir',
        memberA,
        '--dir',
        memberB,
        '--dir',
        memberC,
      ]);
    });

    it('rejects an invalid style naming the two valid ones', async () => {
      writeOpenersConfig({ vim: { style: 'tabs' } });

      // The table is read only where it is consulted: a tool-less
      // scripted create must not fail on an unrelated config row...
      const toolLess = await createPlatform();
      expect(toolLess.exitCode).toBe(0);

      // ...while naming a tool reads it and fails typed.
      const withTool = await runCLI(
        ['workset', 'create', 'tooled', '--member', memberA, '--tool', 'claude', '--json'],
        { cwd: tempDir, env }
      );
      expect(withTool.exitCode).toBe(1);
      const payload = parseJson(withTool);
      expect(payload.status[0].code).toBe('invalid_opener_config');
      expect(payload.status[0].fix).toContain("'workspace-file' or 'attach-dirs'");
    });
  });

  describe('state file hygiene', () => {
    it('a corrupt worksets file fails clearly from any command, never rewritten', async () => {
      const filePath = getWorksetsFilePath(pathOptions());
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, '{broken');

      for (const args of [
        ['workset', 'list', '--json'],
        ['workset', 'create', 'x', '--member', memberA, '--json'],
        ['workset', 'remove', 'x', '--yes', '--json'],
      ]) {
        const result = await runCLI(args, { cwd: tempDir, env });
        expect(result.exitCode).toBe(1);
        const status = parseJson(result).status[0];
        expect(status.code).toBe('invalid_workset_file');
        expect(status.fix).toBe(`Repair or remove ${filePath}.`);
      }

      // open is human-only; it fails the same way on its stderr leg.
      const open = await runCLI(['workset', 'open', 'x'], {
        cwd: tempDir,
        env,
      });
      expect(open.exitCode).toBe(1);
      expect(open.stderr).toContain('Invalid worksets file');

      expect(fs.readFileSync(filePath, 'utf-8')).toBe('{broken');
    });

    it('unknown subcommands keep the one-JSON-document contract', async () => {
      const json = await runCLI(['workset', 'bogus', '--json'], {
        cwd: tempDir,
        env,
      });
      expect(json.exitCode).toBe(1);
      const payload = parseJson(json);
      expect(payload.status[0].code).toBe('unknown_workset_subcommand');
      expect(payload.status[0].message).toContain("Unknown command 'bogus'");

      const human = await runCLI(['workset', 'bogus'], { cwd: tempDir, env });
      expect(human.exitCode).toBe(1);
      expect(human.stderr).toContain("Unknown command 'bogus'");
      expect(human.stderr).toContain('create, list (ls), open, remove');
    });

    it('a bare group invocation keeps the contract too (--json and human)', async () => {
      const json = await runCLI(['workset', '--json'], { cwd: tempDir, env });
      expect(json.exitCode).toBe(1);
      const payload = parseJson(json);
      expect(payload.status[0].code).toBe('unknown_workset_subcommand');
      expect(payload.status[0].message).toContain('Missing subcommand');

      const human = await runCLI(['workset'], { cwd: tempDir, env });
      expect(human.exitCode).toBe(1);
      expect(human.stderr).toContain('Missing subcommand');
    });

    it('a launch failure carries a pasteable alternative and the manual route', async () => {
      await createPlatform(['--tool', 'claude']);
      // A fake claude that PASSES the PATH scan but fails to spawn.
      // The shebang must point at a missing interpreter: that fails
      // ENOENT -> spawn 'error' event on every POSIX libc, whereas a
      // shebang-less text file dies ENOEXEC, which glibc's execvp
      // silently retries via /bin/sh - the child then *runs* and exits
      // 127 instead of erroring. The garbage .exe is the win32 analog
      // (passes the PATHEXT scan, fails CreateProcess as a bad image).
      const binDir = path.join(tempDir, 'fake-broken-bin');
      fs.mkdirSync(binDir, { recursive: true });
      const broken = path.join(binDir, 'claude');
      fs.writeFileSync(
        broken,
        `#!${path.join(binDir, 'no-such-interpreter')}\n`
      );
      fs.chmodSync(broken, 0o755);
      fs.writeFileSync(path.join(binDir, 'claude.exe'), 'not a real image\n');
      const fakeCode = createFakeTool(tempDir, 'code');
      const launchEnv = envWithFakeTools(env, [fakeCode]);
      launchEnv.PATH = `${binDir}${path.delimiter}${launchEnv.PATH}`;

      const result = await runCLI(['workset', 'open', 'platform'], {
        cwd: tempDir,
        env: launchEnv,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Could not launch Claude Code');
      expect(result.stderr).toContain(
        'Fix: Run: openspec workset open platform --tool code'
      );
      expect(result.stderr).toContain('Open manually:');
    });
  });
});

describe('launchOpenerCommand (in-process launch mechanics)', () => {
  class FakeChild extends EventEmitter {}

  function fakeSpawn(behavior: (child: FakeChild) => void) {
    return ((..._args: unknown[]) => {
      const child = new FakeChild();
      queueMicrotask(() => behavior(child));
      return child;
    }) as any;
  }

  const command = {
    executable: 'claude',
    args: ['--add-dir', '/abs/a'],
    cwd: '/abs/a',
    label: 'Claude Code',
    style: 'attach-dirs' as const,
  };

  it('resolves with the child exit facts', async () => {
    const result = await launchOpenerCommand(command, {
      spawnFn: fakeSpawn((child) => child.emit('close', 7, null)),
    });

    expect(result).toEqual({ code: 7, signal: null });
    expect(exitCodeForLaunch(result)).toBe(7);
  });

  it('maps a SIGINT death to 130 (128+n), not an error', async () => {
    const result = await launchOpenerCommand(command, {
      spawnFn: fakeSpawn((child) => child.emit('close', null, 'SIGINT')),
    });

    expect(exitCodeForLaunch(result)).toBe(130);
  });

  it('maps SIGTERM to 143 and a clean exit to 0', () => {
    expect(exitCodeForLaunch({ code: null, signal: 'SIGTERM' })).toBe(143);
    expect(exitCodeForLaunch({ code: 0, signal: null })).toBe(0);
  });

  it('rejects spawn failures as workset_launch_failed', async () => {
    await expect(
      launchOpenerCommand(command, {
        spawnFn: fakeSpawn((child) =>
          child.emit('error', new Error('spawn claude ENOENT'))
        ),
      })
    ).rejects.toMatchObject({
      diagnostic: {
        code: 'workset_launch_failed',
        target: 'workset.tool',
      },
      message: 'Could not launch Claude Code: spawn claude ENOENT',
    });
  });
});

describe('interactive compose cancellation (in-process)', () => {
  let tempDir: string;
  let restoreTTY: (() => void) | undefined;
  let originalEnv: NodeJS.ProcessEnv;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let originalExitCode: number | string | undefined;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workset-tty-'))
    );
    originalEnv = { ...process.env };
    process.env.XDG_DATA_HOME = path.join(tempDir, 'data');
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
    delete process.env.CI;
    delete process.env.OPEN_SPEC_INTERACTIVE;
    process.env.OPENSPEC_ENABLE_CLI_AGENT_OPENERS = '1';
    // Deterministic tool availability for the wizard's [3/3] step:
    // exactly one fake claude on PATH, regardless of the host machine.
    const fakeClaude = createFakeTool(tempDir, 'claude');
    process.env.PATH = `${fakeClaude.binDir}${path.delimiter}${path.dirname(process.execPath)}`;

    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    });
    restoreTTY = () => {
      if (descriptor) {
        Object.defineProperty(process.stdin, 'isTTY', descriptor);
      } else {
        delete (process.stdin as { isTTY?: boolean }).isTTY;
      }
    };

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.doUnmock('@inquirer/prompts');
    vi.resetModules();
    errorSpy.mockRestore();
    logSpy.mockRestore();
    restoreTTY?.();
    process.env = originalEnv;
    process.exitCode = originalExitCode;
    cleanupTempPath(tempDir);
  });

  function exitPromptError(): Error {
    const error = new Error('User force closed the prompt with SIGINT');
    error.name = 'ExitPromptError';
    return error;
  }

  async function runCreate(promptsModule: Record<string, unknown>): Promise<void> {
    vi.doMock('@inquirer/prompts', () => promptsModule);
    const { registerWorksetCommand } = await import(
      '../../src/commands/workset.js'
    );
    const { Command } = await import('commander');
    const program = new Command();
    program.exitOverride();
    registerWorksetCommand(program);
    await program.parseAsync(['workset', 'create'], { from: 'user' });
  }

  it.each(['name', 'member'])(
    'Ctrl-C at the %s prompt prints Cancelled. and exits 130 with nothing saved',
    async (boundary) => {
      await runCreate({
        input: vi.fn(async (config: { message: string }) => {
          if (boundary === 'name' || config.message.includes('name')) {
            throw exitPromptError();
          }
          throw exitPromptError();
        }),
        select: vi.fn(async () => {
          throw exitPromptError();
        }),
        confirm: vi.fn(async () => {
          throw exitPromptError();
        }),
      });

      expect(process.exitCode).toBe(130);
      expect(errorSpy).toHaveBeenCalledWith('Cancelled.');
      expect(
        fs.existsSync(
          path.join(process.env.XDG_DATA_HOME!, 'openspec', 'worksets', 'worksets.yaml')
        )
      ).toBe(false);
    }
  );

  it('Ctrl-C at the tool select cancels with nothing saved', async () => {
    const memberDir = path.join(tempDir, 'repo');
    fs.mkdirSync(memberDir);
    let inputCalls = 0;

    await runCreate({
      input: vi.fn(async () => {
        inputCalls += 1;
        if (inputCalls === 1) return 'platform';
        return memberDir;
      }),
      select: vi.fn(async (config: { message: string }) => {
        if (config.message.includes('Add another')) return 'finish';
        throw exitPromptError();
      }),
      confirm: vi.fn(async () => true),
    });

    expect(process.exitCode).toBe(130);
    expect(errorSpy).toHaveBeenCalledWith('Cancelled.');
    expect(
      fs.existsSync(
        path.join(process.env.XDG_DATA_HOME!, 'openspec', 'worksets', 'worksets.yaml')
      )
    ).toBe(false);
  });

  it('the guided flow saves; declining open-now prints the reopen line', async () => {
    const memberDir = path.join(tempDir, 'repo');
    fs.mkdirSync(memberDir);
    let inputCalls = 0;

    await runCreate({
      input: vi.fn(async () => {
        inputCalls += 1;
        return inputCalls === 1 ? 'platform' : memberDir;
      }),
      select: vi.fn(async (config: { message: string }) => {
        if (config.message.includes('Add another')) return 'finish';
        return 'claude';
      }),
      confirm: vi.fn(async () => false),
    });

    expect(process.exitCode === undefined || process.exitCode === 0).toBe(
      true
    );
    const yamlPath = path.join(
      process.env.XDG_DATA_HOME!,
      'openspec',
      'worksets',
      'worksets.yaml'
    );
    expect(fs.readFileSync(yamlPath, 'utf-8')).toContain('platform');
    expect(fs.readFileSync(yamlPath, 'utf-8')).toContain('tool: claude');
    expect(logSpy).toHaveBeenCalledWith(
      'Open it any time with: openspec workset open platform'
    );
  });

  it('Ctrl-C at the post-save open-now offer is NOT a cancelled create', async () => {
    const memberDir = path.join(tempDir, 'repo');
    fs.mkdirSync(memberDir);
    let inputCalls = 0;

    await runCreate({
      input: vi.fn(async () => {
        inputCalls += 1;
        return inputCalls === 1 ? 'platform' : memberDir;
      }),
      select: vi.fn(async (config: { message: string }) => {
        if (config.message.includes('Add another')) return 'finish';
        return 'claude';
      }),
      confirm: vi.fn(async () => {
        throw exitPromptError();
      }),
    });

    // The workset is durably saved; declining-by-Ctrl-C is success.
    expect(process.exitCode === undefined || process.exitCode === 0).toBe(
      true
    );
    expect(errorSpy).not.toHaveBeenCalledWith('Cancelled.');
    expect(logSpy).toHaveBeenCalledWith(
      'Open it any time with: openspec workset open platform'
    );
    expect(
      fs.existsSync(
        path.join(
          process.env.XDG_DATA_HOME!,
          'openspec',
          'worksets',
          'worksets.yaml'
        )
      )
    ).toBe(true);
  });

  it('a declined remove confirm is the typed workset_remove_cancelled', async () => {
    const memberDir = path.join(tempDir, 'repo');
    fs.mkdirSync(memberDir);

    vi.doMock('@inquirer/prompts', () => ({
      input: vi.fn(),
      select: vi.fn(),
      confirm: vi.fn(async () => false),
    }));
    const { registerWorksetCommand } = await import(
      '../../src/commands/workset.js'
    );
    const { Command } = await import('commander');

    // Save one non-interactively first (no prompts involved).
    const setup = new Command();
    setup.exitOverride();
    registerWorksetCommand(setup);
    process.env.OPEN_SPEC_INTERACTIVE = '0';
    await setup.parseAsync(
      ['workset', 'create', 'platform', '--member', memberDir],
      { from: 'user' }
    );
    delete process.env.OPEN_SPEC_INTERACTIVE;
    process.exitCode = undefined;

    const program = new Command();
    program.exitOverride();
    registerWorksetCommand(program);
    await program.parseAsync(['workset', 'remove', 'platform'], {
      from: 'user',
    });

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith('Error: Workset remove cancelled.');
    expect(
      fs.existsSync(
        path.join(process.env.XDG_DATA_HOME!, 'openspec', 'worksets', 'worksets.yaml')
      )
    ).toBe(true);
  });
});
