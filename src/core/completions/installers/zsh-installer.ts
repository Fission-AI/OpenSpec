import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { FileSystemUtils } from '../../../utils/file-system.js';
import { InstallationResult } from '../factory.js';
import { shellSingleQuote } from './shell-quote.js';

/**
 * zsh reads its startup files from $ZDOTDIR when it is set, and from $HOME
 * only otherwise, so a block written to ~/.zshrc under an XDG-style
 * ZDOTDIR is never loaded (#2138).
 */
function zshrcDir(homeDir: string): string {
  const zdotdir = process.env.ZDOTDIR;
  // zsh does not expand `~` in ZDOTDIR, and path.join would resolve a relative
  // or `~/...` value against the current directory, writing a stray .zshrc
  // into the user's project. Only an absolute ZDOTDIR moves the file.
  return zdotdir && path.isAbsolute(zdotdir) ? zdotdir : homeDir;
}

/** The .zshrc zsh will read, as shown to the user: `~/.zshrc` unless ZDOTDIR moves it. */
export function zshrcDisplayPath(homeDir: string = os.homedir()): string {
  const zshrcPath = path.join(zshrcDir(homeDir), '.zshrc');
  return zshrcPath === path.join(homeDir, '.zshrc') ? '~/.zshrc' : zshrcPath;
}

/**
 * Installer for Zsh completion scripts.
 * Supports both Oh My Zsh and standard Zsh configurations.
 */
export class ZshInstaller {
  private readonly homeDir: string;

  /**
   * Markers for .zshrc configuration management
   */
  private readonly ZSHRC_MARKERS = {
    start: '# OPENSPEC:START',
    end: '# OPENSPEC:END',
  };

  constructor(homeDir: string = os.homedir()) {
    this.homeDir = homeDir;
  }

