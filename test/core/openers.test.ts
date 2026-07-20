import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  BUILTIN_OPENERS,
  buildLaunchCommand,
  findOpener,
  isOpenerCommandAvailable,
  listOpenerChoices,
  mergeOpenerTable,
} from '../../src/core/openers.js';

const CONFIG_PATH = '/home/dev/.config/openspec/config.json';

describe('openers core', () => {
  describe('built-in table', () => {
    it('carries the locked v1 rows', () => {
      expect(BUILTIN_OPENERS.map((opener) => [opener.id, opener.style])).toEqual([
        ['code', 'workspace-file'],
        ['cursor', 'workspace-file'],
        ['claude', 'attach-dirs'],
        ['codex', 'attach-dirs'],
      ]);
      expect(findOpener([...BUILTIN_OPENERS], 'codex')?.args).toEqual([
        '--sandbox',
        'workspace-write',
      ]);
      expect(findOpener([...BUILTIN_OPENERS], 'claude')?.attachFlag).toBe(
        '--add-dir'
      );
    });
  });

  describe('config merge', () => {
    it('returns built-ins for an absent openers key', () => {
      expect(mergeOpenerTable(undefined, CONFIG_PATH)).toEqual([
        ...BUILTIN_OPENERS,
      ]);
      expect(mergeOpenerTable(null, CONFIG_PATH)).toEqual([...BUILTIN_OPENERS]);
    });

    it('adds a new workspace-file tool with defaults from its id', () => {
      const table = mergeOpenerTable(
        { zed: { style: 'workspace-file' } },
        CONFIG_PATH
      );

      const zed = findOpener(table, 'zed');
      expect(zed).toEqual({
        id: 'zed',
        label: 'zed',
        style: 'workspace-file',
        command: 'zed',
        args: [],
        attachFlag: '--add-dir',
      });
    });

    it('overrides only the fields a built-in row sets', () => {
      const table = mergeOpenerTable(
        { claude: { attach_flag: '--dir' } },
        CONFIG_PATH
      );

      const claude = findOpener(table, 'claude');
      expect(claude?.attachFlag).toBe('--dir');
      expect(claude?.label).toBe('Claude Code');
      expect(claude?.command).toBe('claude');
      expect(claude?.style).toBe('attach-dirs');
    });

    it('rejects an unknown style naming the two valid styles', () => {
      try {
        mergeOpenerTable({ vim: { style: 'tabs' } }, CONFIG_PATH);
        expect.unreachable('expected invalid_opener_config');
      } catch (error) {
        const diagnostic = (
          error as { diagnostic: { code: string; fix?: string } }
        ).diagnostic;
        expect(diagnostic.code).toBe('invalid_opener_config');
        expect(diagnostic.fix).toContain("'workspace-file' or 'attach-dirs'");
        expect(diagnostic.fix).toContain(CONFIG_PATH);
      }
    });

    it('rejects a new tool that omits style', () => {
      expect(() =>
        mergeOpenerTable({ zed: { command: 'zed' } }, CONFIG_PATH)
      ).toThrowError(/'zed' adds a new tool and must set style/);
    });

    it('rejects malformed rows instead of ignoring them', () => {
      expect(() => mergeOpenerTable('zed', CONFIG_PATH)).toThrowError(
        /Invalid openers config/
      );
      expect(() =>
        mergeOpenerTable({ zed: { style: 'workspace-file', extra: 1 } }, CONFIG_PATH)
      ).toThrowError(/Invalid openers config/);
    });
  });

  describe('availability scan', () => {
    let tempDir: string;

    beforeEach(() => {
      // listOpenerChoices hides CLI-agent (attach-dirs) tools by default;
      // this suite asserts the full table, so enable them.
      process.env.OPENSPEC_ENABLE_CLI_AGENT_OPENERS = '1';
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-openers-'));
    });

    afterEach(() => {
      delete process.env.OPENSPEC_ENABLE_CLI_AGENT_OPENERS;
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    function makeExecutable(name: string): string {
      const filePath = path.join(tempDir, name);
      fs.writeFileSync(filePath, '#!/bin/sh\nexit 0\n');
      fs.chmodSync(filePath, 0o755);
      return filePath;
    }

    // posix-only: these exercise the real execute bit and the ':'-delimited
    // PATH against a real temp dir. On win32 chmod is a no-op and the temp
    // path's drive-letter colon shatters posix PATH splitting; win32
    // availability is covered by the injected-seam cases below.
    const itPosix = it.skipIf(process.platform === 'win32');

    itPosix('finds an executable on the posix PATH', () => {
      makeExecutable('faketool');

      expect(
        isOpenerCommandAvailable('faketool', {
          env: { PATH: tempDir },
          platform: 'linux',
        })
      ).toBe(true);
      expect(
        isOpenerCommandAvailable('missing', {
          env: { PATH: tempDir },
          platform: 'linux',
        })
      ).toBe(false);
    });

    itPosix('honors the case-insensitive Path key', () => {
      makeExecutable('faketool');

      expect(
        isOpenerCommandAvailable('faketool', {
          env: { Path: tempDir },
          platform: 'linux',
        })
      ).toBe(true);
    });

    itPosix('requires the execute bit on posix', () => {
      const filePath = path.join(tempDir, 'notexec');
      fs.writeFileSync(filePath, 'data');
      fs.chmodSync(filePath, 0o644);

      expect(
        isOpenerCommandAvailable('notexec', {
          env: { PATH: tempDir },
          platform: 'linux',
        })
      ).toBe(false);
    });

    it('stats separator-bearing commands directly', () => {
      const filePath = makeExecutable('direct');

      expect(
        isOpenerCommandAvailable(filePath, {
          env: { PATH: '' },
          platform: 'linux',
        })
      ).toBe(true);
    });

    it('walks the win32 PATHEXT matrix through the injected stat seam', () => {
      const seen: string[] = [];
      const available = isOpenerCommandAvailable('tool', {
        env: { Path: 'C:\\bin;D:\\apps' },
        platform: 'win32',
        isExecutableFile: (candidate) => {
          seen.push(candidate);
          return candidate === 'D:\\apps\\tool.CMD';
        },
      });

      expect(available).toBe(true);
      expect(seen).toContain('C:\\bin\\tool.COM');
      expect(seen).toContain('C:\\bin\\tool.EXE');
      expect(seen).toContain('D:\\apps\\tool.CMD');
    });

    it('honors a custom PATHEXT', () => {
      const seen: string[] = [];
      isOpenerCommandAvailable('tool', {
        env: { PATH: 'C:\\bin', PATHEXT: '.WSF;.LNK' },
        platform: 'win32',
        isExecutableFile: (candidate) => {
          seen.push(candidate);
          return false;
        },
      });

      expect(seen).toEqual(['C:\\bin\\tool.WSF', 'C:\\bin\\tool.LNK']);
    });

    it('matches a command already carrying a known extension as-is, never doubled', () => {
      const seen: string[] = [];
      const available = isOpenerCommandAvailable('tool.cmd', {
        env: { PATH: 'C:\\bin' },
        platform: 'win32',
        isExecutableFile: (candidate) => {
          seen.push(candidate);
          return candidate === 'C:\\bin\\tool.cmd';
        },
      });

      expect(available).toBe(true);
      // Exactly the bare candidate - no tool.cmd.COM/.EXE doubling
      // (the scan must agree with spawn-time resolution).
      expect(seen).toEqual(['C:\\bin\\tool.cmd']);

      const negative: string[] = [];
      isOpenerCommandAvailable('tool.cmd', {
        env: { PATH: 'C:\\bin' },
        platform: 'win32',
        isExecutableFile: (candidate) => {
          negative.push(candidate);
          return false;
        },
      });
      expect(negative).toEqual(['C:\\bin\\tool.cmd']);
    });

    itPosix('sorts choices available-first preserving table order', () => {
      makeExecutable('claude');
      makeExecutable('codex');

      const choices = listOpenerChoices([...BUILTIN_OPENERS], {
        env: { PATH: tempDir },
        platform: 'linux',
      });

      expect(
        choices.map((choice) => [choice.opener.id, choice.available])
      ).toEqual([
        ['claude', true],
        ['codex', true],
        ['code', false],
        ['cursor', false],
      ]);
      expect(choices[2].note).toBe('(code not found on PATH)');
    });
  });

  describe('launch command builder', () => {
    const members = [
      { name: 'team-context', path: '/abs/team-context' },
      { name: 'web-app', path: '/abs/web-app' },
      { name: 'api', path: '/abs/api' },
    ];
    const codeWorkspacePath = '/data/worksets/platform.code-workspace';

    it('workspace-file style passes pre-args plus the file path only', () => {
      const code = findOpener([...BUILTIN_OPENERS], 'code')!;

      const command = buildLaunchCommand(code, { members, codeWorkspacePath });

      expect(command).toEqual({
        executable: 'code',
        args: [codeWorkspacePath],
        cwd: '/abs/team-context',
        label: 'VS Code',
        style: 'workspace-file',
      });
    });

    it('attach-dirs style attaches every member, the primary included', () => {
      const claude = findOpener([...BUILTIN_OPENERS], 'claude')!;

      const command = buildLaunchCommand(claude, { members, codeWorkspacePath });

      expect(command.args).toEqual([
        '--add-dir',
        '/abs/team-context',
        '--add-dir',
        '/abs/web-app',
        '--add-dir',
        '/abs/api',
      ]);
      expect(command.cwd).toBe('/abs/team-context');
    });

    it('codex carries its sandbox pre-args before the attach pairs', () => {
      const codex = findOpener([...BUILTIN_OPENERS], 'codex')!;

      const command = buildLaunchCommand(codex, {
        members: [members[0]],
        codeWorkspacePath,
      });

      expect(command.args).toEqual([
        '--sandbox',
        'workspace-write',
        '--add-dir',
        '/abs/team-context',
      ]);
    });

    it('never emits a positional argument for attach-dirs tools', () => {
      const claude = findOpener([...BUILTIN_OPENERS], 'claude')!;

      const command = buildLaunchCommand(claude, { members, codeWorkspacePath });

      // Every argv entry is either a flag or the value following one.
      for (let index = 0; index < command.args.length; index += 2) {
        expect(command.args[index]).toBe('--add-dir');
      }
      expect(command.args.length % 2).toBe(0);
    });

    it('a configured attach_flag rename flows into the argv', () => {
      const table = mergeOpenerTable(
        { claude: { attach_flag: '--dir' } },
        CONFIG_PATH
      );

      const command = buildLaunchCommand(findOpener(table, 'claude')!, {
        members: [members[0], members[1]],
        codeWorkspacePath,
      });

      expect(command.args).toEqual([
        '--dir',
        '/abs/team-context',
        '--dir',
        '/abs/web-app',
      ]);
    });
  });
});
