import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { FileSystemUtils } from '../../../utils/file-system.js';
import { InstallationResult } from '../factory.js';

/**
 * Installer for PowerShell completion scripts.
 * Works with both Windows PowerShell 5.1 and PowerShell Core 7+
 */
export class PowerShellInstaller {
  private readonly homeDir: string;

  /**
   * Markers for PowerShell profile configuration management
   */
  private readonly PROFILE_MARKERS = {
    start: '# OPENSPEC:START',
    end: '# OPENSPEC:END',
  };

  constructor(homeDir: string = os.homedir()) {
    this.homeDir = homeDir;
  }

  /**
   * Get PowerShell profile path
   * Prefers $PROFILE environment variable, falls back to platform defaults
   *
   * @returns Profile path
   */
  getProfilePath(): string {
    // Check $PROFILE environment variable (set when running in PowerShell)
    if (process.env.PROFILE) {
      return process.env.PROFILE;
    }

    // Fall back to platform-specific defaults
    if (process.platform === 'win32') {
      // Windows: Documents/PowerShell/Microsoft.PowerShell_profile.ps1
      return path.join(this.homeDir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
    } else {
      // macOS/Linux: .config/powershell/Microsoft.PowerShell_profile.ps1
      return path.join(this.homeDir, '.config', 'powershell', 'Microsoft.PowerShell_profile.ps1');
    }
  }

  /**
   * Get the installation path for the completion script
   *
   * @returns Installation path
   */
  getInstallationPath(): string {
    const profilePath = this.getProfilePath();
    const profileDir = path.dirname(profilePath);
    return path.join(profileDir, 'OpenSpecCompletion.ps1');
  }

  /**
   * Backup an existing completion file if it exists
   *
   * @param targetPath - Path to the file to backup
   * @returns Path to the backup file, or undefined if no backup was needed
   */
  async backupExistingFile(targetPath: string): Promise<string | undefined> {
    try {
      await fs.access(targetPath);
      // File exists, create a backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${targetPath}.backup-${timestamp}`;
      await fs.copyFile(targetPath, backupPath);
      return backupPath;
    } catch {
      // File doesn't exist, no backup needed
      return undefined;
    }
  }

  /**
   * Generate PowerShell profile configuration content
   *
   * @param scriptPath - Path to the completion script
   * @returns Configuration content
   */
  private generateProfileConfig(scriptPath: string): string {
    return [
      '# OpenSpec shell completions configuration',
      `if (Test-Path "${scriptPath}") {`,
      `    . "${scriptPath}"`,
      '}',
    ].join('\n');
  }

  /**
   * Configure PowerShell profile to source the completion script
   *
   * @param scriptPath - Path to the completion script
   * @returns true if configured successfully, false otherwise
   */
  async configureProfile(scriptPath: string): Promise<boolean> {
    // Check if auto-configuration is disabled
    if (process.env.OPENSPEC_NO_AUTO_CONFIG === '1') {
      return false;
    }

    try {
      const profilePath = this.getProfilePath();
      const config = this.generateProfileConfig(scriptPath);

      // Check write permissions
      const canWrite = await FileSystemUtils.canWriteFile(profilePath);
      if (!canWrite) {
        return false;
      }

      // Use marker-based update
      await FileSystemUtils.updateFileWithMarkers(
        profilePath,
        config,
        this.PROFILE_MARKERS.start,
        this.PROFILE_MARKERS.end
      );

      return true;
    } catch (error: any) {
      // Fail gracefully - don't break installation
      console.debug(`Unable to configure PowerShell profile for completions: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove PowerShell profile configuration
   * Used during uninstallation
   *
   * @returns true if removed successfully, false otherwise
   */
  async removeProfileConfig(): Promise<boolean> {
    try {
      const profilePath = this.getProfilePath();

      // Check if file exists
      try {
        await fs.access(profilePath);
      } catch {
        // File doesn't exist, nothing to remove
        return true;
      }

      // Read file content
      const content = await fs.readFile(profilePath, 'utf-8');

      // Check if markers exist
      if (!content.includes(this.PROFILE_MARKERS.start) || !content.includes(this.PROFILE_MARKERS.end)) {
        // Markers don't exist, nothing to remove
        return true;
      }

      // Remove content between markers (including markers)
      const lines = content.split('\n');
      const startIndex = lines.findIndex((line) => line.trim() === this.PROFILE_MARKERS.start);
      const endIndex = lines.findIndex((line) => line.trim() === this.PROFILE_MARKERS.end);

      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        // Invalid marker placement
        return false;
      }

      // Remove lines between markers (inclusive)
      lines.splice(startIndex, endIndex - startIndex + 1);

      // Remove trailing empty lines
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }

      // Write back
      await fs.writeFile(profilePath, lines.join('\n'), 'utf-8');

      return true;
    } catch (error: any) {
      // Fail gracefully
      console.debug(`Unable to remove PowerShell profile configuration: ${error.message}`);
      return false;
    }
  }

  /**
   * Install the completion script
   *
   * @param completionScript - The completion script content to install
   * @returns Installation result with status and instructions
   */
  async install(completionScript: string): Promise<InstallationResult> {
    try {
      const targetPath = this.getInstallationPath();

      // Check if already installed with same content
      let isUpdate = false;
      try {
        const existingContent = await fs.readFile(targetPath, 'utf-8');
        if (existingContent === completionScript) {
          // Already installed and up to date
          return {
            success: true,
            installedPath: targetPath,
            message: 'Completion script is already installed (up to date)',
            instructions: [
              'The completion script is already installed and up to date.',
              'If completions are not working, try restarting PowerShell or run: . $PROFILE',
            ],
          };
        }
        // File exists but content is different - this is an update
        isUpdate = true;
      } catch (error: any) {
        // File doesn't exist or can't be read, proceed with installation
        console.debug(`Unable to read existing completion file at ${targetPath}: ${error.message}`);
      }

      // Ensure the directory exists
      const targetDir = path.dirname(targetPath);
      await fs.mkdir(targetDir, { recursive: true });

      // Backup existing file if updating
      const backupPath = isUpdate ? await this.backupExistingFile(targetPath) : undefined;

      // Write the completion script
      await fs.writeFile(targetPath, completionScript, 'utf-8');

      // Auto-configure PowerShell profile
      const profileConfigured = await this.configureProfile(targetPath);

      // Generate instructions if profile wasn't auto-configured
      const instructions = profileConfigured ? undefined : this.generateInstructions(targetPath);

      // Determine appropriate message
      let message: string;
      if (isUpdate) {
        message = backupPath
          ? 'Completion script updated successfully (previous version backed up)'
          : 'Completion script updated successfully';
      } else {
        message = profileConfigured
          ? 'Completion script installed and PowerShell profile configured successfully'
          : 'Completion script installed successfully for PowerShell';
      }

      return {
        success: true,
        installedPath: targetPath,
        backupPath,
        profileConfigured,
        message,
        instructions,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to install completion script: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Generate user instructions for enabling completions
   *
   * @param installedPath - Path where the script was installed
   * @returns Array of instruction strings
   */
  private generateInstructions(installedPath: string): string[] {
    const profilePath = this.getProfilePath();

    return [
      'Completion script installed successfully.',
      '',
      `To enable completions, add the following to your PowerShell profile (${profilePath}):`,
      '',
      '  # Source OpenSpec completions',
      `  if (Test-Path "${installedPath}") {`,
      `      . "${installedPath}"`,
      '  }',
      '',
      'Then restart PowerShell or run: . $PROFILE',
    ];
  }

  /**
   * Uninstall the completion script
   *
   * @param options - Optional uninstall options
   * @param options.yes - Skip confirmation prompt (handled by command layer)
   * @returns Uninstallation result
   */
  async uninstall(options?: { yes?: boolean }): Promise<{ success: boolean; message: string }> {
    try {
      const targetPath = this.getInstallationPath();

      // Check if installed
      try {
        await fs.access(targetPath);
      } catch {
        return {
          success: false,
          message: 'Completion script is not installed',
        };
      }

      // Remove the completion script
      await fs.unlink(targetPath);

      // Remove profile configuration
      await this.removeProfileConfig();

      return {
        success: true,
        message: 'Completion script uninstalled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to uninstall completion script: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