  /**
   * Check if Oh My Zsh is installed
   *
   * @returns true if Oh My Zsh is detected via $ZSH env var or directory exists
   */
  async isOhMyZshInstalled(): Promise<boolean> {
    // First check for $ZSH environment variable (standard OMZ setup)
    if (process.env.ZSH) {
      return true;
    }

    // Fall back to checking for ~/.oh-my-zsh directory
    try {
      const stat = await fs.stat(this.ohMyZshRoot());
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Oh My Zsh exports its root as $ZSH; honor a custom location, or the
   * completion lands in a ~/.oh-my-zsh tree that nothing ever loads.
   */
  private ohMyZshRoot(): string {
    return process.env.ZSH || path.join(this.homeDir, '.oh-my-zsh');
  }

  /**
   * The custom dir is separately relocatable via $ZSH_CUSTOM.
   */
  private ohMyZshCustomDir(): string {
    return process.env.ZSH_CUSTOM || path.join(this.ohMyZshRoot(), 'custom');
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
        path: path.join(this.ohMyZshCustomDir(), 'completions', '_openspec'),
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
   * Get the path to .zshrc file
   *
   * @returns Path to .zshrc
   */
  private getZshrcPath(): string {
    return path.join(zshrcDir(this.homeDir), '.zshrc');
  }

  /**
   * Every .zshrc that may hold an OpenSpec block: the one zsh reads, plus
   * ~/.zshrc, where installs before #2138 wrote it even under ZDOTDIR.
   */
  private getZshrcCandidates(): string[] {
    return [...new Set([this.getZshrcPath(), path.join(this.homeDir, '.zshrc')])];
  }

  /**
   * Generate .zshrc configuration content
   *
   * @param completionsDir - Directory containing completion scripts
   * @returns Configuration content
   */
  private generateZshrcConfig(completionsDir: string): string {
    return [
      '# OpenSpec shell completions configuration',
      `fpath=(${shellSingleQuote(completionsDir)} $fpath)`,
      'autoload -Uz compinit',
      'compinit',
    ].join('\n');
  }

  /**
   * Configure .zshrc to enable completions
   * Only applies to standard Zsh (not Oh My Zsh)
   *
   * @param completionsDir - Directory containing completion scripts
   * @returns true if configured successfully, false otherwise
   */
  async configureZshrc(completionsDir: string): Promise<boolean> {
    // Check if auto-configuration is disabled
    if (process.env.OPENSPEC_NO_AUTO_CONFIG === '1') {
      return false;
    }

    try {
      const zshrcPath = this.getZshrcPath();
      const config = this.generateZshrcConfig(completionsDir);

      // Check write permissions
      const canWrite = await FileSystemUtils.canWriteFile(zshrcPath);
      if (!canWrite) {
        return false;
      }

      // Use marker-based update
      await FileSystemUtils.updateFileWithMarkers(
        zshrcPath,
        config,
        this.ZSHRC_MARKERS.start,
        this.ZSHRC_MARKERS.end
      );

      return true;
    } catch (error: any) {
      // Fail gracefully - don't break installation
      console.debug(`Unable to configure .zshrc for completions: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if .zshrc has OpenSpec configuration markers
   *
   * @returns true if .zshrc exists and has markers
   */
  private async hasZshrcConfig(zshrcPath: string = this.getZshrcPath()): Promise<boolean> {
    try {
      const content = await fs.readFile(zshrcPath, 'utf-8');
      return content.includes(this.ZSHRC_MARKERS.start) && content.includes(this.ZSHRC_MARKERS.end);
    } catch {
      return false;
    }
  }

  /**
   * Remove .zshrc configuration
   * Used during uninstallation
   *
   * @param zshrcPath - The .zshrc to clean; defaults to the one zsh reads
   * @returns true if removed successfully, false otherwise
   */
  async removeZshrcConfig(zshrcPath: string = this.getZshrcPath()): Promise<boolean> {
    try {
      // Check if file exists
      try {
        await fs.access(zshrcPath);
      } catch {
        // File doesn't exist, nothing to remove
        return true;
      }

      // Read file content
      const content = await fs.readFile(zshrcPath, 'utf-8');

      // Check if markers exist
      if (!content.includes(this.ZSHRC_MARKERS.start) || !content.includes(this.ZSHRC_MARKERS.end)) {
        // Markers don't exist, nothing to remove
        return true;
      }

      // Remove content between markers (including markers)
      const lines = content.split('\n');
      const startIndex = lines.findIndex((line) => line.trim() === this.ZSHRC_MARKERS.start);
      const endIndex = lines.findIndex((line) => line.trim() === this.ZSHRC_MARKERS.end);

      if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        // Invalid marker placement
        return false;
      }

      // Remove lines between markers (inclusive)
      lines.splice(startIndex, endIndex - startIndex + 1);

      // Install puts the block at the top of the file followed by one blank
      // separator line; drop that line too so the file reads as it did before.
      // Everything else, including blank lines the user had at the top, is left as is.
      if (startIndex === 0 && lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }

      // Write back
      await fs.writeFile(zshrcPath, lines.join('\n'), 'utf-8');

      return true;
    } catch (error: any) {
      // Fail gracefully
      console.debug(`Unable to remove .zshrc configuration: ${error.message}`);
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
      const { path: targetPath, isOhMyZsh } = await this.getInstallationPath();

      // Check if already installed with same content
      let isUpdate = false;
      try {
        const existingContent = await fs.readFile(targetPath, 'utf-8');
        if (existingContent === completionScript) {
          // Already installed and up to date. Still make sure the .zshrc zsh
          // reads has the block: an install made before #2138 under ZDOTDIR
          // wrote it to ~/.zshrc, and re-running install is how that's fixed.
          const zshrcConfigured = isOhMyZsh
            ? false
            : await this.configureZshrc(path.dirname(targetPath));
          return {
            success: true,
            installedPath: targetPath,
            isOhMyZsh,
            zshrcConfigured,
            message: 'Completion script is already installed (up to date)',
            instructions:
              isOhMyZsh || zshrcConfigured
                ? [
                    'The completion script is already installed and up to date.',
                    'If completions are not working, try: exec zsh',
                  ]
                : this.generateInstructions(false, targetPath),
          };
        }
        // File exists but content is different - this is an update
        isUpdate = true;
      } catch (error: any) {
        // File doesn't exist or can't be read, proceed with installation
        console.debug(`Unable to read existing completion file at ${targetPath}: ${error.message}`);
      }

      if (!(await FileSystemUtils.canWriteFile(targetPath))) {
        throw new Error(`Path is not writable: ${targetPath}`);
      }

      // Ensure the directory exists
      const targetDir = path.dirname(targetPath);
      await fs.mkdir(targetDir, { recursive: true });

      // Backup existing file if updating
      const backupPath = isUpdate ? await this.backupExistingFile(targetPath) : undefined;

      // Write the completion script
      await fs.writeFile(targetPath, completionScript, 'utf-8');

      // Auto-configure .zshrc for standard Zsh only.
      // Oh My Zsh loads custom/completions and runs compinit itself.
      let zshrcConfigured = false;
      if (!isOhMyZsh) {
        zshrcConfigured = await this.configureZshrc(targetDir);
      }

      // Generate instructions (only if .zshrc wasn't auto-configured)
      let instructions = zshrcConfigured ? undefined : this.generateInstructions(isOhMyZsh, targetPath);

      // Add fpath guidance for Oh My Zsh installations
      if (isOhMyZsh) {
        const fpathGuidance = this.generateOhMyZshFpathGuidance(targetDir);
        if (fpathGuidance) {
          instructions = instructions ? [...instructions, '', ...fpathGuidance] : fpathGuidance;
        }
      }

      // Determine appropriate message based on update status
      let message: string;
      if (isUpdate) {
        message = backupPath
          ? 'Completion script updated successfully (previous version backed up)'
          : 'Completion script updated successfully';
      } else {
        message = isOhMyZsh
          ? 'Completion script installed successfully for Oh My Zsh'
          : zshrcConfigured
            ? 'Completion script installed and .zshrc configured successfully'
            : 'Completion script installed successfully for Zsh';
      }

      return {
        success: true,
        installedPath: targetPath,
        backupPath,
        isOhMyZsh,
        zshrcConfigured,
        message,
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
   * Generate Oh My Zsh fpath verification guidance
   *
   * @param completionsDir - Custom completions directory path
   * @returns Array of guidance strings, or undefined if not needed
   */
  private generateOhMyZshFpathGuidance(completionsDir: string): string[] | undefined {
    // One fpath entry per line, matched as a literal: a relocated $ZSH_CUSTOM
    // need not contain "custom/completions", and the path may hold characters
    // grep would otherwise read as a pattern. Single-quoted for the shell.
    const quotedDir = `'${completionsDir.replace(/'/g, `'\\''`)}'`;
    return [
      'Note: Oh My Zsh typically auto-loads completions from custom/completions.',
      `Verify that ${completionsDir} is in your fpath by running:`,
      `  printf '%s\\n' $fpath | grep -F ${quotedDir}`,
      '',
      'If not found, completions may not work. Restart your shell to ensure changes take effect.',
    ];
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
      const zshrcPath = this.getZshrcPath();

      return [
        'Completion script installed to ~/.zsh/completions/',
        '',
        `To enable completions, add the following to your ${zshrcDisplayPath(this.homeDir)} file:`,
        '',
        `  # Add completions directory to fpath`,
        `  fpath=(${shellSingleQuote(completionsDir)} $fpath)`,
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
      const { path: targetPath, isOhMyZsh } = await this.getInstallationPath();

      // Try to remove completion script
      let scriptRemoved = false;
      try {
        await fs.access(targetPath);
        await fs.unlink(targetPath);
        scriptRemoved = true;
      } catch {
        // Script not installed
      }

      // Try to remove .zshrc configuration (only for standard Zsh)
      let zshrcWasPresent = false;
      const cleanedZshrcs: string[] = [];
      const failedZshrcs: string[] = [];
      if (!isOhMyZsh) {
        for (const zshrcPath of this.getZshrcCandidates()) {
          if (await this.hasZshrcConfig(zshrcPath)) {
            zshrcWasPresent = true;
            if (await this.removeZshrcConfig(zshrcPath)) {
              cleanedZshrcs.push(zshrcPath);
            } else {
              failedZshrcs.push(zshrcPath);
            }
          }
        }
      }

      if (!scriptRemoved && !zshrcWasPresent) {
        return {
          success: false,
          message: 'Completion script is not installed',
        };
      }

      const messages: string[] = [];
      if (scriptRemoved) {
        messages.push(`Completion script removed from ${targetPath}`);
      }
      const label = (zshrcPath: string) =>
        zshrcPath === path.join(this.homeDir, '.zshrc') ? '~/.zshrc' : zshrcPath;
      for (const zshrcPath of cleanedZshrcs) {
        messages.push(`Removed OpenSpec configuration from ${label(zshrcPath)}`);
      }
      // A block left behind keeps loading the completions, so say so instead
      // of reporting a clean uninstall.
      for (const zshrcPath of failedZshrcs) {
        messages.push(
          `Could not remove the OpenSpec block from ${label(zshrcPath)}; delete the lines between # OPENSPEC:START and # OPENSPEC:END by hand`
        );
      }

      return {
        success: failedZshrcs.length === 0,
        message: messages.join('. '),
      };
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
