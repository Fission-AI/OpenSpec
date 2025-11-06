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
      expect(result.path).toBe(path.join(testHomeDir, '.oh-my-zsh', 'completions', '_openspec'));
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
      expect(result.installedPath).toBe(path.join(ohMyZshPath, 'completions', '_openspec'));
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

    it('should include instructions in result for Oh My Zsh', async () => {
      const ohMyZshPath = path.join(testHomeDir, '.oh-my-zsh');
      await fs.mkdir(ohMyZshPath, { recursive: true });

      const result = await installer.install(testScript);

      expect(result.instructions).toBeDefined();
      expect(result.instructions!.length).toBeGreaterThan(0);
      expect(result.instructions!.join(' ')).toContain('exec zsh');
      expect(result.instructions!.join(' ')).toContain('automatically');
    });

    it('should include fpath instructions for standard Zsh', async () => {
      const result = await installer.install(testScript);

      expect(result.instructions).toBeDefined();
      expect(result.instructions!.join('\n')).toContain('fpath');
      expect(result.instructions!.join('\n')).toContain('.zshrc');
      expect(result.instructions!.join('\n')).toContain('compinit');
    });

    it('should handle installation errors gracefully', async () => {
      // Create installer with non-existent/invalid home directory
      const invalidInstaller = new ZshInstaller('/root/invalid/nonexistent/path');

      const result = await invalidInstaller.install(testScript);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to install');
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

    it('should return failure when script is not installed', async () => {
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
      expect(result.message).toContain(path.join('.oh-my-zsh', 'completions', '_openspec'));
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
});
