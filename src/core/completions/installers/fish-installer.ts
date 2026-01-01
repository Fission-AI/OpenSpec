import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { InstallationResult } from '../factory.js';

/**
 * Installer for Fish completion scripts.
 * Fish automatically loads completions from ~/.config/fish/completions/
 */
export class FishInstaller {
  private readonly homeDir: string;

  constructor(homeDir: string = os.homedir()) {
    this.homeDir = homeDir;
  }

  /**
   * Get the installation path for Fish completions
   *
   * @returns Installation path
   */
  getInstallationPath(): string {
    return path.join(this.homeDir, '.config', 'fish', 'completions', 'openspec.fish');
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
              'Fish automatically loads completions - they should be available immediately.',
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

      // Determine appropriate message
      let message: string;
      if (isUpdate) {
        message = backupPath
          ? 'Completion script updated successfully (previous version backed up)'
          : 'Completion script updated successfully';
      } else {
        message = 'Completion script installed successfully for Fish';
      }

      return {
        success: true,
        installedPath: targetPath,
        backupPath,
        message,
        instructions: [
          'Fish automatically loads completions from ~/.config/fish/completions/',
          'Completions are available immediately - no shell restart needed.',
        ],
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to install completion script: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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
