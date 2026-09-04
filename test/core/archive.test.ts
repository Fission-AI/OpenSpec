import { describe, it, expect, beforeEach, afterEach, onTestFinished, vi } from 'vitest';
import { ArchiveCommand, isRetirableSpec } from '../../src/core/archive.js';
import { retireSpec } from '../../src/core/specs-apply.js';
import { Validator } from '../../src/core/validation/validator.js';
import { MarkdownParser } from '../../src/core/parsers/markdown-parser.js';
import { findMainSpecStructureIssues } from '../../src/core/parsers/spec-structure.js';
import { VALIDATION_MESSAGES } from '../../src/core/validation/constants.js';
import { formatLocalDate } from '../../src/utils/date.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn()
}));

// Archive now reads yes/no through confirmPrompt (which avoids @inquirer's
// ANSI rendering on non-TTY stdout, #1526). Mock that seam instead of confirm,
// keeping the real isNonInteractivePromptError so the #1479 blocked-path tests
// still classify ExitPromptError exactly as production does.
vi.mock('../../src/utils/interactive.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/interactive.js')>();
  return { ...actual, confirmPrompt: vi.fn() };
});

describe('ArchiveCommand', () => {
  let tempDir: string;
  let archiveCommand: ArchiveCommand;
  const originalConsoleLog = console.log;
  const originalExitCode = process.exitCode;
  const originalXdgDataHome = process.env.XDG_DATA_HOME;
  const originalTimeZone = process.env.TZ;

  function archiveClaimPath(_archiveName: string): string {
    return path.join(
      tempDir,
      'openspec',
      'changes',
      'archive',
      '.openspec-archive.lock'
    );
  }

  beforeEach(async () => {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-archive-test-'));

    // Change to temp directory
    process.chdir(tempDir);

    // Isolate root resolution from any real store registry on the
    // host machine so no-root behavior stays the implicit-root path.
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg-data');

    // Create OpenSpec structure
    const openspecDir = path.join(tempDir, 'openspec');
    await fs.mkdir(path.join(openspecDir, 'changes'), { recursive: true });
    await fs.mkdir(path.join(openspecDir, 'specs'), { recursive: true });
    await fs.mkdir(path.join(openspecDir, 'changes', 'archive'), { recursive: true });

    // Suppress console.log during tests
    console.log = vi.fn();

    // Isolate process.exitCode so a failing run can't leak into the next
    // test or skew the vitest process exit status.
    process.exitCode = undefined;

    archiveCommand = new ArchiveCommand();
  });

  afterEach(async () => {
    vi.useRealTimers();

    // Restore console.log
    console.log = originalConsoleLog;

    // Restore process.exitCode (clear anything a test set)
    process.exitCode = originalExitCode;

    if (originalXdgDataHome === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = originalXdgDataHome;
    }

    if (originalTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTimeZone;
    }

    // Clear mocks
    vi.clearAllMocks();

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('execute', () => {
    it('should archive a change successfully', async () => {
      // Create a test change
      const changeName = 'test-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with completed tasks
      const tasksContent = '- [x] Task 1\n- [x] Task 2';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Execute archive with --yes flag
      await archiveCommand.execute(changeName, { yes: true });
      
      // Check that change was moved to archive
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      
      expect(archives.length).toBe(1);
      expect(archives[0]).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`));
      
      // Verify original change directory no longer exists
      await expect(fs.access(changeDir)).rejects.toThrow();
    });

    it('retains the complete copied archive when fallback source cleanup partially fails', async () => {
      const changeName = 'fallback-cleanup-failure';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Complete\n');
      await fs.writeFile(path.join(changeDir, 'notes.md'), 'keep this\n');

      const realRename = fs.rename.bind(fs);
      const realRm = fs.rm.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source).endsWith(`${path.sep}changes${path.sep}${changeName}`) &&
          String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
        ) {
          throw Object.assign(new Error('cross-device move'), { code: 'EXDEV' });
        }
        return realRename(source, destination);
      });
      vi.spyOn(fs, 'rm').mockImplementation(async (candidate, options) => {
        if (
          String(candidate).includes(`${path.sep}changes${path.sep}.openspec-move-`)
        ) {
          throw Object.assign(new Error('source cleanup failed'), { code: 'EACCES' });
        }
        return realRm(candidate, options);
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true, skipSpecs: true })
      ).rejects.toThrow(/complete destination was retained for recovery/);

      const archived = path.join(
        tempDir,
        'openspec',
        'changes',
        'archive',
        `${formatLocalDate()}-${changeName}`
      );
      await expect(fs.readFile(path.join(archived, 'tasks.md'), 'utf-8')).resolves.toContain(
        'Complete'
      );
      await expect(fs.readFile(path.join(archived, 'notes.md'), 'utf-8')).resolves.toBe(
        'keep this\n'
      );
    });

    it('does not discard an artifact changed during the fallback copy', async () => {
      const changeName = 'fallback-artifact-race';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const tasksPath = path.join(changeDir, 'tasks.md');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(tasksPath, '- [x] Original task\n');

      const realRename = fs.rename.bind(fs);
      const realCopyFile = fs.copyFile.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source).endsWith(`${path.sep}changes${path.sep}${changeName}`) &&
          String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
        ) {
          throw Object.assign(new Error('cross-device move'), { code: 'EXDEV' });
        }
        return realRename(source, destination);
      });
      let edited = false;
      vi.spyOn(fs, 'copyFile').mockImplementation(async (source, destination, mode) => {
        await realCopyFile(source, destination, mode);
        if (
          !edited &&
          String(source).includes(`${path.sep}.openspec-move-`) &&
          String(source).endsWith(`${path.sep}tasks.md`)
        ) {
          edited = true;
          await fs.appendFile(source, '- [x] Concurrent task\n');
        }
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true, skipSpecs: true })
      ).rejects.toThrow(/changed during the fallback copy/);

      expect(edited).toBe(true);
      await expect(fs.readFile(tasksPath, 'utf-8')).resolves.toContain('Concurrent task');
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      await expect(
        fs.access(
          path.join(
            tempDir,
            'openspec',
            'changes',
            'archive',
            `${formatLocalDate()}-${changeName}`
          )
        )
      ).rejects.toThrow();
    });

    it.skipIf(process.platform === 'win32')(
      'does not discard an artifact permission change during the fallback copy',
      async () => {
        const changeName = 'fallback-mode-race';
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        const toolPath = path.join(changeDir, 'tool.sh');
        await fs.mkdir(changeDir, { recursive: true });
        await fs.writeFile(toolPath, '#!/bin/sh\n');
        await fs.chmod(toolPath, 0o644);

        const realRename = fs.rename.bind(fs);
        const realCopyFile = fs.copyFile.bind(fs);
        onTestFinished(() => vi.restoreAllMocks());
        vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
          if (
            String(source).endsWith(`${path.sep}changes${path.sep}${changeName}`) &&
            String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
          ) {
            throw Object.assign(new Error('cross-device move'), { code: 'EXDEV' });
          }
          return realRename(source, destination);
        });
        let changed = false;
        vi.spyOn(fs, 'copyFile').mockImplementation(async (source, destination, mode) => {
          await realCopyFile(source, destination, mode);
          if (
            !changed &&
            String(source).includes(`${path.sep}.openspec-move-`) &&
            String(source).endsWith(`${path.sep}tool.sh`)
          ) {
            changed = true;
            await fs.chmod(source, 0o755);
          }
        });

        await expect(
          archiveCommand.execute(changeName, { yes: true, skipSpecs: true })
        ).rejects.toThrow(/changed during the fallback copy/);

        expect(changed).toBe(true);
        expect((await fs.stat(toolPath)).mode & 0o777).toBe(0o755);
        await expect(fs.access(changeDir)).resolves.not.toThrow();
      }
    );

    it.skipIf(process.platform === 'win32')(
      'preserves directory and file modes in an unchanged fallback copy',
      async () => {
        const changeName = 'fallback-preserves-modes';
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        const privateDir = path.join(changeDir, 'private');
        const toolPath = path.join(privateDir, 'tool.sh');
        await fs.mkdir(privateDir, { recursive: true });
        await fs.writeFile(toolPath, '#!/bin/sh\n');
        await fs.chmod(toolPath, 0o755);
        await fs.chmod(privateDir, 0o700);

        const realRename = fs.rename.bind(fs);
        const realCopyFile = fs.copyFile.bind(fs);
        onTestFinished(() => vi.restoreAllMocks());
        vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
          if (
            String(source).endsWith(`${path.sep}changes${path.sep}${changeName}`) &&
            String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
          ) {
            throw Object.assign(new Error('cross-device move'), { code: 'EXDEV' });
          }
          return realRename(source, destination);
        });
        let modeDuringCopy: number | undefined;
        vi.spyOn(fs, 'copyFile').mockImplementation(async (source, destination, mode) => {
          if (String(source).endsWith(`${path.sep}private${path.sep}tool.sh`)) {
            modeDuringCopy = (await fs.stat(path.dirname(String(destination)))).mode & 0o777;
          }
          return realCopyFile(source, destination, mode);
        });

        await archiveCommand.execute(changeName, { yes: true, skipSpecs: true });

        const archivedPrivate = path.join(
          tempDir,
          'openspec',
          'changes',
          'archive',
          `${formatLocalDate()}-${changeName}`,
          'private'
        );
        expect(modeDuringCopy).toBe(0o700);
        expect((await fs.stat(archivedPrivate)).mode & 0o777).toBe(0o700);
        expect((await fs.stat(path.join(archivedPrivate, 'tool.sh'))).mode & 0o777).toBe(
          0o755
        );
      }
    );

    it.skipIf(process.platform === 'win32')(
      'uses a short staging name for a long change during fallback',
      async () => {
        const prefix = `${formatLocalDate()}-`;
        const changeName = prefix + 'x'.repeat(220 - Buffer.byteLength(prefix));
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        await fs.mkdir(changeDir, { recursive: true });
        await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Complete\n');

        const realRename = fs.rename.bind(fs);
        onTestFinished(() => vi.restoreAllMocks());
        vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
          if (
            String(source).endsWith(
              `${path.sep}openspec${path.sep}changes${path.sep}${changeName}`
            ) &&
            String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
          ) {
            throw Object.assign(new Error('cross-device move'), { code: 'EXDEV' });
          }
          return realRename(source, destination);
        });

        await archiveCommand.execute(changeName, { yes: true, skipSpecs: true });

        await expect(
          fs.access(path.join(tempDir, 'openspec', 'changes', 'archive', changeName))
        ).resolves.not.toThrow();
      }
    );
    it('preserves symlinks during the cross-device archive fallback', async () => {
      if (process.platform === 'win32') return;

      const changeName = 'linked-notes';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const outsideFile = path.join(tempDir, 'private-notes.md');
      const linkedFile = path.join(changeDir, 'notes.md');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(outsideFile, 'do not copy me');
      await fs.symlink(outsideFile, linkedFile);

      const rename = vi.spyOn(fs, 'rename').mockRejectedValueOnce(
        Object.assign(new Error('cross-device move'), { code: 'EXDEV' })
      );
      try {
        await archiveCommand.execute(changeName, {
          yes: true,
          noValidate: true,
          skipSpecs: true,
        });
      } finally {
        rename.mockRestore();
      }

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const [archiveName] = await fs.readdir(archiveDir);
      const archivedLink = path.join(archiveDir, archiveName, 'notes.md');
      expect((await fs.lstat(archivedLink)).isSymbolicLink()).toBe(true);
      expect(await fs.readlink(archivedLink)).toBe(outsideFile);
    });

    it('preserves a linked directory during the cross-device archive fallback', async () => {
      const changeName = 'linked-directory';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const sharedDir = path.join(tempDir, 'shared-notes');
      const linkedDir = path.join(changeDir, 'notes');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.mkdir(sharedDir);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(path.join(sharedDir, 'readme.md'), 'shared');
      await fs.symlink(
        sharedDir,
        linkedDir,
        process.platform === 'win32' ? 'junction' : 'dir'
      );

      const rename = vi.spyOn(fs, 'rename').mockRejectedValueOnce(
        Object.assign(new Error('cross-device move'), { code: 'EXDEV' })
      );
      try {
        await archiveCommand.execute(changeName, {
          yes: true,
          noValidate: true,
          skipSpecs: true,
        });
      } finally {
        rename.mockRestore();
      }

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const [archiveName] = await fs.readdir(archiveDir);
      const archivedLink = path.join(archiveDir, archiveName, 'notes');
      expect((await fs.lstat(archivedLink)).isSymbolicLink()).toBe(true);
      await expect(fs.readFile(path.join(archivedLink, 'readme.md'), 'utf8')).resolves.toBe(
        'shared'
      );
    });

    it('rejects a linked change before the cross-device archive fallback', async () => {
      if (process.platform === 'win32') return;

      const changeName = 'linked-change';
      const realChangeDir = path.join(tempDir, 'shared-change');
      const linkedChangeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(realChangeDir);
      await fs.writeFile(path.join(realChangeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.symlink(realChangeDir, linkedChangeDir);

      await expect(
        archiveCommand.execute(changeName, {
          yes: true,
          noValidate: true,
          skipSpecs: true,
        })
      ).rejects.toMatchObject({
        diagnostic: { code: 'archive_change_symlink' },
      });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await expect(fs.readdir(archiveDir)).resolves.toHaveLength(0);
      expect((await fs.lstat(linkedChangeDir)).isSymbolicLink()).toBe(true);
      await expect(fs.readFile(path.join(realChangeDir, 'tasks.md'), 'utf8')).resolves.toContain(
        'Task 1'
      );
    });

    it('rejects a destination symlink introduced during the cross-device fallback', async () => {
      if (process.platform === 'win32') return;

      const changeName = 'raced-destination';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const outsideDir = path.join(tempDir, 'outside-archive');
      const sentinel = path.join(outsideDir, 'sentinel.txt');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.mkdir(outsideDir);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(sentinel, 'leave me alone');

      const rename = vi.spyOn(fs, 'rename').mockImplementationOnce(async (_src, dest) => {
        await fs.symlink(outsideDir, dest);
        throw Object.assign(new Error('cross-device move'), { code: 'EXDEV' });
      });
      try {
        await expect(
          archiveCommand.execute(changeName, {
            yes: true,
            noValidate: true,
            skipSpecs: true,
          })
        ).rejects.toMatchObject({
          diagnostic: { code: 'archive_target_exists' },
        });
      } finally {
        rename.mockRestore();
      }

      await expect(fs.readFile(sentinel, 'utf8')).resolves.toBe('leave me alone');
      await expect(fs.access(path.join(outsideDir, 'tasks.md'))).rejects.toThrow();
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('rejects a change name that escapes the changes directory', async () => {
      const outsideDir = path.join(tempDir, 'outside-change');
      await fs.mkdir(outsideDir, { recursive: true });
      await fs.writeFile(path.join(outsideDir, 'tasks.md'), '- [x] Task 1\n');

      await expect(
        archiveCommand.execute('../../outside-change', {
          yes: true,
          noValidate: true,
          skipSpecs: true,
        })
      ).rejects.toThrow(/must not contain path separators/u);
      await expect(fs.access(outsideDir)).resolves.not.toThrow();
    });

    it('rejects an archive directory symlink outside the OpenSpec root', async () => {
      if (process.platform === 'win32') return;

      const changeName = 'stay-inside';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const outsideDir = path.join(tempDir, 'outside-archive');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.rm(archiveDir, { recursive: true, force: true });
      await fs.mkdir(outsideDir);
      await fs.symlink(outsideDir, archiveDir);

      await expect(
        archiveCommand.execute(changeName, {
          yes: true,
          noValidate: true,
          skipSpecs: true,
        })
      ).rejects.toThrow(/outside the OpenSpec root/u);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      await expect(fs.readdir(outsideDir)).resolves.toEqual([]);
    });

    it('archives normally when the project root is reached through a symlink alias', async () => {
      if (process.platform === 'win32') return;

      const aliasPath = path.join(tempDir, 'project-alias');
      const changeName = 'aliased-root';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.symlink(tempDir, aliasPath);

      process.chdir(aliasPath);
      try {
        await archiveCommand.execute(changeName, {
          yes: true,
          noValidate: true,
          skipSpecs: true,
        });
      } finally {
        process.chdir(tempDir);
      }

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await expect(fs.readdir(archiveDir)).resolves.toHaveLength(1);
    });

    it('should use the process local date across a UTC date boundary', async () => {
      process.env.TZ = 'Asia/Shanghai';
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-14T16:30:00.000Z'));

      const changeName = 'local-date-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true, noValidate: true, skipSpecs: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await expect(fs.readdir(archiveDir)).resolves.toEqual([`2026-07-15-${changeName}`]);
    });

    it('should preserve the date when UTC and local calendar dates match', async () => {
      process.env.TZ = 'Asia/Shanghai';
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-05T04:30:00.000Z'));

      const changeName = 'same-date-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true, noValidate: true, skipSpecs: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      await expect(fs.readdir(archiveDir)).resolves.toEqual([`2026-01-05-${changeName}`]);
    });

    it('keeps an existing YYYY-MM-DD- prefix instead of stacking a new one (#1309)', async () => {
      const changeName = '2026-07-04-voice-copilot-v1';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1');

      await archiveCommand.execute(changeName, { yes: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);

      // Archived under its own name: no second date prefix, and the folder
      // keeps sorting under the change's own day even when archived later.
      expect(archives).toEqual([changeName]);
      await expect(fs.access(changeDir)).rejects.toThrow();
    });

    it('still adds the date prefix when a name only starts with a partial date', async () => {
      const changeName = '2026-07-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1');

      await archiveCommand.execute(changeName, { yes: true });

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);

      // `2026-07-` is not a full YYYY-MM-DD- prefix, so the name is dated
      // as usual. Asserted as a pattern rather than an exact date to avoid
      // a UTC-midnight race between execute() and the expectation.
      expect(archives.length).toBe(1);
      expect(archives[0]).toMatch(new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${changeName}$`));
    });

    it('should warn about incomplete tasks', async () => {
      const changeName = 'incomplete-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with incomplete tasks
      const tasksContent = '- [x] Task 1\n- [ ] Task 2\n- [ ] Task 3';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Execute archive with --yes flag
      await archiveCommand.execute(changeName, { yes: true });
      
      // Verify warning was logged
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: 2 incomplete task(s) found')
      );
    });

    it('detects incomplete tasks in nested glob tasks.md files (#1202 data-safety gate)', async () => {
      // Before the fix the gate read a fixed changes/<name>/tasks.md, saw zero
      // tasks for a glob-tasks change, and let an unfinished change archive.
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'glob-tasks');
      await fs.mkdir(schemaDir, { recursive: true });
      await fs.writeFile(
        path.join(schemaDir, 'schema.yaml'),
        [
          'name: glob-tasks',
          'version: 1',
          'artifacts:',
          '  - id: proposal',
          '    generates: proposal.md',
          '    description: Proposal',
          '    template: proposal.md',
          '    requires: []',
          '  - id: tasks',
          '    generates: "**/tasks.md"',
          '    description: Nested tasks',
          '    template: tasks.md',
          '    requires: [proposal]',
          'apply:',
          '  requires: [tasks]',
          '  tracks: "**/tasks.md"',
          '',
        ].join('\n')
      );

      const changeName = 'glob-incomplete-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(path.join(changeDir, 'backend'), { recursive: true });
      await fs.mkdir(path.join(changeDir, 'frontend'), { recursive: true });
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: glob-tasks\n');
      await fs.writeFile(path.join(changeDir, 'backend', 'tasks.md'), '- [x] 1.1 a\n- [x] 1.2 b\n');
      await fs.writeFile(path.join(changeDir, 'frontend', 'tasks.md'), '- [x] 2.1 a\n- [ ] 2.2 b\n- [ ] 2.3 c\n');

      await archiveCommand.execute(changeName, { yes: true, noValidate: true, skipSpecs: true });

      // The gate now sees 5 tasks / 2 incomplete across the nested files.
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('2 incomplete task(s) found')
      );
    });

    it('detects incomplete indented sub-tasks (#1485 data-safety gate)', async () => {
      // Before the fix the gate only saw checkboxes at column 0, so a change
      // whose sub-tasks were unfinished archived with no warning at all.
      const changeName = 'nested-subtasks-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        [
          '## 1. Implementation',
          '- [x] 1.1 Parent task',
          '  - [ ] 1.1.1 Unfinished sub-task',
          '  - [ ] 1.1.2 Another unfinished sub-task',
          '- [x] 1.2 Second parent',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: 2 incomplete task(s) found')
      );
    });

    it('should update specs when archiving (delta-based ADDED) and include change name in skeleton', async () => {
      const changeName = 'spec-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create delta-based change spec (ADDED requirement)
      const specContent = `# Test Capability Spec - Changes

## ADDED Requirements

### Requirement: The system SHALL provide test capability

#### Scenario: Basic test
Given a test condition
When an action occurs
Then expected result happens`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive with --yes flag and skip validation for speed
      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      
      // Verify spec was created from skeleton and ADDED requirement applied
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'test-capability', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain('# test-capability Specification');
      expect(updatedContent).toContain('## Purpose');
      expect(updatedContent).toContain(`created by archiving change ${changeName}`);
      expect(updatedContent).toContain('## Requirements');
      expect(updatedContent).toContain('### Requirement: The system SHALL provide test capability');
      expect(updatedContent).toContain('#### Scenario: Basic test');
    });

    it('should archive when ADDED requirements were already synced to the baseline (issue #1332)', async () => {
      const changeName = 'early-synced-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const requirementBlock = `### Requirement: The system SHALL provide a core abstraction layer

#### Scenario: Layer is available
- **WHEN** a consumer imports the layer
- **THEN** the abstraction is available`;

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## ADDED Requirements\n\n${requirementBlock}`
      );

      // Simulate the early-sync pattern: the requirement is already in the
      // main spec (identical content) before archive runs.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n${requirementBlock}\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Archive succeeds and the main spec keeps the requirement exactly once
      const updatedContent = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      const occurrences = updatedContent.split('### Requirement: The system SHALL provide a core abstraction layer').length - 1;
      expect(occurrences).toBe(1);

      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it('should still abort ADDED when an existing requirement has different content', async () => {
      const changeName = 'conflicting-added-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## ADDED Requirements\n\n### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: New behavior\n- **WHEN** a consumer imports the layer\n- **THEN** the new abstraction is available`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: Old behavior\n- **WHEN** a consumer imports the layer\n- **THEN** the old abstraction is available\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Genuine conflict: archive aborts, nothing moves, main spec untouched
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('ADDED failed for header "### Requirement: The system SHALL provide a core abstraction layer" - already exists')
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.access(changeDir)).resolves.toBeUndefined();
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should archive when RENAMED requirements were already synced to the baseline', async () => {
      const changeName = 'early-synced-rename';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## RENAMED Requirements\n\n- FROM: \`### Requirement: The system SHALL provide an abstraction layer\`\n- TO: \`### Requirement: The system SHALL provide a core abstraction layer\`\n`
      );

      // Early-sync pattern: the main spec already carries the new header.
      const renamedBlock = `### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: Layer is available\n- **WHEN** a consumer imports the layer\n- **THEN** the abstraction is available`;
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n${renamedBlock}\n`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      const occurrences = updatedContent.split('### Requirement: The system SHALL provide a core abstraction layer').length - 1;
      expect(occurrences).toBe(1);
      expect(updatedContent).not.toContain('SHALL provide an abstraction layer');

      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it('should still abort RENAMED when neither the old nor the new header exists', async () => {
      const changeName = 'broken-rename';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## RENAMED Requirements\n\n- FROM: \`### Requirement: A requirement that never existed\`\n- TO: \`### Requirement: A new name that also does not exist\`\n`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: Layer is available\n- **WHEN** a consumer imports the layer\n- **THEN** the abstraction is available\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('RENAMED failed for header "### Requirement: A requirement that never existed" - source not found')
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.access(changeDir)).resolves.toBeUndefined();
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should abort when REMOVED names the FROM side of a RENAMED in the same delta', async () => {
      // Contradictory delta: you cannot both rename and remove the same
      // requirement. This used to fail incidentally at apply time (the rename
      // consumed the old header, so REMOVED hit "not found"); now that a
      // missing REMOVED target is treated as already synced, the conflict has
      // to be rejected explicitly.
      const changeName = 'rename-and-remove';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## RENAMED Requirements\n\n- FROM: \`### Requirement: Old name\`\n- TO: \`### Requirement: New name\`\n\n## REMOVED Requirements\n\n### Requirement: Old name\n`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n### Requirement: Old name\n\n#### Scenario: Works\n- **WHEN** it runs\n- **THEN** it works\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('requirement present in multiple sections (RENAMED and REMOVED) for header "### Requirement: Old name"')
      );
      expect(process.exitCode).toBe(1);
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should abort when REMOVED spells the renamed FROM header with different case', async () => {
      const changeName = 'rename-and-remove-case';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## RENAMED Requirements\n\n- FROM: \`### Requirement: Old Name\`\n- TO: \`### Requirement: New Name\`\n\n## REMOVED Requirements\n\n### Requirement: old name\n`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n### Requirement: Old Name\n\n#### Scenario: Works\n- **WHEN** it runs\n- **THEN** it works\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('requirement present in multiple sections (RENAMED and REMOVED) for header "### Requirement: Old Name" (REMOVED spells it "old name")')
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should archive when REMOVED requirements were already synced to the baseline', async () => {
      const changeName = 'early-synced-removal';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## REMOVED Requirements\n\n### Requirement: The system SHALL provide a legacy layer\n**Reason**: Replaced by the core abstraction layer.\n`
      );

      // Early-sync pattern: the requirement was already removed from the main spec.
      const keptBlock = `### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: Layer is available\n- **WHEN** a consumer imports the layer\n- **THEN** the abstraction is available`;
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n${keptBlock}\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Archive succeeds with a warning instead of aborting
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('REMOVED requirement "The system SHALL provide a legacy layer" is not in the current spec')
      );
      // The skipped removal is not reported as applied
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('- 1 removed'));
      // A no-op update must not churn the file with normalization differences
      const updatedContent = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updatedContent).toBe(mainSpecContent);
      // ...and must not claim an update happened
      expect(console.log).toHaveBeenCalledWith('Specs already in sync; no files changed.');
      expect(console.log).not.toHaveBeenCalledWith('Specs updated successfully.');

      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it('should archive when MODIFIED requirements were already synced to the baseline', async () => {
      const changeName = 'early-synced-modify';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'mod-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const block = `### Requirement: Session handling\nThe system SHALL keep sessions.\n\n#### Scenario: Session persists\n- **WHEN** a user returns\n- **THEN** the session is restored`;
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Mod Layer - Changes\n\n## MODIFIED Requirements\n\n${block}\n`
      );

      // Early-sync pattern: the modification is already applied to main.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'mod-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# mod-layer Specification\n\n## Purpose\nSession layer behavior.\n\n## Requirements\n\n${block}\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // An identical MODIFIED block is a no-op: no churned rewrite, no
      // claimed update, no "~ 1 modified" in the totals.
      const updatedContent = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updatedContent).toBe(mainSpecContent);
      expect(console.log).toHaveBeenCalledWith('Specs already in sync; no files changed.');
      expect(console.log).not.toHaveBeenCalledWith('Specs updated successfully.');

      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it('should abort an already-synced RENAMED when a case variant of the source still exists', async () => {
      // FROM missing + TO present normally means the rename was early-synced,
      // but a fold-variant of FROM still in the spec means the header is a
      // typo - the same near-miss guard REMOVED applies.
      const changeName = 'typo-rename';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'rename-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Rename Layer - Changes\n\n## RENAMED Requirements\n- FROM: \`### Requirement: cache policy\`\n- TO: \`### Requirement: Eviction policy\`\n`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'rename-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# rename-layer Specification\n\n## Purpose\nCache behavior.\n\n## Requirements\n\n### Requirement: Cache Policy\nThe system SHALL cache.\n\n#### Scenario: Cached\n- **WHEN** data repeats\n- **THEN** it is served from cache\n\n### Requirement: Eviction policy\nThe system SHALL evict.\n\n#### Scenario: Evicted\n- **WHEN** the cache is full\n- **THEN** old entries are dropped\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('RENAMED failed for header "### Requirement: cache policy" - source not found, but "### Requirement: Cache Policy" exists')
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should abort when a REMOVED header near-misses an existing requirement (case/whitespace typo)', async () => {
      // A fold-insensitive match in the current spec means the header is a
      // typo, not an early-synced removal - that case must stay a hard abort.
      const changeName = 'typo-removal';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## REMOVED Requirements\n\n### Requirement: legacy layer\n**Reason**: Replaced.\n`
      );

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecContent = `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n### Requirement: Legacy Layer\n\n#### Scenario: Works\n- **WHEN** it runs\n- **THEN** it works\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpecContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('REMOVED failed for header "### Requirement: legacy layer" - not found, but "### Requirement: Legacy Layer" exists')
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      const untouched = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(untouched).toBe(mainSpecContent);
    });

    it('should surface the skipped REMOVED as a warning in --json output', async () => {
      const changeName = 'early-synced-removal-json';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(changeSpecDir, { recursive: true });

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Core Layer - Changes\n\n## REMOVED Requirements\n\n### Requirement: The system SHALL provide a legacy layer\n**Reason**: Replaced.\n`
      );

      const keptBlock = `### Requirement: The system SHALL provide a core abstraction layer\n\n#### Scenario: Layer is available\n- **WHEN** a consumer imports the layer\n- **THEN** the abstraction is available`;
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'core-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# core-layer Specification\n\n## Purpose\nCore abstraction layer.\n\n## Requirements\n\n${keptBlock}\n`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true, json: true });

      expect(process.exitCode).toBeUndefined();
      const logCalls = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().map(String);
      const jsonLine = logCalls.find((entry) => entry.trimStart().startsWith('{'));
      expect(jsonLine).toBeDefined();
      const parsed = JSON.parse(jsonLine!);
      expect(parsed.archive.totals.removed).toBe(0);
      // No file was written, so the result must not claim an update
      expect(parsed.archive.specsUpdated).toBe(false);
      // The silent path must not swallow the skip: agents reading JSON get
      // the same signal humans get on stdout.
      expect(parsed.archive.warnings).toEqual([
        expect.stringContaining('REMOVED requirement "The system SHALL provide a legacy layer" is not in the current spec'),
      ]);
    });

    it('should merge nested delta specs into the same relative path (#1353)', async () => {
      const changeName = 'nested-spec-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const nestedSpecDir = path.join(changeDir, 'specs', 'platform', 'example-capability');
      await fs.mkdir(nestedSpecDir, { recursive: true });

      const specContent = `# Nested Capability - Changes

## ADDED Requirements

### Requirement: Nested capability works
The system SHALL discover capabilities stored below namespace directories.

#### Scenario: Validate nested delta
- **WHEN** the user validates the change
- **THEN** OpenSpec detects the nested capability`;
      await fs.writeFile(path.join(nestedSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Delta merged into the same nested path under the main specs directory
      const mainSpecPath = path.join(
        tempDir,
        'openspec',
        'specs',
        'platform',
        'example-capability',
        'spec.md'
      );
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain('### Requirement: Nested capability works');
      expect(updatedContent).toContain('#### Scenario: Validate nested delta');

      // Change directory moved to archive with the nested delta preserved
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
      const archivedDelta = path.join(
        archiveDir,
        archives[0],
        'specs',
        'platform',
        'example-capability',
        'spec.md'
      );
      await expect(fs.access(archivedDelta)).resolves.toBeUndefined();
    });

    it('should allow REMOVED requirements when creating new spec file (issue #403)', async () => {
      const changeName = 'new-spec-with-removed';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'gift-card');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create delta spec with both ADDED and REMOVED requirements
      // This simulates refactoring where old fields are removed and new ones are added
      const specContent = `# Gift Card - Changes

## ADDED Requirements

### Requirement: Logo and Background Color
The system SHALL support logo and backgroundColor fields for gift cards.

#### Scenario: Display gift card with logo
- **WHEN** a gift card is displayed
- **THEN** it shows the logo and backgroundColor

## REMOVED Requirements

### Requirement: Image Field
### Requirement: Thumbnail Field`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive - should succeed with warning about REMOVED requirements
      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      
      // Verify warning was logged about REMOVED requirements being ignored
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: gift-card - 2 REMOVED requirement(s) ignored for new spec (nothing to remove).')
      );

      // The ignored removals are not reported as applied
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('- 2 removed'));
      
      // Verify spec was created with only ADDED requirements
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'gift-card', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain('# gift-card Specification');
      expect(updatedContent).toContain('### Requirement: Logo and Background Color');
      expect(updatedContent).toContain('#### Scenario: Display gift card with logo');
      // REMOVED requirements should not be in the final spec
      expect(updatedContent).not.toContain('### Requirement: Image Field');
      expect(updatedContent).not.toContain('### Requirement: Thumbnail Field');
      
      // Verify change was archived successfully
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBeGreaterThan(0);
      expect(archives.some(a => a.includes(changeName))).toBe(true);
    });

    it('should carry the delta Purpose into a new main spec (issue #1413)', async () => {
      const changeName = 'new-spec-with-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'loyalty');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## Purpose

Tracks loyalty points earned and redeemed across the storefront.

## ADDED Requirements

### Requirement: Earn Points
The system SHALL award loyalty points on each completed order.

#### Scenario: Order completes
- **WHEN** an order completes
- **THEN** points are credited to the customer
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'loyalty', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain('Tracks loyalty points earned and redeemed across the storefront.');
      expect(updatedContent).not.toContain('TBD - created by archiving change');
      expect(updatedContent).toContain('### Requirement: Earn Points');
    });

    it('should keep fenced code inside a real delta Purpose (issue #1413)', async () => {
      const changeName = 'new-spec-with-fenced-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'config-format');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## Purpose

Normalizes config files. The canonical shape is:

\`\`\`yaml
retries: 3
\`\`\`

## ADDED Requirements

### Requirement: Normalize Config
The system SHALL normalize config files on load.

#### Scenario: Config normalized
- **WHEN** a config file is loaded
- **THEN** it is normalized to the canonical shape
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'config-format', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain('Normalizes config files. The canonical shape is:');
      // The fenced example is part of the authored Purpose - masking fenced
      // lines out of the body would silently truncate it.
      expect(updatedContent).toContain('retries: 3');
      expect(updatedContent).not.toContain('TBD - created by archiving change');
    });

    it('should keep the TBD Purpose placeholder when the delta has no Purpose (issue #1413)', async () => {
      const changeName = 'new-spec-without-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'referrals');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## ADDED Requirements

### Requirement: Send Invite
The system SHALL send a referral invite.

#### Scenario: Invite sent
- **WHEN** a customer refers a friend
- **THEN** an invite email is sent
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'referrals', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
    });

    it('should keep the TBD placeholder when the only Purpose header is inside a code fence (issue #1413)', async () => {
      const changeName = 'new-spec-with-fenced-header';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'payouts');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## ADDED Requirements

### Requirement: Send Payout
The system SHALL send a payout. A main spec looks like:

\`\`\`markdown
## Purpose
Illustration only - not this capability's purpose.
\`\`\`

#### Scenario: Payout sent
- **WHEN** a payout is due
- **THEN** it is sent
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'payouts', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      expect(updatedContent).not.toContain("Illustration only - not this capability's purpose.\n## Requirements");
    });

    it('should keep the TBD placeholder when the delta Purpose section is empty (issue #1413)', async () => {
      const changeName = 'new-spec-with-empty-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'notifications');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## Purpose

## ADDED Requirements

### Requirement: Send Notification
The system SHALL send a notification.

#### Scenario: Notification sent
- **WHEN** an event fires
- **THEN** a notification is sent
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'notifications', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
    });

    it('should fall back to the placeholder when the delta Purpose hides a requirement header (issue #1413)', async () => {
      const changeName = 'new-spec-with-stray-header-in-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'widgets');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // A delta an agent can plausibly emit. Carrying this Purpose verbatim
      // would put a requirement header outside ## Requirements and abort the
      // archive - which succeeded before the Purpose carry-over existed.
      const specContent = `## Purpose

Handles widgets.

### Requirement: Stray header

## ADDED Requirements

### Requirement: Real Requirement
The system SHALL handle widgets.

#### Scenario: Widget handled
- **WHEN** a widget arrives
- **THEN** it is handled
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'widgets', 'spec.md');
      const updatedContent = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      expect(updatedContent).not.toContain('### Requirement: Stray header');
      expect(updatedContent).toContain('### Requirement: Real Requirement');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Warning: widgets - delta Purpose ignored (it would leave the new spec unreadable)')
      );

      // The archive still completed rather than aborting.
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
    });

    it('should fall back to the placeholder when the delta Purpose contains a heading (issue #1413)', async () => {
      const changeName = 'new-spec-with-heading-in-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'gadgets');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // An `#` heading truncates the Purpose section when the spec is read back,
      // leaving a spec whose own validator rejects it for having no Purpose.
      const specContent = `## Purpose

# Not a spec title
Some body text that is comfortably longer than the strict-mode minimum length.

## ADDED Requirements

### Requirement: Handle Gadget
The system SHALL handle gadgets.

#### Scenario: Gadget handled
- **WHEN** a gadget arrives
- **THEN** it is handled
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'gadgets', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      expect(updatedContent).not.toContain('# Not a spec title');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('gadgets - delta Purpose ignored')
      );
      // The rebuilt spec must still satisfy the validator archive itself runs.
      const report = await new Validator().validateSpecContent('gadgets', updatedContent);
      expect(report.issues.filter(i => i.level === 'ERROR')).toHaveLength(0);
    });

    it('should fall back to the placeholder when the delta Purpose has an unterminated fence (issue #1413)', async () => {
      const changeName = 'new-spec-with-unterminated-fence';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'mesh-config');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // The open fence masks everything after it, so the Purpose body would
      // swallow the skeleton's own ## Requirements header.
      const specContent = `## ADDED Requirements

### Requirement: Normalize Mesh Config
The system SHALL normalize mesh config.

#### Scenario: Config normalized
- **WHEN** config is loaded
- **THEN** it is normalized

## Purpose

Normalizes configuration for every service in the mesh. Canonical shape:

\`\`\`yaml
retries: 3
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'mesh-config', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      // Exactly one Requirements section, and the requirement is still visible.
      expect(updatedContent.match(/^## Requirements$/gm)).toHaveLength(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('mesh-config - delta Purpose ignored')
      );
      const report = await new Validator().validateSpecContent('mesh-config', updatedContent);
      expect(report.issues.filter(i => i.level === 'ERROR')).toHaveLength(0);
    });

    it('should ignore a commented-out Purpose in favor of the real one (issue #1413)', async () => {
      const changeName = 'new-spec-with-commented-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'loyalty-v2');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `<!--
## Purpose
Draft purpose the author commented out while rewriting the section.
-->

## Purpose

Manages the loyalty program end to end across the storefront and admin console.

## ADDED Requirements

### Requirement: Earn Points
The system SHALL award loyalty points.

#### Scenario: Points earned
- **WHEN** an order completes
- **THEN** points are credited
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'loyalty-v2', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('Manages the loyalty program end to end');
      expect(updatedContent).not.toContain('Draft purpose the author commented out');
      expect(updatedContent).not.toContain('-->');
    });

    it.each([
      [
        'a section header hidden in a comment',
        'requirements-hidden-in-comment',
        'hidden-reqs',
        `## Purpose
Tracks widgets and keeps their state consistent across restarts.
<!-- TODO(author): promote the list below to
## Requirements
so the sections line up. -->
Widgets are the core unit of work.
`,
      ],
      [
        'a requirement header hidden in a comment',
        'requirement-header-in-comment',
        'hidden-req-header',
        `## Purpose
Tracks widgets and keeps their state consistent across restarts.
<!--
## Requirements
### Requirement: Draft idea we did not ship
-->
`,
      ],
      [
        'an unterminated comment',
        'unterminated-comment',
        'dangling-comment',
        `## Purpose
Tracks widgets and keeps their state consistent across restarts.
<!-- TODO: expand once the widget team confirms the retention policy.
`,
      ],
      [
        'a comment closed with the --!> terminator',
        'bang-terminated-comment',
        'bang-comment',
        `## Purpose
Tracks widgets and keeps their state consistent across restarts.
<!-- TODO(author): promote the list below to
## Requirements
so the sections line up. --!>
`,
      ],
    ])(
      'should fall back to the placeholder when the delta Purpose has %s (issue #1413)',
      async (_label, changeName, specFolder, purposeBlock) => {
        const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', specFolder);
        await fs.mkdir(changeSpecDir, { recursive: true });

        await fs.writeFile(
          path.join(changeSpecDir, 'spec.md'),
          `${purposeBlock}
## ADDED Requirements

### Requirement: Widget Tracking
The system SHALL track widgets.

#### Scenario: Widget tracked
- **WHEN** a widget is created
- **THEN** it is tracked
`
        );

        await archiveCommand.execute(changeName, { yes: true, noValidate: true });

        const updatedContent = await fs.readFile(
          path.join(tempDir, 'openspec', 'specs', specFolder, 'spec.md'),
          'utf-8'
        );
        // Markdown hidden in a comment is skipped by the section scan but still
        // lands in the file, where it can hide the headers the parsers rely on
        // and blank the document out in a markdown renderer.
        expect(updatedContent).toContain(
          `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
        );
        expect(updatedContent).not.toContain('<!--');
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(`${specFolder} - delta Purpose ignored`)
        );
        expect(updatedContent.match(/^## Requirements$/gm)).toHaveLength(1);
        const report = await new Validator().validateSpecContent(specFolder, updatedContent);
        expect(report.issues.filter(i => i.level === 'ERROR')).toHaveLength(0);
      }
    );

    it.each([
      ['closed', '-->'],
      ['unterminated', ''],
    ])(
      'should not read a Purpose out of a %s comment that opens above the header (issue #1413)',
      async (label, terminator) => {
        const changeName = `commented-out-purpose-${label}`;
        const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', `co-${label}`);
        await fs.mkdir(changeSpecDir, { recursive: true });

        // An unterminated comment runs to end of file, so the header below it is
        // commented out just as surely as it is inside a closed comment.
        await fs.writeFile(
          path.join(changeSpecDir, 'spec.md'),
          `<!-- Draft the author commented out

## Purpose

Old abandoned purpose text that must not become the capability's Purpose.
${terminator}

## ADDED Requirements

### Requirement: Route Events
The system SHALL route events.

#### Scenario: Event routed
- **WHEN** an event arrives
- **THEN** it is routed
`
        );

        await archiveCommand.execute(changeName, { yes: true, noValidate: true });

        const updatedContent = await fs.readFile(
          path.join(tempDir, 'openspec', 'specs', `co-${label}`, 'spec.md'),
          'utf-8'
        );
        expect(updatedContent).toContain(
          `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
        );
        expect(updatedContent).not.toContain('Old abandoned purpose text');
        const report = await new Validator().validateSpecContent(`co-${label}`, updatedContent);
        expect(report.issues.filter(i => i.level === 'ERROR')).toHaveLength(0);
      }
    );

    it('should carry a Purpose containing arrow notation (issue #1413)', async () => {
      const changeName = 'new-spec-with-arrow-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'pipeline');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // `-->` is not a comment opener; it renders as text and hides nothing, so
      // it must not be mistaken for the HTML-comment hazard.
      const specContent = `## Purpose

Routes events through the pipeline: ingest --> transform --> sink, retrying each hop.

## ADDED Requirements

### Requirement: Route Events
The system SHALL route events through the pipeline.

#### Scenario: Event routed
- **WHEN** an event arrives
- **THEN** it is routed
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'pipeline', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain('ingest --> transform --> sink');
      expect(updatedContent).not.toContain('TBD - created by archiving change');
    });

    it('should keep the TBD placeholder when the delta Purpose is only a code fence (issue #1413)', async () => {
      const changeName = 'new-spec-with-fenced-only-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'fenced-only');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // A code sample is not a description of the capability, so it counts as
      // an absent Purpose rather than one worth carrying.
      const specContent = `## Purpose

\`\`\`yaml
retries: 3
\`\`\`

## ADDED Requirements

### Requirement: Retry Requests
The system SHALL retry failed requests.

#### Scenario: Request retried
- **WHEN** a request fails
- **THEN** it is retried
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'fenced-only', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      expect(updatedContent).not.toContain('retries: 3');
    });

    it('should end the Purpose at the next heading outside a code fence (issue #1413)', async () => {
      const changeName = 'new-spec-with-fenced-heading';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'fenced-heading');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // The fenced `## Requirements` must not be mistaken for the end of the
      // Purpose section, nor for a real section once the spec is written.
      const specContent = `## Purpose

Documents the main spec shape for readers. A main spec looks like:

\`\`\`markdown
## Requirements

### Requirement: Illustrative Only
\`\`\`

## ADDED Requirements

### Requirement: Real Requirement
The system SHALL do the real thing.

#### Scenario: Real thing done
- **WHEN** asked
- **THEN** done
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'fenced-heading', 'spec.md'),
        'utf-8'
      );
      // The whole fenced sample stays inside Purpose...
      expect(updatedContent).toContain('Documents the main spec shape for readers.');
      expect(updatedContent).toContain('### Requirement: Illustrative Only');
      // ...and none of it is read as real structure.
      expect(findMainSpecStructureIssues(updatedContent)).toHaveLength(0);
      const spec = new MarkdownParser(updatedContent).parseSpec('fenced-heading');
      expect(spec.requirements).toHaveLength(1);
    });

    it('should keep the placeholder when the delta Purpose is only an HTML comment (issue #1413)', async () => {
      const changeName = 'new-spec-with-unfilled-template';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'unfilled');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // This is the shipped delta template left unfilled.
      const specContent = `## Purpose
<!-- New capabilities only: one or two sentences on what this capability is for. -->

## ADDED Requirements

### Requirement: Do Thing
The system SHALL do the thing.

#### Scenario: Thing done
- **WHEN** asked
- **THEN** done
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'unfilled', 'spec.md'),
        'utf-8'
      );
      expect(updatedContent).toContain(
        `TBD - created by archiving change ${changeName}. Update Purpose after archive.`
      );
      expect(updatedContent).not.toContain('New capabilities only');
    });

    it('should warn when a carried Purpose is under the strict-mode minimum (issue #1413)', async () => {
      const changeName = 'new-spec-with-brief-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'points');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const specContent = `## Purpose

Tracks loyalty points.

## ADDED Requirements

### Requirement: Track Points
The system SHALL track points.

#### Scenario: Points tracked
- **WHEN** an order completes
- **THEN** points are tracked
`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(
        path.join(tempDir, 'openspec', 'specs', 'points', 'spec.md'),
        'utf-8'
      );
      // The author's words are kept - the warning exists so the strict-mode
      // failure is not a surprise later.
      expect(updatedContent).toContain('Tracks loyalty points.');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('carried Purpose is under 50 characters')
      );
    });

    it('should not overwrite the Purpose of an existing main spec (issue #1413)', async () => {
      const changeName = 'existing-spec-with-purpose';
      const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', 'billing');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'billing');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# billing Specification

## Purpose
The established purpose that must survive archiving.

## Requirements

### Requirement: Charge Card
The system SHALL charge the card on file.

#### Scenario: Card charged
- **WHEN** an invoice is due
- **THEN** the card is charged
`
      );

      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `## Purpose

A purpose written in the delta that must be ignored for an existing spec.

## ADDED Requirements

### Requirement: Refund Card
The system SHALL refund the card on file.

#### Scenario: Refund issued
- **WHEN** a refund is approved
- **THEN** the card is refunded
`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updatedContent = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updatedContent).toContain('The established purpose that must survive archiving.');
      expect(updatedContent).not.toContain('A purpose written in the delta that must be ignored');
      expect(updatedContent).toContain('### Requirement: Refund Card');
      // Dropping it silently would be indistinguishable from it having worked.
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('billing - delta Purpose ignored; billing already has one')
      );
    });

    it.each([
      [
        'the existing spec has no Purpose at all',
        'existing-spec-without-purpose',
        'no-purpose-yet',
        `# no-purpose-yet Specification

## Requirements

### Requirement: Old Thing
The system SHALL do the old thing.

#### Scenario: Old done
- **WHEN** asked
- **THEN** done
`,
      ],
      [
        'the existing Purpose is identical to the delta Purpose',
        'existing-spec-with-same-purpose',
        'same-purpose',
        `# same-purpose Specification

## Purpose
Shared purpose text that both files carry verbatim for this test case.

## Requirements

### Requirement: Old Thing
The system SHALL do the old thing.

#### Scenario: Old done
- **WHEN** asked
- **THEN** done
`,
      ],
    ])(
      'should not warn about an ignored delta Purpose when %s (issue #1413)',
      async (_label, changeName, specFolder, mainSpec) => {
        const changeSpecDir = path.join(tempDir, 'openspec', 'changes', changeName, 'specs', specFolder);
        await fs.mkdir(changeSpecDir, { recursive: true });
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', specFolder);
        await fs.mkdir(mainSpecDir, { recursive: true });
        await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec);

        await fs.writeFile(
          path.join(changeSpecDir, 'spec.md'),
          `## Purpose

Shared purpose text that both files carry verbatim for this test case.

## ADDED Requirements

### Requirement: New Thing
The system SHALL do the new thing.

#### Scenario: New done
- **WHEN** asked
- **THEN** done
`
        );

        await archiveCommand.execute(changeName, { yes: true, noValidate: true });

        // "already has one" is false when it has none, and noise when the two
        // bodies match.
        expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('already has one'));
      }
    );

    it('should still error on MODIFIED when creating new spec file', async () => {
      const changeName = 'new-spec-with-modified';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'new-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create delta spec with MODIFIED requirement (should fail for new spec)
      const specContent = `# New Capability - Changes

## ADDED Requirements

### Requirement: New Feature
New feature description.

## MODIFIED Requirements

### Requirement: Existing Feature
Modified content.`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive - should abort with error message (not throw, but log and return)
      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      
      // Verify error message mentions MODIFIED not allowed for new specs
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('new-capability: target spec does not exist; only ADDED requirements are allowed for new specs. MODIFIED and RENAMED operations require an existing spec.')
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');
      
      // Verify spec was NOT created
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'new-capability', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();
      
      // Verify change was NOT archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should still error on RENAMED when creating new spec file', async () => {
      const changeName = 'new-spec-with-renamed';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'another-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create delta spec with RENAMED requirement (should fail for new spec)
      const specContent = `# Another Capability - Changes

## ADDED Requirements

### Requirement: New Feature
New feature description.

## RENAMED Requirements
- FROM: \`### Requirement: Old Name\`
- TO: \`### Requirement: New Name\``;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive - should abort with error message (not throw, but log and return)
      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      
      // Verify error message mentions RENAMED not allowed for new specs
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('another-capability: target spec does not exist; only ADDED requirements are allowed for new specs. MODIFIED and RENAMED operations require an existing spec.')
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');
      
      // Verify spec was NOT created
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'another-capability', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();
      
      // Verify change was NOT archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should throw error if change does not exist', async () => {
      await expect(
        archiveCommand.execute('non-existent-change', { yes: true })
      ).rejects.toThrow("Change 'non-existent-change' not found.");
    });

    it('should throw error if archive already exists', async () => {
      const changeName = 'duplicate-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create existing archive with same date
      const date = formatLocalDate();
      const archivePath = path.join(tempDir, 'openspec', 'changes', 'archive', `${date}-${changeName}`);
      await fs.mkdir(archivePath, { recursive: true });
      
      // Try to archive
      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(`Archive '${date}-${changeName}' already exists.`);
    });

    it.skipIf(process.platform === 'win32')(
      'does not replace a dangling symlink at the archive destination',
      async () => {
        const changeName = 'dangling-archive-target';
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        await fs.mkdir(changeDir, { recursive: true });
        const archivePath = path.join(
          tempDir,
          'openspec',
          'changes',
          'archive',
          `${formatLocalDate()}-${changeName}`
        );
        await fs.symlink('missing-target', archivePath);

        await expect(
          archiveCommand.execute(changeName, { yes: true, skipSpecs: true })
        ).rejects.toThrow(/already exists/);

        expect((await fs.lstat(archivePath)).isSymbolicLink()).toBe(true);
        await expect(fs.readlink(archivePath)).resolves.toBe('missing-target');
        await expect(fs.access(changeDir)).resolves.not.toThrow();
      }
    );

    it.skipIf(process.platform === 'win32')(
      'archives a valid maximum-length date-prefixed change name',
      async () => {
        const prefix = `${formatLocalDate()}-`;
        const changeName = prefix + 'x'.repeat(251 - Buffer.byteLength(prefix));
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        await fs.mkdir(changeDir, { recursive: true });

        await archiveCommand.execute(changeName, { yes: true, skipSpecs: true });

        await expect(
          fs.access(path.join(tempDir, 'openspec', 'changes', 'archive', changeName))
        ).resolves.not.toThrow();
      }
    );

    it.skipIf(process.platform === 'win32')(
      'rejects an explicitly named symlinked active change',
      async () => {
        const changeName = 'symlinked-active-change';
        const realChange = path.join(tempDir, 'real-change');
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        await fs.mkdir(realChange, { recursive: true });
        await fs.symlink(realChange, changeDir, 'dir');

        await expect(
          archiveCommand.execute(changeName, { yes: true, skipSpecs: true })
        ).rejects.toThrow(/symbolic link/);

        expect((await fs.lstat(changeDir)).isSymbolicLink()).toBe(true);
        await expect(fs.access(realChange)).resolves.not.toThrow();
      }
    );

    it.skipIf(process.platform === 'win32')(
      'reports a symlinked active change as one JSON failure document',
      async () => {
        const changeName = 'symlinked-active-change-json';
        const realChange = path.join(tempDir, 'real-json-change');
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        await fs.mkdir(realChange, { recursive: true });
        await fs.symlink(realChange, changeDir, 'dir');

        await archiveCommand.execute(changeName, {
          json: true,
          yes: true,
          skipSpecs: true,
        });

        const calls = (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls).toHaveLength(1);
        const payload = JSON.parse(String(calls[0][0]));
        expect(payload.archive).toBeNull();
        expect(payload.status).toEqual([
          expect.objectContaining({
            severity: 'error',
            code: 'archive_change_symlink',
          }),
        ]);
        expect(process.exitCode).toBe(1);
        expect((await fs.lstat(changeDir)).isSymbolicLink()).toBe(true);
      }
    );

    it('gives safe recovery guidance for a stale archive claim', async () => {
      const changeName = 'stale-archive-claim';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      const archiveName = `${formatLocalDate()}-${changeName}`;
      const claimPath = archiveClaimPath(archiveName);
      await fs.writeFile(claimPath, JSON.stringify({ pid: 2_147_483_647 }));

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/remove the stale claim at .*\.openspec-archive\.lock/);

      await expect(fs.access(changeDir)).resolves.not.toThrow();
      await expect(fs.access(claimPath)).resolves.not.toThrow();
    });

    it('keeps an archive claim owned by a running process', async () => {
      const changeName = 'active-archive-claim';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      const archiveName = `${formatLocalDate()}-${changeName}`;
      const claimPath = archiveClaimPath(archiveName);
      await fs.writeFile(claimPath, JSON.stringify({ pid: process.pid }));

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/already being created/);

      await expect(fs.access(changeDir)).resolves.not.toThrow();
      await expect(fs.access(claimPath)).resolves.not.toThrow();
    });

    // Windows defers deletion of an open file until its original handle closes,
    // so unlink-and-recreate cannot model a persistent replacement there.
    it.skipIf(process.platform === 'win32')(
      'does not unlink a claim entry replaced by another process',
      async () => {
        const changeName = 'replaced-archive-claim';
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        await fs.mkdir(changeDir, { recursive: true });
        const archiveName = `${formatLocalDate()}-${changeName}`;
        const claimPath = archiveClaimPath(archiveName);
        const realRename = fs.rename.bind(fs);
        onTestFinished(() => vi.restoreAllMocks());
        let replaced = false;
        vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
          if (
            !replaced &&
            String(source).endsWith(`${path.sep}changes${path.sep}${changeName}`) &&
            String(destination).endsWith(`${path.sep}archive${path.sep}${archiveName}`)
          ) {
            replaced = true;
            await fs.unlink(claimPath);
            await fs.writeFile(claimPath, 'replacement claim\n');
          }
          return realRename(source, destination);
        });

        await archiveCommand.execute(changeName, { yes: true, skipSpecs: true });

        expect(replaced).toBe(true);
        await expect(fs.readFile(claimPath, 'utf-8')).resolves.toBe('replacement claim\n');
      }
    );

    it('should handle changes without tasks.md', async () => {
      const changeName = 'no-tasks-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Execute archive without tasks.md
      await archiveCommand.execute(changeName, { yes: true });
      
      // Should complete without warnings
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('incomplete task(s)')
      );
      
      // Verify change was archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
    });

    it('should handle changes without specs', async () => {
      const changeName = 'no-specs-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Execute archive without specs
      await archiveCommand.execute(changeName, { yes: true });
      
      // Should complete without spec updates
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Specs to update')
      );
      
      // Verify change was archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
    });

    it('should archive a skip_specs change with no spec files cleanly', async () => {
      const changeName = 'marked-refactor';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: spec-driven\nskip_specs: true\n'
      );

      await archiveCommand.execute(changeName, { yes: true });

      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(true);
      expect(process.exitCode).toBeUndefined();
    });

    it('should block archiving a skip_specs change that has files under specs/', async () => {
      const changeName = 'marked-with-stray-specs';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const strayDir = path.join(changeDir, 'specs', 'notes');
      await fs.mkdir(strayDir, { recursive: true });
      await fs.writeFile(path.join(strayDir, 'spec.md'), '# headerless notes\n');
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: spec-driven\nskip_specs: true\n'
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('skip_specs is set in .openspec.yaml but spec files exist under specs/')
      );
      expect(process.exitCode).toBe(1);
      // Change must not have moved.
      await expect(fs.access(changeDir)).resolves.toBeUndefined();
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should block archiving when skip_specs is set but the metadata is unhonorable', async () => {
      const changeName = 'marked-invalid-metadata';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      // skip_specs without the required schema field: validate rejects this
      // metadata, so archive must not accept the change either.
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'skip_specs: true\n');

      await archiveCommand.execute(changeName, { yes: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('skip_specs is set but .openspec.yaml is not valid change metadata')
      );
      expect(process.exitCode).toBe(1);
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should block archiving when skip_specs names an unknown schema', async () => {
      const changeName = 'marked-unknown-schema';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      // Well-shaped metadata naming a schema that does not resolve: status
      // rejects this metadata, so archive must not honor the marker and
      // bypass delta validation even though specs/ is empty.
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: does-not-exist\nskip_specs: true\n'
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('skip_specs is set but .openspec.yaml is not valid change metadata')
      );
      expect(process.exitCode).toBe(1);
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should block archiving when the metadata file exists but cannot be read', async () => {
      const changeName = 'metadata-as-directory';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      // .openspec.yaml as a directory: every metadata-reading surface errors
      // and the marker state cannot be determined, so archive must fail
      // closed into validation instead of treating the change as unmarked.
      await fs.mkdir(path.join(changeDir, '.openspec.yaml'), { recursive: true });

      await archiveCommand.execute(changeName, { yes: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('skip_specs is set but .openspec.yaml is not valid change metadata')
      );
      expect(process.exitCode).toBe(1);
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should skip spec updates when --skip-specs flag is used', async () => {
      const changeName = 'skip-specs-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create spec in change
      const specContent = '# Test Capability Spec\n\nTest content';
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Execute archive with --skip-specs flag and noValidate to skip validation
      await archiveCommand.execute(changeName, { yes: true, skipSpecs: true, noValidate: true });
      
      // Verify skip message was logged
      expect(console.log).toHaveBeenCalledWith(
        'Skipping spec updates (--skip-specs flag provided).'
      );
      
      // Verify spec was NOT copied to main specs
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'test-capability', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();
      
      // Verify change was still archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
      expect(archives[0]).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`));
    });

    it('should skip validation when commander sets validate to false (--no-validate)', async () => {
      const changeName = 'skip-validation-flag';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'unstable-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const deltaSpec = `# Unstable Capability

## ADDED Requirements

### Requirement: Logging Feature
**ID**: REQ-LOG-001

The system will log all events.

#### Scenario: Event recorded
- **WHEN** an event occurs
- **THEN** it is captured`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaSpec);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      const deltaSpy = vi.spyOn(Validator.prototype, 'validateChangeDeltaSpecs');
      const specContentSpy = vi.spyOn(Validator.prototype, 'validateSpecContent');

      try {
        await archiveCommand.execute(changeName, { yes: true, skipSpecs: true, validate: false });

        expect(deltaSpy).not.toHaveBeenCalled();
        expect(specContentSpy).not.toHaveBeenCalled();

        const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
        const archives = await fs.readdir(archiveDir);
        expect(archives.length).toBe(1);
        expect(archives[0]).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`));
      } finally {
        deltaSpy.mockRestore();
        specContentSpy.mockRestore();
      }
    });

    it('should proceed with archive when user declines spec updates', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      
      const changeName = 'decline-specs-feature';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'test-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });
      
      // Create valid spec in change
      const specContent = `# Test Capability Spec

## Purpose
This is a test capability specification.

## Requirements

### The system SHALL provide test capability

#### Scenario: Basic test
Given a test condition
When an action occurs
Then expected result happens`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      
      // Mock confirm to return false (decline spec updates)
      mockConfirm.mockResolvedValueOnce(false);
      
      // Execute archive without --yes flag
      await archiveCommand.execute(changeName);
      
      // Verify user was prompted about specs
      expect(mockConfirm).toHaveBeenCalledWith({
        message: 'Proceed with spec updates?',
        default: true
      });
      
      // Verify skip message was logged
      expect(console.log).toHaveBeenCalledWith(
        'Skipping spec updates. Proceeding with archive.'
      );
      
      // Verify spec was NOT copied to main specs
      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'test-capability', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();
      
      // Verify change was still archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.length).toBe(1);
      expect(archives[0]).toMatch(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`));
    });

    it('warns about absorbed content before asking to apply the destructive spec update', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      const changeName = 'warn-before-spec-update';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'demo');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'demo');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.mkdir(mainSpecDir, { recursive: true });

      const mainSpec = `# demo Specification

## Purpose
This capability exists to exercise archive warning behavior.

## Requirements

### Requirement: Target
The system SHALL target.

#### Scenario: Target works
- **WHEN** it runs
- **THEN** it works

   ### Notes
Keep this note.

### Requirement: Survivor
The system SHALL survive.

#### Scenario: Survivor works
- **WHEN** it runs
- **THEN** it survives
`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec);
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# demo - Changes

## REMOVED Requirements

### Requirement: Target
**Reason**: It is obsolete.
`
      );

      mockConfirm.mockReset();
      mockConfirm.mockImplementationOnce(async () => {
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('"### Notes" sits inside requirement "Target"')
        );
        return false;
      });

      await archiveCommand.execute(changeName);

      expect(mockConfirm).toHaveBeenCalledWith({
        message: 'Proceed with spec updates?',
        default: true,
      });
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(mainSpec);
      await expect(fs.access(changeDir)).rejects.toThrow();
    });

    it('does not apply a stale retirement decision when discarded content changes at the prompt', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      const changeName = 'retirement-changed-at-prompt';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const deltaDir = path.join(changeDir, 'specs', 'legacy-layer');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const target = path.join(mainSpecDir, 'spec.md');
      await fs.mkdir(deltaDir, { recursive: true });
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\nretire_capabilities: true\n');
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      await fs.writeFile(
        path.join(deltaDir, 'spec.md'),
        `## REMOVED Requirements

### Requirement: Legacy behavior
**Reason**: It is retired.
**Migration**: None.
`
      );
      await fs.writeFile(
        target,
        `# legacy-layer Specification

## Purpose
This capability preserves legacy behavior for existing consumers.

## Requirements

### Requirement: Legacy behavior
The system SHALL preserve legacy behavior.

#### Scenario: Legacy behavior applies
- **WHEN** legacy behavior is requested
- **THEN** it remains available
`
      );

      mockConfirm.mockReset();
      mockConfirm.mockImplementationOnce(async () => {
        const current = await fs.readFile(target, 'utf-8');
        await fs.writeFile(
          target,
          current.replace(
            '- **THEN** it remains available',
            '- **THEN** this concurrent edit remains available'
          )
        );
        return true;
      });

      await archiveCommand.execute(changeName);

      await expect(fs.readFile(target, 'utf-8')).resolves.toContain(
        '- **THEN** this concurrent edit remains available'
      );
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Spec inputs for 'legacy-layer' changed")
      );
    });

    it('does not use retirement authorization that changed at the prompt', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      const changeName = 'retirement-marker-changed-at-prompt';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const deltaDir = path.join(changeDir, 'specs', 'legacy-layer');
      await fs.mkdir(deltaDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: spec-driven\nretire_capabilities: true\n'
      );
      await fs.writeFile(
        path.join(deltaDir, 'spec.md'),
        `## REMOVED Requirements

### Requirement: Legacy behavior
**Reason**: It is retired.
**Migration**: None.
`
      );
      const target = path.join(
        tempDir,
        'openspec',
        'specs',
        'legacy-layer',
        'spec.md'
      );
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(
        target,
        `# legacy-layer Specification

## Purpose
This capability preserves legacy behavior for existing consumers.

## Requirements

### Requirement: Legacy behavior
The system SHALL preserve legacy behavior.

#### Scenario: Legacy behavior applies
- **WHEN** legacy behavior is requested
- **THEN** it remains available
`
      );

      mockConfirm.mockReset();
      mockConfirm.mockImplementationOnce(async () => {
        await fs.writeFile(
          path.join(changeDir, '.openspec.yaml'),
          'schema: spec-driven\nretire_capabilities: false\n'
        );
        return true;
      });

      await archiveCommand.execute(changeName);

      await expect(fs.access(target)).resolves.not.toThrow();
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('retirement authorization changed')
      );
    });

    it('prints the loss warning before --yes writes the spec', async () => {
      const changeName = 'warn-before-yes-write';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'demo');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'demo');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# demo Specification

