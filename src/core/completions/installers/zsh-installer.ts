import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * Installation result information
 */
export interface InstallationResult {
  success: boolean;
  installedPath?: string;
  backupPath?: string;
  isOhMyZsh: boolean;
  message: string;
  instructions?: string[];
}

/**
 * Installer for Zsh completion scripts.
 * Supports both Oh My Zsh and standard Zsh configurations.
 */
export class ZshInstaller {
  private readonly homeDir: string;

  constructor(homeDir: string = os.homedir()) {
    this.homeDir = homeDir;
  }

  /**
   * Check if Oh My Zsh is installed
   *
   * @returns true if Oh My Zsh directory exists
   */
  async isOhMyZshInstalled(): Promise<boolean> {
    const ohMyZshPath = path.join(this.homeDir, '.oh-my-zsh');

    try {
      const stat = await fs.stat(ohMyZshPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get the appropriate installation path for the completion script
   *
   * @returns Object with installation path and whether it's Oh My Zsh
   */
  async getInstallationPath(): Promise<{ path: string; isOhMyZsh: boolean }> {
    const isOhMyZsh = await this.isOhMyZshInstalled();

    if (isOhMyZsh) {
      // Oh My Zsh custom completions directory
      return {
        path: path.join(this.homeDir, '.oh-my-zsh', 'completions', '_openspec'),
        isOhMyZsh: true,
      };
    } else {
      // Standard Zsh completions directory
      return {
        path: path.join(this.homeDir, '.zsh', 'completions', '_openspec'),
        isOhMyZsh: false,
      };
    }
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
      const { path: targetPath, isOhMyZsh } = await this.getInstallationPath();

      // Ensure the directory exists
      const targetDir = path.dirname(targetPath);
      await fs.mkdir(targetDir, { recursive: true });

      // Backup existing file if present
      const backupPath = await this.backupExistingFile(targetPath);

      // Write the completion script
      await fs.writeFile(targetPath, completionScript, 'utf-8');

      // Generate instructions
      const instructions = this.generateInstructions(isOhMyZsh, targetPath);

      return {
        success: true,
        installedPath: targetPath,
        backupPath,
        isOhMyZsh,
        message: isOhMyZsh
          ? 'Completion script installed successfully for Oh My Zsh'
          : 'Completion script installed successfully for Zsh',
        instructions,
      };
    } catch (error) {
      return {
        success: false,
        isOhMyZsh: false,
        message: `Failed to install completion script: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Generate user instructions for enabling completions
   *
   * @param isOhMyZsh - Whether Oh My Zsh is being used
   * @param installedPath - Path where the script was installed
   * @returns Array of instruction strings
   */
  private generateInstructions(isOhMyZsh: boolean, installedPath: string): string[] {
    if (isOhMyZsh) {
      return [
        'Completion script installed to Oh My Zsh completions directory.',
        'Restart your shell or run: exec zsh',
        'Completions should activate automatically.',
      ];
    } else {
      const completionsDir = path.dirname(installedPath);
      const zshrcPath = path.join(this.homeDir, '.zshrc');

      return [
        'Completion script installed to ~/.zsh/completions/',
        '',
        'To enable completions, add the following to your ~/.zshrc file:',
        '',
        `  # Add completions directory to fpath`,
        `  fpath=(${completionsDir} $fpath)`,
        '',
        '  # Initialize completion system',
        '  autoload -Uz compinit',
        '  compinit',
        '',
        'Then restart your shell or run: exec zsh',
        '',
        `Check if these lines already exist in ${zshrcPath} before adding.`,
      ];
    }
  }

  /**
   * Uninstall the completion script
   *
   * @returns true if uninstalled successfully, false otherwise
   */
  async uninstall(): Promise<{ success: boolean; message: string }> {
    try {
      const { path: targetPath } = await this.getInstallationPath();

      try {
        await fs.access(targetPath);
        await fs.unlink(targetPath);
        return {
          success: true,
          message: `Completion script removed from ${targetPath}`,
        };
      } catch {
        return {
          success: false,
          message: 'Completion script is not installed',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to uninstall completion script: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check if completion script is currently installed
   *
   * @returns true if the completion script exists
   */
  async isInstalled(): Promise<boolean> {
    try {
      const { path: targetPath } = await this.getInstallationPath();
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get information about the current installation
   *
   * @returns Installation status information
   */
  async getInstallationInfo(): Promise<{
    installed: boolean;
    path?: string;
    isOhMyZsh?: boolean;
  }> {
    const installed = await this.isInstalled();

    if (!installed) {
      return { installed: false };
    }

    const { path: targetPath, isOhMyZsh } = await this.getInstallationPath();

    return {
      installed: true,
      path: targetPath,
      isOhMyZsh,
    };
  }
}
