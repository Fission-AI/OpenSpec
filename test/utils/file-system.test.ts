import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { FileSystemUtils } from '../../src/utils/file-system.js';

describe('FileSystemUtils', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('createDirectory', () => {
    it('should create a directory', async () => {
      const dirPath = path.join(testDir, 'new-dir');
      await FileSystemUtils.createDirectory(dirPath);
      
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(testDir, 'nested', 'deep', 'dir');
      await FileSystemUtils.createDirectory(dirPath);
      
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      const dirPath = path.join(testDir, 'existing-dir');
      await fs.mkdir(dirPath);
      
      await expect(FileSystemUtils.createDirectory(dirPath)).resolves.not.toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      await fs.writeFile(filePath, 'test content');
      
      const exists = await FileSystemUtils.fileExists(filePath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const filePath = path.join(testDir, 'non-existent.txt');
      
      const exists = await FileSystemUtils.fileExists(filePath);
      expect(exists).toBe(false);
    });

    it('should return false for directory path', async () => {
      const dirPath = path.join(testDir, 'dir');
      await fs.mkdir(dirPath);
      
      const exists = await FileSystemUtils.fileExists(dirPath);
      expect(exists).toBe(true); // fs.access doesn't distinguish between files and directories
    });
  });

  describe('directoryExists', () => {
    it('should return true for existing directory', async () => {
      const dirPath = path.join(testDir, 'test-dir');
      await fs.mkdir(dirPath);
      
      const exists = await FileSystemUtils.directoryExists(dirPath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing directory', async () => {
      const dirPath = path.join(testDir, 'non-existent-dir');
      
      const exists = await FileSystemUtils.directoryExists(dirPath);
      expect(exists).toBe(false);
    });

    it('should return false for file path', async () => {
      const filePath = path.join(testDir, 'file.txt');
      await fs.writeFile(filePath, 'content');
      
      const exists = await FileSystemUtils.directoryExists(filePath);
      expect(exists).toBe(false);
    });
  });

  describe('writeFile', () => {
    it('should write content to file', async () => {
      const filePath = path.join(testDir, 'output.txt');
      const content = 'Hello, World!';
      
      await FileSystemUtils.writeFile(filePath, content);
      
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });

    it('should create directory if it does not exist', async () => {
      const filePath = path.join(testDir, 'nested', 'dir', 'output.txt');
      const content = 'Nested content';
      
      await FileSystemUtils.writeFile(filePath, content);
      
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe(content);
    });

    it('should overwrite existing file', async () => {
      const filePath = path.join(testDir, 'existing.txt');
      await fs.writeFile(filePath, 'old content');
      
      const newContent = 'new content';
      await FileSystemUtils.writeFile(filePath, newContent);
      
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe(newContent);
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const filePath = path.join(testDir, 'input.txt');
      const content = 'Test content';
      await fs.writeFile(filePath, content);
      
      const readContent = await FileSystemUtils.readFile(filePath);
      expect(readContent).toBe(content);
    });

    it('should throw for non-existing file', async () => {
      const filePath = path.join(testDir, 'non-existent.txt');
      
      await expect(FileSystemUtils.readFile(filePath)).rejects.toThrow();
    });
  });

  describe('ensureWritePermissions', () => {
    it('should return true for writable directory', async () => {
      const hasPermission = await FileSystemUtils.ensureWritePermissions(testDir);
      expect(hasPermission).toBe(true);
    });

    it('should return true for non-existing directory with writable parent', async () => {
      const dirPath = path.join(testDir, 'new-dir');
      const hasPermission = await FileSystemUtils.ensureWritePermissions(dirPath);
      expect(hasPermission).toBe(true);
    });

    it('should handle deeply nested non-existing directories', async () => {
      const dirPath = path.join(testDir, 'a', 'b', 'c', 'd');
      const hasPermission = await FileSystemUtils.ensureWritePermissions(dirPath);
      expect(hasPermission).toBe(true);
    });
  });

  describe('canWriteFile', () => {
    it('should return true for existing writable file', async () => {
      const filePath = path.join(testDir, 'writable.txt');
      await fs.writeFile(filePath, 'content');

      const canWrite = await FileSystemUtils.canWriteFile(filePath);
      expect(canWrite).toBe(true);
    });

    it('should return false for existing read-only file', async () => {
      const filePath = path.join(testDir, 'readonly.txt');
      await fs.writeFile(filePath, 'content');
      await fs.chmod(filePath, 0o444); // Read-only

      const canWrite = await FileSystemUtils.canWriteFile(filePath);
      expect(canWrite).toBe(false);

      // Cleanup: restore permissions so afterEach can delete
      await fs.chmod(filePath, 0o644);
    });

    it('should return true for non-existent file in writable directory', async () => {
      const filePath = path.join(testDir, 'new-file.txt');

      const canWrite = await FileSystemUtils.canWriteFile(filePath);
      expect(canWrite).toBe(true);
    });

    it('should return true for non-existent file in non-existent nested directories', async () => {
      const filePath = path.join(testDir, 'deep', 'nested', 'path', 'file.txt');

      const canWrite = await FileSystemUtils.canWriteFile(filePath);
      expect(canWrite).toBe(true);
    });

    // Skip on Windows: fs.chmod() on directories doesn't restrict write access on Windows
    // Windows uses ACLs which Node.js chmod doesn't control
    it.skipIf(process.platform === 'win32')('should return false for non-existent file in read-only directory', async () => {
      const readOnlyDir = path.join(testDir, 'readonly-dir');
      await fs.mkdir(readOnlyDir);
      await fs.chmod(readOnlyDir, 0o555); // Read-only + execute

      const filePath = path.join(readOnlyDir, 'file.txt');
      const canWrite = await FileSystemUtils.canWriteFile(filePath);
      expect(canWrite).toBe(false);

      // Cleanup
      await fs.chmod(readOnlyDir, 0o755);
    });

    it('should return true when path points to existing directory', async () => {
      const dirPath = path.join(testDir, 'some-dir');
      await fs.mkdir(dirPath);

      const canWrite = await FileSystemUtils.canWriteFile(dirPath);
      expect(canWrite).toBe(true);
    });

    it('should traverse multiple non-existent parent directories', async () => {
      const filePath = path.join(testDir, 'a', 'b', 'c', 'd', 'e', 'file.txt');

      const canWrite = await FileSystemUtils.canWriteFile(filePath);
      expect(canWrite).toBe(true);
    });

    it('should return false when intermediate path component is a file', async () => {
      // Create a file where a directory should be
      const fileInPath = path.join(testDir, 'blocking-file.txt');
      await fs.writeFile(fileInPath, 'content');

      // Try to check a path that goes "through" this file
      const filePath = path.join(fileInPath, 'nested', 'file.txt');
      const canWrite = await FileSystemUtils.canWriteFile(filePath);
      expect(canWrite).toBe(false);
    });

    // Skip on Windows: creating symlinks requires elevated privileges or Developer Mode
    it.skipIf(process.platform === 'win32')('should follow symbolic links to files', async () => {
      const realFile = path.join(testDir, 'real-file.txt');
      const linkFile = path.join(testDir, 'link-file.txt');
      await fs.writeFile(realFile, 'content');
      await fs.symlink(realFile, linkFile);

      const canWrite = await FileSystemUtils.canWriteFile(linkFile);
      expect(canWrite).toBe(true);
    });

    it('should handle platform-specific path separators', async () => {
      const filePath = FileSystemUtils.joinPath(testDir, 'subdir', 'file.txt');
      const canWrite = await FileSystemUtils.canWriteFile(filePath);
      expect(canWrite).toBe(true);
    });
  });

  describe('joinPath', () => {
    it('should join POSIX-style paths', () => {
      const result = FileSystemUtils.joinPath(
        '/tmp/project',
        '.claude/commands/openspec/proposal.md'
      );
      expect(result).toBe('/tmp/project/.claude/commands/openspec/proposal.md');
    });

    it('should join Linux home directory paths', () => {
      const result = FileSystemUtils.joinPath(
        '/home/dev/workspace/openspec',
        '.cursor/commands/install.md'
      );
      expect(result).toBe('/home/dev/workspace/openspec/.cursor/commands/install.md');
    });

    it('should join Windows drive-letter paths with backslashes', () => {
      const result = FileSystemUtils.joinPath(
        'C:\\Users\\dev\\project',
        '.claude/commands/openspec/proposal.md'
      );
      expect(result).toBe(
        'C:\\Users\\dev\\project\\.claude\\commands\\openspec\\proposal.md'
      );
    });

    it('should join Windows paths that use forward slashes', () => {
      const result = FileSystemUtils.joinPath(
        'D:/workspace/app',
        '.cursor/commands/openspec-apply.md'
      );
      expect(result).toBe(
        'D:\\workspace\\app\\.cursor\\commands\\openspec-apply.md'
      );
    });

    it('should join UNC-style Windows paths', () => {
      const result = FileSystemUtils.joinPath(
        '\\server\\share\\repo',
        '.windsurf/workflows/openspec-archive.md'
      );
      expect(result).toBe(
        '\\server\\share\\repo\\.windsurf\\workflows\\openspec-archive.md'
      );
    });
  });
});