## Purpose
This capability exists to exercise archive warning behavior.

## Requirements

### Requirement: Target
The system SHALL target.

#### Scenario: Target works
- **WHEN** it runs
- **THEN** it works

   ### Notes
Keep this note.

### Requirement: Survivor
The system SHALL survive.

#### Scenario: Survivor works
- **WHEN** it runs
- **THEN** it survives
`
      );
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# demo - Changes

## REMOVED Requirements

### Requirement: Target
**Reason**: It is obsolete.
`
      );

      await archiveCommand.execute(changeName, { yes: true });

      const output = (
        console.log as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls.flat().map(String);
      const warningIndex = output.findIndex((line) =>
        line.includes('"### Notes" sits inside requirement "Target"')
      );
      const successIndex = output.indexOf('Specs updated successfully.');
      expect(warningIndex).toBeGreaterThanOrEqual(0);
      expect(successIndex).toBeGreaterThan(warningIndex);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.not.toContain(
        'Keep this note.'
      );
      await expect(fs.access(changeDir)).rejects.toThrow();
    });

    it('should support header trim-only normalization for matching', async () => {
      const changeName = 'normalize-headers';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'alpha');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Create existing main spec with a requirement (no extra trailing spaces)
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'alpha');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainContent = `# alpha Specification

## Purpose
Alpha purpose.

## Requirements

### Requirement: Important Rule
Some details.`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainContent);

      // Change attempts to modify the same requirement but with trailing spaces after the name
      const deltaContent = `# Alpha - Changes

## MODIFIED Requirements

### Requirement: Important Rule   
Updated details.`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updated = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updated).toContain('### Requirement: Important Rule');
      expect(updated).toContain('Updated details.');
    });

    it('should apply operations in order: RENAMED → REMOVED → MODIFIED → ADDED', async () => {
      const changeName = 'apply-order';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'beta');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Main spec with two requirements A and B
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'beta');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainContent = `# beta Specification

## Purpose
Beta purpose.

## Requirements

### Requirement: A
content A

### Requirement: B
content B`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainContent);

      // Rename A->C, Remove B, Modify C, Add D
      const deltaContent = `# Beta - Changes

## RENAMED Requirements
- FROM: \`### Requirement: A\`
- TO: \`### Requirement: C\`

## REMOVED Requirements
### Requirement: B

## MODIFIED Requirements
### Requirement: C
updated C

## ADDED Requirements
### Requirement: D
content D`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updated = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updated).toContain('### Requirement: C');
      expect(updated).toContain('updated C');
      expect(updated).toContain('### Requirement: D');
      expect(updated).not.toContain('### Requirement: A');
      expect(updated).not.toContain('### Requirement: B');
    });

    it('should preserve source order and lineage when renaming requirements', async () => {
      const changeName = 'rename-order';
      const renamed = (pairs: Array<[string, string]>): string =>
        `## RENAMED Requirements\n\n${pairs
          .map(
            ([from, to]) =>
              `- FROM: \`### Requirement: ${from}\`\n- TO: \`### Requirement: ${to}\``
          )
          .join('\n\n')}`;
      const cases = [
        { capability: 'first', names: ['A', 'B', 'C'], delta: renamed([['A', 'A2']]), expected: ['A2', 'B', 'C'] },
        { capability: 'middle', names: ['A', 'B', 'C'], delta: renamed([['B', 'B2']]), expected: ['A', 'B2', 'C'] },
        { capability: 'last', names: ['A', 'B', 'C'], delta: renamed([['C', 'C2']]), expected: ['A', 'B', 'C2'] },
        {
          capability: 'multiple',
          names: ['A', 'B', 'C'],
          delta: renamed([['B', 'B2'], ['A', 'A2']]),
          expected: ['A2', 'B2', 'C'],
        },
        {
          capability: 'chained',
          names: ['X', 'A', 'Y'],
          delta: renamed([['A', 'B'], ['B', 'C']]),
          expected: ['X', 'C', 'Y'],
        },
        {
          capability: 'modified',
          names: ['A', 'B', 'C'],
          delta: `${renamed([['B', 'B2']])}\n\n## MODIFIED Requirements\n\n### Requirement: B2\nModified body.`,
          expected: ['A', 'B2', 'C'],
          expectedContent: '### Requirement: B2\nModified body.',
        },
        {
          capability: 'readded',
          names: ['X', 'A', 'Y'],
          delta: `${renamed([['A', 'B']])}\n\n## ADDED Requirements\n\n### Requirement: A\nNew body A.`,
          expected: ['X', 'B', 'Y', 'A'],
        },
        {
          capability: 'foreign-tail',
          names: ['A', 'B', 'C'],
          delta: renamed([['B', 'B2']]),
          expected: ['A', 'B2', 'C'],
          foreignTail: '### Notes\nAuthored note travels with B.',
          expectedContent: '### Requirement: B2\nBody B.\n\n### Notes\nAuthored note travels with B.',
        },
      ];

      for (const item of cases) {
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', item.capability);
        const changeSpecDir = path.join(
          tempDir,
          'openspec',
          'changes',
          changeName,
          'specs',
          item.capability
        );
        await fs.mkdir(mainSpecDir, { recursive: true });
        await fs.mkdir(changeSpecDir, { recursive: true });
        const blocks = item.names.map(
          (name) =>
            `### Requirement: ${name}\nBody ${name}.` +
            (name === 'B' && item.foreignTail ? `\n\n${item.foreignTail}` : '')
        );
        await fs.writeFile(
          path.join(mainSpecDir, 'spec.md'),
          `# ${item.capability} Specification\n\n## Purpose\nOrdering fixture.\n\n## Requirements\n\n${blocks.join('\n\n')}\n`
        );
        await fs.writeFile(
          path.join(changeSpecDir, 'spec.md'),
          `# ${item.capability} - Changes\n\n${item.delta}\n`
        );
      }

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      for (const item of cases) {
        const updated = await fs.readFile(
          path.join(tempDir, 'openspec', 'specs', item.capability, 'spec.md'),
          'utf-8'
        );
        const names = [...updated.matchAll(/^### Requirement:\s*(.+?)\s*$/gm)].map(
          (match) => match[1]
        );
        expect(names).toEqual(item.expected);
        if (item.expectedContent) expect(updated).toContain(item.expectedContent);
      }
      const output = (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls
        .flat()
        .map(String)
        .join('\n');
      expect(output).not.toContain('sits inside requirement "B"');
    });

    it('should keep the target and change untouched when a later rename collides', async () => {
      const changeName = 'late-rename-collision';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'demo');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'demo');
      const mainSpecPath = path.join(mainSpecDir, 'spec.md');
      const changeSpecPath = path.join(changeSpecDir, 'spec.md');
      const mainContent = `# demo Specification\n\n## Purpose\nTransaction fixture.\n\n## Requirements\n\n### Requirement: A\nBody A.\n\n### Requirement: B\nBody B.\n\n### Requirement: C\nBody C.\n`;
      const changeContent = `# demo - Changes\n\n## RENAMED Requirements\n\n- FROM: \`### Requirement: A\`\n- TO: \`### Requirement: A2\`\n\n- FROM: \`### Requirement: A2\`\n- TO: \`### Requirement: C\`\n`;
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(mainSpecPath, mainContent);
      await fs.writeFile(changeSpecPath, changeContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'RENAMED failed for header "### Requirement: C" - target already exists'
        )
      );
      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(mainSpecPath, 'utf-8')).resolves.toBe(mainContent);
      await expect(fs.readFile(changeSpecPath, 'utf-8')).resolves.toBe(changeContent);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives.some((entry) => entry.includes(changeName))).toBe(false);
    });

    it('should abort with error when MODIFIED references non-existent requirements', async () => {
      const changeName = 'validate-missing';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'gamma');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Main spec with no requirements
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'gamma');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainContent = `# gamma Specification

## Purpose
Gamma purpose.

## Requirements`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainContent);

      // Delta tries to modify a non-existent requirement
      const deltaContent = `# Gamma - Changes

## MODIFIED Requirements
### Requirement: Missing
new text`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Should not change the main spec and should not archive the change dir
      const still = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(still).toBe(mainContent);
      // Change dir should still exist since operation aborted
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('should abort stale MODIFIED blocks that would drop current scenarios (issue #1246)', async () => {
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'stale-modified');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecPath = path.join(mainSpecDir, 'spec.md');
      const baseSpec = `# stale-modified Specification

## Purpose
Stale modified purpose.

## Requirements

### Requirement: Shared Rule
The system SHALL support the shared rule.

#### Scenario: Existing behavior
- **WHEN** the original behavior runs
- **THEN** it succeeds`;
      await fs.writeFile(mainSpecPath, baseSpec);

      const changeA = 'modify-shared-a';
      const changeADir = path.join(tempDir, 'openspec', 'changes', changeA);
      const changeASpecDir = path.join(changeADir, 'specs', 'stale-modified');
      await fs.mkdir(changeASpecDir, { recursive: true });
      await fs.writeFile(path.join(changeASpecDir, 'spec.md'), `# Stale Modified - Change A

## MODIFIED Requirements

### Requirement: Shared Rule
The system SHALL support the shared rule.

#### Scenario: Existing behavior
- **WHEN** the original behavior runs
- **THEN** it succeeds

#### Scenario: Behavior from A
- **WHEN** change A behavior runs
- **THEN** it succeeds`);

      const changeB = 'modify-shared-b';
      const changeBDir = path.join(tempDir, 'openspec', 'changes', changeB);
      const changeBSpecDir = path.join(changeBDir, 'specs', 'stale-modified');
      await fs.mkdir(changeBSpecDir, { recursive: true });
      await fs.writeFile(path.join(changeBSpecDir, 'spec.md'), `# Stale Modified - Change B

## MODIFIED Requirements

### Requirement: Shared Rule
The system SHALL support the shared rule.

#### Scenario: Existing behavior
- **WHEN** the original behavior runs
- **THEN** it succeeds

#### Scenario: Behavior from B
- **WHEN** change B behavior runs
- **THEN** it succeeds`);

      await archiveCommand.execute(changeA, { yes: true, noValidate: true });
      await archiveCommand.execute(changeB, { yes: true, noValidate: true });

      const updated = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updated).toContain('#### Scenario: Existing behavior');
      expect(updated).toContain('#### Scenario: Behavior from A');
      expect(updated).not.toContain('#### Scenario: Behavior from B');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'stale-modified MODIFIED failed for header "### Requirement: Shared Rule" - current spec contains scenario(s) not present in the modified block: "Behavior from A"'
        )
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');

      await expect(fs.access(changeBDir)).resolves.not.toThrow();
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeA))).toBe(true);
      expect(archives.some(a => a.includes(changeB))).toBe(false);
    });

    it('should abort MODIFIED that drops a duplicate-named scenario (issue #1246 multiplicity)', async () => {
      // Residual blind spot after the original #1246 gate: findMissingCurrentScenarios
      // used Set membership, so two current scenarios sharing a name were both
      // considered "present" when the MODIFIED block kept only one of them.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'dup-scenario');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecPath = path.join(mainSpecDir, 'spec.md');
      await fs.writeFile(
        mainSpecPath,
        `# dup-scenario Specification

## Purpose
Duplicate scenario names within one requirement.

## Requirements

### Requirement: Login
The system SHALL authenticate.

#### Scenario: Validate
- **WHEN** input is empty
- **THEN** reject

#### Scenario: Validate
- **WHEN** input is malformed
- **THEN** reject`
      );

      const changeName = 'drop-one-validate';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'dup-scenario');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Drop One Validate - Change

## MODIFIED Requirements

### Requirement: Login
The system SHALL authenticate.

#### Scenario: Validate
- **WHEN** input is empty
- **THEN** reject`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updated = await fs.readFile(mainSpecPath, 'utf-8');
      // Spec must be untouched — both Validate scenarios preserved
      expect((updated.match(/#### Scenario: Validate/g) || []).length).toBe(2);
      expect(updated).toContain('malformed');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'dup-scenario MODIFIED failed for header "### Requirement: Login" - current spec contains scenario(s) not present in the modified block: "Validate"'
        )
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');

      await expect(fs.access(changeDir)).resolves.not.toThrow();
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should not treat a fenced scenario example in the current spec as real drift', async () => {
      // The validator ignores fenced `#### Scenario:` lines (countScenarios is
      // fence-aware); the drift check must agree, or a fenced sample in the
      // current spec aborts an archive that validate said was fine.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'fenced-current');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecPath = path.join(mainSpecDir, 'spec.md');
      await fs.writeFile(
        mainSpecPath,
        `# fenced-current Specification

## Purpose
Fenced scenario samples in the current spec.

## Requirements

### Requirement: Reporting
The system SHALL report results using the scenario format:

\`\`\`markdown
#### Scenario: Fenced sample
- **WHEN** shown as an example
- **THEN** it is not a real scenario
\`\`\`

#### Scenario: Emit report
- **WHEN** a run finishes
- **THEN** a report is emitted`
      );

      const changeName = 'edit-fenced-current';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'fenced-current');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Edit Fenced Current - Change

