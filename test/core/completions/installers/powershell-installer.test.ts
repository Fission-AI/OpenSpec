import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PowerShellInstaller } from '../../../../src/core/completions/installers/powershell-installer.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

describe('PowerShellInstaller', () => {
  let testHomeDir: string;
  let installer: PowerShellInstaller;
  let originalPlatform: NodeJS.Platform;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    testHomeDir = path.join(os.tmpdir(), `openspec-powershell-test-${randomUUID()}`);
    await fs.mkdir(testHomeDir, { recursive: true });
    installer = new PowerShellInstaller(testHomeDir);
    originalPlatform = process.platform;
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    await fs.rm(testHomeDir, { recursive: true, force: true });
    // Restore platform and environment
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
    process.env = originalEnv;
  });

  describe('getProfilePath', () => {
    it('should prefer PROFILE environment variable when set', () => {
      process.env.PROFILE = '/custom/profile/path.ps1';
      const result = installer.getProfilePath();
      expect(result).toBe('/custom/profile/path.ps1');
    });

    it('should return Windows default path when on win32 platform', () => {
      delete process.env.PROFILE;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      const result = installer.getProfilePath();
      expect(result).toBe(path.join(testHomeDir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1'));
    });

    it('should return Unix default path when on darwin platform', () => {
      delete process.env.PROFILE;
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const result = installer.getProfilePath();
      expect(result).toBe(path.join(testHomeDir, '.config', 'powershell', 'Microsoft.PowerShell_profile.ps1'));
    });

    it('should return Unix default path when on linux platform', () => {
      delete process.env.PROFILE;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      const result = installer.getProfilePath();
      expect(result).toBe(path.join(testHomeDir, '.config', 'powershell', 'Microsoft.PowerShell_profile.ps1'));
    });
  });

  describe('getInstallationPath', () => {
    it('should return path relative to profile directory', () => {
      delete process.env.PROFILE;
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const result = installer.getInstallationPath();
      expect(result).toBe(path.join(testHomeDir, '.config', 'powershell', 'OpenSpecCompletion.ps1'));
    });

    it('should work with custom PROFILE environment variable', () => {
      process.env.PROFILE = path.join(testHomeDir, 'custom', 'profile.ps1');
      const result = installer.getInstallationPath();
      expect(result).toBe(path.join(testHomeDir, 'custom', 'OpenSpecCompletion.ps1'));
    });

    it('should return Windows path when on Windows platform', () => {
      delete process.env.PROFILE;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      const result = installer.getInstallationPath();
      expect(result).toBe(path.join(testHomeDir, 'Documents', 'PowerShell', 'OpenSpecCompletion.ps1'));
    });
  });

  describe('backupExistingFile', () => {
    it('should return undefined when file does not exist', async () => {
      const nonExistentPath = path.join(testHomeDir, 'does-not-exist.ps1');
      const backupPath = await installer.backupExistingFile(nonExistentPath);
      expect(backupPath).toBeUndefined();
    });

    it('should create backup with timestamp in filename', async () => {
      const filePath = path.join(testHomeDir, 'test.ps1');
      await fs.writeFile(filePath, 'test content');

      const backupPath = await installer.backupExistingFile(filePath);

      expect(backupPath).toBeDefined();
      expect(backupPath).toMatch(/\.backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });

    it('should copy file content to backup', async () => {
      const filePath = path.join(testHomeDir, 'test.ps1');
      const originalContent = '# Original PowerShell completion script\n$completer = {}';
      await fs.writeFile(filePath, originalContent);

      const backupPath = await installer.backupExistingFile(filePath);

      expect(backupPath).toBeDefined();
      const backupContent = await fs.readFile(backupPath!, 'utf-8');
      expect(backupContent).toBe(originalContent);
    });

    it('should create backup next to original file', async () => {
      const filePath = path.join(testHomeDir, 'subdir', 'test.ps1');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'content');

      const backupPath = await installer.backupExistingFile(filePath);

      expect(backupPath).toBeDefined();
      expect(path.dirname(backupPath!)).toBe(path.dirname(filePath));
    });
  });

  describe('configureProfile', () => {
    const mockScriptPath = '/path/to/OpenSpecCompletion.ps1';

    // Note: OPENSPEC_NO_AUTO_CONFIG check is now handled in the install() method,
    // not in configureProfile() itself

    it('should create profile with markers when file does not exist', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const profilePath = installer.getProfilePath();

      const result = await installer.configureProfile(mockScriptPath);

      expect(result).toBe(true);
      const content = await fs.readFile(profilePath, 'utf-8');
      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain('# OPENSPEC:END');
      expect(content).toContain(`. "${mockScriptPath}"`);
    });

    it('should prepend markers and config when file exists without markers', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const profilePath = installer.getProfilePath();
      await fs.mkdir(path.dirname(profilePath), { recursive: true });
      await fs.writeFile(profilePath, '# My custom PowerShell config\nWrite-Host "Hello"');

      const result = await installer.configureProfile(mockScriptPath);

      expect(result).toBe(true);
      const content = await fs.readFile(profilePath, 'utf-8');
      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain('# OPENSPEC:END');
      expect(content).toContain(mockScriptPath);
      expect(content).toContain('# My custom PowerShell config');
      expect(content).toContain('Write-Host "Hello"');
    });

    // Skip on Windows: Windows has dual profile paths (PowerShell Core + Windows PowerShell 5.1),
    // so even if one profile is already configured, the second one will be configured and return true
    it.skipIf(process.platform === 'win32')('should skip configuration when script line already exists', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const profilePath = installer.getProfilePath();
      await fs.mkdir(path.dirname(profilePath), { recursive: true });

      const initialContent = [
        '# OPENSPEC:START - OpenSpec completion (managed block, do not edit manually)',
        `. "${mockScriptPath}"`,
        '# OPENSPEC:END',
        '',
        '# My custom config',
        'Write-Host "Custom"',
      ].join('\n');

      await fs.writeFile(profilePath, initialContent);

      const result = await installer.configureProfile(mockScriptPath);

      // Should return false because already configured (anyConfigured = false)
      expect(result).toBe(false);
      const content = await fs.readFile(profilePath, 'utf-8');
      // Content should be unchanged
      expect(content).toBe(initialContent);
    });

    it('should preserve user content outside markers', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const profilePath = installer.getProfilePath();
      await fs.mkdir(path.dirname(profilePath), { recursive: true });

      const initialContent = [
        '# User config before',
        'Set-Variable -Name "test" -Value "before"',
        '',
        '# OPENSPEC:START',
        '# Old config',
        '# OPENSPEC:END',
        '',
        '# User config after',
        'Set-Variable -Name "test" -Value "after"',
      ].join('\n');

      await fs.writeFile(profilePath, initialContent);

      const result = await installer.configureProfile(mockScriptPath);

      expect(result).toBe(true);
      const content = await fs.readFile(profilePath, 'utf-8');
      expect(content).toContain('# User config before');
      expect(content).toContain('Set-Variable -Name "test" -Value "before"');
      expect(content).toContain('# User config after');
      expect(content).toContain('Set-Variable -Name "test" -Value "after"');
    });

    it('should generate correct PowerShell syntax in config', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const profilePath = installer.getProfilePath();

      await installer.configureProfile(mockScriptPath);

      const content = await fs.readFile(profilePath, 'utf-8');
      expect(content).toContain('# OPENSPEC:START');
      expect(content).toContain(`. "${mockScriptPath}"`);
      expect(content).toContain('# OPENSPEC:END');
    });

    // Skip on Windows: fs.chmod() doesn't reliably restrict write access on Windows
    // (admin users can bypass read-only attribute, and CI runners often have elevated privileges)
    it.skipIf(process.platform === 'win32')('should return false on write permission error', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const profilePath = installer.getProfilePath();
      await fs.mkdir(path.dirname(profilePath), { recursive: true });
      await fs.writeFile(profilePath, '# Test');

      // Make file read-only
      await fs.chmod(profilePath, 0o444);

      const result = await installer.configureProfile(mockScriptPath);

      // Restore permissions for cleanup
      await fs.chmod(profilePath, 0o644);

      expect(result).toBe(false);
    });
  });

  describe('removeProfileConfig', () => {
    it('should return false when profile does not exist', async () => {
      const result = await installer.removeProfileConfig();
      expect(result).toBe(false);
    });

    it('should return false when profile exists but has no markers', async () => {
      const profilePath = installer.getProfilePath();
      await fs.mkdir(path.dirname(profilePath), { recursive: true });
      await fs.writeFile(profilePath, '# My custom config\nWrite-Host "Hello"');

      const result = await installer.removeProfileConfig();

      expect(result).toBe(false);
      const content = await fs.readFile(profilePath, 'utf-8');
      expect(content).toBe('# My custom config\nWrite-Host "Hello"');
    });

    it('should remove content between markers', async () => {
      const profilePath = installer.getProfilePath();
      await fs.mkdir(path.dirname(profilePath), { recursive: true });

      const initialContent = [
        '# OPENSPEC:START',
        '# OpenSpec completions',
        'if (Test-Path "/path") {',
        '    . "/path"',
        '}',
        '# OPENSPEC:END',
        '',
        '# My config',
      ].join('\n');

      await fs.writeFile(profilePath, initialContent);

      const result = await installer.removeProfileConfig();

      expect(result).toBe(true);
      const content = await fs.readFile(profilePath, 'utf-8');
      expect(content).not.toContain('# OPENSPEC:START');
      expect(content).not.toContain('# OPENSPEC:END');
      expect(content).not.toContain('# OpenSpec completions');
      expect(content).toContain('# My config');
    });

    it('should remove trailing empty lines after removal', async () => {
      const profilePath = installer.getProfilePath();
      await fs.mkdir(path.dirname(profilePath), { recursive: true });

      const initialContent = [
        '# User config',
        '# OPENSPEC:START',
        '# Config',
        '# OPENSPEC:END',
        '',
        '',
      ].join('\n');

      await fs.writeFile(profilePath, initialContent);

      const result = await installer.removeProfileConfig();

      expect(result).toBe(true);
      const content = await fs.readFile(profilePath, 'utf-8');
      expect(content).toBe('# User config\n');
    });

    it('should preserve user content outside markers', async () => {
      const profilePath = installer.getProfilePath();
      await fs.mkdir(path.dirname(profilePath), { recursive: true });

      const initialContent = [
        '# Before',
        '# OPENSPEC:START',
        '# OpenSpec',
        '# OPENSPEC:END',
        '# After',
      ].join('\n');

      await fs.writeFile(profilePath, initialContent);

      const result = await installer.removeProfileConfig();

      expect(result).toBe(true);
      const content = await fs.readFile(profilePath, 'utf-8');
      expect(content).toContain('# Before');
      expect(content).toContain('# After');
    });

    it('should return false on invalid marker placement', async () => {
      const profilePath = installer.getProfilePath();
      await fs.mkdir(path.dirname(profilePath), { recursive: true });

      const initialContent = [
        '# OPENSPEC:END',
        '# Config',
        '# OPENSPEC:START',
      ].join('\n');

      await fs.writeFile(profilePath, initialContent);

      const result = await installer.removeProfileConfig();

      expect(result).toBe(false);
    });
  });

  describe('install', () => {
    const mockCompletionScript = `# PowerShell completion script for OpenSpec
$openspecCompleter = {
    param($wordToComplete, $commandAst, $cursorPosition)
    # Completion logic here
}
Register-ArgumentCompleter -CommandName openspec -ScriptBlock $openspecCompleter
`;

    it('should install completion script for the first time', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const result = await installer.install(mockCompletionScript);

      expect(result.success).toBe(true);
      expect(result.message).toContain('installed');
      expect(result.installedPath).toContain('OpenSpecCompletion.ps1');
      expect(result.backupPath).toBeUndefined();
    });

    it('should create parent directories if they do not exist', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const result = await installer.install(mockCompletionScript);

      expect(result.success).toBe(true);
      const targetPath = installer.getInstallationPath();
      const fileExists = await fs.access(targetPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should write completion script content correctly', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);

      const targetPath = installer.getInstallationPath();
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe(mockCompletionScript);
    });

    it('should detect when already installed with same content', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);

      const result = await installer.install(mockCompletionScript);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Completion script is already installed (up to date)');
      expect(result.backupPath).toBeUndefined();
    });

    it('should update when content is different', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);

      const updatedScript = mockCompletionScript + '\n# Updated version';
      const result = await installer.install(updatedScript);

      expect(result.success).toBe(true);
      expect(result.message).toContain('updated successfully');
      expect(result.backupPath).toBeDefined();
    });

    it('should create backup when updating existing installation', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);

      const updatedScript = mockCompletionScript + '\n# Updated';
      const result = await installer.install(updatedScript);

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();

      // Verify backup contains original content
      const backupContent = await fs.readFile(result.backupPath!, 'utf-8');
      expect(backupContent).toBe(mockCompletionScript);
    });

    it('should configure PowerShell profile when not disabled', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const result = await installer.install(mockCompletionScript);

      expect(result.success).toBe(true);
      expect(result.profileConfigured).toBe(true);
      expect(result.message).toContain('profile configured');
      expect(result.instructions).toBeUndefined();
    });

    // Note: OPENSPEC_NO_AUTO_CONFIG support was removed from PowerShell installer
    // Profile is now always auto-configured if possible

    // Skip on Windows: fs.chmod() doesn't reliably restrict write access on Windows
    // (admin users can bypass read-only attribute, and CI runners often have elevated privileges)
    it.skipIf(process.platform === 'win32')('should provide instructions when profile cannot be configured', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      // Make profile directory read-only to prevent configuration
      const profilePath = installer.getProfilePath();
      await fs.mkdir(path.dirname(profilePath), { recursive: true });
      await fs.writeFile(profilePath, '# Test');
      await fs.chmod(profilePath, 0o444);

      const result = await installer.install(mockCompletionScript);

      // Restore permissions
      await fs.chmod(profilePath, 0o644);

      expect(result.success).toBe(true);
      expect(result.profileConfigured).toBe(false);
      expect(result.instructions).toBeDefined();
      expect(result.instructions!.some(i => i.includes('Test-Path'))).toBe(true);
    });

    it('should include backup path in message when updating', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);

      const updatedScript = mockCompletionScript + '\n# Updated';
      const result = await installer.install(updatedScript);

      expect(result.success).toBe(true);
      expect(result.message).toContain('backed up');
      expect(result.backupPath).toBeDefined();
    });

    it('should handle installation with paths containing spaces', async () => {
      const spacedHomeDir = path.join(os.tmpdir(), `openspec powershell test ${randomUUID()}`);
      await fs.mkdir(spacedHomeDir, { recursive: true });

      const spacedInstaller = new PowerShellInstaller(spacedHomeDir);
      const result = await spacedInstaller.install(mockCompletionScript);

      expect(result.success).toBe(true);
      expect(result.installedPath).toContain('openspec powershell test');

      // Cleanup
      await fs.rm(spacedHomeDir, { recursive: true, force: true });
    });

    // Skip on Windows: fs.chmod() on directories doesn't restrict write access on Windows
    // Windows uses ACLs which Node.js chmod doesn't control
    it.skipIf(process.platform === 'win32')('should return failure on permission error', async () => {
      const targetPath = installer.getInstallationPath();
      const targetDir = path.dirname(targetPath);
      await fs.mkdir(targetDir, { recursive: true });

      // Make target directory read-only to simulate permission error
      await fs.chmod(targetDir, 0o444);

      const result = await installer.install(mockCompletionScript);

      // Restore permissions for cleanup
      await fs.chmod(targetDir, 0o755);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to install completion script');
    });

    it('should handle empty completion script', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const result = await installer.install('');

      expect(result.success).toBe(true);
      const targetPath = installer.getInstallationPath();
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe('');
    });

    it('should handle completion script with special characters', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      const specialScript = `# PowerShell with special chars: ' " \` $ @\n$test = "value"`;

      const result = await installer.install(specialScript);

      expect(result.success).toBe(true);
      const targetPath = installer.getInstallationPath();
      const content = await fs.readFile(targetPath, 'utf-8');
      expect(content).toBe(specialScript);
    });
  });

  describe('uninstall', () => {
    const mockCompletionScript = `# PowerShell completion script
$openspecCompleter = {}
Register-ArgumentCompleter -CommandName openspec -ScriptBlock $openspecCompleter
`;

    it('should successfully uninstall when completion script exists', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);

      const result = await installer.uninstall();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Completion script uninstalled successfully');
    });

    it('should remove the completion file', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);
      const targetPath = installer.getInstallationPath();

      await installer.uninstall();

      const fileExists = await fs.access(targetPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(false);
    });

    it('should remove profile configuration', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);
      const profilePath = installer.getProfilePath();

      await installer.uninstall();

      const content = await fs.readFile(profilePath, 'utf-8');
      expect(content).not.toContain('# OPENSPEC:START');
      expect(content).not.toContain('# OPENSPEC:END');
    });

    it('should return failure when completion script is not installed', async () => {
      const result = await installer.uninstall();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Completion script is not installed');
    });

    it('should accept yes option parameter', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);

      const result = await installer.uninstall({ yes: true });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Completion script uninstalled successfully');
    });

    it('should handle both script and config removal', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);

      const targetPath = installer.getInstallationPath();
      const profilePath = installer.getProfilePath();

      // Verify both exist
      const scriptExists = await fs.access(targetPath).then(() => true).catch(() => false);
      const profileContent = await fs.readFile(profilePath, 'utf-8');
      expect(scriptExists).toBe(true);
      expect(profileContent).toContain('# OPENSPEC:START');

      await installer.uninstall();

      // Verify both are removed/cleaned
      const scriptExistsAfter = await fs.access(targetPath).then(() => true).catch(() => false);
      const profileContentAfter = await fs.readFile(profilePath, 'utf-8');
      expect(scriptExistsAfter).toBe(false);
      expect(profileContentAfter).not.toContain('# OPENSPEC:START');
    });

    // Skip on Windows: fs.chmod() on directories doesn't restrict write access on Windows
    // Windows uses ACLs which Node.js chmod doesn't control
    it.skipIf(process.platform === 'win32')('should return failure on permission error', async () => {
      delete process.env.OPENSPEC_NO_AUTO_CONFIG;
      await installer.install(mockCompletionScript);
      const targetPath = installer.getInstallationPath();
      const parentDir = path.dirname(targetPath);

      // Make parent directory read-only
      await fs.chmod(parentDir, 0o444);
      const result = await installer.uninstall();

      // Restore permissions
      await fs.chmod(parentDir, 0o755);

      // On some systems, the access check fails which returns "not installed"
      // On others, the unlink fails which returns "Failed to uninstall"
      expect(result.success).toBe(false);
      expect(
        result.message === 'Completion script is not installed' ||
        result.message.includes('Failed to uninstall completion script')
      ).toBe(true);
    });

    it('should handle uninstall when parent directory does not exist', async () => {
      const result = await installer.uninstall();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Completion script is not installed');
    });
  });

});
