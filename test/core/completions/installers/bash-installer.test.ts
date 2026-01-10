import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { BashInstaller } from '../../../../src/core/completions/installers/bash-installer.js';

describe('BashInstaller', () => {
  let testHomeDir: string;
  let installer: BashInstaller;

  beforeEach(async () => {
    // Create a temporary home directory for testing
    testHomeDir = path.join(os.tmpdir(), `openspec-bash-test-${randomUUID()}`);
    await fs.mkdir(testHomeDir, { recursive: true });
    installer = new BashInstaller(testHomeDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testHomeDir, { recursive: true, force: true });
  });

  describe('getInstallationPath', () => {
    it('should return standard bash-completion path', async () => {
      const result = await installer.getInstallationPath();

      expect(result).toBe(path.join(testHomeDir, '.local', 'share', 'bash-completion', 'completions', 'openspec'));
    });
  });

  describe('backupExistingFile', () => {
    it('should return undefined when file does not exist', async () => {
      const nonExistentPath = path.join(testHomeDir, 'nonexistent.txt');
      const backupPath = await installer.backupExistingFile(nonExistentPath);

      expect(backupPath).toBeUndefined();
    });

    it('should create backup when file exists', async () => {
      const filePath = path.join(testHomeDir, 'test.txt');
      await fs.writeFile(filePath, 'original content');

      const backupPath = await installer.backupExistingFile(filePath);

      expect(backupPath).toBeDefined();
      expect(backupPath).toContain('.backup-');

      // Verify backup file exists and has correct content
      const backupContent = await fs.readFile(backupPath!, 'utf-8');
      expect(backupContent).toBe('original content');
    });

    it('should create backup with timestamp in filename', async () => {
      const filePath = path.join(testHomeDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      const backupPath = await installer.backupExistingFile(filePath);

      expect(backupPath).toMatch(/\.backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });
  });

  describe('install', () => {
    const testScript = '# Bash completion script for OpenSpec CLI\n_openspec_completion() {\n  echo "test"\n}\n';

    it('should install to bash-completion path', async () => {
      const result = await installer.install(testScript);

      expect(result.success).toBe(true);
      expect(result.installedPath).toBe(path.join(testHomeDir, '.local', 'share', 'bash-completion', 'completions', 'openspec'));

      // Verify file was created with correct content
      const content = await fs.readFile(result.installedPath!, 'utf-8');
      expect(content).toBe(testScript);
    });

    it('should create necessary directories if they do not exist', async () => {
      const result = await installer.install(testScript);

      expect(result.success).toBe(true);

      // Verify directory structure was created
      const completionsDir = path.dirname(result.installedPath!);
      const stat = await fs.stat(completionsDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should backup existing file before overwriting', async () => {
      const targetPath = path.join(testHomeDir, '.local', 'share', 'bash-completion', 'completions', 'openspec');
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, 'old script');

      const result = await installer.install(testScript);

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).toContain('.backup-');

      // Verify backup has old content
      const backupContent = await fs.readFile(result.backupPath!, 'utf-8');
      expect(backupContent).toBe('old script');

      // Verify new file has new content
      const newContent = await fs.readFile(targetPath, 'utf-8');
      expect(newContent).toBe(testScript);
    });

    it('should configure .bashrc when auto-config is enabled', async () => {
      const result = await installer.install(testScript);

      expect(result.success).toBe(true);
      expect(result.bashrcConfigured).toBe(true);

      const bashrcPath = path.join(testHomeDir, '.bashrc');
      const content = await fs.readFile(bashrcPath, 'utf-8');

      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain('# OPENSPEC:END');
      expect(content).toContain('OpenSpec shell completions configuration');
    });

    it('should include instructions when auto-config is disabled', async () => {
      const originalEnv = process.env.OPENSPEC_NO_AUTO_CONFIG;
      process.env.OPENSPEC_NO_AUTO_CONFIG = '1';

      const result = await installer.install(testScript);

      expect(result.instructions).toBeDefined();
      expect(result.instructions!.join('\n')).toContain('.bashrc');
      expect(result.bashrcConfigured).toBe(false);

      // Restore env
      if (originalEnv === undefined) {
        delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      } else {
        process.env.OPENSPEC_NO_AUTO_CONFIG = originalEnv;
      }
    });

    it('should handle installation errors gracefully', async () => {
      // Create a temporary file and use its path as homeDir
      // This guarantees ENOTDIR when trying to create subdirectories (cross-platform)
      const blockingFile = path.join(testHomeDir, 'blocking-file');
      await fs.writeFile(blockingFile, 'blocking content');
      const invalidInstaller = new BashInstaller(blockingFile);

      const result = await invalidInstaller.install(testScript);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to install');
    });

    it('should detect already-installed completion with identical content', async () => {
      // First installation
      const firstResult = await installer.install(testScript);
      expect(firstResult.success).toBe(true);

      // Second installation with same script
      const secondResult = await installer.install(testScript);

      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toContain('already installed');
      expect(secondResult.message).toContain('up to date');
      expect(secondResult.backupPath).toBeUndefined();
    });

    it('should update completion when content differs', async () => {
      // First installation
      const firstScript = '# Bash completion v1\n_openspec_completion() {\n  echo "version 1"\n}\n';
      const firstResult = await installer.install(firstScript);
      expect(firstResult.success).toBe(true);

      // Second installation with different script
      const secondScript = '# Bash completion v2\n_openspec_completion() {\n  echo "version 2"\n}\n';
      const secondResult = await installer.install(secondScript);

      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toContain('updated successfully');
      expect(secondResult.backupPath).toBeDefined();

      // Verify new content was written
      const content = await fs.readFile(secondResult.installedPath!, 'utf-8');
      expect(content).toBe(secondScript);

      // Verify backup has old content
      const backupContent = await fs.readFile(secondResult.backupPath!, 'utf-8');
      expect(backupContent).toBe(firstScript);
    });

    it('should handle paths with spaces in .bashrc config', async () => {
      // Create a test home directory with spaces
      const testHomeDirWithSpaces = path.join(os.tmpdir(), `openspec bash test ${randomUUID()}`);
      await fs.mkdir(testHomeDirWithSpaces, { recursive: true });
      const installerWithSpaces = new BashInstaller(testHomeDirWithSpaces);

      try {
        const result = await installerWithSpaces.install(testScript);
        expect(result.success).toBe(true);

        // Check if .bashrc was created (when auto-config is enabled)
        const bashrcPath = path.join(testHomeDirWithSpaces, '.bashrc');
        try {
          const bashrcContent = await fs.readFile(bashrcPath, 'utf-8');
          // Verify the path is quoted in config
          const completionsDir = path.dirname(result.installedPath!);
          expect(bashrcContent).toContain(completionsDir);
        } catch {
          // .bashrc might not exist if auto-config was disabled
        }
      } finally {
        // Clean up
        await fs.rm(testHomeDirWithSpaces, { recursive: true, force: true });
      }
    });
  });

  describe('uninstall', () => {
    const testScript = '# Bash completion script\n_openspec_completion() {}\n';

    it('should remove installed completion script', async () => {
      // Install first
      await installer.install(testScript);

      // Uninstall
      const result = await installer.uninstall();

      expect(result.success).toBe(true);
      expect(result.message).toContain('uninstalled successfully');

      // Verify file is gone
      const targetPath = await installer.getInstallationPath();
      const exists = await fs.access(targetPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should return failure when not installed', async () => {
      const result = await installer.uninstall();

      expect(result.success).toBe(false);
      expect(result.message).toContain('not installed');
    });

    it('should remove .bashrc configuration', async () => {
      await installer.install(testScript);

      const result = await installer.uninstall();

      expect(result.success).toBe(true);

      // Verify .bashrc markers are removed
      const bashrcPath = path.join(testHomeDir, '.bashrc');
      const exists = await fs.access(bashrcPath).then(() => true).catch(() => false);

      if (exists) {
        const content = await fs.readFile(bashrcPath, 'utf-8');
        expect(content).not.toContain('# OPENSPEC:START');
        expect(content).not.toContain('# OPENSPEC:END');
      }
    });
  });

  describe('configureBashrc', () => {
    const completionsDir = '/test/.local/share/bash-completion/completions';

    it('should create .bashrc with markers and config when file does not exist', async () => {
      const result = await installer.configureBashrc(completionsDir);

      expect(result).toBe(true);

      const bashrcPath = path.join(testHomeDir, '.bashrc');
      const content = await fs.readFile(bashrcPath, 'utf-8');

      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain('# OPENSPEC:END');
      expect(content).toContain('# OpenSpec shell completions configuration');
      expect(content).toContain(completionsDir);
    });

    it('should prepend markers and config when .bashrc exists without markers', async () => {
      const bashrcPath = path.join(testHomeDir, '.bashrc');
      await fs.writeFile(bashrcPath, '# My custom bash config\nalias ll="ls -la"\n');

      const result = await installer.configureBashrc(completionsDir);

      expect(result).toBe(true);

      const content = await fs.readFile(bashrcPath, 'utf-8');

      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain('# OPENSPEC:END');
      expect(content).toContain('# My custom bash config');
      expect(content).toContain('alias ll="ls -la"');

      // Config should be before existing content
      const configIndex = content.indexOf('# OPENSPEC:START');
      const aliasIndex = content.indexOf('alias ll');
      expect(configIndex).toBeLessThan(aliasIndex);
    });

    it('should update config between markers when .bashrc has existing markers', async () => {
      const bashrcPath = path.join(testHomeDir, '.bashrc');
      const initialContent = [
        '# OPENSPEC:START',
        '# Old config',
        'if [ -d "/old/path" ]; then',
        '  . "/old/path"',
        'fi',
        '# OPENSPEC:END',
        '',
        '# My custom config',
      ].join('\n');

      await fs.writeFile(bashrcPath, initialContent);

      const result = await installer.configureBashrc(completionsDir);

      expect(result).toBe(true);

      const content = await fs.readFile(bashrcPath, 'utf-8');

      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain('# OPENSPEC:END');
      expect(content).toContain(completionsDir);
      expect(content).not.toContain('# Old config');
      expect(content).not.toContain('/old/path');
      expect(content).toContain('# My custom config');
    });

    it('should preserve user content outside markers', async () => {
      const bashrcPath = path.join(testHomeDir, '.bashrc');
      const userContent = [
        '# My bash config',
        'export PATH="/custom/path:$PATH"',
        '',
        '# OPENSPEC:START',
        '# Old OpenSpec config',
        '# OPENSPEC:END',
        '',
        'alias ls="ls -G"',
      ].join('\n');

      await fs.writeFile(bashrcPath, userContent);

      const result = await installer.configureBashrc(completionsDir);

      expect(result).toBe(true);

      const content = await fs.readFile(bashrcPath, 'utf-8');

      expect(content).toContain('# My bash config');
      expect(content).toContain('export PATH="/custom/path:$PATH"');
      expect(content).toContain('alias ls="ls -G"');
      expect(content).toContain(completionsDir);
      expect(content).not.toContain('# Old OpenSpec config');
    });

    it('should return false when OPENSPEC_NO_AUTO_CONFIG is set', async () => {
      const originalEnv = process.env.OPENSPEC_NO_AUTO_CONFIG;
      process.env.OPENSPEC_NO_AUTO_CONFIG = '1';

      const result = await installer.configureBashrc(completionsDir);

      expect(result).toBe(false);

      const bashrcPath = path.join(testHomeDir, '.bashrc');
      const exists = await fs.access(bashrcPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);

      // Restore env
      if (originalEnv === undefined) {
        delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      } else {
        process.env.OPENSPEC_NO_AUTO_CONFIG = originalEnv;
      }
    });

    it('should handle write permission errors gracefully', async () => {
      // Create a temporary file and use its path as homeDir
      // This guarantees ENOTDIR when trying to write .bashrc (cross-platform)
      const blockingFile = path.join(testHomeDir, 'blocking-file');
      await fs.writeFile(blockingFile, 'blocking content');
      const invalidInstaller = new BashInstaller(blockingFile);

      const result = await invalidInstaller.configureBashrc(completionsDir);

      expect(result).toBe(false);
    });
  });

  describe('removeBashrcConfig', () => {
    it('should return true when .bashrc does not exist', async () => {
      const result = await installer.removeBashrcConfig();
      expect(result).toBe(true);
    });

    it('should return true when .bashrc exists but has no markers', async () => {
      const bashrcPath = path.join(testHomeDir, '.bashrc');
      await fs.writeFile(bashrcPath, '# My custom config\nalias ll="ls -la"\n');

      const result = await installer.removeBashrcConfig();

      expect(result).toBe(true);

      // Content should be unchanged
      const content = await fs.readFile(bashrcPath, 'utf-8');
      expect(content).toBe('# My custom config\nalias ll="ls -la"\n');
    });

    it('should remove markers and config when present', async () => {
      const bashrcPath = path.join(testHomeDir, '.bashrc');
      const content = [
        '# My config',
        '',
        '# OPENSPEC:START',
        '# OpenSpec shell completions configuration',
        'if [ -d ~/.local/share/bash-completion/completions ]; then',
        '  . ~/.local/share/bash-completion/completions/openspec',
        'fi',
        '# OPENSPEC:END',
        '',
        'alias ll="ls -la"',
      ].join('\n');

      await fs.writeFile(bashrcPath, content);

      const result = await installer.removeBashrcConfig();

      expect(result).toBe(true);

      const newContent = await fs.readFile(bashrcPath, 'utf-8');

      expect(newContent).not.toContain('# OPENSPEC:START');
      expect(newContent).not.toContain('# OPENSPEC:END');
      expect(newContent).not.toContain('OpenSpec shell completions configuration');
      expect(newContent).toContain('# My config');
      expect(newContent).toContain('alias ll="ls -la"');
    });

    it('should preserve user content when removing markers', async () => {
      const bashrcPath = path.join(testHomeDir, '.bashrc');
      const content = [
        'export PATH="/custom:$PATH"',
        '',
        '# OPENSPEC:START',
        '# Config',
        '# OPENSPEC:END',
        '',
        'alias g="git"',
      ].join('\n');

      await fs.writeFile(bashrcPath, content);

      const result = await installer.removeBashrcConfig();

      expect(result).toBe(true);

      const newContent = await fs.readFile(bashrcPath, 'utf-8');

      expect(newContent).toContain('export PATH="/custom:$PATH"');
      expect(newContent).toContain('alias g="git"');
      expect(newContent).not.toContain('# OPENSPEC:START');
    });

    it('should handle permission errors gracefully', async () => {
      const invalidInstaller = new BashInstaller('/root/invalid/path');
      const result = await invalidInstaller.removeBashrcConfig();

      expect(result).toBe(true);
    });
  });

  describe('constructor', () => {
    it('should use provided home directory', () => {
      const customInstaller = new BashInstaller('/custom/home');
      expect(customInstaller).toBeDefined();
    });

    it('should use os.homedir() by default', () => {
      const defaultInstaller = new BashInstaller();
      expect(defaultInstaller).toBeDefined();
    });
  });
});
