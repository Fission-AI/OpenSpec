import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { ZshInstaller } from '../../../../src/core/completions/installers/zsh-installer.js';

describe('ZshInstaller', () => {
  let testHomeDir: string;
  let installer: ZshInstaller;

  beforeEach(async () => {
    // Create a temporary home directory for testing
    testHomeDir = path.join(os.tmpdir(), `openspec-zsh-test-${randomUUID()}`);
    await fs.mkdir(testHomeDir, { recursive: true });
    installer = new ZshInstaller(testHomeDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testHomeDir, { recursive: true, force: true });
  });

  describe('isOhMyZshInstalled', () => {
    it('should return false when Oh My Zsh is not installed', async () => {
      const isInstalled = await installer.isOhMyZshInstalled();
      expect(isInstalled).toBe(false);
    });

    it('should return true when Oh My Zsh directory exists', async () => {
      // Create .oh-my-zsh directory
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.mkdir(ohMyZshPath, { recursive: true });

      const isInstalled = await installer.isOhMyZshInstalled();
      expect(isInstalled).toBe(true);
    });

    it('should return false when .oh-my-zsh exists but is a file', async () => {
      // Create .oh-my-zsh as a file instead of directory
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.writeFile(ohMyZshPath, 'not a directory');

      const isInstalled = await installer.isOhMyZshInstalled();
      expect(isInstalled).toBe(false);
    });
  });

  describe('getInstallationPath', () => {
    it('should return Oh My Zsh path when Oh My Zsh is installed', async () => {
      // Create .oh-my-zsh directory
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.mkdir(ohMyZshPath, { recursive: true });

      const result = await installer.getInstallationPath();

      expect(result.isOhMyZsh).toBe(true);
      expect(result.path).toBe(path.join(testHomeDir, '.oh-my-zsh', 'custom', 'completions', '_openspec'));
    });

    it('should return standard Zsh path when Oh My Zsh is not installed', async () => {
      const result = await installer.getInstallationPath();

      expect(result.isOhMyZsh).toBe(false);
      expect(result.path).toBe(path.join(testHomeDir, '.zsh', 'completions', '_openspec'));
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
    const testScript = '#compdef openspec\n_openspec() {\n  echo "test"\n}\n';

    it('should install to Oh My Zsh path when Oh My Zsh is present', async () => {
      // Create .oh-my-zsh directory
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.mkdir(ohMyZshPath, { recursive: true });

      const result = await installer.install(testScript);

      expect(result.success).toBe(true);
      expect(result.isOhMyZsh).toBe(true);
      expect(result.installedPath).toBe(path.join(ohMyZshPath, 'custom', 'completions', '_openspec'));
      expect(result.message).toContain('Oh My Zsh');

      // Verify file was created with correct content
      const content = await fs.readFile(result.installedPath!, 'utf-8');
      expect(content).toBe(testScript);
    });

    it('should install to standard Zsh path when Oh My Zsh is not present', async () => {
      const result = await installer.install(testScript);

      expect(result.success).toBe(true);
      expect(result.isOhMyZsh).toBe(false);
      expect(result.installedPath).toBe(path.join(testHomeDir, '.zsh', 'completions', '_openspec'));

      // Verify file was created
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
      const targetPath = path.join(testHomeDir, '.zsh', 'completions', '_openspec');
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

    it('should include fpath verification guidance for Oh My Zsh', async () => {
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.mkdir(ohMyZshPath, { recursive: true });

      const result = await installer.install(testScript);

      expect(result.instructions).toBeDefined();
      expect(result.instructions!.length).toBeGreaterThan(0);
      // Should include guidance about verifying fpath for Oh My Zsh
      expect(result.instructions!.join(' ')).toContain('fpath');
      expect(result.instructions!.join(' ')).toContain('custom/completions');
    });

    it('should include fpath instructions for standard Zsh when auto-config is disabled', async () => {
      const originalEnv = process.env.OPENSPEC_NO_AUTO_CONFIG;
      process.env.OPENSPEC_NO_AUTO_CONFIG = '1';

      const result = await installer.install(testScript);

      expect(result.instructions).toBeDefined();
      expect(result.instructions!.join('\n')).toContain('fpath');
      expect(result.instructions!.join('\n')).toContain('.zshrc');
      expect(result.instructions!.join('\n')).toContain('compinit');

      // Restore env
      if (originalEnv === undefined) {
        delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      } else {
        process.env.OPENSPEC_NO_AUTO_CONFIG = originalEnv;
      }
    });

    it('should handle installation errors gracefully', async () => {
      // Create installer with non-existent/invalid home directory
      // Use a path that will fail on both Unix and Windows
      const invalidPath = process.platform === 'win32'
        ? 'Z:\\nonexistent\\invalid\\path'  // Non-existent drive letter on Windows
        : '/root/invalid/nonexistent/path';  // Permission-denied path on Unix
      const invalidInstaller = new ZshInstaller(invalidPath);

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
      expect(secondResult.instructions).toBeDefined();
      expect(secondResult.instructions!.join(' ')).toContain('already installed');
    });

    it('should update completion when content differs', async () => {
      // First installation
      const firstScript = '#compdef openspec\n_openspec() {\n  echo "version 1"\n}\n';
      const firstResult = await installer.install(firstScript);
      expect(firstResult.success).toBe(true);

      // Second installation with different script
      const secondScript = '#compdef openspec\n_openspec() {\n  echo "version 2"\n}\n';
      const secondResult = await installer.install(secondScript);

      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toContain('updated successfully');
      expect(secondResult.message).toContain('backed up');
      expect(secondResult.backupPath).toBeDefined();

      // Verify new content was written
      const content = await fs.readFile(secondResult.installedPath!, 'utf-8');
      expect(content).toBe(secondScript);

      // Verify backup has old content
      const backupContent = await fs.readFile(secondResult.backupPath!, 'utf-8');
      expect(backupContent).toBe(firstScript);
    });

    it('should handle paths with spaces in .zshrc config', async () => {
      // Create a test home directory with spaces
      const testHomeDirWithSpaces = path.join(os.tmpdir(), `openspec zsh test ${randomUUID()}`);
      await fs.mkdir(testHomeDirWithSpaces, { recursive: true });
      const installerWithSpaces = new ZshInstaller(testHomeDirWithSpaces);

      try {
        const result = await installerWithSpaces.install(testScript);
        expect(result.success).toBe(true);

        // Check if .zshrc was created (when auto-config is enabled)
        const zshrcPath = path.join(testHomeDirWithSpaces, '.zshrc');
        try {
          const zshrcContent = await fs.readFile(zshrcPath, 'utf-8');
          // Verify the path is quoted in fpath
          expect(zshrcContent).toContain(`fpath=("${path.dirname(result.installedPath!)}" $fpath)`);
        } catch {
          // .zshrc might not exist if auto-config was disabled
        }
      } finally {
        // Clean up
        await fs.rm(testHomeDirWithSpaces, { recursive: true, force: true });
      }
    });
  });

  describe('uninstall', () => {
    const testScript = '#compdef openspec\n_openspec() {}\n';

    it('should remove installed completion script', async () => {
      // Install first
      await installer.install(testScript);

      // Verify it's installed
      const beforeUninstall = await installer.isInstalled();
      expect(beforeUninstall).toBe(true);

      // Uninstall
      const result = await installer.uninstall();

      expect(result.success).toBe(true);
      expect(result.message).toContain('removed');

      // Verify it's gone
      const afterUninstall = await installer.isInstalled();
      expect(afterUninstall).toBe(false);
    });

    it('should return failure when script and .zshrc config are not installed', async () => {
      // Don't create .zshrc or completion script - nothing to remove
      const result = await installer.uninstall();

      expect(result.success).toBe(false);
      expect(result.message).toContain('not installed');
    });

    it('should remove from correct location for Oh My Zsh', async () => {
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.mkdir(ohMyZshPath, { recursive: true });

      await installer.install(testScript);

      const result = await installer.uninstall();

      expect(result.success).toBe(true);
      expect(result.message).toContain(path.join('.oh-my-zsh', 'custom', 'completions', '_openspec'));
    });
  });

  describe('isInstalled', () => {
    const testScript = '#compdef openspec\n_openspec() {}\n';

    it('should return false when not installed', async () => {
      const isInstalled = await installer.isInstalled();
      expect(isInstalled).toBe(false);
    });

    it('should return true when installed', async () => {
      await installer.install(testScript);

      const isInstalled = await installer.isInstalled();
      expect(isInstalled).toBe(true);
    });

    it('should check correct location for Oh My Zsh', async () => {
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.mkdir(ohMyZshPath, { recursive: true });

      await installer.install(testScript);

      const isInstalled = await installer.isInstalled();
      expect(isInstalled).toBe(true);
    });
  });

  describe('getInstallationInfo', () => {
    const testScript = '#compdef openspec\n_openspec() {}\n';

    it('should return not installed when script does not exist', async () => {
      const info = await installer.getInstallationInfo();

      expect(info.installed).toBe(false);
      expect(info.path).toBeUndefined();
      expect(info.isOhMyZsh).toBeUndefined();
    });

    it('should return installation info when installed', async () => {
      await installer.install(testScript);

      const info = await installer.getInstallationInfo();

      expect(info.installed).toBe(true);
      expect(info.path).toBeDefined();
      expect(info.path).toContain('_openspec');
      expect(info.isOhMyZsh).toBe(false);
    });

    it('should indicate Oh My Zsh when installed there', async () => {
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.mkdir(ohMyZshPath, { recursive: true });

      await installer.install(testScript);

      const info = await installer.getInstallationInfo();

      expect(info.installed).toBe(true);
      expect(info.isOhMyZsh).toBe(true);
      expect(info.path).toContain('.oh-my-zsh');
    });
  });

  describe('constructor', () => {
    it('should use provided home directory', () => {
      const customInstaller = new ZshInstaller('/custom/home');
      expect(customInstaller).toBeDefined();
    });

    it('should use os.homedir() by default', () => {
      const defaultInstaller = new ZshInstaller();
      expect(defaultInstaller).toBeDefined();
    });
  });

  describe('configureZshrc', () => {
    const completionsDir = '/test/.zsh/completions';

    it('should create .zshrc with markers and config when file does not exist', async () => {
      const result = await installer.configureZshrc(completionsDir);

      expect(result).toBe(true);

      const zshrcPath = path.join(testHomeDir, '.zshrc');
      const content = await fs.readFile(zshrcPath, 'utf-8');

      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain('# OPENSPEC:END');
      expect(content).toContain('# OpenSpec shell completions configuration');
      expect(content).toContain(`fpath=("${completionsDir}" $fpath)`);
      expect(content).toContain('autoload -Uz compinit');
      expect(content).toContain('compinit');
    });

    it('should prepend markers and config when .zshrc exists without markers', async () => {
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      await fs.writeFile(zshrcPath, '# My custom zsh config\nalias ll="ls -la"\n');

      const result = await installer.configureZshrc(completionsDir);

      expect(result).toBe(true);

      const content = await fs.readFile(zshrcPath, 'utf-8');

      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain('# OPENSPEC:END');
      expect(content).toContain('# My custom zsh config');
      expect(content).toContain('alias ll="ls -la"');

      // Config should be before existing content
      const configIndex = content.indexOf('# OPENSPEC:START');
      const aliasIndex = content.indexOf('alias ll');
      expect(configIndex).toBeLessThan(aliasIndex);
    });

    it('should update config between markers when .zshrc has existing markers', async () => {
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      const initialContent = [
        '# OPENSPEC:START',
        '# Old config',
        'fpath=(/old/path $fpath)',
        '# OPENSPEC:END',
        '',
        '# My custom config',
      ].join('\n');

      await fs.writeFile(zshrcPath, initialContent);

      const result = await installer.configureZshrc(completionsDir);

      expect(result).toBe(true);

      const content = await fs.readFile(zshrcPath, 'utf-8');

      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain('# OPENSPEC:END');
      expect(content).toContain(`fpath=("${completionsDir}" $fpath)`);
      expect(content).not.toContain('# Old config');
      expect(content).not.toContain('/old/path');
      expect(content).toContain('# My custom config');
    });

    it('should preserve user content outside markers', async () => {
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      const userContent = [
        '# My zsh config',
        'export PATH="/custom/path:$PATH"',
        '',
        '# OPENSPEC:START',
        '# Old OpenSpec config',
        '# OPENSPEC:END',
        '',
        'alias ls="ls -G"',
      ].join('\n');

      await fs.writeFile(zshrcPath, userContent);

      const result = await installer.configureZshrc(completionsDir);

      expect(result).toBe(true);

      const content = await fs.readFile(zshrcPath, 'utf-8');

      expect(content).toContain('# My zsh config');
      expect(content).toContain('export PATH="/custom/path:$PATH"');
      expect(content).toContain('alias ls="ls -G"');
      expect(content).toContain(`fpath=("${completionsDir}" $fpath)`);
      expect(content).not.toContain('# Old OpenSpec config');
    });

    it('should return false when OPENSPEC_NO_AUTO_CONFIG is set', async () => {
      const originalEnv = process.env.OPENSPEC_NO_AUTO_CONFIG;
      process.env.OPENSPEC_NO_AUTO_CONFIG = '1';

      const result = await installer.configureZshrc(completionsDir);

      expect(result).toBe(false);

      const zshrcPath = path.join(testHomeDir, '.zshrc');
      const exists = await fs.access(zshrcPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);

      // Restore env
      if (originalEnv === undefined) {
        delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      } else {
        process.env.OPENSPEC_NO_AUTO_CONFIG = originalEnv;
      }
    });

    it('should handle write permission errors gracefully', async () => {
      // Create installer with path that can't be written
      // Use a path that will fail on both Unix and Windows
      const invalidPath = process.platform === 'win32'
        ? 'Z:\\nonexistent\\invalid\\path'  // Non-existent drive letter on Windows
        : '/root/invalid/path';  // Permission-denied path on Unix
      const invalidInstaller = new ZshInstaller(invalidPath);

      const result = await invalidInstaller.configureZshrc(completionsDir);

      expect(result).toBe(false);
    });
  });

  describe('removeZshrcConfig', () => {
    it('should return true when .zshrc does not exist', async () => {
      const result = await installer.removeZshrcConfig();
      expect(result).toBe(true);
    });

    it('should return true when .zshrc exists but has no markers', async () => {
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      await fs.writeFile(zshrcPath, '# My custom config\nalias ll="ls -la"\n');

      const result = await installer.removeZshrcConfig();

      expect(result).toBe(true);

      // Content should be unchanged
      const content = await fs.readFile(zshrcPath, 'utf-8');
      expect(content).toBe('# My custom config\nalias ll="ls -la"\n');
    });

    it('should remove markers and config when present', async () => {
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      const content = [
        '# My config',
        '',
        '# OPENSPEC:START',
        '# OpenSpec shell completions configuration',
        'fpath=(~/.zsh/completions $fpath)',
        'autoload -Uz compinit',
        'compinit',
        '# OPENSPEC:END',
        '',
        'alias ll="ls -la"',
      ].join('\n');

      await fs.writeFile(zshrcPath, content);

      const result = await installer.removeZshrcConfig();

      expect(result).toBe(true);

      const newContent = await fs.readFile(zshrcPath, 'utf-8');

      expect(newContent).not.toContain('# OPENSPEC:START');
      expect(newContent).not.toContain('# OPENSPEC:END');
      expect(newContent).not.toContain('OpenSpec shell completions');
      expect(newContent).toContain('# My config');
      expect(newContent).toContain('alias ll="ls -la"');
    });

    it('should remove leading empty lines when markers were at top', async () => {
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      const content = [
        '# OPENSPEC:START',
        '# OpenSpec config',
        '# OPENSPEC:END',
        '',
        '# User config below',
      ].join('\n');

      await fs.writeFile(zshrcPath, content);

      const result = await installer.removeZshrcConfig();

      expect(result).toBe(true);

      const newContent = await fs.readFile(zshrcPath, 'utf-8');

      // Should not start with empty lines
      expect(newContent).toBe('# User config below');
    });

    it('should handle invalid marker placement gracefully', async () => {
      const zshrcPath = path.join(testHomeDir, '.zshrc');

      // End marker before start marker
      await fs.writeFile(zshrcPath, '# OPENSPEC:END\n# OPENSPEC:START\n');

      const result = await installer.removeZshrcConfig();

      expect(result).toBe(false);
    });

    it('should return true when only one marker is present', async () => {
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      await fs.writeFile(zshrcPath, '# OPENSPEC:START\nsome config\n');

      const result = await installer.removeZshrcConfig();

      // Should return true (markers don't exist as a pair)
      expect(result).toBe(true);
    });
  });

  describe('install with .zshrc auto-configuration', () => {
    const testScript = '#compdef openspec\n_openspec() {}\n';

    it('should auto-configure .zshrc for standard Zsh', async () => {
      const result = await installer.install(testScript);

      expect(result.success).toBe(true);
      expect(result.zshrcConfigured).toBe(true);

      // Verify .zshrc was created
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      const content = await fs.readFile(zshrcPath, 'utf-8');

      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain('fpath=');
      expect(content).toContain('compinit');
    });

    it('should configure .zshrc for Oh My Zsh when fpath is missing', async () => {
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.mkdir(ohMyZshPath, { recursive: true });

      const result = await installer.install(testScript);

      expect(result.success).toBe(true);
      expect(result.isOhMyZsh).toBe(true);
      // Should configure .zshrc if fpath doesn't already include the directory
      expect(result.zshrcConfigured).toBe(true);

      // Verify .zshrc was created with fpath configuration
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      const exists = await fs.access(zshrcPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      if (exists) {
        const content = await fs.readFile(zshrcPath, 'utf-8');
        expect(content).toContain('fpath=');
        // Check for custom/completions or custom\completions (Windows path separator)
        expect(content).toMatch(/custom[/\\]completions/);
      }
    });

    it('should not include manual instructions when .zshrc was auto-configured', async () => {
      const result = await installer.install(testScript);

      expect(result.success).toBe(true);
      expect(result.zshrcConfigured).toBe(true);
      expect(result.instructions).toBeUndefined();
    });

    it('should include instructions when .zshrc auto-config fails', async () => {
      const originalEnv = process.env.OPENSPEC_NO_AUTO_CONFIG;
      process.env.OPENSPEC_NO_AUTO_CONFIG = '1';

      const result = await installer.install(testScript);

      expect(result.success).toBe(true);
      expect(result.zshrcConfigured).toBe(false);
      expect(result.instructions).toBeDefined();
      expect(result.instructions!.join('\n')).toContain('fpath');

      // Restore env
      if (originalEnv === undefined) {
        delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      } else {
        process.env.OPENSPEC_NO_AUTO_CONFIG = originalEnv;
      }
    });

    it('should update success message when .zshrc is configured', async () => {
      const result = await installer.install(testScript);

      expect(result.success).toBe(true);
      expect(result.message).toContain('.zshrc configured');
    });
  });

  describe('uninstall with .zshrc cleanup', () => {
    const testScript = '#compdef openspec\n_openspec() {}\n';

    it('should remove .zshrc config when uninstalling', async () => {
      // Install first (which creates .zshrc config)
      await installer.install(testScript);

      // Verify .zshrc was configured
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      let content = await fs.readFile(zshrcPath, 'utf-8');
      expect(content).toContain('# OPENSPEC:START');

      // Uninstall
      const result = await installer.uninstall();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Removed OpenSpec configuration from ~/.zshrc');

      // Verify .zshrc config was removed
      content = await fs.readFile(zshrcPath, 'utf-8');
      expect(content).not.toContain('# OPENSPEC:START');
    });

    it('should not remove .zshrc config for Oh My Zsh users', async () => {
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.mkdir(ohMyZshPath, { recursive: true });

      await installer.install(testScript);

      const result = await installer.uninstall();

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('.zshrc');
    });

    it('should succeed even if only .zshrc config is removed', async () => {
      // Manually create .zshrc config without installing completion script
      const zshrcPath = path.join(testHomeDir, '.zshrc');
      await fs.writeFile(zshrcPath, '# OPENSPEC:START\nconfig\n# OPENSPEC:END\n');

      const result = await installer.uninstall();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Removed OpenSpec configuration from ~/.zshrc');
    });

    it('should include both messages when removing script and .zshrc', async () => {
      await installer.install(testScript);

      const result = await installer.uninstall();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Completion script removed');
      expect(result.message).toContain('Removed OpenSpec configuration from ~/.zshrc');
    });
  });
});