## MODIFIED Requirements

### Requirement: Reporting
The system SHALL report results in JSON.

#### Scenario: Emit report
- **WHEN** a run finishes
- **THEN** a JSON report is emitted`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updated = await fs.readFile(mainSpecPath, 'utf-8');
      expect(updated).toContain('The system SHALL report results in JSON.');
      expect(updated).toContain('a JSON report is emitted');
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('current spec contains scenario(s) not present in the modified block')
      );
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(true);
    });

    it('should abort when a MODIFIED block only keeps a dropped scenario inside a fence', async () => {
      // The inverse hole: a fenced `#### Scenario: Audit` in the incoming block
      // must not count as keeping the real Audit scenario the block dropped.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'fenced-incoming');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainSpecPath = path.join(mainSpecDir, 'spec.md');
      await fs.writeFile(
        mainSpecPath,
        `# fenced-incoming Specification

## Purpose
Fenced scenario names in the incoming block.

## Requirements

### Requirement: Access log
The system SHALL log access.

#### Scenario: Audit
- **WHEN** a user signs in
- **THEN** an audit row is written`
      );

      const changeName = 'drop-audit-behind-fence';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'fenced-incoming');
      await fs.mkdir(changeSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(changeSpecDir, 'spec.md'),
        `# Drop Audit Behind Fence - Change

## MODIFIED Requirements

### Requirement: Access log
The system SHALL log access, for example:

\`\`\`markdown
#### Scenario: Audit
- **WHEN** shown as an example
- **THEN** it is not a real scenario
\`\`\`

#### Scenario: Trace
- **WHEN** a request is served
- **THEN** a trace row is written`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const updated = await fs.readFile(mainSpecPath, 'utf-8');
      // Spec must be untouched — the real Audit scenario preserved.
      expect(updated).toContain('an audit row is written');
      expect(updated).not.toContain('Trace');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'fenced-incoming MODIFIED failed for header "### Requirement: Access log" - current spec contains scenario(s) not present in the modified block: "Audit"'
        )
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should abort with a structural error when target spec hides requirements outside ## Requirements', async () => {
      const changeName = 'hidden-requirement-target';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'delta-target');
      await fs.mkdir(changeSpecDir, { recursive: true });

      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'delta-target');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const malformedMain = `# delta-target Specification

## Purpose
Delta target purpose.

## Requirements

### Requirement: A
The system SHALL do A.

#### Scenario: A works
- **WHEN** foo
- **THEN** bar

## Edge Cases

### Requirement: B
The system SHALL do B.

#### Scenario: B works
- **WHEN** baz
- **THEN** qux`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), malformedMain);

      const deltaContent = `# Delta Target Changes

## MODIFIED Requirements

### Requirement: B
The system SHALL do B differently.

#### Scenario: B changes
- **WHEN** baz changes
- **THEN** qux changes`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('delta-target: target spec is structurally invalid and cannot be updated until fixed:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Requirement header "### Requirement: B" appears outside the main ## Requirements section.')
      );
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');

      const still = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(still).toBe(malformedMain);

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('should require MODIFIED to reference the NEW header when a rename exists (error format)', async () => {
      const changeName = 'rename-modify-new-header';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'delta');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Main spec with Old
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'delta');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainContent = `# delta Specification

## Purpose
Delta purpose.

## Requirements

### Requirement: Old
old body`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainContent);

      // Delta: rename Old->New, but MODIFIED references Old (should abort)
      const badDelta = `# Delta - Changes

## RENAMED Requirements
- FROM: \`### Requirement: Old\`
- TO: \`### Requirement: New\`

## MODIFIED Requirements
### Requirement: Old
new body`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), badDelta);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      const unchanged = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(unchanged).toBe(mainContent);
      // Assert error message format and abort notice
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('delta validation failed')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Aborted. No files were changed.')
      );

      // Fix MODIFIED to reference New (should succeed)
      const goodDelta = `# Delta - Changes

## RENAMED Requirements
- FROM: \`### Requirement: Old\`
- TO: \`### Requirement: New\`

## MODIFIED Requirements
### Requirement: New
new body`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), goodDelta);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });
      const updated = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updated).toContain('### Requirement: New');
      expect(updated).toContain('new body');
      expect(updated).not.toContain('### Requirement: Old');
    });

    it('should process multiple specs atomically (any failure aborts all)', async () => {
      const changeName = 'multi-spec-atomic';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const spec1Dir = path.join(changeDir, 'specs', 'epsilon');
      const spec2Dir = path.join(changeDir, 'specs', 'zeta');
      await fs.mkdir(spec1Dir, { recursive: true });
      await fs.mkdir(spec2Dir, { recursive: true });

      // Existing main specs
      const epsilonMain = path.join(tempDir, 'openspec', 'specs', 'epsilon', 'spec.md');
      await fs.mkdir(path.dirname(epsilonMain), { recursive: true });
      await fs.writeFile(epsilonMain, `# epsilon Specification

## Purpose
Epsilon purpose.

## Requirements

### Requirement: E1
e1`);

      const zetaMain = path.join(tempDir, 'openspec', 'specs', 'zeta', 'spec.md');
      await fs.mkdir(path.dirname(zetaMain), { recursive: true });
      await fs.writeFile(zetaMain, `# zeta Specification

## Purpose
Zeta purpose.

## Requirements

### Requirement: Z1
z1`);

      // Delta: epsilon is valid modification; zeta tries to modify non-existent -> should abort both
      await fs.writeFile(path.join(spec1Dir, 'spec.md'), `# Epsilon - Changes

## MODIFIED Requirements
### Requirement: E1
E1 updated`);

      await fs.writeFile(path.join(spec2Dir, 'spec.md'), `# Zeta - Changes

## MODIFIED Requirements
### Requirement: Missing
missing body`);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const e1 = await fs.readFile(epsilonMain, 'utf-8');
      const z1 = await fs.readFile(zetaMain, 'utf-8');
      expect(e1).toContain('### Requirement: E1');
      expect(e1).not.toContain('E1 updated');
      expect(z1).toContain('### Requirement: Z1');
      // changeDir should still exist
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('should display aggregated totals across multiple specs', async () => {
      const changeName = 'multi-spec-totals';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const spec1Dir = path.join(changeDir, 'specs', 'omega');
      const spec2Dir = path.join(changeDir, 'specs', 'psi');
      await fs.mkdir(spec1Dir, { recursive: true });
      await fs.mkdir(spec2Dir, { recursive: true });

      // Existing main specs
      const omegaMain = path.join(tempDir, 'openspec', 'specs', 'omega', 'spec.md');
      await fs.mkdir(path.dirname(omegaMain), { recursive: true });
      await fs.writeFile(omegaMain, `# omega Specification\n\n## Purpose\nOmega purpose.\n\n## Requirements\n\n### Requirement: O1\no1`);

      const psiMain = path.join(tempDir, 'openspec', 'specs', 'psi', 'spec.md');
      await fs.mkdir(path.dirname(psiMain), { recursive: true });
      await fs.writeFile(psiMain, `# psi Specification\n\n## Purpose\nPsi purpose.\n\n## Requirements\n\n### Requirement: P1\np1`);

      // Deltas: omega add one, psi rename and modify -> totals: +1, ~1, -0, →1
      await fs.writeFile(path.join(spec1Dir, 'spec.md'), `# Omega - Changes\n\n## ADDED Requirements\n\n### Requirement: O2\nnew`);
      await fs.writeFile(path.join(spec2Dir, 'spec.md'), `# Psi - Changes\n\n## RENAMED Requirements\n- FROM: \`### Requirement: P1\`\n- TO: \`### Requirement: P2\`\n\n## MODIFIED Requirements\n### Requirement: P2\nupdated`);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Verify aggregated totals line was printed
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Totals: + 1, ~ 1, - 0, → 1')
      );
    });
  });

  describe('exit code on blocked archive (human mode)', () => {
    // Regression for the silent-exit-0 bug: when archive is blocked in
    // human mode it must set a non-zero exit code so scripts/CI can detect
    // the failure, mirroring the JSON-mode behavior.
    it('runs delta spec validation for lowercase delta headers (parity with validate)', async () => {
      const changeName = 'exit-lowercase-delta';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'lower-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Lowercase section header: the parser reads it case-insensitively, so
      // the archive gate must route it into delta validation the same way
      // validate does instead of falling through to the rebuilt-spec check.
      const specContent = `# Lower Capability - Changes

## added requirements

### Requirement: Logging Feature
The system SHALL log all events.`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('must include at least one scenario')
      );
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('sets exit code 1 when delta spec validation fails', async () => {
      const changeName = 'exit-delta-fail';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'bad-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Delta spec missing requirement text -> validation error
      const specContent = `# Bad Capability - Changes

## ADDED Requirements

### Requirement: Logging Feature

#### Scenario: Event recorded
- **WHEN** an event occurs
- **THEN** it is captured`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true, skipSpecs: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed')
      );

      // Change must NOT have been archived
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('sets exit code 1 when the only delta spec sits at the specs/ root (#1385)', async () => {
      const changeName = 'exit-root-delta';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecsDir = path.join(changeDir, 'specs');
      await fs.mkdir(changeSpecsDir, { recursive: true });

      // No capability folder: the merge path skips this file, so archiving it
      // used to succeed while dropping the requirement.
      const specContent = `## ADDED Requirements

### Requirement: Request metrics
The system SHALL record request metrics.

#### Scenario: Request is counted
- **WHEN** a request completes
- **THEN** a counter is incremented`;
      await fs.writeFile(path.join(changeSpecsDir, 'spec.md'), specContent);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed')
      );

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('sets exit code 1 for a root-level specs/spec.md without delta headers (#1385)', async () => {
      const changeName = 'exit-root-plain';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecsDir = path.join(changeDir, 'specs');
      await fs.mkdir(changeSpecsDir, { recursive: true });

      // Main-spec shape rather than delta shape: still never merged, so the
      // gate must trip on the file existing, not on its headers.
      const specContent = `# Metrics

## Purpose
Metrics for requests.

## Requirements

### Requirement: Request metrics
The system SHALL record request metrics.

#### Scenario: Request is counted
- **WHEN** a request completes
- **THEN** a counter is incremented`;
      await fs.writeFile(path.join(changeSpecsDir, 'spec.md'), specContent);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('sets exit code 1 when spec rebuild fails (MODIFIED on new spec)', async () => {
      const changeName = 'exit-rebuild-fail';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'new-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // MODIFIED on a non-existent target spec aborts the rebuild
      const specContent = `# New Capability - Changes

## ADDED Requirements

### Requirement: New Feature
New feature description.

## MODIFIED Requirements

### Requirement: Existing Feature
Modified content.`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), specContent);

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');

      const mainSpecPath = path.join(tempDir, 'openspec', 'specs', 'new-capability', 'spec.md');
      await expect(fs.access(mainSpecPath)).rejects.toThrow();

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(false);
    });

    it('sets exit code 1 when rebuilt spec fails validateSpecContent', async () => {
      // Spot 3 is defensive: spot 1 (validateChangeDeltaSpecs) already
      // enforces SHALL/MUST/scenario rules on the delta, and buildUpdatedSpec
      // pre-validates target structure, so a real delta almost never reaches
      // this branch. Spy on validateSpecContent (the existing --no-validate
      // test uses the same spy pattern) to force the rebuilt spec invalid
      // while buildUpdatedSpec runs for real — exercising the exit-code fix.
      const changeName = 'exit-rebuilt-validate-fail';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const changeSpecDir = path.join(changeDir, 'specs', 'rebuilt-capability');
      await fs.mkdir(changeSpecDir, { recursive: true });

      // Existing main spec so MODIFIED targets a real spec and buildUpdatedSpec
      // succeeds (does not throw).
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'rebuilt-capability');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const mainContent = `# rebuilt-capability Specification

## Purpose
Rebuilt capability purpose.

## Requirements

### Requirement: Existing Feature
The system SHALL do the thing.

#### Scenario: works
- **WHEN** x
- **THEN** y`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainContent);

      // Valid MODIFIED delta (passes spot 1 delta validation).
      const deltaContent = `# Rebuilt Capability - Changes

## MODIFIED Requirements

### Requirement: Existing Feature
The system SHALL do the thing differently.

#### Scenario: works
- **WHEN** x
- **THEN** z`;
      await fs.writeFile(path.join(changeSpecDir, 'spec.md'), deltaContent);
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      const specContentSpy = vi
        .spyOn(Validator.prototype, 'validateSpecContent')
        .mockResolvedValue({
          valid: false,
          issues: [
            { level: 'ERROR', path: 'requirements[0]', message: 'mocked rebuilt-spec failure' },
          ],
          summary: { errors: 1, warnings: 0, info: 0 },
        });

      try {
        await archiveCommand.execute(changeName, { yes: true });

        expect(process.exitCode).toBe(1);
        // buildUpdatedSpec ran for real and the spy made its output "invalid"
        expect(specContentSpy).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Validation errors in rebuilt spec for rebuilt-capability')
        );
        expect(console.log).toHaveBeenCalledWith('Aborted. No files were changed.');

        // Main spec must be unchanged (no writes happened)
        const still = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
        expect(still).toBe(mainContent);

        // Change must NOT have been archived
        const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
        const archives = await fs.readdir(archiveDir);
        expect(archives.some(a => a.includes(changeName))).toBe(false);
      } finally {
        specContentSpy.mockRestore();
      }
    });

    it('leaves exit code 0 on successful archive (no leak from prior test)', async () => {
      const changeName = 'exit-ok';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBeUndefined();

      const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
      const archives = await fs.readdir(archiveDir);
      expect(archives.some(a => a.includes(changeName))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should report no active changes when openspec directory does not exist', async () => {
      // Remove openspec directory
      await fs.rm(path.join(tempDir, 'openspec'), { recursive: true });
      
      await expect(
        archiveCommand.execute('any-change', { yes: true })
      ).rejects.toThrow("Change 'any-change' not found. No active changes exist in this root.");
    });
  });

  describe('interactive mode', () => {
    it('should use select prompt for change selection', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = select as unknown as ReturnType<typeof vi.fn>;

      // The interactive picker only runs at a real terminal (both streams TTY);
      // otherwise archive refuses up front rather than render a menu into a pipe.
      const originalStdinIsTty = process.stdin.isTTY;
      const originalStdoutIsTty = process.stdout.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      try {
        // Create test changes
        const change1 = 'feature-a';
        const change2 = 'feature-b';
        await fs.mkdir(path.join(tempDir, 'openspec', 'changes', change1), { recursive: true });
        await fs.mkdir(path.join(tempDir, 'openspec', 'changes', change2), { recursive: true });

        // Mock select to return first change
        mockSelect.mockResolvedValueOnce(change1);

        // Execute without change name
        await archiveCommand.execute(undefined, { yes: true });

        // Verify select was called with correct options (values matter, names may include progress)
        expect(mockSelect).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Select a change to archive',
          choices: expect.arrayContaining([
            expect.objectContaining({ value: change1 }),
            expect.objectContaining({ value: change2 })
          ])
        }));

        // Verify the selected change was archived
        const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
        const archives = await fs.readdir(archiveDir);
        expect(archives[0]).toContain(change1);
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinIsTty, configurable: true, writable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutIsTty, configurable: true, writable: true });
      }
    });

    it('should use confirm prompt for task warnings', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      
      const changeName = 'incomplete-interactive';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with incomplete tasks
      const tasksContent = '- [ ] Task 1';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Mock confirm to return true (proceed)
      mockConfirm.mockResolvedValueOnce(true);
      
      // Execute without --yes flag
      await archiveCommand.execute(changeName);
      
      // Verify confirm was called
      expect(mockConfirm).toHaveBeenCalledWith({
        message: 'Warning: 1 incomplete task(s) found. Continue?',
        default: false
      });
    });

    it('should cancel when user declines task warning', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      
      const changeName = 'cancel-test';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      
      // Create tasks.md with incomplete tasks
      const tasksContent = '- [ ] Task 1';
      await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
      
      // Mock confirm to return false (cancel) for validation skip
      mockConfirm.mockResolvedValueOnce(false);
      // Mock another false for task warning
      mockConfirm.mockResolvedValueOnce(false);
      
      // Execute without --yes flag but skip validation to test task warning
      await archiveCommand.execute(changeName, { noValidate: true });
      
      // Verify archive was cancelled
      expect(console.log).toHaveBeenCalledWith('Archive cancelled.');
      
      // Verify change was not archived
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('prompts before archiving a change whose only unfinished work is a sub-task (#1485)', async () => {
      // The other half of the gate: without --yes the user is asked, and
      // declining leaves the change in place. Before the fix there was no
      // question to answer - the sub-task was invisible and archive ran.
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;

      const changeName = 'subtask-prompt';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        '- [x] 1.1 Parent task\n  - [ ] 1.1.1 Unfinished sub-task\n'
      );

      // Drain answers queued by earlier tests: vi.clearAllMocks() resets calls
      // but not a pending mockResolvedValueOnce queue.
      mockConfirm.mockReset();
      // First confirm is the skip-validation prompt, second is the task warning.
      mockConfirm.mockResolvedValueOnce(true);
      mockConfirm.mockResolvedValueOnce(false);

      await archiveCommand.execute(changeName, { noValidate: true });

      expect(mockConfirm).toHaveBeenCalledWith({
        message: 'Warning: 1 incomplete task(s) found. Continue?',
        default: false,
      });
      expect(console.log).toHaveBeenCalledWith('Archive cancelled.');
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });
  });

  // A delta whose REMOVED entries cover every requirement rebuilds the main
  // spec empty, and an empty spec can never validate. Every such archive used
  // to abort with "Spec must have at least one requirement", leaving no way to
  // retire a capability (#1302).
  describe('capability retirement (#1302)', () => {
    const REQUIREMENT = [
      '### Requirement: The system SHALL provide a legacy layer',
      'The system SHALL provide a legacy layer to existing consumers.',
      '',
      '#### Scenario: Layer is available',
      '- **WHEN** a consumer imports the layer',
      '- **THEN** the legacy layer is available',
    ].join('\n');

    const PURPOSE =
      'Holds the behavior contract for the legacy layer that consumers still depend on today.';

    function mainSpec(name: string, requirements = REQUIREMENT): string {
      return `# ${name} Specification\n\n## Purpose\n${PURPOSE}\n\n## Requirements\n\n${requirements}\n`;
    }

    const REMOVE_ALL = [
      '# Legacy Layer - Changes',
      '',
      '## REMOVED Requirements',
      '',
      '### Requirement: The system SHALL provide a legacy layer',
      '**Reason**: The capability is retired.',
      '**Migration**: None; consumers already moved off it.',
      '',
    ].join('\n');

    /** The last thing printed, which in JSON mode is the one payload. */
    function lastJsonPayload(): string {
      const calls = (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls;
      return String(calls[calls.length - 1][0]);
    }

    /**
     * A change that is allowed to retire a capability. Every retirement case
     * below carries the marker, because without it archive aborts - which is the
     * whole point of the marker, and has its own tests further down.
     */
    async function createChange(
      changeName: string,
      capability: string,
      deltaSpec: string,
      options: { declareRetirement?: boolean } = {}
    ): Promise<string> {
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(path.join(changeDir, 'specs', ...capability.split('/')), {
        recursive: true,
      });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(
        path.join(changeDir, 'specs', ...capability.split('/'), 'spec.md'),
        deltaSpec
      );
      if (options.declareRetirement !== false) {
        await fs.writeFile(
          path.join(changeDir, '.openspec.yaml'),
          'schema: spec-driven\nretire_capabilities: true\n'
        );
      }
      return changeDir;
    }

    // The marker is what makes the deletion the author's decision rather than
    // an inference from the shape of a delta. Without it archive behaves exactly
    // as it did before #1302 - it aborts on a spec it cannot write - except that
    // the abort now names the way out.
    describe('retire_capabilities marker', () => {
      async function setUpUnmarked(changeName: string, metadata?: string): Promise<string> {
        const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL, {
          declareRetirement: false,
        });
        if (metadata !== undefined) {
          await fs.writeFile(path.join(changeDir, '.openspec.yaml'), metadata);
        }
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(mainSpecDir, { recursive: true });
        await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));
        return path.join(mainSpecDir, 'spec.md');
      }

      it('aborts without the marker, naming it, and deletes nothing', async () => {
        const target = await setUpUnmarked('retire-unmarked');
        const original = await fs.readFile(target, 'utf-8');

        await archiveCommand.execute('retire-unmarked', { yes: true });

        // Pre-#1302 behavior, unchanged: the unwritable spec aborts the archive.
        expect(process.exitCode).toBe(1);
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(VALIDATION_MESSAGES.SPEC_NO_REQUIREMENTS)
        );
        // ...but the dead end now comes with its own way out.
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('add `retire_capabilities: true`')
        );
        // Nothing touched: not the spec, not the change.
        await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
        await expect(
          fs.access(path.join(tempDir, 'openspec', 'changes', 'retire-unmarked'))
        ).resolves.not.toThrow();
      });

      it('refuses a marker it cannot honor, and says why', async () => {
        // Mirrors skip_specs: a marker in metadata that fails the contract is
        // not a marker. Silently ignoring it would be the worst outcome - the
        // author believes they authorised the deletion.
        const target = await setUpUnmarked(
          'retire-bad-marker',
          'schema: spec-driven\nretire_capabilities: yes-please\n'
        );

        await archiveCommand.execute('retire-bad-marker', { yes: true });

        expect(process.exitCode).toBe(1);
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('cannot be honored')
        );
        await expect(fs.access(target)).resolves.not.toThrow();
      });

      it('treats retire_capabilities: false as not declared', async () => {
        const target = await setUpUnmarked(
          'retire-false-marker',
          'schema: spec-driven\nretire_capabilities: false\n'
        );

        await archiveCommand.execute('retire-false-marker', { yes: true });

        expect(process.exitCode).toBe(1);
        // An explicit false is the opposite of setting the marker, so it must
        // not be reported as an unhonorable one.
        expect(console.log).not.toHaveBeenCalledWith(
          expect.stringContaining('cannot be honored')
        );
        await expect(fs.access(target)).resolves.not.toThrow();
      });

      it('reports the missing marker as the fix in --json', async () => {
        await setUpUnmarked('retire-unmarked-json');

        await archiveCommand
          .execute('retire-unmarked-json', { yes: true, json: true })
          .catch(() => undefined);

        const payload = JSON.parse(lastJsonPayload());
        expect(payload.archive).toBeNull();
        expect(JSON.stringify(payload.status)).toContain('retire_capabilities: true');
      });

      // #1696: the marker is missing AND the file holds a line the merge cannot
      // account for. Both hints were suppressed - the marker hint because
      // retirement would still be refused, the refusal reason because it only
      // spoke to authors who had already set the marker - so the archive aborted
      // on "must have at least one requirement" with no way forward at all.
      it('names the content blocking a retirement instead of aborting bare', async () => {
        const changeDir = await createChange(
          'retire-unmarked-with-notes',
          'legacy-layer',
          REMOVE_ALL,
          { declareRetirement: false }
        );
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(mainSpecDir, { recursive: true });
        const target = path.join(mainSpecDir, 'spec.md');
        // An ordinary hand-written section. It keeps the spec valid, so the only
        // error is still the empty rebuild - but deleting the file would take it.
        await fs.writeFile(
          target,
          `${mainSpec('legacy-layer')}\n## Notes\n\nOwned by the platform team.\n`
        );
        const original = await fs.readFile(target, 'utf-8');

        await archiveCommand.execute('retire-unmarked-with-notes', { yes: true });

        expect(process.exitCode).toBe(1);
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(VALIDATION_MESSAGES.SPEC_NO_REQUIREMENTS)
        );
        // The abort now says what archive would do with the emptied spec, and
        // names the line standing in the way of it.
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Retiring the capability is what archive does instead')
        );
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('"Owned by the platform team."')
        );
        // Not the marker, though: adding it would not have let this through,
        // and the marker is only ever named when it really is the one thing
        // missing.
        expect(console.log).not.toHaveBeenCalledWith(
          expect.stringContaining('add `retire_capabilities: true`')
        );
        // Still a refusal: nothing is written and nothing is deleted.
        await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
        await expect(fs.access(changeDir)).resolves.not.toThrow();
      });

      // The blocking lines are authored file content echoed to a terminal. A
      // spec that arrives with a checkout can carry an ESC, and one very long
      // line could push the way out of the abort off the screen.
      it('renders blocking lines safely and boundedly', async () => {
        await createChange('retire-unmarked-hostile', 'legacy-layer', REMOVE_ALL, {
          declareRetirement: false,
        });
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(mainSpecDir, { recursive: true });
        const longLine = `L${'o'.repeat(400)}ng`;
        await fs.writeFile(
          path.join(mainSpecDir, 'spec.md'),
          `${mainSpec('legacy-layer')}\n## Notes\n\nOwned by \u001b[31mthe platform team.\n\n${longLine}\n`
        );

        await archiveCommand.execute('retire-unmarked-hostile', { yes: true });

        expect(process.exitCode).toBe(1);
        const printed = (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls
          .map((call) => String(call[0]))
          .join('\n');
        // The escape never reaches the terminal, but the line is still findable.
        expect(printed).toContain('Owned by ?[31mthe platform team.');
        expect(printed).not.toContain('\u001b[31m');
        // The long line is named, then cut.
        expect(printed).toContain(`"L${'o'.repeat(199)}…"`);
      });

      // An author who set a marker that cannot be honored believes they have
      // authorised the deletion. Clearing the blocking content first, only to
      // then learn the marker was never read, is two aborts for one mistake.
      it('reports an unhonorable marker alongside the blocking content', async () => {
        const changeDir = await createChange(
          'retire-bad-marker-with-notes',
          'legacy-layer',
          REMOVE_ALL,
          { declareRetirement: false }
        );
        await fs.writeFile(
          path.join(changeDir, '.openspec.yaml'),
          'schema: spec-driven\nretire_capabilities: yes-please\n'
        );
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(mainSpecDir, { recursive: true });
        await fs.writeFile(
          path.join(mainSpecDir, 'spec.md'),
          `${mainSpec('legacy-layer')}\n## Notes\n\nOwned by the platform team.\n`
        );

        await archiveCommand.execute('retire-bad-marker-with-notes', { yes: true });

        expect(process.exitCode).toBe(1);
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('"Owned by the platform team."')
        );
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('cannot be honored')
        );
        // Still no invitation to add one - the content blocks it either way.
        expect(console.log).not.toHaveBeenCalledWith(
          expect.stringContaining('add `retire_capabilities: true`')
        );
      });

      it('carries the blocked-retirement guidance into --json', async () => {
        await createChange('retire-unmarked-notes-json', 'legacy-layer', REMOVE_ALL, {
          declareRetirement: false,
        });
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(mainSpecDir, { recursive: true });
        await fs.writeFile(
          path.join(mainSpecDir, 'spec.md'),
          `${mainSpec('legacy-layer')}\n## Notes\n\nOwned by the platform team.\n`
        );

        await archiveCommand
          .execute('retire-unmarked-notes-json', { yes: true, json: true })
          .catch(() => undefined);

        const payload = JSON.parse(lastJsonPayload());
        expect(payload.archive).toBeNull();
        const status = JSON.stringify(payload.status);
        expect(status).toContain('Retiring the capability is what archive does instead');
        expect(status).toContain('Owned by the platform team.');
      });

      it('does not name the marker when retirement would not have fixed it', async () => {
        // A spec broken in some further way is not a retirement candidate, so
        // pointing at the marker would send the author after the wrong fix.
        const changeDir = await createChange('retire-also-broken-marker', 'legacy-layer', REMOVE_ALL, {
          declareRetirement: false,
        });
        expect(changeDir).toBeTruthy();
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(mainSpecDir, { recursive: true });
        // No `## Purpose`: a second, independent validation error.
        await fs.writeFile(
          path.join(mainSpecDir, 'spec.md'),
          `# legacy-layer Specification\n\n## Requirements\n\n${REQUIREMENT}\n`
        );

        await archiveCommand.execute('retire-also-broken-marker', { yes: true });

        expect(process.exitCode).toBe(1);
        expect(console.log).not.toHaveBeenCalledWith(
          expect.stringContaining('add `retire_capabilities: true`')
        );
      });
    });

    // A second `## Requirements` section is where every parser here stops short:
    // `extractRequirementsSection` binds to the first one, so the validator's
    // lookup, the block parser, the residual-heading veto and the lost-section
    // report all ignore what follows. A spec shaped like this passed
    // `validate --strict` and was then deleted with a live SHALL requirement in
    // it, named nowhere in the report.
    it('refuses to retire a spec that has a second Requirements section', async () => {
      const changeName = 'retire-two-sections';
      await createChange(changeName, 'audit', [
        '# Audit - Changes',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: Audit trail',
        '**Reason**: Superseded.',
        '**Migration**: None.',
        '',
      ].join('\n'));
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'audit');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const original = [
        '# audit Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: Audit trail',
        'The system SHALL record an audit entry for every privileged action.',
        '',
        '#### Scenario: Entry recorded',
        '- **WHEN** a privileged action runs',
        '- **THEN** an entry is recorded',
        '',
        '## Requirements',
        '',
        '### Seven year retention',
        'The system SHALL retain audit entries for seven years.',
        '',
        '#### Scenario: Early purge refused',
        '- **WHEN** a purge is attempted early',
        '- **THEN** it is refused',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), original);

      // The spec as written is valid, which is what made the deletion silent.
      const before = await new Validator().validateSpecContent('audit', original, 'strict');
      expect(before.valid).toBe(true);

      await archiveCommand.execute(changeName, { yes: true });

      // Aborts instead, exactly as it did before retirement existed...
      expect(process.exitCode).toBe(1);
      // ...and the second section's requirement is still there.
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(
        original
      );
    });

    it('refuses to retire duplicate requirement names from the main spec', async () => {
      const changeName = 'retire-duplicate-requirement';
      await createChange(
        changeName,
        'audit',
        '# Audit - Changes\n\n## REMOVED Requirements\n\n### Requirement: Same\n**Reason**: x.\n**Migration**: None.\n'
      );
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'audit');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const original = [
        '# audit Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: Same',
        'The system SHALL keep the first behavior.',
        '',
        '#### Scenario: First',
        '- **WHEN** the first path runs',
        '- **THEN** the first behavior remains',
        '',
        '### Requirement: Same',
        'The system SHALL keep the independently authored second behavior.',
        '',
        '#### Scenario: Second',
        '- **WHEN** the second path runs',
        '- **THEN** the second behavior remains',
        '',
      ].join('\n');
      const target = path.join(mainSpecDir, 'spec.md');
      await fs.writeFile(target, original);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('duplicates the requirement declared')
      );
      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it('refuses to retire an H1 section written after Purpose', async () => {
      const changeName = 'retire-h1-after-purpose';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const original = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '# Architecture Notes',
        'Do not delete this independently authored section.',
        '',
        '## Requirements',
        '',
        REQUIREMENT,
        '',
      ].join('\n');
      const target = path.join(mainSpecDir, 'spec.md');
      await fs.writeFile(target, original);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('content the merge cannot safely account for')
      );
    });

    // `extractRequirementsSection` masks fences only, `findHeadings` masks HTML
    // comments as well. That one-mask difference was a data-loss bug: a `##`
    // inside a multi-line comment ends the section for the merge, so everything
    // below it became a tail no comment-masking scan could see - and a
    // `validate --strict`-clean spec was deleted with a live SHALL in it.
    it('refuses to retire when a commented-out heading hid the section boundary', async () => {
      const changeName = 'retire-comment-boundary';
      await createChange(
        changeName,
        'audit',
        '# Audit - Changes\n\n## REMOVED Requirements\n\n### Requirement: Audit trail\n**Reason**: x.\n**Migration**: None.\n'
      );
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'audit');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const original = [
        '# audit Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: Audit trail',
        'The system SHALL record an audit entry.',
        '',
        '#### Scenario: Recorded',
        '- **WHEN** a privileged action runs',
        '- **THEN** an entry is recorded',
        '',
        '<!-- duplicate header left over from an old split',
        '## Purpose',
        '-->',
        '',
        '### Seven year retention',
        'The system SHALL retain audit entries for seven years.',
        '',
        '#### Scenario: Early purge refused',
        '- **WHEN** a purge is attempted early',
        '- **THEN** it is refused',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), original);

      // Valid as written, which is what made the deletion silent.
      expect((await new Validator().validateSpecContent('audit', original, 'strict')).valid).toBe(
        true
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(
        original
      );
      // And the author is told why their marker was refused.
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('content the merge cannot safely account for')
      );
    });

    // The guard audits the WHOLE file, not a couple of its slices. A block's
    // raw carries everything the parser did not read as a new header - prose,
    // tables, fences - and that content was deleted while the report said only
    // "Purpose" was lost. Content above the requirements section had the same
    // hole.
    it.each([
      {
        where: 'inside a removed block',
        spec: [
          '# legacy-layer Specification',
          '',
          '## Purpose',
          PURPOSE,
          '',
          '## Requirements',
          '',
          REQUIREMENT,
          '',
          'MIGRATION RUNBOOK (authored by hand, not a heading):',
          'Step 1: rotate the customer keys before 2026-08-01.',
          '',
          '| host | owner |',
          '| --- | --- |',
          '| db-1 | payments |',
          '',
        ].join('\n'),
        quoted: 'MIGRATION RUNBOOK',
      },
      {
        where: 'above the requirements section',
        spec: [
          '# legacy-layer Specification',
          '',
          'NOTE TO MAINTAINERS: the escrow keys live in the "legacy" vault.',
          '',
          '## Purpose',
          PURPOSE,
          '',
          '## Requirements',
          '',
          REQUIREMENT,
          '',
        ].join('\n'),
        quoted: 'NOTE TO MAINTAINERS',
      },
      // Not a case: prose between `## Purpose` and `## Requirements` IS the
      // Purpose body - the section runs to the next `##` - and the retirement
      // warning already names Purpose as going with the file.
    ])('refuses to retire with authored content $where', async ({ spec, quoted }) => {
      const changeName = `retire-authored-${quoted.split(' ')[0].toLowerCase()}`;
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      // And the author is told which lines stood in the way.
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(quoted));
    });

    it('refuses to retire when a note is bulleted below the scenarios', async () => {
      // Every bullet used to count as a scenario's own, so an operational note
      // written under the last scenario was deleted with the file and named
      // nowhere. A scenario's bullets run unbroken beneath its header; a blank
      // line ends them.
      const changeName = 'retire-bulleted-note';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        REQUIREMENT,
        '',
        '- IMPORTANT: escrow keys live in the "legacy" vault; rotate before deleting.',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);
      expect((await new Validator().validateSpecContent('legacy-layer', spec, 'strict')).valid).toBe(
        true
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('escrow keys'));
    });

    // #1780: a repository that wraps its prose at a column limit writes every
    // long scenario bullet over two lines. The continuation line is part of the
    // bullet, but it was counted as content the merge could not name - so a
    // wrapped spec could not be retired at all, and the same count suppressed
    // the hint that told an unmarked author the marker exists.
    it('still retires a spec whose scenario bullets wrap onto a second line', async () => {
      const changeName = 'retire-wrapped-bullet';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers, wrapped at the',
        "repository's column limit like every other paragraph in this file.",
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** the outstanding count becomes zero and the completions are recorded',
        '  rather than the earned total being reduced',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);
      expect((await new Validator().validateSpecContent('legacy-layer', spec, 'strict')).valid).toBe(
        true
      );

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).rejects.toThrow();
    });

    it('still retires when a scenario bullet wraps without indenting the continuation', async () => {
      // Not every wrap indents. A lazy continuation is part of the bullet above
      // it the same way an indented one is, and inside a scenario's bullet run
      // a sibling bullet written in that position is already read as the
      // scenario's own - so reading this line as loose content refused specs
      // for a spelling difference.
      const changeName = 'retire-lazy-wrapped-bullet';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers.',
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** the outstanding count becomes zero and the completions are recorded',
        'rather than the earned total being reduced',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);
      expect((await new Validator().validateSpecContent('legacy-layer', spec, 'strict')).valid).toBe(
        true
      );

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).rejects.toThrow();
    });

    it('does not lazily absorb prose below a note bulleted after the scenarios', async () => {
      // The lazy allowance is for a scenario's own bullet run. Past the blank
      // line that ends it the author's note is the author's, and so is the line
      // that wraps it - both must be named rather than deleted with the file.
      const changeName = 'retire-lazy-note-after-scenarios';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        REQUIREMENT,
        '',
        '- IMPORTANT: escrow keys live in the "legacy" vault; rotate them before',
        'anyone deletes this capability.',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('escrow keys'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('anyone deletes'));
    });
    it('still retires when a nested list item wraps, and when a tab does the indenting', async () => {
      const changeName = 'retire-wrapped-nested-bullet';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers.',
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** these happen in order:',
        '  1. the layer loads from the cache written by the previous run, or from disk',
        '     when that cache is cold',
        '\t2. the consumer proceeds',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);
      expect((await new Validator().validateSpecContent('legacy-layer', spec, 'strict')).valid).toBe(
        true
      );

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).rejects.toThrow();
    });

    it.each([
      { what: 'an ATX heading', line: '  ### Data Migration Notes' },
      { what: 'a raw HTML heading', line: '  <h2>Data Migration Notes</h2>' },
      { what: 'a setext heading', line: '  Data Migration Notes\n  --------------------' },
    ])('still refuses $what indented directly under a scenario bullet', async ({ what, line }) => {
      // Continuation is for wrapped prose. A heading is a heading wherever it
      // sits, so indenting a section under a bullet must not smuggle it past
      // the audit and delete it with the file.
      const changeName = `retire-indented-heading-${what.split(' ')[1]}`;
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers.',
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** the legacy layer is available',
        line,
        '  Export the escrow table by hand first.',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Data Migration Notes')
      );
    });
    it.each([
      { what: 'an ATX heading', body: ['## Data Migration Notes', 'Export the escrow table by hand first.'] },
      { what: 'a setext heading', body: ['Data Migration Notes', '--------------------', 'Export the escrow table by hand first.'] },
      { what: 'a raw HTML heading', body: ['<h2>Data Migration Notes</h2>', 'Export the escrow table by hand first.'] },
    ])('still refuses $what opened with no blank line after the scenario bullets', async ({ what, body }) => {
      // The lazy allowance must not reach past a heading. A section opened
      // directly under the bullets is a section however tightly it is written,
      // and deleting the file would take it.
      const changeName = `retire-tight-heading-${what.split(' ')[1]}`;
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers.',
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** the legacy layer is available',
        ...body,
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Data Migration Notes')
      );
    });

    it('reads a wrapped bullet the same way when the spec uses CRLF line endings', async () => {
      const changeName = 'retire-wrapped-bullet-crlf';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        [
          '# legacy-layer Specification',
          '',
          '## Purpose',
          PURPOSE,
          '',
          '## Requirements',
          '',
          '### Requirement: The system SHALL provide a legacy layer',
          'The system SHALL provide a legacy layer to existing consumers.',
          '',
          '#### Scenario: Layer is available',
          '- **WHEN** a consumer imports the layer',
          '- **THEN** the outstanding count becomes zero and the completions are recorded',
          '  rather than the earned total being reduced',
          '',
        ].join('\r\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).rejects.toThrow();
    });
    it('names only the real leftover in a wrapped multi-requirement spec', async () => {
      // The report is what an author acts on, so a wrapped spec must not bury
      // the one line that matters under a list of its own continuations.
      const changeName = 'retire-wrapped-multi';
      const removeBoth = [
        '# Legacy Layer - Changes',
        '',
        '## REMOVED Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        '**Reason**: The capability is retired.',
        '**Migration**: None; consumers already moved off it.',
        '',
        '### Requirement: The system SHALL report legacy usage',
        '**Reason**: The capability is retired.',
        '**Migration**: None; consumers already moved off it.',
        '',
      ].join('\n');
      await createChange(changeName, 'legacy-layer', removeBoth);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers, wrapped at the',
        "repository's column limit like every other paragraph in this file.",
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** the outstanding count becomes zero and the completions are recorded',
        '  rather than the earned total being reduced',
        '',
        '### Requirement: The system SHALL report legacy usage',
        'The system SHALL report legacy usage to the operator.',
        '',
        '#### Scenario: Usage is reported',
        '- **WHEN** the nightly job runs',
        '- **THEN** every consumer still importing the layer is listed in the report',
        'along with the last time it did so',
        '',
        '- IMPORTANT: escrow keys live in the "legacy" vault; rotate before deleting.',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      const refusal = (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls
        .map((call) => String(call[0]))
        .find((line) => line.includes('cannot safely account for'));
      expect(refusal).toContain('escrow keys');
      expect(refusal).not.toContain('column limit');
      expect(refusal).not.toContain('earned total');
      expect(refusal).not.toContain('last time it did so');
    });
    it.each([
      { what: 'a blockquote', body: ['> IMPORTANT: escrow keys live in the "legacy" vault.'], named: 'escrow keys' },
      { what: 'a thematic break', body: ['***', 'IMPORTANT: escrow keys live in the "legacy" vault.'], named: 'escrow keys' },
      { what: 'a table', body: ['| key | vault |', '| --- | ----- |', '| escrow | legacy |'], named: 'escrow' },
      { what: 'a nested list', body: ['- IMPORTANT: escrow keys live in the "legacy" vault.'], named: 'escrow keys' },
    ])('does not lazily absorb $what written flush against the scenario bullets', async ({ what, body, named }) => {
      // CommonMark lets each of these interrupt a paragraph, so one written
      // with no blank line after a bullet opens something new rather than
      // continuing the bullet - and deleting the file would take it.
      //
      // The nested-list case is the one exception in kind: a sibling bullet in
      // that position has always been read as the scenario's own, which is what
      // makes the lazy allowance safe. It is here to pin that behavior, not to
      // change it.
      const changeName = `retire-lazy-block-${what.split(' ')[1]}`;
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers.',
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** the legacy layer is available',
        ...body,
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      if (what === 'a nested list') {
        // Pinned, not asserted as desirable: unchanged from before the lazy
        // allowance existed.
        await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).rejects.toThrow();
        return;
      }
      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(named));
    });

    it.each([
      { where: 'flush against the bullet', fence: ['```sh', 'openspec archive legacy', '```'] },
      { where: 'indented inside the bullet', fence: ['  ```sh', '  openspec archive legacy', '  ```'] },
    ])('does not lazily absorb a note written under a fence $where', async ({ where, fence }) => {
      // A fence ends the paragraph wherever it sits, so the line after it is
      // not continuing the bullet however tightly it is written.
      const changeName = `retire-lazy-after-fence-${where.split(' ')[0]}`;
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers.',
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** the legacy layer is available',
        ...fence,
        'IMPORTANT: escrow keys live in the "legacy" vault.',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('escrow keys'));
    });

    it('does not lazily absorb a note written under an indented quote in the bullet', async () => {
      // The quote is inside the item, so it is not named - but it closed the
      // bullet's paragraph, and the unindented line below it is new content.
      const changeName = 'retire-lazy-after-indented-quote';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers.',
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** the legacy layer is available',
        '  > and the operator is told which consumers are still importing it',
        'IMPORTANT: escrow keys live in the "legacy" vault.',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('escrow keys'));
    });
    it.each([
      { what: 'an ATX heading', body: ['     ## Retention'], named: 'Retention' },
      { what: 'a setext heading', body: ['     Retention', '     ---------'], named: 'Retention' },
      { what: 'an unindented note', body: ['IMPORTANT: escrow keys live in the "legacy" vault.'], named: 'escrow keys' },
    ])('still refuses $what written under a wide ordered marker', async ({ what, body, named }) => {
      // A marker as wide as `100. ` puts the item's content past the three
      // columns a Markdown construct is allowed at the file's left margin, so
      // reading these lines against that margin saw five spaces of nothing and
      // absorbed them. They are classified as the item sees them - which is
      // also what tells the audit that the nested item closed the outer
      // bullet's paragraph, so the unindented note below it is not a wrap.
      const changeName = `retire-wide-marker-${what.split(' ')[1]}`;
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers.',
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** these happen in order:',
        '  100. the layer loads',
        ...body,
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining(named));
    });
    it('names the marker for an unmarked change whose scenario bullets wrap', async () => {
      // The hint was gated on there being nothing unaccounted for, so a wrapped
      // spec got the bare `must have at least one requirement` abort and the
      // author never learned the retirement path existed.
      const changeName = 'retire-wrapped-bullet-unmarked';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL, {
        declareRetirement: false,
      });
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        [
          '# legacy-layer Specification',
          '',
          '## Purpose',
          PURPOSE,
          '',
          '## Requirements',
          '',
          '### Requirement: The system SHALL provide a legacy layer',
          'The system SHALL provide a legacy layer to existing consumers.',
          '',
          '#### Scenario: Layer is available',
          '- **WHEN** a consumer imports the layer',
          '- **THEN** the outstanding count becomes zero and the completions are recorded',
          '  rather than the earned total being reduced',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('add `retire_capabilities: true`')
      );
    });

    it('still refuses a note indented below a blank line after the scenarios', async () => {
      // Indentation alone is not continuation: a blank line ends the list item,
      // so what follows is the author's own note however it is indented. The
      // wrapped-bullet allowance must not swallow it.
      const changeName = 'retire-indented-note-after-blank';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        REQUIREMENT,
        '',
        '  IMPORTANT: escrow keys live in the "legacy" vault; rotate before deleting.',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('escrow keys'));
    });
    it('still retires a spec whose requirement uses lists and code examples', async () => {
      // The guard must not refuse ordinary spec prose: a numbered list, a fenced
      // example, and a statement opening with inline code are all a
      // requirement's own content.
      //
      // Known limitation, deliberate: a scenario whose bullets are split by a
      // blank line reads the same as a note bulleted below the scenario, and no
      // line-based rule separates them. Such a spec is REFUSED, never deleted -
      // the abort names the lines and the author moves them or deletes the file
      // by hand.
      const changeName = 'retire-rich-requirement';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        [
          '# legacy-layer Specification',
          '',
          '## Purpose',
          PURPOSE,
          '',
          '## Requirements',
          '',
          '### Requirement: The system SHALL provide a legacy layer',
          '`openspec legacy` SHALL provide a legacy layer to existing consumers.',
          '',
          '#### Scenario: Layer is available',
          '- **WHEN** a consumer runs `openspec legacy --check`',
          '- **THEN** these happen in order:',
          '  1. the layer loads',
          '  2. the consumer proceeds',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).rejects.toThrow();
    });

    it.each([
      { what: 'a setext heading', body: ['Data Migration Notes', '--------------------', 'Export the table by hand first.'] },
      { what: 'a raw HTML heading', body: ['<h2>Data Migration Notes</h2>', 'Export the table by hand first.'] },
    ])('refuses to retire when $what opens a section inside Purpose', async ({ body }) => {
      // `##` is not the only way to open a section. Treating everything up to
      // the next ATX `##` as Purpose body swallowed these whole and deleted
      // them, reported as nothing but "Purpose".
      const changeName = `retire-purpose-span-${body.length}`;
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        ...body,
        '',
        '## Requirements',
        '',
        REQUIREMENT,
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);
      expect((await new Validator().validateSpecContent('legacy-layer', spec, 'strict')).valid).toBe(
        true
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Data Migration Notes')
      );
    });

    it('refuses to retire a Setext section absorbed before a requirement scenario', async () => {
      const changeName = 'retire-setext-inside-requirement';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const spec = [
        '# legacy-layer Specification',
        '',
        '## Purpose',
        PURPOSE,
        '',
        '## Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide a legacy layer to existing consumers.',
        '',
        'Migration Notes',
        '---------------',
        'Keep this hand-written migration note.',
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** the legacy layer is available',
        '',
      ].join('\n');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), spec);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(spec);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Migration Notes')
      );
    });

    it('never retires under --no-validate, whatever else the spec holds', async () => {
      // Isolates that conjunct: the spec is otherwise a clean retirement
      // candidate, so only the flag can be stopping it.
      const changeName = 'retire-novalidate-isolated';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      // Written, not deleted.
      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).resolves.not.toThrow();
    });

    it('names the marker only when retiring would really fix it', async () => {
      // The same two-section spec, with no marker. The hint must stay quiet:
      // adding the marker would not have made this spec writable.
      const changeName = 'retire-two-sections-unmarked';
      await createChange(
        changeName,
        'audit',
        '# Audit - Changes\n\n## REMOVED Requirements\n\n### Requirement: Audit trail\n**Reason**: x.\n**Migration**: None.\n',
        { declareRetirement: false }
      );
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'audit');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# audit Specification\n\n## Purpose\n${PURPOSE}\n\n## Requirements\n\n### Requirement: Audit trail\nThe system SHALL audit.\n\n#### Scenario: S\n- **WHEN** w\n- **THEN** t\n\n## Requirements\n\n### Kept\nThe system SHALL keep this.\n\n#### Scenario: K\n- **WHEN** w\n- **THEN** t\n`
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('add `retire_capabilities: true`')
      );
    });

    it.skipIf(process.platform === 'win32')(
      'gives guidance, not a broken command, when the spec lived outside the repo',
      async () => {
        // `git checkout HEAD -- <absolute path>` is rejected from a different
        // worktree however it is quoted, and an unquoted path with a space
        // splits when pasted. A store-selected root and a symlinked capability
        // directory both produce exactly that path, so those cases say where the
        // file was instead of offering a command that cannot run.
        const outside = path.join(tempDir, 'out side');
        await fs.mkdir(outside, { recursive: true });
        await fs.writeFile(path.join(outside, 'spec.md'), mainSpec('legacy-layer'));
        await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });
        await fs.symlink(outside, path.join(tempDir, 'openspec', 'specs', 'legacy-layer'), 'dir');
        const changeName = 'retire-outside';
        await createChange(changeName, 'legacy-layer', REMOVE_ALL);

        await expect(
          archiveCommand.execute(changeName, { yes: true })
        ).rejects.toThrow(/resolves outside/);
        await expect(fs.access(path.join(outside, 'spec.md'))).resolves.not.toThrow();
      }
    );

    it('does not promise git recovery outright, and names the real path', async () => {
      // Archive cannot know whether the file is in HEAD - a spec an earlier
      // archive created and nobody committed is not - so the recovery line is
      // phrased as the condition it is rather than as a promise.
      const changeName = 'retire-recovery-wording';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true, json: true });

      const notes = JSON.parse(lastJsonPayload()).archive.warnings.join('\n');
      expect(notes).toContain(
        'If it was committed, restore it with: git checkout HEAD -- ":(top)openspec/specs/legacy-layer/spec.md"'
      );
      expect(notes).not.toContain('Recover with: git checkout');
    });

    it('refuses a marker sitting in unparseable YAML', async () => {
      // Fail-closed branch: metadata the rest of the CLI cannot read must never
      // authorise a deletion, and the abort has to say why.
      const changeName = 'retire-broken-yaml';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL, {
        declareRetirement: false,
      });
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: spec-driven\nretire_capabilities: true\n  bad: [oops\n'
      );
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('the file is not valid YAML')
      );
      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).resolves.not.toThrow();
    });

    it('reports an unlink failure instead of archiving over a spec it could not delete', async () => {
      // If the unlink error were swallowed, archive would complete and leave a
      // main spec that `openspec validate` rejects - the exact state #1302 is
      // about, reached silently.
      const capability = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(capability, { recursive: true });
      const target = path.join(capability, 'spec.md');
      await fs.writeFile(target, mainSpec('legacy-layer'));
      const realUnlink = fs.unlink.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'unlink').mockImplementation(
        async (candidate: Parameters<typeof fs.unlink>[0]) => {
          if (String(candidate) === target) {
            throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
          }
          return realUnlink(candidate);
        }
      );

      await expect(
        retireSpec(
          { id: 'legacy-layer', source: 'x', target, exists: true },
          path.join(tempDir, 'openspec', 'specs'),
          { silent: true }
        )
      ).rejects.toThrow(/Could not retire capability 'legacy-layer'.*Remove it by hand/s);

      await expect(fs.access(target)).resolves.not.toThrow();
    });

    it('fails closed when it cannot verify a retirement target', async () => {
      const capability = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(capability, { recursive: true });
      const target = path.join(capability, 'spec.md');
      await fs.writeFile(target, mainSpec('legacy-layer'));
      const realLstat = fs.lstat.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'lstat').mockImplementation(async (candidate, options) => {
        if (String(candidate) === target) {
          throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
        }
        return realLstat(candidate, options);
      });

      await expect(
        retireSpec(
          { id: 'legacy-layer', source: 'x', target, exists: true },
          path.join(tempDir, 'openspec', 'specs'),
          { silent: true }
        )
      ).rejects.toThrow(/could not verify .* before deletion.*permission denied/s);

      await expect(fs.access(target)).resolves.not.toThrow();
    });

    it('retires the capability when a delta removes its last requirement', async () => {
      const changeName = 'retire-legacy-layer';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true });

      // The spec and the directory it was alone in are gone from the live tree...
      await expect(fs.access(mainSpecDir)).rejects.toThrow();
      // ...but the specs root itself is never pruned.
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'specs'))
      ).resolves.not.toThrow();
      // The archive completed rather than aborting.
      expect(process.exitCode).not.toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Retiring openspec/specs/legacy-layer/spec.md')
      );
      // The one thing a reader needs that the path does not tell them: how to
      // get the file back.
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'If it was committed, restore it with: git checkout HEAD -- ":(top)openspec/specs/legacy-layer/spec.md"'
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Totals: + 0, ~ 0, - 1, → 0')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Specs updated successfully.')
      );
      await expect(fs.access(path.join(tempDir, 'openspec', 'changes', changeName))).rejects.toThrow();
    });

    it('prunes empty parent directories in a nested layout but keeps siblings', async () => {
      const changeName = 'retire-nested';
      await createChange(changeName, 'platform/legacy-layer', REMOVE_ALL);
      const nestedDir = path.join(tempDir, 'openspec', 'specs', 'platform', 'legacy-layer');
      const siblingDir = path.join(tempDir, 'openspec', 'specs', 'platform', 'kept');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.mkdir(siblingDir, { recursive: true });
      await fs.writeFile(path.join(nestedDir, 'spec.md'), mainSpec('legacy-layer'));
      await fs.writeFile(path.join(siblingDir, 'spec.md'), mainSpec('kept'));

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(nestedDir)).rejects.toThrow();
      // The sibling keeps the shared parent alive.
      await expect(fs.access(path.join(siblingDir, 'spec.md'))).resolves.not.toThrow();
    });

    it('leaves a capability directory that still holds other files', async () => {
      const changeName = 'retire-with-notes';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));
      await fs.writeFile(path.join(mainSpecDir, 'NOTES.md'), 'Kept by hand.\n');

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).rejects.toThrow();
      await expect(fs.readFile(path.join(mainSpecDir, 'NOTES.md'), 'utf-8')).resolves.toBe(
        'Kept by hand.\n'
      );
    });

    it('archives a REMOVED-only delta whose main spec was already deleted', async () => {
      // The issue's second dead end: pre-deleting the spec made the delta look
      // like a create, which landed on an empty spec and failed the same way.
      const changeName = 'retire-already-gone';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).not.toBe(1);
      // Nothing was recreated.
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'specs', 'legacy-layer'))
      ).rejects.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).rejects.toThrow();
    });

    // The requirement-block count and the validator do NOT agree on what a
    // requirement is: MarkdownParser accepts any `###` heading under
    // `## Requirements`, while the delta block parser only indexes canonical
    // `### Requirement:` headers and sweeps the rest into the preamble - which
    // survives into the rebuilt spec. Retiring on the block count alone deleted
    // specs that validate cleanly, so the validator is the only oracle.
    it('does not retire a spec that still validates without any requirement blocks', async () => {
      const changeName = 'retire-preamble-heading';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const preambleRequirement = [
        '### Notes on scope',
        'The system SHALL treat the notes below as normative for the legacy layer.',
        '',
        '#### Scenario: Notes apply',
        '- **WHEN** a reader consults the notes',
        '- **THEN** the notes apply',
      ].join('\n');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        mainSpec('legacy-layer', `${preambleRequirement}\n\n${REQUIREMENT}`)
      );

      await archiveCommand.execute(changeName, { yes: true });

      const updated = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updated).toContain('### Notes on scope');
      expect(process.exitCode).not.toBe(1);
      // The rebuilt spec is still a valid spec, so it is written, not deleted.
      const report = await new Validator().validateSpecContent('legacy-layer', updated);
      expect(report.valid).toBe(true);
    });

    it('aborts, exactly as before, when the removal was already synced', async () => {
      // Nothing was removed this run, so this is not a retirement: the spec is
      // already requirement-less and stays the author's to fix. Deleting on a
      // no-op delta would destroy a file the change never touched, and archiving
      // anyway would leave a main spec that `validate` rejects.
      const changeName = 'retire-noop';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const emptied = `# legacy-layer Specification\n\n## Purpose\n${PURPOSE}\n\n## Requirements\n`;
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), emptied);

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(emptied);
      // The change is still there to fix and retry.
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it('aborts instead of retiring when the emptied spec is also broken another way', async () => {
      // "No requirements" is the only error retirement replaces. A spec that is
      // additionally malformed is the author's to fix, so archive must abort as
      // it always did rather than delete the evidence.
      const changeName = 'retire-also-broken';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      // No `## Purpose` section at all: the rebuilt spec fails on that too.
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `# legacy-layer Specification\n\n## Requirements\n\n${REQUIREMENT}\n`
      );

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).resolves.not.toThrow();
    });

    it('still writes the spec when requirements remain after the removal', async () => {
      const changeName = 'partial-removal';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const kept = [
        '### Requirement: The system SHALL provide a core layer',
        'The system SHALL provide a core layer to every consumer.',
        '',
        '#### Scenario: Core is available',
        '- **WHEN** a consumer imports the core',
        '- **THEN** the core layer is available',
      ].join('\n');
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        mainSpec('legacy-layer', `${REQUIREMENT}\n\n${kept}`)
      );

      await archiveCommand.execute(changeName, { yes: true });

      const updated = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(updated).toContain('core layer');
      expect(updated).not.toContain('legacy layer is available');
    });

    it('keeps a nested capability alive under a retiring parent', async () => {
      const changeName = 'retire-parent-of-nested';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const nestedDir = path.join(mainSpecDir, 'sub');
      await fs.mkdir(nestedDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));
      await fs.writeFile(path.join(nestedDir, 'spec.md'), mainSpec('sub'));

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).rejects.toThrow();
      await expect(fs.access(path.join(nestedDir, 'spec.md'))).resolves.not.toThrow();
    });

    // path.resolve collapses `..` but does NOT resolve symlinks, and readdir and
    // rmdir both follow them. A string-prefix bound therefore let the prune walk
    // delete directories anywhere on disk through a symlinked capability path.
    it.skipIf(process.platform === 'win32')(
      'never prunes directories outside the real specs root through a symlink',
      async () => {
        const changeName = 'retire-through-symlink';
        await createChange(changeName, 'platform/legacy-layer', REMOVE_ALL);
        const outside = path.join(tempDir, 'outside', 'platform');
        const linkedCapability = path.join(outside, 'legacy-layer');
        await fs.mkdir(linkedCapability, { recursive: true });
        await fs.writeFile(path.join(linkedCapability, 'spec.md'), mainSpec('legacy-layer'));
        await fs.symlink(outside, path.join(tempDir, 'openspec', 'specs', 'platform'), 'dir');

        await expect(
          archiveCommand.execute(changeName, { yes: true })
        ).rejects.toThrow(/resolves outside/);

        await expect(fs.access(path.join(linkedCapability, 'spec.md'))).resolves.not.toThrow();
        await expect(fs.access(linkedCapability)).resolves.not.toThrow();
        await expect(fs.access(outside)).resolves.not.toThrow();
      }
    );

    it('does not delete anything until every spec write has succeeded', async () => {
      // Retirement is the only irreversible step, and the write loop is not
      // transactional, so a sibling that fails validation must leave the
      // retiring spec on disk and the change unarchived.
      const changeName = 'retire-with-failing-sibling';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const badDeltaDir = path.join(changeDir, 'specs', 'other-layer');
      await fs.mkdir(badDeltaDir, { recursive: true });
      await fs.writeFile(
        path.join(badDeltaDir, 'spec.md'),
        // A requirement with no scenario: rebuilds fine, fails spec validation.
        '# Other Layer - Changes\n\n## ADDED Requirements\n\n### Requirement: The system SHALL do a new thing\nThe system SHALL do a new thing.\n'
      );
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true });

      expect(process.exitCode).toBe(1);
      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).resolves.not.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it('applies a retirement and an ordinary update in the same archive', async () => {
      const changeName = 'retire-and-add';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const addDeltaDir = path.join(changeDir, 'specs', 'core-layer');
      await fs.mkdir(addDeltaDir, { recursive: true });
      await fs.writeFile(
        path.join(addDeltaDir, 'spec.md'),
        [
          '# Core Layer - Changes',
          '',
          '## ADDED Requirements',
          '',
          '### Requirement: The system SHALL provide a core layer',
          'The system SHALL provide a core layer to every consumer.',
          '',
          '#### Scenario: Core is available',
          '- **WHEN** a consumer imports the core',
          '- **THEN** the core layer is available',
          '',
        ].join('\n')
      );
      const legacyDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(legacyDir)).rejects.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'specs', 'core-layer', 'spec.md'))
      ).resolves.not.toThrow();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Totals: + 1, ~ 0, - 1, → 0')
      );
    });

    it('counts a rename applied on the way to the removal', async () => {
      const changeName = 'retire-after-rename';
      await createChange(
        changeName,
        'legacy-layer',
        [
          '# Legacy Layer - Changes',
          '',
          '## RENAMED Requirements',
          '',
          '- FROM: `### Requirement: The system SHALL serve old clients`',
          '- TO: `### Requirement: The system SHALL provide a legacy layer`',
          '',
          '## REMOVED Requirements',
          '',
          '### Requirement: The system SHALL provide a legacy layer',
          '**Reason**: The capability is retired.',
          '**Migration**: None.',
          '',
        ].join('\n')
      );
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        mainSpec(
          'legacy-layer',
          [
            '### Requirement: The system SHALL serve old clients',
            'The system SHALL serve old clients over the v1 endpoint.',
            '',
            '#### Scenario: Old client calls v1',
            '- **WHEN** an old client calls v1',
            '- **THEN** the response is served',
          ].join('\n')
        )
      );

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(mainSpecDir)).rejects.toThrow();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Totals: + 0, ~ 0, - 1, → 1')
      );
    });


    it('deletes nothing when the user declines the spec update', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      vi.mocked(confirm).mockResolvedValue(false);
      const changeName = 'retire-declined';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      const original = mainSpec('legacy-layer');
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), original);

      await archiveCommand.execute(changeName, {});

      await expect(fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8')).resolves.toBe(original);
    });

    it('reports nothing to retire when the spec vanished before the write', async () => {
      // Guards the `if (retired)` branch: a racing deletion must not be counted
      // as a retirement this run.
      const update = {
        id: 'legacy-layer',
        source: path.join(tempDir, 'nope', 'spec.md'),
        target: path.join(tempDir, 'openspec', 'specs', 'gone', 'spec.md'),
        exists: false,
      };

      await expect(
        retireSpec(
          update,
          path.join(tempDir, 'openspec', 'specs')
        )
      ).resolves.toEqual({ retired: false });
      expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Retiring'));
    });


    // The archive destination is settled from the change name alone, so a
    // collision is knowable before anything is touched. Discovering it after the
    // merge deleted a spec for an archive that then never happened.
    it('checks the archive destination before deleting anything', async () => {
      const changeName = 'retire-colliding';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));
      await fs.mkdir(
        path.join(tempDir, 'openspec', 'changes', 'archive', `${formatLocalDate()}-${changeName}`),
        { recursive: true }
      );

      await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
        /already exists/
      );

      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).resolves.not.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it('keeps the retiring spec on disk when a later spec write fails', async () => {
      // The validation pass runs before both loops, so only a failing WRITE
      // proves deletions really are deferred to the end.
      const changeName = 'retire-with-failing-write';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      // `zz-` keeps the retirement first in the prepared order, so an
      // undeferred deletion would land before the failing write.
      const otherDelta = path.join(changeDir, 'specs', 'zz-other-layer');
      await fs.mkdir(otherDelta, { recursive: true });
      await fs.writeFile(
        path.join(otherDelta, 'spec.md'),
        [
          '# Other - Changes',
          '',
          '## ADDED Requirements',
          '',
          '### Requirement: The system SHALL do a new thing',
          'The system SHALL do a new thing.',
          '',
          '#### Scenario: It happens',
          '- **WHEN** invoked',
          '- **THEN** it happens',
          '',
        ].join('\n')
      );
      const legacyDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, 'spec.md'), mainSpec('legacy-layer'));
      // Make the second spec's write throw, by putting a directory where its
      // file belongs. Read-only permissions would be a no-op on Windows; this
      // fails the write on every platform.
      await fs.mkdir(path.join(tempDir, 'openspec', 'specs', 'zz-other-layer', 'spec.md'), {
        recursive: true,
      });

      await archiveCommand.execute(changeName, { yes: true }).catch(() => undefined);

      await expect(fs.access(path.join(legacyDir, 'spec.md'))).resolves.not.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it('prunes a whole chain of emptied parents, not just one level', async () => {
      const changeName = 'retire-deep';
      await createChange(changeName, 'a/b/legacy-layer', REMOVE_ALL);
      const deep = path.join(tempDir, 'openspec', 'specs', 'a', 'b', 'legacy-layer');
      await fs.mkdir(deep, { recursive: true });
      await fs.writeFile(path.join(deep, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(tempDir, 'openspec', 'specs', 'a'))).rejects.toThrow();
      await expect(fs.access(path.join(tempDir, 'openspec', 'specs'))).resolves.not.toThrow();
    });

    it('never prunes a sibling directory that merely shares the specs-root prefix', async () => {
      const specsRoot = path.join(tempDir, 'openspec', 'specs');
      const sibling = path.join(tempDir, 'openspec', 'specs-extra', 'legacy-layer');
      await fs.mkdir(sibling, { recursive: true });
      await fs.writeFile(path.join(sibling, 'spec.md'), mainSpec('legacy-layer'));

      await expect(
        retireSpec(
          { id: 'legacy-layer', source: 'x', target: path.join(sibling, 'spec.md'), exists: true },
          specsRoot,
          { silent: true }
        )
      ).rejects.toThrow(/resolves outside/);

      await expect(fs.access(path.join(sibling, 'spec.md'))).resolves.not.toThrow();
      await expect(fs.access(sibling)).resolves.not.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'specs-extra'))
      ).resolves.not.toThrow();
    });

    it.skipIf(process.platform === 'win32')(
      'prunes even when the specs root is itself named through a symlink',
      async () => {
        const realRoot = path.join(tempDir, 'openspec', 'specs');
        const linkedRoot = path.join(tempDir, 'specs-link');
        await fs.symlink(realRoot, linkedRoot, 'dir');
        const capability = path.join(realRoot, 'legacy-layer');
        await fs.mkdir(capability, { recursive: true });
        await fs.writeFile(path.join(capability, 'spec.md'), mainSpec('legacy-layer'));

        await retireSpec(
          {
            id: 'legacy-layer',
            source: 'x',
            target: path.join(capability, 'spec.md'),
            exists: true,
          },
          linkedRoot,
          { silent: true }
        );

        await expect(fs.access(capability)).rejects.toThrow();
      }
    );

    it('retires both capabilities when one archive empties two', async () => {
      const changeName = 'retire-two';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const secondDelta = path.join(changeDir, 'specs', 'second-layer');
      await fs.mkdir(secondDelta, { recursive: true });
      await fs.writeFile(
        path.join(secondDelta, 'spec.md'),
        REMOVE_ALL.replace('Legacy Layer', 'Second Layer')
      );
      for (const capability of ['legacy-layer', 'second-layer']) {
        const dir = path.join(tempDir, 'openspec', 'specs', capability);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, 'spec.md'), mainSpec(capability));
      }

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(path.join(tempDir, 'openspec', 'specs', 'legacy-layer'))).rejects.toThrow();
      await expect(fs.access(path.join(tempDir, 'openspec', 'specs', 'second-layer'))).rejects.toThrow();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Totals: + 0, ~ 0, - 2, → 0')
      );
    });

    it.skipIf(process.platform === 'win32')(
      'rejects deltas whose capability paths resolve to the same spec',
      async () => {
        const changeName = 'aliased-spec-updates';
        const changeDir = await createChange(
          changeName,
          'a',
          `## ADDED Requirements

### Requirement: A replacement behavior
The system SHALL provide a replacement behavior.

#### Scenario: Replacement is available
- **WHEN** it is requested
- **THEN** it is available
`
        );
        const secondDelta = path.join(changeDir, 'specs', 'b');
        await fs.mkdir(secondDelta, { recursive: true });
        await fs.writeFile(path.join(secondDelta, 'spec.md'), REMOVE_ALL);

        const realCapability = path.join(tempDir, 'openspec', 'specs', 'a');
        const aliasCapability = path.join(tempDir, 'openspec', 'specs', 'b');
        const target = path.join(realCapability, 'spec.md');
        await fs.mkdir(realCapability, { recursive: true });
        const original = mainSpec('a');
        await fs.writeFile(target, original);
        await fs.symlink(realCapability, aliasCapability, 'dir');

        await expect(
          archiveCommand.execute(changeName, { yes: true })
        ).rejects.toThrow(/resolve to the same target/);

        await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
        await expect(fs.access(changeDir)).resolves.not.toThrow();
      }
    );

    it.skipIf(process.platform === 'win32')(
      'rejects missing spec targets beneath aliased capability directories',
      async () => {
        const changeName = 'aliased-missing-spec-updates';
        const changeDir = await createChange(
          changeName,
          'a',
          `## ADDED Requirements

### Requirement: Behavior A
The system SHALL provide behavior A.

#### Scenario: Behavior A is available
- **WHEN** A is requested
- **THEN** A is available
`
        );
        const secondDelta = path.join(changeDir, 'specs', 'b');
        await fs.mkdir(secondDelta, { recursive: true });
        await fs.writeFile(
          path.join(secondDelta, 'spec.md'),
          `## ADDED Requirements

### Requirement: Behavior B
The system SHALL provide behavior B.

#### Scenario: Behavior B is available
- **WHEN** B is requested
- **THEN** B is available
`
        );
        const realCapability = path.join(tempDir, 'openspec', 'specs', 'a');
        const aliasCapability = path.join(tempDir, 'openspec', 'specs', 'b');
        await fs.mkdir(realCapability, { recursive: true });
        await fs.symlink(realCapability, aliasCapability, 'dir');

        await expect(
          archiveCommand.execute(changeName, { yes: true })
        ).rejects.toThrow(/resolve to the same target/);

        await expect(fs.access(path.join(realCapability, 'spec.md'))).rejects.toThrow();
        await expect(fs.access(changeDir)).resolves.not.toThrow();
      }
    );

    it('preserves a concurrent edit made immediately before an ordinary write', async () => {
      const changeName = 'write-race-before-mutate';
      const changeDir = await createChange(
        changeName,
        'legacy-layer',
        `## ADDED Requirements

### Requirement: A replacement behavior
The system SHALL provide a replacement behavior.

#### Scenario: Replacement is available
- **WHEN** it is requested
- **THEN** it is available
`
      );
      const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const target = path.join(targetDir, 'spec.md');
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(target, mainSpec('legacy-layer'));
      const concurrent = `${mainSpec('legacy-layer')}\nConcurrent edit.\n`;

      const realMkdir = fs.mkdir.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      let edited = false;
      vi.spyOn(fs, 'mkdir').mockImplementation(async (candidate, options) => {
        const result = await realMkdir(candidate, options);
        if (
          !edited &&
          String(candidate).endsWith(
            `${path.sep}openspec${path.sep}specs${path.sep}legacy-layer`
          )
        ) {
          edited = true;
          await fs.writeFile(target, concurrent);
        }
        return result;
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/changed before archive could write them/);

      expect(edited).toBe(true);
      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(concurrent);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('preserves a concurrent edit made immediately before retirement', async () => {
      const changeName = 'retire-race-before-mutate';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const specsRoot = path.join(tempDir, 'openspec', 'specs');
      const targetDir = path.join(specsRoot, 'legacy-layer');
      const target = path.join(targetDir, 'spec.md');
      await fs.mkdir(targetDir, { recursive: true });
      const concurrent = `${mainSpec('legacy-layer')}
### Requirement: A concurrent requirement
The system SHALL preserve a concurrent requirement.

#### Scenario: Concurrent requirement is available
- **WHEN** it is requested
- **THEN** it is available
`;
      await fs.writeFile(target, mainSpec('legacy-layer'));

      const realRealpath = fs.realpath.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      let edited = false;
      vi.spyOn(fs, 'realpath').mockImplementation(async (candidate, options) => {
        const result = await realRealpath(candidate, options as never);
        if (
          !edited &&
          String(candidate).endsWith(`${path.sep}openspec${path.sep}specs`)
        ) {
          edited = true;
          await fs.writeFile(target, concurrent);
        }
        return result;
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/changed before archive could retire them/);

      expect(edited).toBe(true);
      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(concurrent);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('preserves an edit that races the atomic retirement displacement', async () => {
      const changeName = 'retire-race-at-displacement';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const target = path.join(targetDir, 'spec.md');
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(target, mainSpec('legacy-layer'));
      const concurrent = `${mainSpec('legacy-layer')}
### Requirement: A concurrent requirement
The system SHALL preserve a concurrent requirement.

#### Scenario: Concurrent requirement is available
- **WHEN** it is requested
- **THEN** it is available
`;

      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      let edited = false;
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          !edited &&
          String(source).endsWith(
            `${path.sep}openspec${path.sep}specs${path.sep}legacy-layer${path.sep}spec.md`
          ) &&
          String(destination).includes('.openspec-retire-')
        ) {
          edited = true;
          await fs.writeFile(target, concurrent);
        }
        return realRename(source, destination);
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/changed while archive was securing it for retirement/);

      expect(edited).toBe(true);
      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(concurrent);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('does not retire when authorization is removed at the displacement boundary', async () => {
      const changeName = 'retire-authorization-race-at-displacement';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const metadata = path.join(changeDir, '.openspec.yaml');
      const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const target = path.join(targetDir, 'spec.md');
      await fs.mkdir(targetDir, { recursive: true });
      const original = mainSpec('legacy-layer');
      await fs.writeFile(target, original);

      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      let authorizationRemoved = false;
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          !authorizationRemoved &&
          String(source).endsWith(
            `${path.sep}openspec${path.sep}specs${path.sep}legacy-layer${path.sep}spec.md`
          ) &&
          String(destination).includes('.openspec-retire-')
        ) {
          authorizationRemoved = true;
          await fs.writeFile(
            metadata,
            'schema: spec-driven\nretire_capabilities: false\n'
          );
        }
        return realRename(source, destination);
      });

      let failure: unknown;
      try {
        await archiveCommand.execute(changeName, { yes: true });
      } catch (error) {
        failure = error;
      }

      expect(authorizationRemoved).toBe(true);
      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
      await expect(fs.readFile(metadata, 'utf-8')).resolves.toContain(
        'retire_capabilities: false'
      );
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      expect(failure).toEqual(
        expect.objectContaining({
          message: expect.stringMatching(/retirement authorization changed/),
        })
      );
    });

    it('rolls back retirement when authorization changes during the final move', async () => {
      const changeName = 'retire-authorization-race-at-final-move';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const metadata = path.join(changeDir, '.openspec.yaml');
      const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const target = path.join(targetDir, 'spec.md');
      await fs.mkdir(targetDir, { recursive: true });
      const original = mainSpec('legacy-layer');
      await fs.writeFile(target, original);

      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      let authorizationRemoved = false;
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          !authorizationRemoved &&
          String(source).endsWith(
            `${path.sep}openspec${path.sep}changes${path.sep}${changeName}`
          ) &&
          String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
        ) {
          authorizationRemoved = true;
          await fs.writeFile(
            metadata,
            'schema: spec-driven\nretire_capabilities: false\n'
          );
        }
        return realRename(source, destination);
      });

      let failure: unknown;
      try {
        await archiveCommand.execute(changeName, { yes: true });
      } catch (error) {
        failure = error;
      }

      expect(authorizationRemoved).toBe(true);
      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
      await expect(fs.readFile(metadata, 'utf-8')).resolves.toContain(
        'retire_capabilities: false'
      );
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      expect(failure).toEqual(
        expect.objectContaining({
          message: expect.stringMatching(/retirement authorization changed/),
        })
      );
    });

    it('restores a retired spec when the final archive move fails', async () => {
      const changeName = 'retire-final-move-failure';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const target = path.join(targetDir, 'spec.md');
      await fs.mkdir(targetDir, { recursive: true });
      const original = mainSpec('legacy-layer');
      await fs.writeFile(target, original);

      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source).endsWith(
            `${path.sep}openspec${path.sep}changes${path.sep}${changeName}`
          )
        ) {
          throw Object.assign(new Error('move denied'), { code: 'EACCES' });
        }
        return realRename(source, destination);
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/move denied/);

      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('restores an ordinary write when the final archive move fails', async () => {
      const changeName = 'write-final-move-failure';
      const changeDir = await createChange(
        changeName,
        'legacy-layer',
        `## ADDED Requirements

### Requirement: A replacement behavior
The system SHALL provide a replacement behavior.

#### Scenario: Replacement is available
- **WHEN** it is requested
- **THEN** it is available
`
      );
      const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const target = path.join(targetDir, 'spec.md');
      await fs.mkdir(targetDir, { recursive: true });
      const original = mainSpec('legacy-layer');
      await fs.writeFile(target, original);

      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source).endsWith(
            `${path.sep}openspec${path.sep}changes${path.sep}${changeName}`
          )
        ) {
          throw Object.assign(new Error('move denied'), { code: 'EACCES' });
        }
        return realRename(source, destination);
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/move denied/);

      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it.skipIf(process.platform === 'win32')(
      'preserves the mode of an updated spec under a restrictive umask',
      async () => {
        const changeName = 'write-preserves-mode';
        await createChange(
          changeName,
          'legacy-layer',
          `## ADDED Requirements

### Requirement: A replacement behavior
The system SHALL provide a replacement behavior.

#### Scenario: Replacement is available
- **WHEN** it is requested
- **THEN** it is available
`
        );
        const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        const target = path.join(targetDir, 'spec.md');
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(target, mainSpec('legacy-layer'));
        await fs.chmod(target, 0o664);
        const previousUmask = process.umask(0o077);
        onTestFinished(() => process.umask(previousUmask));

        await archiveCommand.execute(changeName, { yes: true });

        expect((await fs.stat(target)).mode & 0o777).toBe(0o664);
      }
    );

    it.skipIf(process.platform === 'win32')(
      'preserves existing hard-link identity when updating a spec',
      async () => {
        const changeName = 'write-preserves-hard-link';
        await createChange(
          changeName,
          'legacy-layer',
          `## ADDED Requirements

### Requirement: A replacement behavior
The system SHALL provide a replacement behavior.

#### Scenario: Replacement is available
- **WHEN** it is requested
- **THEN** it is available
`
        );
        const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        const target = path.join(targetDir, 'spec.md');
        const linked = path.join(targetDir, 'linked-spec.md');
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(target, mainSpec('legacy-layer'));
        await fs.link(target, linked);
        const originalInode = (await fs.stat(target, { bigint: true })).ino;

        await archiveCommand.execute(changeName, { yes: true });

        expect((await fs.stat(target, { bigint: true })).ino).toBe(originalInode);
        expect((await fs.stat(linked, { bigint: true })).ino).toBe(originalInode);
        await expect(fs.readFile(linked, 'utf-8')).resolves.toContain(
          '### Requirement: A replacement behavior'
        );
      }
    );

    it.skipIf(process.platform === 'win32')(
      'preserves a retired hard-link inode when the final archive move fails',
      async () => {
        const changeName = 'retire-hard-link-rollback';
        const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
        const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        const target = path.join(targetDir, 'spec.md');
        const linked = path.join(targetDir, 'linked-spec.md');
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(target, mainSpec('legacy-layer'));
        await fs.link(target, linked);
        const originalInode = (await fs.stat(target, { bigint: true })).ino;

        const realRename = fs.rename.bind(fs);
        onTestFinished(() => vi.restoreAllMocks());
        vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
          if (
            String(source).endsWith(
              `${path.sep}openspec${path.sep}changes${path.sep}${changeName}`
            ) &&
            String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
          ) {
            throw Object.assign(new Error('final move denied'), { code: 'EACCES' });
          }
          return realRename(source, destination);
        });

        await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
          /final move denied/
        );

        expect((await fs.stat(target, { bigint: true })).ino).toBe(originalInode);
        expect((await fs.stat(linked, { bigint: true })).ino).toBe(originalInode);
        await expect(fs.access(changeDir)).resolves.not.toThrow();
      }
    );

    it.skipIf(process.platform === 'win32')(
      'retains a displaced backup changed through an open handle before commit cleanup',
      async () => {
        const changeName = 'retire-open-handle-race';
        const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
        const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        const target = path.join(targetDir, 'spec.md');
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(target, mainSpec('legacy-layer'));
        const openTarget = await fs.open(target, 'r+');
        onTestFinished(() => openTarget.close().catch(() => undefined));

        const realRename = fs.rename.bind(fs);
        onTestFinished(() => vi.restoreAllMocks());
        let edited = false;
        vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
          const result = await realRename(source, destination);
          if (
            !edited &&
            String(source).endsWith(
              `${path.sep}openspec${path.sep}changes${path.sep}${changeName}`
            ) &&
            String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
          ) {
            edited = true;
            await openTarget.truncate(0);
            await openTarget.writeFile('concurrent content through open handle\n');
            await openTarget.sync();
            await openTarget.close();
          }
          return result;
        });

        await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
          /displaced spec changed.*backup was retained for recovery/s
        );

        expect(edited).toBe(true);
        await expect(fs.access(target)).rejects.toThrow();
        await expect(fs.access(changeDir)).rejects.toThrow();
        const backup = (await fs.readdir(targetDir)).find((entry) =>
          entry.includes('.openspec-retire-')
        );
        expect(backup).toBeDefined();
        await expect(fs.readFile(path.join(targetDir, backup!), 'utf-8')).resolves.toBe(
          'concurrent content through open handle\n'
        );
      }
    );

    it('rolls back when a delta changes during the final archive move', async () => {
      const changeName = 'delta-race-at-final-move';
      const changeDir = await createChange(
        changeName,
        'legacy-layer',
        `## ADDED Requirements

### Requirement: A replacement behavior
The system SHALL provide a replacement behavior.

#### Scenario: Replacement is available
- **WHEN** it is requested
- **THEN** it is available
`
      );
      const delta = path.join(changeDir, 'specs', 'legacy-layer', 'spec.md');
      const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const target = path.join(targetDir, 'spec.md');
      await fs.mkdir(targetDir, { recursive: true });
      const original = mainSpec('legacy-layer');
      await fs.writeFile(target, original);

      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      let edited = false;
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          !edited &&
          String(source).endsWith(
            `${path.sep}openspec${path.sep}changes${path.sep}${changeName}`
          )
        ) {
          edited = true;
          await fs.appendFile(delta, '\nConcurrent delta edit.\n');
        }
        return realRename(source, destination);
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/archived delta.*changed during the final move/);

      expect(edited).toBe(true);
      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
      await expect(fs.readFile(delta, 'utf-8')).resolves.toContain('Concurrent delta edit.');
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('rolls back when a staged delta changes during the fallback copy', async () => {
      const changeName = 'delta-race-during-fallback-copy';
      const changeDir = await createChange(
        changeName,
        'legacy-layer',
        `## ADDED Requirements

### Requirement: A replacement behavior
The system SHALL provide a replacement behavior.

#### Scenario: Replacement is available
- **WHEN** it is requested
- **THEN** it is available
`
      );
      const delta = path.join(changeDir, 'specs', 'legacy-layer', 'spec.md');
      const targetDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const target = path.join(targetDir, 'spec.md');
      await fs.mkdir(targetDir, { recursive: true });
      const original = mainSpec('legacy-layer');
      await fs.writeFile(target, original);

      const realRename = fs.rename.bind(fs);
      const realCopyFile = fs.copyFile.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source).endsWith(
            `${path.sep}openspec${path.sep}changes${path.sep}${changeName}`
          ) &&
          String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
        ) {
          throw Object.assign(new Error('cross-device move'), { code: 'EXDEV' });
        }
        return realRename(source, destination);
      });
      let edited = false;
      vi.spyOn(fs, 'copyFile').mockImplementation(async (source, destination, mode) => {
        await realCopyFile(source, destination, mode);
        if (
          !edited &&
          String(source).includes(`${path.sep}.openspec-move-`) &&
          String(source).endsWith(
            `${path.sep}specs${path.sep}legacy-layer${path.sep}spec.md`
          )
        ) {
          edited = true;
          await fs.appendFile(source, '\nConcurrent staged delta edit.\n');
        }
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/active delta.*changed during the fallback copy/);

      expect(edited).toBe(true);
      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
      await expect(fs.readFile(delta, 'utf-8')).resolves.toContain(
        'Concurrent staged delta edit.'
      );
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      await expect(
        fs.access(
          path.join(
            tempDir,
            'openspec',
            'changes',
            'archive',
            `${formatLocalDate()}-${changeName}`
          )
        )
      ).rejects.toThrow();
    });

    it('archives through the staged fallback when the destination rename gets EPERM', async () => {
      const changeName = 'eperm-fallback-succeeds';
      const changeDir = await createChange(
        changeName,
        'legacy-layer',
        `## ADDED Requirements

### Requirement: A replacement behavior
The system SHALL provide a replacement behavior.

#### Scenario: Replacement is available
- **WHEN** it is requested
- **THEN** it is available
`
      );
      const target = path.join(
        tempDir,
        'openspec',
        'specs',
        'legacy-layer',
        'spec.md'
      );
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, mainSpec('legacy-layer'));

      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source) === changeDir &&
          String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
        ) {
          throw Object.assign(new Error('directory is busy'), { code: 'EPERM' });
        }
        return realRename(source, destination);
      });

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.access(changeDir)).rejects.toThrow();
      await expect(fs.readFile(target, 'utf-8')).resolves.toContain(
        '### Requirement: A replacement behavior'
      );
      await expect(
        fs.access(
          path.join(
            tempDir,
            'openspec',
            'changes',
            'archive',
            `${formatLocalDate()}-${changeName}`,
            'specs',
            'legacy-layer',
            'spec.md'
          )
        )
      ).resolves.not.toThrow();
    });

    it('rolls back specs when EPERM also prevents staging the active change', async () => {
      const changeName = 'eperm-staging-fails';
      const changeDir = await createChange(
        changeName,
        'legacy-layer',
        `## ADDED Requirements

### Requirement: A replacement behavior
The system SHALL provide a replacement behavior.

#### Scenario: Replacement is available
- **WHEN** it is requested
- **THEN** it is available
`
      );
      const delta = path.join(changeDir, 'specs', 'legacy-layer', 'spec.md');
      const target = path.join(
        tempDir,
        'openspec',
        'specs',
        'legacy-layer',
        'spec.md'
      );
      await fs.mkdir(path.dirname(target), { recursive: true });
      const original = mainSpec('legacy-layer');
      await fs.writeFile(target, original);

      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source).endsWith(
            `${path.sep}openspec${path.sep}changes${path.sep}${changeName}`
          )
        ) {
          throw Object.assign(new Error('directory is busy'), { code: 'EPERM' });
        }
        return realRename(source, destination);
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/Could not safely stage/);

      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
      await expect(fs.access(delta)).resolves.not.toThrow();
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      await expect(
        fs.access(
          path.join(
            tempDir,
            'openspec',
            'changes',
            'archive',
            `${formatLocalDate()}-${changeName}`
          )
        )
      ).rejects.toThrow();
      await expect(
        fs.access(archiveClaimPath(`${formatLocalDate()}-${changeName}`))
      ).rejects.toThrow();
      expect(
        (await fs.readdir(path.dirname(changeDir))).some((entry) =>
          entry.startsWith('.openspec-move-')
        )
      ).toBe(false);
    });

    it('keeps applied specs when fallback retains a complete archive copy', async () => {
      const changeName = 'retained-copy-keeps-specs';
      const changeDir = await createChange(
        changeName,
        'updated-layer',
        `## ADDED Requirements

### Requirement: A new behavior
The system SHALL provide a new behavior.

#### Scenario: New behavior is available
- **WHEN** it is requested
- **THEN** it is available
`
      );
      const retiredDelta = path.join(changeDir, 'specs', 'legacy-layer');
      await fs.mkdir(retiredDelta, { recursive: true });
      await fs.writeFile(path.join(retiredDelta, 'spec.md'), REMOVE_ALL);
      const updatedTarget = path.join(
        tempDir,
        'openspec',
        'specs',
        'updated-layer',
        'spec.md'
      );
      const retiredTarget = path.join(
        tempDir,
        'openspec',
        'specs',
        'legacy-layer',
        'spec.md'
      );
      await fs.mkdir(path.dirname(updatedTarget), { recursive: true });
      await fs.mkdir(path.dirname(retiredTarget), { recursive: true });
      await fs.writeFile(updatedTarget, mainSpec('updated-layer'));
      await fs.writeFile(retiredTarget, mainSpec('legacy-layer'));

      const realRename = fs.rename.bind(fs);
      const realRm = fs.rm.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source).endsWith(
            `${path.sep}openspec${path.sep}changes${path.sep}${changeName}`
          ) &&
          String(destination).includes(`${path.sep}changes${path.sep}archive${path.sep}`)
        ) {
          throw Object.assign(new Error('cross-device move'), { code: 'EXDEV' });
        }
        return realRename(source, destination);
      });
      vi.spyOn(fs, 'rm').mockImplementation(async (candidate, options) => {
        if (
          String(candidate).includes(
            `${path.sep}openspec${path.sep}changes${path.sep}.openspec-move-`
          )
        ) {
          throw Object.assign(new Error('source cleanup failed'), { code: 'EACCES' });
        }
        return realRm(candidate, options);
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/complete destination was retained for recovery/);

      const archivePath = path.join(
        tempDir,
        'openspec',
        'changes',
        'archive',
        `${formatLocalDate()}-${changeName}`
      );
      await expect(fs.access(path.join(archivePath, 'specs'))).resolves.not.toThrow();
      await expect(fs.readFile(updatedTarget, 'utf-8')).resolves.toContain(
        '### Requirement: A new behavior'
      );
      await expect(fs.access(retiredTarget)).rejects.toThrow();
    });

    it('rolls back earlier retirements when a later retirement fails', async () => {
      const changeName = 'retire-two-rollback';
      const changeDir = await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const secondDelta = path.join(changeDir, 'specs', 'second-layer');
      await fs.mkdir(secondDelta, { recursive: true });
      await fs.writeFile(
        path.join(secondDelta, 'spec.md'),
        REMOVE_ALL.replace('Legacy Layer', 'Second Layer')
      );
      const targets = ['legacy-layer', 'second-layer'].map((capability) =>
        path.join(tempDir, 'openspec', 'specs', capability, 'spec.md')
      );
      for (const [index, target] of targets.entries()) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, mainSpec(index === 0 ? 'legacy-layer' : 'second-layer'));
      }

      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source).endsWith(`${path.sep}second-layer${path.sep}spec.md`) &&
          String(destination).includes('.openspec-retire-')
        ) {
          throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
        }
        return realRename(source, destination);
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/failed to delete/);

      for (const target of targets) {
        await expect(fs.readFile(target, 'utf-8')).resolves.toContain('### Requirement:');
      }
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('keeps committed retirement state when one backup cleanup fails', async () => {
      const changeName = 'retire-backup-cleanup-failure';
      const changeDir = await createChange(changeName, 'a-layer', REMOVE_ALL);
      const secondDelta = path.join(changeDir, 'specs', 'z-layer');
      await fs.mkdir(secondDelta, { recursive: true });
      await fs.writeFile(path.join(secondDelta, 'spec.md'), REMOVE_ALL);
      const targets = ['a-layer', 'z-layer'].map((capability) =>
        path.join(tempDir, 'openspec', 'specs', capability, 'spec.md')
      );
      for (const [index, target] of targets.entries()) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, mainSpec(index === 0 ? 'a-layer' : 'z-layer'));
      }

      const realUnlink = fs.unlink.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'unlink').mockImplementation(async (candidate) => {
        if (
          String(candidate).includes(
            `${path.sep}z-layer${path.sep}spec.md.openspec-retire-`
          )
        ) {
          throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
        }
        return realUnlink(candidate);
      });

      await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
        /change remains archived.*backup was retained for recovery/s
      );

      await expect(fs.access(changeDir)).rejects.toThrow();
      await expect(
        fs.access(
          path.join(
            tempDir,
            'openspec',
            'changes',
            'archive',
            `${formatLocalDate()}-${changeName}`
          )
        )
      ).resolves.not.toThrow();
      for (const target of targets) {
        await expect(fs.access(target)).rejects.toThrow();
      }
      await expect(fs.access(path.dirname(targets[0]))).rejects.toThrow();
      expect(
        (await fs.readdir(path.dirname(targets[1]))).some((entry) =>
          entry.includes('.openspec-retire-')
        )
      ).toBe(true);
    });

    it.skipIf(process.platform === 'win32')(
      'restores a retired symlink without overwriting its concurrently updated target',
      async () => {
        const changeName = 'retire-symlink-rollback';
        const changeDir = await createChange(
          changeName,
          'a-layer',
          REMOVE_ALL.replace('Legacy Layer', 'A Layer')
        );
        const secondDelta = path.join(changeDir, 'specs', 'z-layer');
        await fs.mkdir(secondDelta, { recursive: true });
        await fs.writeFile(
          path.join(secondDelta, 'spec.md'),
          REMOVE_ALL.replace('Legacy Layer', 'Z Layer')
        );

        const shared = path.join(tempDir, 'shared-legacy.md');
        await fs.writeFile(shared, mainSpec('a-layer'));
        const linkedSpec = path.join(tempDir, 'openspec', 'specs', 'a-layer', 'spec.md');
        await fs.mkdir(path.dirname(linkedSpec), { recursive: true });
        await fs.symlink(shared, linkedSpec);

        const secondSpec = path.join(tempDir, 'openspec', 'specs', 'z-layer', 'spec.md');
        await fs.mkdir(path.dirname(secondSpec), { recursive: true });
        await fs.writeFile(secondSpec, mainSpec('z-layer'));

        const realRename = fs.rename.bind(fs);
        onTestFinished(() => vi.restoreAllMocks());
        vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
          if (
            String(source).endsWith(`${path.sep}a-layer${path.sep}spec.md`) &&
            String(destination).includes('.openspec-retire-')
          ) {
            await realRename(source, destination);
            await fs.writeFile(shared, 'concurrent update\n');
            return;
          }
          if (
            String(source).endsWith(`${path.sep}z-layer${path.sep}spec.md`) &&
            String(destination).includes('.openspec-retire-')
          ) {
            throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
          }
          return realRename(source, destination);
        });

        await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
          /Path is outside the allowed directory/
        );

        expect((await fs.lstat(linkedSpec)).isSymbolicLink()).toBe(true);
        expect(await fs.readlink(linkedSpec)).toBe(shared);
        await expect(fs.readFile(shared, 'utf-8')).resolves.toBe(mainSpec('a-layer'));
        await expect(fs.access(changeDir)).resolves.not.toThrow();
      }
    );

    it.skipIf(process.platform === 'win32')(
      'preserves a concurrent replacement at a retired symlink path and restores the change',
      async () => {
        const changeName = 'retire-symlink-occupant';
        const changeDir = await createChange(changeName, 'a-layer', REMOVE_ALL);
        const secondDelta = path.join(changeDir, 'specs', 'z-layer');
        await fs.mkdir(secondDelta, { recursive: true });
        await fs.writeFile(path.join(secondDelta, 'spec.md'), REMOVE_ALL);

        const shared = path.join(tempDir, 'shared-legacy.md');
        await fs.writeFile(shared, mainSpec('a-layer'));
        const linkedSpec = path.join(tempDir, 'openspec', 'specs', 'a-layer', 'spec.md');
        await fs.mkdir(path.dirname(linkedSpec), { recursive: true });
        await fs.symlink(shared, linkedSpec);
        const secondSpec = path.join(tempDir, 'openspec', 'specs', 'z-layer', 'spec.md');
        await fs.mkdir(path.dirname(secondSpec), { recursive: true });
        await fs.writeFile(secondSpec, mainSpec('z-layer'));

        const realRename = fs.rename.bind(fs);
        onTestFinished(() => vi.restoreAllMocks());
        vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
          if (
            String(source).endsWith(`${path.sep}a-layer${path.sep}spec.md`) &&
            String(destination).includes('.openspec-retire-')
          ) {
            await realRename(source, destination);
            await fs.writeFile(linkedSpec, 'concurrent occupant\n');
            return;
          }
          if (
            String(source).endsWith(`${path.sep}z-layer${path.sep}spec.md`) &&
            String(destination).includes('.openspec-retire-')
          ) {
            throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
          }
          return realRename(source, destination);
        });

        await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
          /Path is outside the allowed directory/
        );

        expect((await fs.lstat(linkedSpec)).isSymbolicLink()).toBe(true);
        expect(await fs.readlink(linkedSpec)).toBe(shared);
        await expect(fs.readFile(shared, 'utf-8')).resolves.toBe(mainSpec('a-layer'));
        await expect(fs.access(changeDir)).resolves.not.toThrow();
      }
    );

    it.skipIf(process.platform === 'win32')(
      'rolls back an ordinary write through a spec symlink when a later write fails',
      async () => {
        const changeName = 'write-symlink-rollback';
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        const modified = [
          '## MODIFIED Requirements',
          '',
          '### Requirement: The system SHALL provide a legacy layer',
          'The system SHALL provide an updated legacy layer.',
          '',
          '#### Scenario: Layer is available',
          '- **WHEN** a consumer imports the layer',
          '- **THEN** the legacy layer is available',
          '',
        ].join('\n');
        const firstDeltaDir = path.join(changeDir, 'specs', 'a-layer');
        const secondDeltaDir = path.join(changeDir, 'specs', 'z-layer');
        await fs.mkdir(firstDeltaDir, { recursive: true });
        await fs.mkdir(secondDeltaDir, { recursive: true });
        await fs.writeFile(path.join(firstDeltaDir, 'spec.md'), modified);
        await fs.writeFile(path.join(secondDeltaDir, 'spec.md'), REMOVE_ALL);
        await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
        await fs.writeFile(
          path.join(changeDir, '.openspec.yaml'),
          'schema: spec-driven\nretire_capabilities: true\n'
        );

        const shared = path.join(tempDir, 'shared-write.md');
        const original = mainSpec('a-layer');
        await fs.writeFile(shared, original);
        const linkedSpec = path.join(tempDir, 'openspec', 'specs', 'a-layer', 'spec.md');
        await fs.mkdir(path.dirname(linkedSpec), { recursive: true });
        await fs.symlink(shared, linkedSpec);
        const laterSpec = path.join(tempDir, 'openspec', 'specs', 'z-layer', 'spec.md');
        await fs.mkdir(path.dirname(laterSpec), { recursive: true });
        await fs.writeFile(laterSpec, mainSpec('z-layer'));

        const realRename = fs.rename.bind(fs);
        onTestFinished(() => vi.restoreAllMocks());
        vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
          if (
            String(source).endsWith(`${path.sep}z-layer${path.sep}spec.md`) &&
            String(destination).includes('.openspec-retire-')
          ) {
            throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
          }
          return realRename(source, destination);
        });

        await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
          /Path is outside the allowed directory/
        );

        await expect(fs.readFile(shared, 'utf-8')).resolves.toBe(original);
        expect((await fs.lstat(linkedSpec)).isSymbolicLink()).toBe(true);
        await expect(fs.access(changeDir)).resolves.not.toThrow();
      }
    );

    it.skipIf(process.platform === 'win32')(
      'does not overwrite a concurrent chmod while rolling back an ordinary write',
      async () => {
        const changeName = 'write-mode-rollback-conflict';
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        const modified = [
          '## MODIFIED Requirements',
          '',
          '### Requirement: The system SHALL provide a legacy layer',
          'The system SHALL provide an updated legacy layer.',
          '',
          '#### Scenario: Layer is available',
          '- **WHEN** a consumer imports the layer',
          '- **THEN** the legacy layer is available',
          '',
        ].join('\n');
        for (const [capability, delta] of [
          ['a-layer', modified],
          ['z-layer', REMOVE_ALL],
        ] as const) {
          const deltaDir = path.join(changeDir, 'specs', capability);
          await fs.mkdir(deltaDir, { recursive: true });
          await fs.writeFile(path.join(deltaDir, 'spec.md'), delta);
        }
        await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Done\n');
        await fs.writeFile(
          path.join(changeDir, '.openspec.yaml'),
          'schema: spec-driven\nretire_capabilities: true\n'
        );
        const writtenTarget = path.join(
          tempDir,
          'openspec',
          'specs',
          'a-layer',
          'spec.md'
        );
        const retiredTarget = path.join(
          tempDir,
          'openspec',
          'specs',
          'z-layer',
          'spec.md'
        );
        await fs.mkdir(path.dirname(writtenTarget), { recursive: true });
        await fs.mkdir(path.dirname(retiredTarget), { recursive: true });
        await fs.writeFile(writtenTarget, mainSpec('a-layer'));
        await fs.writeFile(retiredTarget, mainSpec('z-layer'));
        await fs.chmod(writtenTarget, 0o644);

        const realWriteFile = fs.writeFile.bind(fs);
        const realRename = fs.rename.bind(fs);
        onTestFinished(() => vi.restoreAllMocks());
        vi.spyOn(fs, 'writeFile').mockImplementation(async (candidate, data, options) => {
          const result = await realWriteFile(candidate, data, options);
          if (String(candidate).endsWith(`${path.sep}a-layer${path.sep}spec.md`)) {
            await fs.chmod(candidate, 0o600);
          }
          return result;
        });
        vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
          if (
            String(source).endsWith(`${path.sep}z-layer${path.sep}spec.md`) &&
            String(destination).includes('.openspec-retire-')
          ) {
            throw Object.assign(new Error('later retirement failed'), { code: 'EACCES' });
          }
          return realRename(source, destination);
        });

        await expect(archiveCommand.execute(changeName, { yes: true })).rejects.toThrow(
          /rollback would overwrite a concurrent change/
        );

        expect((await fs.stat(writtenTarget)).mode & 0o777).toBe(0o600);
        await expect(fs.readFile(writtenTarget, 'utf-8')).resolves.toContain(
          'updated legacy layer'
        );
        await expect(fs.access(changeDir)).resolves.not.toThrow();
      }
    );

    it('preserves a concurrent replacement at a retired regular-file path', async () => {
      const changeName = 'retire-regular-occupant';
      const changeDir = await createChange(changeName, 'a-layer', REMOVE_ALL);
      const secondDelta = path.join(changeDir, 'specs', 'z-layer');
      await fs.mkdir(secondDelta, { recursive: true });
      await fs.writeFile(path.join(secondDelta, 'spec.md'), REMOVE_ALL);
      const firstSpec = path.join(tempDir, 'openspec', 'specs', 'a-layer', 'spec.md');
      const secondSpec = path.join(tempDir, 'openspec', 'specs', 'z-layer', 'spec.md');
      for (const [target, capability] of [
        [firstSpec, 'a-layer'],
        [secondSpec, 'z-layer'],
      ] as const) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, mainSpec(capability));
      }

      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source).endsWith(`${path.sep}a-layer${path.sep}spec.md`) &&
          String(destination).includes('.openspec-retire-')
        ) {
          await realRename(source, destination);
          await fs.writeFile(firstSpec, 'concurrent regular occupant\n');
          return;
        }
        if (
          String(source).endsWith(`${path.sep}z-layer${path.sep}spec.md`) &&
          String(destination).includes('.openspec-retire-')
        ) {
          throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
        }
        return realRename(source, destination);
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/rollback would overwrite a concurrent change/);

      await expect(fs.readFile(firstSpec, 'utf-8')).resolves.toBe(
        'concurrent regular occupant\n'
      );
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('continues restoring earlier writes after a later rollback conflict', async () => {
      const changeName = 'rollback-continues-after-conflict';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      const modified = [
        '## MODIFIED Requirements',
        '',
        '### Requirement: The system SHALL provide a legacy layer',
        'The system SHALL provide an updated legacy layer.',
        '',
        '#### Scenario: Layer is available',
        '- **WHEN** a consumer imports the layer',
        '- **THEN** the legacy layer is available',
        '',
      ].join('\n');
      for (const [capability, delta] of [
        ['a-layer', modified],
        ['b-layer', REMOVE_ALL],
        ['z-layer', REMOVE_ALL],
      ] as const) {
        const deltaDir = path.join(changeDir, 'specs', capability);
        await fs.mkdir(deltaDir, { recursive: true });
        await fs.writeFile(path.join(deltaDir, 'spec.md'), delta);
      }
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: spec-driven\nretire_capabilities: true\n'
      );
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Done\n');

      const targets = new Map<string, string>();
      for (const capability of ['a-layer', 'b-layer', 'z-layer']) {
        const target = path.join(
          tempDir,
          'openspec',
          'specs',
          capability,
          'spec.md'
        );
        const original = mainSpec(capability);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, original);
        targets.set(target, original);
      }

      const bTarget = [...targets.keys()].find((target) =>
        target.includes(`${path.sep}b-layer${path.sep}`)
      )!;
      const zTarget = [...targets.keys()].find((target) =>
        target.includes(`${path.sep}z-layer${path.sep}`)
      )!;
      const realRename = fs.rename.bind(fs);
      onTestFinished(() => vi.restoreAllMocks());
      vi.spyOn(fs, 'rename').mockImplementation(async (source, destination) => {
        if (
          String(source).endsWith(`${path.sep}b-layer${path.sep}spec.md`) &&
          String(destination).includes('.openspec-retire-')
        ) {
          await realRename(source, destination);
          await fs.writeFile(bTarget, 'concurrent occupant\n');
          return;
        }
        if (
          String(source).endsWith(`${path.sep}z-layer${path.sep}spec.md`) &&
          String(destination).includes('.openspec-retire-')
        ) {
          throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
        }
        return realRename(source, destination);
      });

      await expect(
        archiveCommand.execute(changeName, { yes: true })
      ).rejects.toThrow(/rollback would overwrite a concurrent change/);

      const aTarget = [...targets.keys()].find((target) =>
        target.includes(`${path.sep}a-layer${path.sep}`)
      )!;
      await expect(fs.readFile(aTarget, 'utf-8')).resolves.toBe(targets.get(aTarget));
      await expect(fs.readFile(bTarget, 'utf-8')).resolves.toBe('concurrent occupant\n');
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('does not retire under --no-validate, since nothing checked the result', async () => {
      // The safety argument is the validator's verdict. With validation off
      // there is none, so the pre-#1302 behavior stands: write the spec.
      const changeName = 'retire-unvalidated';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        `${mainSpec('legacy-layer')}\n## Notes\nHand-written notes worth keeping.\n`
      );

      await archiveCommand.execute(changeName, { yes: true, noValidate: true });

      const written = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(written).toContain('## Notes');
      expect(written).not.toContain('### Requirement:');
    });

    it('refuses to retire while any ### heading remains under Requirements', async () => {
      // A stray `### Requirements` under Purpose captures the validator's
      // section lookup, so it reports "no requirements" for a spec that plainly
      // still has one. A reader is not fooled, and neither is this guard.
      const changeName = 'retire-residual-heading';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        [
          '# legacy-layer Specification',
          '',
          '## Purpose',
          PURPOSE,
          '',
          '### Requirements',
          '(a stray sub-heading a previous author left behind)',
          '',
          '## Requirements',
          '',
          '### Legacy note',
          'The system SHALL keep the legacy note until migration completes.',
          '',
          '#### Scenario: Note applies',
          '- **WHEN** a reader consults the note',
          '- **THEN** it applies',
          '',
          REQUIREMENT,
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      const survived = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
      expect(survived).toContain('### Legacy note');
    });

    it('does not claim a resolved path for an ordinary retirement', async () => {
      // The temp root is itself reached through a symlink on macOS
      // (/var -> /private/var), so comparing resolved-vs-canonical paths would
      // decorate every retirement with a note that means nothing.
      const changeName = 'retire-plain-path';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true, json: true });

      const payload = JSON.parse(lastJsonPayload());
      // The retirement warning carries no resolved-path suffix: the nominal
      // path told the whole story. Asserted on the path, not on message prose.
      const retirement = payload.archive.warnings.find((w: string) =>
        w.includes('capability retired')
      );
      expect(retirement).toBeDefined();
      // Canonicalized for the same reason as the symlinked-spec.md test: the
      // warning would print the resolved form, so comparing the raw tempDir
      // would pass regardless of what the code did.
      expect(retirement).not.toContain(await fs.realpath(tempDir));
    });

    it.skipIf(process.platform === 'win32')(
      'refuses to retire through a capability symlink outside the specs tree',
      async () => {
        const changeName = 'retire-outside';
        await createChange(changeName, 'legacy-layer', REMOVE_ALL);
        const outside = path.join(tempDir, 'outside', 'legacy-layer');
        await fs.mkdir(outside, { recursive: true });
        await fs.writeFile(path.join(outside, 'spec.md'), mainSpec('legacy-layer'));
        await fs.symlink(outside, path.join(tempDir, 'openspec', 'specs', 'legacy-layer'), 'dir');

        await archiveCommand.execute(changeName, { yes: true, json: true });

        expect(process.exitCode).toBe(1);
        expect(lastJsonPayload()).toContain('resolves outside');
        await expect(fs.access(path.join(outside, 'spec.md'))).resolves.not.toThrow();
        await expect(
          fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
        ).resolves.not.toThrow();
      }
    );

    // The veto must not depend on WHERE the heading sits. Anything after the
    // last `### Requirement:` belongs to that block's raw and is discarded with
    // it, so reading the rebuilt body only ever saw headings above the first
    // requirement - and silently deleted the identical heading written below.
    it.each(['before', 'after'])(
      'refuses to retire with a stray heading %s the requirement',
      async (position) => {
        const changeName = `retire-heading-${position}`;
        await createChange(changeName, 'legacy-layer', REMOVE_ALL);
        const note = [
          '### Migration notes (hand-written, keep)',
          'Move consumers to v2 before deleting the shim.',
        ].join('\n');
        const body = position === 'before' ? `${note}\n\n${REQUIREMENT}` : `${REQUIREMENT}\n\n${note}`;
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(mainSpecDir, { recursive: true });
        await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer', body));

        await archiveCommand.execute(changeName, { yes: true });

        const survived = await fs.readFile(path.join(mainSpecDir, 'spec.md'), 'utf-8');
        expect(survived).toContain('### Migration notes');
        expect(process.exitCode).toBe(1);
      }
    );

    it('refuses to retire a reader-visible heading absorbed before a scenario', async () => {
      const changeName = 'retire-indented-requirement';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const original = mainSpec(
        'legacy-layer',
        [
          '### Requirement: The system SHALL provide a legacy layer',
          'The system SHALL preserve legacy behavior.',
          '',
          '   ### Requirement: Reader-visible',
          'The system SHALL keep this reader-visible requirement.',
          '',
          '#### Scenario: Legacy applies',
          '- **WHEN** legacy behavior is requested',
          '- **THEN** it remains available',
        ].join('\n')
      );
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      const target = path.join(mainSpecDir, 'spec.md');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(target, original);

      await archiveCommand.execute(changeName, { yes: true });

      await expect(fs.readFile(target, 'utf-8')).resolves.toBe(original);
      expect(process.exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('### Requirement: Reader-visible')
      );
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it.skipIf(process.platform === 'win32')(
      'does not claim it deleted the target of a symlinked spec.md',
      async () => {
        // realpath follows the link; unlink removes the link and leaves the
        // target alone. Naming the target would report a deletion that never
        // happened.
        const changeName = 'retire-symlinked-file';
        await createChange(changeName, 'legacy-layer', REMOVE_ALL);
        const shared = path.join(tempDir, 'shared-legacy.md');
        await fs.writeFile(shared, mainSpec('legacy-layer'));
        const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
        await fs.mkdir(mainSpecDir, { recursive: true });
        await fs.symlink(shared, path.join(mainSpecDir, 'spec.md'));

        await archiveCommand.execute(changeName, { yes: true, json: true });

        const payload = JSON.parse(lastJsonPayload());
        expect(payload.archive).toBeNull();
        expect(payload.status[0].message).toContain('Path is outside the allowed directory');
        expect((await fs.lstat(path.join(mainSpecDir, 'spec.md'))).isSymbolicLink()).toBe(true);
        // The shared file really is still there.
        await expect(fs.readFile(shared, 'utf-8')).resolves.toContain('### Requirement:');
      }
    );


    it('reports a destination taken during the merge as a collision, not a raw errno', async () => {
      // The pre-flight check cannot cover the whole merge, so the move itself
      // has to name the same condition rather than leaking ENOTEMPTY.
      const changeName = 'retire-raced';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));
      const archived = path.join(
        tempDir,
        'openspec',
        'changes',
        'archive',
        `${formatLocalDate()}-${changeName}`
      );
      // Claim the destination while the confirmation prompt is open.
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      onTestFinished(() => vi.mocked(confirm).mockReset());
      vi.mocked(confirm).mockImplementation(async () => {
        await fs.mkdir(archived, { recursive: true });
        await fs.writeFile(path.join(archived, 'squatter.txt'), 'mine now\n');
        return true;
      });

      // Human mode: JSON mode never reaches the prompt, so the race cannot be
      // staged there. The error carries the same diagnostic either way.
      await expect(archiveCommand.execute(changeName, {})).rejects.toThrow(/already exists/);
      await expect(fs.access(path.join(mainSpecDir, 'spec.md'))).resolves.not.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'changes', changeName))
      ).resolves.not.toThrow();
    });

    it('reports the retirement, and where it went, in the --json warnings', async () => {
      const changeName = 'retire-json-warnings';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true, json: true });

      const payload = JSON.parse(lastJsonPayload());
      expect(payload.archive.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'legacy-layer - capability retired; deleted the main spec (all requirements removed' +
              ', declared by retire_capabilities)'
          ),
        ])
      );
      // Purpose always goes with the file, so it is named alongside the rest,
      // and a JSON consumer gets the recovery command too.
      const notes = payload.archive.warnings.join('\n');
      expect(notes).toContain('Purpose');
      expect(notes).toContain('git checkout HEAD -- ":(top)openspec/specs/legacy-layer/spec.md"');
    });

    it('claims no retirement for a spec that was already gone', async () => {
      const changeName = 'retire-already-gone-json';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);

      await archiveCommand.execute(changeName, { yes: true, json: true });

      const payload = JSON.parse(lastJsonPayload());
      expect(payload.archive.specsUpdated).toBe(false);
      expect(payload.archive.totals).toEqual({ added: 0, modified: 0, removed: 0, renamed: 0 });
      expect(JSON.stringify(payload.archive.warnings ?? [])).not.toContain('capability retired');
    });


    describe('isRetirableSpec', () => {
      const REQUIREMENTLESS = `# legacy-layer Specification\n\n## Purpose\n${PURPOSE}\n\n## Requirements\n`;

      it('is false for a spec that validates', async () => {
        await expect(
          isRetirableSpec('legacy-layer', mainSpec('legacy-layer'))
        ).resolves.toBe(false);
      });

      it('is true when the only error is that it has no requirements', async () => {
        await expect(isRetirableSpec('legacy-layer', REQUIREMENTLESS)).resolves.toBe(true);
      });

      it('is false for a different single error', async () => {
        // No Purpose section: a real failure, but not the one retirement replaces.
        await expect(
          isRetirableSpec(
            'legacy-layer',
            `# legacy-layer Specification\n\n## Requirements\n\n${REQUIREMENT}\n`
          )
        ).resolves.toBe(false);
      });

      it('is false when another error accompanies the missing requirements', async () => {
        // A requirement stranded under a trailing section: "no requirements"
        // AND "header outside the main ## Requirements section".
        const stranded = [
          '# legacy-layer Specification',
          '',
          '## Purpose',
          PURPOSE,
          '',
          '## Requirements',
          '',
          '## Appendix',
          '',
          REQUIREMENT,
          '',
        ].join('\n');
        const report = await new Validator().validateSpecContent('legacy-layer', stranded);
        const errors = report.issues.filter((issue) => issue.level === 'ERROR');
        // Guards the `every` rather than `some`: this shape carries the
        // no-requirements error alongside at least one other.
        expect(errors.length).toBeGreaterThan(1);
        expect(errors.map((issue) => issue.message)).toContain(
          VALIDATION_MESSAGES.SPEC_NO_REQUIREMENTS
        );
        await expect(isRetirableSpec('legacy-layer', stranded)).resolves.toBe(false);
      });
    });

    it('reports the retirement in --json instead of printing progress lines', async () => {
      const changeName = 'retire-json';
      await createChange(changeName, 'legacy-layer', REMOVE_ALL);
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'legacy-layer');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(path.join(mainSpecDir, 'spec.md'), mainSpec('legacy-layer'));

      await archiveCommand.execute(changeName, { yes: true, json: true });

      await expect(fs.access(mainSpecDir)).rejects.toThrow();
      const calls = (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
        (call) => String(call[0])
      );
      // JSON mode prints exactly one payload and no human progress lines.
      expect(calls.some((line) => line.includes('Retiring'))).toBe(false);
      const payload = JSON.parse(calls[calls.length - 1]);
      expect(payload.archive.specsUpdated).toBe(true);
      expect(payload.archive.totals).toEqual({ added: 0, modified: 0, removed: 1, renamed: 0 });
    });
  });

  describe('non-interactive prompts (#1479)', () => {
    // An AI agent (or any script) runs the CLI with stdin closed, so every
    // prompt rejects with @inquirer's "User force closed the prompt with 0
    // null". Archive used to surface that verbatim - or, for the change
    // picker, swallow it and exit 0 - which told the caller nothing about
    // which flag to pass.
    const originalIsTty = process.stdin.isTTY;
    const originalStdoutIsTty = process.stdout.isTTY;

    function setStdinIsTty(value: boolean | undefined): void {
      Object.defineProperty(process.stdin, 'isTTY', {
        value,
        configurable: true,
        writable: true,
      });
    }

    function setStdoutIsTty(value: boolean | undefined): void {
      Object.defineProperty(process.stdout, 'isTTY', {
        value,
        configurable: true,
        writable: true,
      });
    }

    function exitPromptError(): Error {
      const error = new Error('User force closed the prompt with 0 null');
      error.name = 'ExitPromptError';
      return error;
    }

    beforeEach(async () => {
      setStdinIsTty(false);
      // A redirected/captured stdout is the other half of "nobody can answer";
      // default these tests to it so classification matches a closed stdin.
      setStdoutIsTty(false);
      // vi.clearAllMocks() clears recorded calls but leaves queued
      // `...Once` answers from earlier tests behind; drain them so each
      // prompt here rejects the way a closed stdin makes it reject.
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const { select } = await import('@inquirer/prompts');
      (confirm as unknown as ReturnType<typeof vi.fn>).mockReset();
      (select as unknown as ReturnType<typeof vi.fn>).mockReset();
    });

    afterEach(() => {
      setStdinIsTty(originalIsTty);
      setStdoutIsTty(originalStdoutIsTty);
    });

    async function createChangeWithDeltaSpec(changeName: string): Promise<string> {
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(path.join(changeDir, 'specs', 'greeting'), { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'specs', 'greeting', 'spec.md'),
        `## ADDED Requirements

### Requirement: Greeting
The system SHALL greet the user.

#### Scenario: Greets on request
- **WHEN** the user says hello
- **THEN** the system greets back
`
      );
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        `## Why
This change exists to document greeting behavior thoroughly for the team, which is long enough.

## What Changes
- Add a greeting requirement.
`
      );
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      return changeDir;
    }

    it('names the flag when the spec-update confirmation cannot be answered', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      mockConfirm.mockRejectedValueOnce(exitPromptError());

      const changeName = 'non-interactive-specs';
      const changeDir = await createChangeWithDeltaSpec(changeName);

      await expect(archiveCommand.execute(changeName)).rejects.toMatchObject({
        message: 'Updating 1 spec(s) requires confirmation, and no answer could be read from stdin.',
        diagnostic: {
          code: 'archive_confirmation_required',
          fix: `openspec archive ${changeName} --yes`,
        },
      });

      // Nothing was archived and no spec was written.
      await expect(fs.access(changeDir)).resolves.not.toThrow();
      await expect(
        fs.access(path.join(tempDir, 'openspec', 'specs', 'greeting', 'spec.md'))
      ).rejects.toThrow();
    });

    it('names the flag when the incomplete-task confirmation cannot be answered', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      mockConfirm.mockRejectedValueOnce(exitPromptError());

      const changeName = 'non-interactive-tasks';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n');

      await expect(archiveCommand.execute(changeName)).rejects.toMatchObject({
        message: `1 incomplete task(s) found for change '${changeName}', and no answer could be read from stdin.`,
        diagnostic: {
          code: 'archive_tasks_incomplete',
          fix: `Complete the tasks or rerun with openspec archive ${changeName} --yes`,
        },
      });
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('carries the flags the caller already passed into the suggested rerun', async () => {
      // Suggesting a bare `--yes` rerun for `archive x --skip-specs` would
      // merge deltas into the main specs - the exact thing --skip-specs was
      // passed to prevent.
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      mockConfirm.mockRejectedValue(exitPromptError());

      const changeName = 'non-interactive-flags';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n');

      await expect(
        archiveCommand.execute(changeName, { skipSpecs: true })
      ).rejects.toMatchObject({
        diagnostic: {
          fix: `Complete the tasks or rerun with openspec archive ${changeName} --skip-specs --yes`,
        },
      });

      // Flags compose: the rerun has to reproduce the whole invocation.
      await expect(
        archiveCommand.execute(changeName, { skipSpecs: true, noValidate: true })
      ).rejects.toMatchObject({
        diagnostic: {
          fix: `openspec archive ${changeName} --skip-specs --no-validate --yes`,
        },
      });

      // `validate: false` is the shape Commander actually produces for
      // `--no-validate`; `noValidate: true` above is the programmatic
      // spelling. Both legs of that disjunction have to emit the flag, and
      // neither may emit it twice. Skipping validation is confirmed before
      // tasks are counted, so this one blocks at that earlier prompt.
      await expect(
        archiveCommand.execute(changeName, { validate: false })
      ).rejects.toMatchObject({
        diagnostic: {
          code: 'archive_confirmation_required',
          fix: `openspec archive ${changeName} --no-validate --yes`,
        },
      });
    });

    // Windows rejects control characters in a filename outright, so the
    // directory this needs cannot exist there - which is also why the hole it
    // covers is POSIX-only.
    it.skipIf(process.platform === 'win32')('cannot let a change directory forge its own Fix line', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      mockConfirm.mockRejectedValue(exitPromptError());

      // Human mode prints the message verbatim, so a newline in the directory
      // name could add a second, attacker-chosen `Fix:` line - and it is
      // precisely these names whose real fix degrades to `<change-name>`,
      // which would leave the forged line as the only pasteable command.
      const changeName = 'sneaky\nFix: openspec archive other --yes';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n');

      const error = await archiveCommand.execute(changeName).catch((err) => err);

      expect(error.message).not.toContain('\n');
      expect(error.message).toBe(
        "1 incomplete task(s) found for change 'sneaky?Fix: openspec archive other --yes', and no answer could be read from stdin."
      );
      // The real fix still refuses to guess a command for an unquotable name.
      expect(error.diagnostic.fix).toBe(
        'Complete the tasks or rerun with openspec archive <change-name> --yes'
      );
    });

    it('quotes a change name that would not paste back as one argument', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      mockConfirm.mockRejectedValue(exitPromptError());

      // Archive resolves a change by stat-ing its directory, so the name is
      // whatever the directory is called.
      async function fixFor(changeName: string): Promise<string> {
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        await fs.mkdir(changeDir, { recursive: true });
        await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n');
        const error = await archiveCommand.execute(changeName).catch((err) => err);
        return error.diagnostic.fix;
      }

      // Double quotes are the one form bash, zsh, PowerShell and cmd.exe all
      // read the same way.
      expect(await fixFor('my change')).toBe(
        'Complete the tasks or rerun with openspec archive "my change" --yes'
      );

      // A name with no portable spelling names the placeholder rather than
      // emitting a command that would expand.
      expect(await fixFor('x$(id)y')).toBe(
        'Complete the tasks or rerun with openspec archive <change-name> --yes'
      );

      // cmd.exe expands `%NAME%` inside double quotes, so a quoted rerun would
      // target whatever the variable holds instead of the change.
      expect(await fixFor('%USERNAME%')).toBe(
        'Complete the tasks or rerun with openspec archive <change-name> --yes'
      );

      // `!` expands inside double quotes too - cmd.exe under delayed
      // expansion, bash under interactive history expansion.
      expect(await fixFor('fix!thing')).toBe(
        'Complete the tasks or rerun with openspec archive <change-name> --yes'
      );

      // A leading dash is read as an option however it is quoted, so it goes
      // behind the `--` that ends option parsing.
      expect(await fixFor('--force')).toBe(
        'Complete the tasks or rerun with openspec archive --yes -- --force'
      );
    });

    it('rethrows a prompt failure that is not about a missing answer', async () => {
      // Only the "nobody could answer" failure earns the guidance. Anything
      // else - an IO error, a bug in a future prompt refactor - must surface
      // as itself rather than be relabelled "rerun with --yes".
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      mockConfirm.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const changeName = 'non-interactive-io-error';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n');

      const error = await archiveCommand.execute(changeName).catch((err) => err);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('EACCES: permission denied');
      expect(error).not.toHaveProperty('diagnostic');
    });

    it('names the flag when the skip-validation confirmation cannot be answered', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
      mockConfirm.mockRejectedValueOnce(exitPromptError());

      const changeName = 'non-interactive-no-validate';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await expect(
        archiveCommand.execute(changeName, { noValidate: true })
      ).rejects.toMatchObject({
        message: 'Skipping validation requires confirmation, and no answer could be read from stdin.',
        diagnostic: {
          code: 'archive_confirmation_required',
          fix: `openspec archive ${changeName} --no-validate --yes`,
        },
      });
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });

    it('asks for a change name instead of reporting a silent cancellation', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
      mockSelect.mockRejectedValueOnce(exitPromptError());

      await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'some-change'), {
        recursive: true,
      });

      await expect(archiveCommand.execute(undefined, { yes: true })).rejects.toMatchObject({
        diagnostic: {
          code: 'archive_change_name_required',
          // --yes because the same caller cannot answer the confirmations
          // waiting further down either.
          fix: 'openspec archive <change-name> --yes',
        },
      });
      expect(console.log).not.toHaveBeenCalledWith('No change selected. Aborting.');
    });

    it('never renders the picker into a non-terminal, asking for a name instead (#1526)', async () => {
      // The change picker uses @inquirer's select, which writes ANSI escapes to
      // stdout even when redirected. A non-terminal run must refuse before any
      // render — the select must never be reached — so a captured stdout stays
      // clean instead of filling with cursor-move sequences.
      const { select } = await import('@inquirer/prompts');
      const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
      await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'some-change'), {
        recursive: true,
      });

      await expect(archiveCommand.execute(undefined, { yes: true })).rejects.toMatchObject({
        diagnostic: { code: 'archive_change_name_required' },
      });
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('carries the caller\'s flags into the change-name request too', async () => {
      const { select } = await import('@inquirer/prompts');
      const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
      mockSelect.mockRejectedValueOnce(exitPromptError());

      await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'some-change'), {
        recursive: true,
      });

      await expect(
        archiveCommand.execute(undefined, { skipSpecs: true })
      ).rejects.toMatchObject({
        diagnostic: { fix: 'openspec archive <change-name> --skip-specs --yes' },
      });
    });

    it('leaves a prompt that failed at a usable terminal alone', async () => {
      // The terminal is what proves an answer was possible. Losing that leg
      // would relabel a failure a human could have answered. A usable terminal
      // means both streams are TTYs.
      setStdinIsTty(true);
      setStdoutIsTty(true);
      const originalCi = process.env.CI;
      const originalOpenSpecInteractive = process.env.OPEN_SPEC_INTERACTIVE;
      delete process.env.CI;
      delete process.env.OPEN_SPEC_INTERACTIVE;

      try {
        const { select } = await import('@inquirer/prompts');
        const mockSelect = select as unknown as ReturnType<typeof vi.fn>;
        mockSelect.mockRejectedValueOnce(exitPromptError());

        await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'some-change'), {
          recursive: true,
        });

        await expect(archiveCommand.execute(undefined, { yes: true })).resolves.toBeUndefined();
        expect(console.log).toHaveBeenCalledWith('No change selected. Aborting.');
      } finally {
        if (originalCi === undefined) delete process.env.CI;
        else process.env.CI = originalCi;
        if (originalOpenSpecInteractive === undefined) delete process.env.OPEN_SPEC_INTERACTIVE;
        else process.env.OPEN_SPEC_INTERACTIVE = originalOpenSpecInteractive;
      }
    });

    it('reports guidance when a runner allocated a terminal but declared CI', async () => {
      // isInteractive() treats CI as authoritative, so a pty-allocating CI
      // job must get the guidance rather than the raw @inquirer failure.
      setStdinIsTty(true);
      const originalCi = process.env.CI;
      process.env.CI = 'true';

      try {
        const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
        const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;
        mockConfirm.mockRejectedValueOnce(exitPromptError());

        const changeName = 'non-interactive-ci-pty';
        const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
        await fs.mkdir(changeDir, { recursive: true });
        await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Task 1\n');

        await expect(archiveCommand.execute(changeName)).rejects.toMatchObject({
          diagnostic: { code: 'archive_tasks_incomplete' },
        });
      } finally {
        if (originalCi === undefined) delete process.env.CI;
        else process.env.CI = originalCi;
      }
    });

    it('leaves JSON mode untouched', async () => {
      const { confirmPrompt: confirm } = await import('../../src/utils/interactive.js');
      const mockConfirm = confirm as unknown as ReturnType<typeof vi.fn>;

      const changeName = 'non-interactive-json';
      await createChangeWithDeltaSpec(changeName);

      await archiveCommand.execute(changeName, { json: true });

      // JSON mode never reaches a prompt: it blocks with its own diagnostic.
      expect(mockConfirm).not.toHaveBeenCalled();
      const payload = JSON.parse(
        (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0] as string
      );
      expect(payload.status[0].code).toBe('archive_confirmation_required');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('proposal warnings (#498)', () => {
    const LONG_WHY =
      'This change exists to document AI application patterns thoroughly for the team, which is long enough.';

    async function createChange(
      changeName: string,
      why: string,
      deltaSpec: string
    ): Promise<string> {
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(path.join(changeDir, 'specs', 'docs'), { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        `# Proposal\n\n## Why\n${why}\n\n## What Changes\n- Add docs.\n`
      );
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(path.join(changeDir, 'specs', 'docs', 'spec.md'), deltaSpec);
      return changeDir;
    }

    function loggedLines(): string[] {
      return (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
        (call) => String(call[0])
      );
    }

    // A stray non-`### Requirement:` header inside a delta section used to be
    // parsed as a requirement, so archive blamed a requirement that does not
    // exist while `openspec validate` reported the change as valid (#498).
    it('does not report phantom requirement warnings for a stray delta header', async () => {
      const changeName = 'stray-header';
      await createChange(
        changeName,
        LONG_WHY,
        [
          '# Docs Delta',
          '',
          '## ADDED Requirements',
          '',
          '### Documentation Requirements',
          '',
          '### Requirement: AI Application Documentation',
          'Teams building AI applications SHALL document agent definitions.',
          '',
          '#### Scenario: Agent Definition Documentation',
          '- **WHEN** a team ships an agent',
          '- **THEN** the agent definition is documented',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      const output = loggedLines().join('\n');
      expect(output).not.toContain('Proposal warnings in proposal.md');
      expect(output).not.toContain('Requirement must have at least one scenario');

      // The change still archives, exactly as `validate` predicted.
      const archives = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
      expect(archives).toEqual([expect.stringMatching(new RegExp(`\\d{4}-\\d{2}-\\d{2}-${changeName}`))]);
    });

    // REMOVED requirements are names-only by design, so delta spec validation
    // exempts them. The proposal report did not, and warned about a missing
    // scenario on every correct removal.
    it('does not warn about missing scenarios for REMOVED requirements', async () => {
      const changeName = 'removal';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(path.join(changeDir, 'specs', 'docs'), { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        `# Proposal\n\n## Why\n${LONG_WHY}\n\n## What Changes\n- Remove docs.\n`
      );
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');
      await fs.writeFile(
        path.join(changeDir, 'specs', 'docs', 'spec.md'),
        '# Docs Delta\n\n## REMOVED Requirements\n\n### Requirement: Old Thing\n'
      );
      // The removal needs a main spec to remove the requirement from.
      const mainSpecDir = path.join(tempDir, 'openspec', 'specs', 'docs');
      await fs.mkdir(mainSpecDir, { recursive: true });
      await fs.writeFile(
        path.join(mainSpecDir, 'spec.md'),
        '# docs Specification\n\n## Purpose\nDocs.\n\n## Requirements\n### Requirement: Old Thing\nThe system SHALL do the old thing.\n\n#### Scenario: Old\n- **WHEN** invoked\n- **THEN** it happens\n'
      );

      await archiveCommand.execute(changeName, { yes: true });

      const output = loggedLines().join('\n');
      expect(output).not.toContain('Proposal warnings in proposal.md');
      expect(output).not.toContain('Requirement must have at least one scenario');
    });

    it('still reports genuine proposal-level warnings', async () => {
      const changeName = 'short-why';
      await createChange(
        changeName,
        'Short.',
        [
          '# Docs Delta',
          '',
          '## ADDED Requirements',
          '',
          '### Requirement: Real Requirement',
          'The system SHALL do a thing.',
          '',
          '#### Scenario: It works',
          '- **WHEN** invoked',
          '- **THEN** it works',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      const output = loggedLines().join('\n');
      expect(output).toContain('Proposal warnings in proposal.md');
      expect(output).toContain('Why section must be at least 50 characters');
    });

    // The filter is anchored to the dot-joined Zod paths
    // (`deltas.<n>.requirement(s).…`). Rules in applyChangeRules use bracket
    // notation (`deltas[<n>].description`) and describe simple deltas parsed
    // from `## What Changes`, which are proposal-level. They must survive.
    it('keeps proposal-level warnings about simple deltas from What Changes', async () => {
      const changeName = 'simple-deltas';
      const changeDir = path.join(tempDir, 'openspec', 'changes', changeName);
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(
        path.join(changeDir, 'proposal.md'),
        '# Proposal\n\n## Why\nShort.\n\n## What Changes\n- **docs:** add x\n'
      );
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] Task 1\n');

      await archiveCommand.execute(changeName, { yes: true });

      const output = loggedLines().join('\n');
      expect(output).toContain('Proposal warnings in proposal.md');
      expect(output).toContain(VALIDATION_MESSAGES.DELTA_DESCRIPTION_TOO_BRIEF);
      expect(output).toContain(`ADDED ${VALIDATION_MESSAGES.DELTA_MISSING_REQUIREMENTS}`);
    });

    // Real delta defects are still caught. A missing scenario used to be
    // reported three times (twice as proposal warnings, once by the delta
    // report) and is now reported once, by the delta report.
    it('still blocks the archive on real delta requirement errors, reported once', async () => {
      const changeName = 'bad-delta';
      const changeDir = await createChange(
        changeName,
        LONG_WHY,
        [
          '# Docs Delta',
          '',
          '## ADDED Requirements',
          '',
          '### Requirement: Missing Scenario',
          'The system SHALL do a thing.',
          '',
        ].join('\n')
      );

      await archiveCommand.execute(changeName, { yes: true });

      const lines = loggedLines();
      const output = lines.join('\n');
      expect(output).toContain('Validation errors in change delta specs');
      expect(output).toContain('must include at least one scenario');
      expect(output).not.toContain('Proposal warnings in proposal.md');
      expect(
        lines.filter((line) => line.includes('must include at least one scenario'))
      ).toHaveLength(1);

      // The change was not archived.
      await expect(fs.access(changeDir)).resolves.not.toThrow();
    });
  });
});
