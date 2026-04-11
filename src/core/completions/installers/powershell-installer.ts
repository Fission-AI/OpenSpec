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
   * Detect the encoding of a file by inspecting its BOM (Byte Order Mark).
   * Returns the Node.js BufferEncoding and the raw BOM bytes to preserve on write.
   */
  private detectEncoding(buffer: Buffer): { encoding: BufferEncoding; bom: Buffer } {
    // UTF-16 LE BOM: FF FE
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return { encoding: 'utf16le', bom: Buffer.from([0xff, 0xfe]) };
    }
    // UTF-16 BE BOM: FE FF — not natively supported by Node
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      throw new Error(
        'File is encoded as UTF-16 BE which is not supported. ' +
          'Please re-save as UTF-8 or UTF-16 LE, then retry.',
      );
    }
    // UTF-8 BOM: EF BB BF
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return { encoding: 'utf-8', bom: Buffer.from([0xef, 0xbb, 0xbf]) };
    }
    // No BOM → default UTF-8
    return { encoding: 'utf-8', bom: Buffer.alloc(0) };
  }

  /**
   * Read a profile file, preserving its encoding metadata for round-trip writes.
   * Throws if the file uses UTF-16 BE (unsupported by Node).
   */
  private async readProfileFile(filePath: string): Promise<{ content: string; encoding: BufferEncoding; bom: Buffer }> {
    const raw = await fs.readFile(filePath);
    const { encoding, bom } = this.detectEncoding(raw);
    const content = raw.subarray(bom.length).toString(encoding);
    return { content, encoding, bom };
  }

  /**
   * Write a profile file, preserving the original BOM and encoding.
   */
  private async writeProfileFile(filePath: string, content: string, encoding: BufferEncoding, bom: Buffer): Promise<void> {
    const body = Buffer.from(content, encoding);
    await fs.writeFile(filePath, Buffer.concat([bom, body]));
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
   * Get all PowerShell profile paths to configure.
   * On Windows, returns both PowerShell Core and Windows PowerShell 5.1 paths.
   * On Unix, returns PowerShell Core path only.
   */
  private getAllProfilePaths(): string[] {
    // If PROFILE env var is set, use only that path
    if (process.env.PROFILE) {
      return [process.env.PROFILE];
    }

    if (process.platform === 'win32') {
      return [
        // PowerShell Core 6+ (cross-platform)
        path.join(this.homeDir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1'),
        // Windows PowerShell 5.1 (Windows-only)
        path.join(this.homeDir, 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1'),
      ];
    } else {
      // Unix systems: PowerShell Core only
      return [path.join(this.homeDir, '.config', 'powershell', 'Microsoft.PowerShell_profile.ps1')];
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
    const profilePaths = this.getAllProfilePaths();
    let anyConfigured = false;

    for (const profilePath of profilePaths) {
      try {
        // Create profile file if it doesn't exist
        const profileDir = path.dirname(profilePath);
        await fs.mkdir(profileDir, { recursive: true });

        let profileContent = '';
        let fileEncoding: BufferEncoding = 'utf-8';
        let fileBom: Buffer = Buffer.alloc(0);
        try {
          const file = await this.readProfileFile(profilePath);
          profileContent = file.content;
          fileEncoding = file.encoding;
          fileBom = file.bom;
        } catch (err: any) {
          // If the file doesn't exist that's fine — we'll create it as UTF-8.
          // Any other read error (permissions, unsupported encoding, etc.) → skip this profile.
          if (err?.code === 'ENOENT') {
            // keep defaults
          } else {
            console.warn(`Warning: Skipping ${profilePath}: ${err?.message ?? String(err)}`);
            continue;
          }
        }

        // Check if already configured
        const scriptLine = `. "${scriptPath}"`;
        if (profileContent.includes(scriptLine)) {
          continue; // Already configured, skip
        }

        // Add OpenSpec completion configuration with markers
        const openspecBlock = [
          '',
          '# OPENSPEC:START - OpenSpec completion (managed block, do not edit manually)',
          scriptLine,
          '# OPENSPEC:END',
          '',
        ].join('\n');

        const newContent = profileContent + openspecBlock;
        await this.writeProfileFile(profilePath, newContent, fileEncoding, fileBom);
        anyConfigured = true;
      } catch (error) {
        // Continue to next profile if this one fails
        console.warn(`Warning: Could not configure ${profilePath}: ${error}`);
      }
    }

    return anyConfigured;
  }

  /**
   * Remove PowerShell profile configuration
   * Used during uninstallation
   *
   * @returns true if removed successfully, false otherwise
   */
  async removeProfileConfig(): Promise<boolean> {
    const profilePaths = this.getAllProfilePaths();
    let anyRemoved = false;

    for (const profilePath of profilePaths) {
      try {
        // Read profile content with encoding detection
        let profileContent: string;
        let fileEncoding: BufferEncoding = 'utf-8';
        let fileBom: Buffer = Buffer.alloc(0);
        try {
          const file = await this.readProfileFile(profilePath);
          profileContent = file.content;
          fileEncoding = file.encoding;
          fileBom = file.bom;
        } catch (err: any) {
          if (err?.code === 'ENOENT') {
            continue; // Profile doesn't exist, nothing to remove
          }
          console.warn(`Warning: Could not read ${profilePath}: ${err?.message ?? String(err)}`);
          continue;
        }

        // Remove OPENSPEC:START -> OPENSPEC:END block
        const startMarker = '# OPENSPEC:START';
        const endMarker = '# OPENSPEC:END';
        const startIndex = profileContent.indexOf(startMarker);

        if (startIndex === -1) {
          continue; // No OpenSpec block found
        }

        const endIndex = profileContent.indexOf(endMarker, startIndex);
        if (endIndex === -1) {
          console.warn(`Warning: Found start marker but no end marker in ${profilePath}`);
          continue;
        }

        // Remove the block (including markers and surrounding newlines)
        const beforeBlock = profileContent.substring(0, startIndex);
        const afterBlock = profileContent.substring(endIndex + endMarker.length);

        // Clean up extra newlines
        const newContent = (beforeBlock.trimEnd() + '\n' + afterBlock.trimStart()).trim() + '\n';

        await this.writeProfileFile(profilePath, newContent, fileEncoding, fileBom);
        anyRemoved = true;
      } catch (error) {
        console.warn(`Warning: Could not clean ${profilePath}: ${error}`);
      }
    }

    return anyRemoved;
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
