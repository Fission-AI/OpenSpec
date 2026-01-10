import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FishInstaller } from '../../../../src/core/completions/installers/fish-installer.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

describe('FishInstaller', () => {
  let testHomeDir: string;
  let installer: FishInstaller;

  beforeEach(async () => {
    testHomeDir = path.join(os.tmpdir(), `openspec-fish-test-${randomUUID()}`);
    await fs.mkdir(testHomeDir, { recursive: true });
    installer = new FishInstaller(testHomeDir);
  });

  afterEach(async () => {
    await fs.rm(testHomeDir, { recursive: true, force: true });
  });

  describe('getInstallationPath', () => {
    it('should return standard fish completions path', () => {
      const result = installer.getInstallationPath();
      expect(result).toBe(path.join(testHomeDir, '.config', 'fish', 'completions', 'openspec.fish'));
    });

    it('should use homeDir from constructor', () => {
      const customHome = '/custom/home';
      const customInstaller = new FishInstaller(customHome);
      const result = customInstaller.getInstallationPath();
      expect(result).toBe(path.join(customHome, '.config', 'fish', 'completions', 'openspec.fish'));
    });
  });

  describe('backupExistingFile', () => {
    it('should return undefined when file does not exist', async () => {
      const nonExistentPath = path.join(testHomeDir, 'does-not-exist.fish');
      const backupPath = await installer.backupExistingFile(nonExistentPath);
      expect(backupPath).toBeUndefined();
    });

    it('should create backup with timestamp in filename', async () => {
      const filePath = path.join(testHomeDir, 'test.fish');
      await fs.writeFile(filePath, 'test content');

      const backupPath = await installer.backupExistingFile(filePath);

      expect(backupPath).toBeDefined();
      expect(backupPath).toMatch(/\.backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });

    it('should copy file content to backup', async () => {
      const filePath = path.join(testHomeDir, 'test.fish');
      const originalContent = '# Original fish completion script\nfunction test_func\nend';
      await fs.writeFile(filePath, originalContent);

      const backupPath = await installer.backupExistingFile(filePath);

      expect(backupPath).toBeDefined();
      const backupContent = await fs.readFile(backupPath!, 'utf-8');
      expect(backupContent).toBe(originalContent);
    });

    it('should create backup next to original file', async () => {
      const filePath = path.join(testHomeDir, 'subdir', 'test.fish');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'content');

      const backupPath = await installer.backupExistingFile(filePath);

      expect(backupPath).toBeDefined();
      expect(path.dirname(backupPath!)).toBe(path.dirname(filePath));
    });
  });

  describe('install', () => {
    const mockCompletionScript = `# Fish completion script for OpenSpec CLI
function __fish_openspec
    echo "test"
end

complete -c openspec -a 'init' -d 'Initialize OpenSpec'
`;

    it('should install completion script for the first time', async () => {
      const result = await installer.install(mockCompletionScript);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Completion script installed successfully for Fish');
      expect(result.installedPath).toBe(path.join(testHomeDir, '.config', 'fish', 'completions', 'openspec.fish'));
      expect(result.backupPath).toBeUndefined();
      expect(result.instructions).toHaveLength(2);
      expect(result.instructions![0]).toContain('Fish automatically loads completions');
      expect(result.instructions![1]).toContain('Completions are available immediately');
    });

    it('should create parent directories if they do not exist', async () => {
      const result = await installer.install(mockCompletionScript);

      expect(result.success).toBe(true);
      const targetPath = path.join(testHomeDir, '.config', 'fish', 'completions', 'openspec.fish');
      const dirExists = await fs.access(path.dirname(targetPath)).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    it('should write completion script content correctly', async () => {
      await installer.install(mockCompletionScript);

      const targetPath = path.join(testHomeDir, '.config', 'fish', 'completions', 'openspec.fish');
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe(mockCompletionScript);
    });

    it('should detect when already installed with same content', async () => {
      // First installation
      await installer.install(mockCompletionScript);

      // Second installation with same content
      const result = await installer.install(mockCompletionScript);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Completion script is already installed (up to date)');
      expect(result.instructions![0]).toContain('already installed and up to date');
      expect(result.backupPath).toBeUndefined();
    });

    it('should update when content is different', async () => {
      // Initial installation
      await installer.install(mockCompletionScript);

      // Update with different content
      const updatedScript = `# Fish completion script for OpenSpec CLI
function __fish_openspec_new
    echo "updated"
end

complete -c openspec -a 'init' -d 'Initialize OpenSpec'
complete -c openspec -a 'validate' -d 'Validate specs'
`;

      const result = await installer.install(updatedScript);

      expect(result.success).toBe(true);
      expect(result.message).toContain('updated successfully');
      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).toMatch(/\.backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });

    it('should create backup when updating existing installation', async () => {
      const originalScript = mockCompletionScript;
      await installer.install(originalScript);

      const updatedScript = originalScript + '\n# Updated version';
      const result = await installer.install(updatedScript);

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();

      // Verify backup contains original content
      const backupContent = await fs.readFile(result.backupPath!, 'utf-8');
      expect(backupContent).toBe(originalScript);

      // Verify current file has updated content
      const targetPath = path.join(testHomeDir, '.config', 'fish', 'completions', 'openspec.fish');
      const currentContent = await fs.readFile(targetPath, 'utf-8');
      expect(currentContent).toBe(updatedScript);
    });

    it('should include backup path in message when updating', async () => {
      await installer.install(mockCompletionScript);

      const updatedScript = mockCompletionScript + '\n# Updated';
      const result = await installer.install(updatedScript);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Completion script updated successfully (previous version backed up)');
      expect(result.backupPath).toBeDefined();
    });

    it('should handle installation with paths containing spaces', async () => {
      const spacedHomeDir = path.join(os.tmpdir(), `openspec fish test ${randomUUID()}`);
      await fs.mkdir(spacedHomeDir, { recursive: true });

      const spacedInstaller = new FishInstaller(spacedHomeDir);
      const result = await spacedInstaller.install(mockCompletionScript);

      expect(result.success).toBe(true);
      expect(result.installedPath).toContain('openspec fish test');

      // Cleanup
      await fs.rm(spacedHomeDir, { recursive: true, force: true });
    });

    // Skip on Windows: fs.chmod() on directories doesn't restrict write access on Windows
    // Windows uses ACLs which Node.js chmod doesn't control
    it.skipIf(process.platform === 'win32')('should return failure on permission error', async () => {
      // Create a read-only directory to simulate permission error
      const restrictedDir = path.join(testHomeDir, '.config', 'fish', 'completions');
      await fs.mkdir(restrictedDir, { recursive: true });
      await fs.chmod(restrictedDir, 0o444); // Read-only

      const result = await installer.install(mockCompletionScript);

      // Cleanup - restore permissions before asserting
      await fs.chmod(restrictedDir, 0o755);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to install completion script');
    });

    it('should provide appropriate instructions for Fish', async () => {
      const result = await installer.install(mockCompletionScript);

      expect(result.success).toBe(true);
      expect(result.instructions).toBeDefined();
      expect(result.instructions).toHaveLength(2);
      expect(result.instructions![0]).toContain('~/.config/fish/completions/');
      expect(result.instructions![1]).toContain('no shell restart needed');
    });

    it('should handle empty completion script', async () => {
      const result = await installer.install('');

      expect(result.success).toBe(true);
      const targetPath = path.join(testHomeDir, '.config', 'fish', 'completions', 'openspec.fish');
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe('');
    });

    it('should handle completion script with special characters', async () => {
      const specialScript = `# Fish completion script with special chars: ' " \` $ \\
function __fish_openspec
    echo "test's \\"quoted\\" text"
end
`;

      const result = await installer.install(specialScript);

      expect(result.success).toBe(true);
      const targetPath = path.join(testHomeDir, '.config', 'fish', 'completions', 'openspec.fish');
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe(specialScript);
    });
  });

  describe('uninstall', () => {
    const mockCompletionScript = `# Fish completion script
complete -c openspec -a 'init'
`;

    it('should successfully uninstall when completion script exists', async () => {
      // First install
      await installer.install(mockCompletionScript);

      // Then uninstall
      const result = await installer.uninstall();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Completion script uninstalled successfully');
    });

    it('should remove the completion file', async () => {
      await installer.install(mockCompletionScript);
      const targetPath = path.join(testHomeDir, '.config', 'fish', 'completions', 'openspec.fish');

      await installer.uninstall();

      const fileExists = await fs.access(targetPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('should return failure when completion script is not installed', async () => {
      const result = await installer.uninstall();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Completion script is not installed');
    });

    it('should accept yes option parameter', async () => {
      await installer.install(mockCompletionScript);

      const result = await installer.uninstall({ yes: true });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Completion script uninstalled successfully');
    });

    // Skip on Windows: fs.chmod() on directories doesn't restrict write access on Windows
    // Windows uses ACLs which Node.js chmod doesn't control
    it.skipIf(process.platform === 'win32')('should return failure on permission error', async () => {
      await installer.install(mockCompletionScript);
      const targetPath = path.join(testHomeDir, '.config', 'fish', 'completions', 'openspec.fish');
      const parentDir = path.dirname(targetPath);

      // Make parent directory read-only to simulate permission error
      await fs.chmod(parentDir, 0o444);
      const result = await installer.uninstall();

      // Restore permissions for cleanup
      await fs.chmod(parentDir, 0o755);

      // On some systems, the access check fails with permission error
      // which returns "not installed" rather than "failed to uninstall"
      expect(result.success).toBe(false);
      expect(
        result.message === 'Completion script is not installed' ||
        result.message.includes('Failed to uninstall completion script')
      ).toBe(true);
    });

    it('should handle uninstall when parent directory does not exist', async () => {
      // Don't install anything, so directory doesn't exist
      const result = await installer.uninstall();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Completion script is not installed');
    });
  });

});
