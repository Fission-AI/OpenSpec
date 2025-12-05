import path from 'path';
import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import { FileSystemUtils } from '../utils/file-system.js';
import { ToolRegistry } from './configurators/registry.js';
import { SlashCommandRegistry } from './configurators/slash/registry.js';
import { OPENSPEC_DIR_NAME, OPENSPEC_MARKERS } from './config.js';
import { PALETTE } from './styles/palette.js';
import os from 'os';

type UninstallOptions = {
  yes?: boolean;
};

type ConfigFileOperation = {
  path: string;
  action: 'modify' | 'delete';
};

type UninstallSummary = {
  openspecDir: string;
  configFiles: ConfigFileOperation[];
  slashCommandPaths: string[];
};

type UninstallResult = {
  openspecDirRemoved: boolean;
  configFilesModified: string[];
  configFilesDeleted: string[];
  slashCommandsRemoved: string[];
  errors: string[];
};

export class UninstallCommand {
  private readonly skipConfirmation: boolean;

  constructor(options: UninstallOptions = {}) {
    this.skipConfirmation = options.yes ?? false;
  }

  async execute(targetPath: string): Promise<void> {
    const projectPath = path.resolve(targetPath);
    const openspecPath = path.join(projectPath, OPENSPEC_DIR_NAME);

    // Validate that OpenSpec is initialized
    await this.validate(openspecPath);

    // Discover what will be removed/modified
    const summary = await this.discoverFiles(projectPath, openspecPath);

    // Get confirmation from user
    const confirmed = await this.confirmUninstallation(summary);
    if (!confirmed) {
      console.log();
      ora().info(PALETTE.midGray('Uninstallation cancelled'));
      return;
    }

    // Perform uninstallation
    const result = await this.performUninstallation(summary, openspecPath, projectPath);

    // Display results
    this.displayResults(result);

    // Throw if there were any failures, let CLI handle exit code
    if (result.errors.length > 0) {
      throw new Error(`Uninstall completed with ${result.errors.length} error(s)`);
    }
  }

  private async validate(openspecPath: string): Promise<void> {
    const exists = await FileSystemUtils.directoryExists(openspecPath);
    if (!exists) {
      throw new Error('OpenSpec is not initialized in this project');
    }
  }

  private async discoverFiles(
    projectPath: string,
    openspecPath: string
  ): Promise<UninstallSummary> {
    const configFiles: ConfigFileOperation[] = [];
    const slashCommandPaths: string[] = [];

    // Discover AI tool config files with OpenSpec markers
    const allTools = ToolRegistry.getAll();
    for (const tool of allTools) {
      if (!tool.configFileName) continue;

      const configPath = path.join(projectPath, tool.configFileName);
      if (!(await FileSystemUtils.fileExists(configPath))) continue;

      // Check if file contains OpenSpec markers
      const content = await FileSystemUtils.readFile(configPath);
      if (
        content.includes(OPENSPEC_MARKERS.start) &&
        content.includes(OPENSPEC_MARKERS.end)
      ) {
        // Determine if file will be empty after stripping markers
        const stripped = FileSystemUtils.stripManagedBlock(
          content,
          OPENSPEC_MARKERS.start,
          OPENSPEC_MARKERS.end
        );
        const action = stripped.length === 0 ? 'delete' : 'modify';
        configFiles.push({ path: configPath, action });
      }
    }

    // Discover slash command files/directories
    const slashConfigurators = SlashCommandRegistry.getAll();
    const checkedDirs = new Set<string>(); // Track directories we've already added

    for (const configurator of slashConfigurators) {
      const targets = configurator.getTargets();

      // For each tool, find the common parent directory containing all slash commands
      for (const target of targets) {
        const absolutePath = configurator.resolveAbsolutePath(projectPath, target.id);

        // Check if this is a global path (outside the project directory)
        const normalizedProjectPath = path.resolve(projectPath);
        const normalizedAbsolutePath = path.resolve(absolutePath);
        const isGlobalPath = !normalizedAbsolutePath.startsWith(normalizedProjectPath + path.sep) &&
                            normalizedAbsolutePath !== normalizedProjectPath;

        if (isGlobalPath) {
          // For global paths (like Codex), track individual files
          if (await FileSystemUtils.fileExists(absolutePath)) {
            if (!checkedDirs.has(absolutePath)) {
              slashCommandPaths.push(absolutePath);
              checkedDirs.add(absolutePath);
            }
          }
        } else {
          // For project-relative paths, find the common "openspec" directory
          // Example: .claude/commands/openspec/proposal.md -> .claude/commands/openspec
          const parentDir = path.dirname(absolutePath);

          // Only add if we haven't already added this directory
          if (!checkedDirs.has(parentDir) && await FileSystemUtils.directoryExists(parentDir)) {
            slashCommandPaths.push(parentDir);
            checkedDirs.add(parentDir);
            break; // Found the common directory for this configurator, move to next
          }
        }
      }
    }

    return {
      openspecDir: openspecPath,
      configFiles,
      slashCommandPaths,
    };
  }

  private async confirmUninstallation(summary: UninstallSummary): Promise<boolean> {
    if (this.skipConfirmation) {
      this.displaySummary(summary);
      return true;
    }

    console.log();
    console.log(PALETTE.white('The following will be removed:'));
    console.log();

    this.displaySummary(summary);

    console.log();
    const confirmed = await confirm({
      message: 'Are you sure you want to continue?',
      default: false,
    });

    return confirmed;
  }

  private displaySummary(summary: UninstallSummary): void {
    // OpenSpec directory
    console.log(PALETTE.white('▌ Directory:'));
    console.log(PALETTE.midGray(`  - ${summary.openspecDir}`));
    console.log();

    // Config files to modify
    const filesToModify = summary.configFiles.filter(f => f.action === 'modify');
    if (filesToModify.length > 0) {
      console.log(PALETTE.white('▌ Config files (OpenSpec blocks will be removed):'));
      for (const file of filesToModify) {
        const relativePath = path.relative(process.cwd(), file.path);
        console.log(PALETTE.midGray(`  - ${relativePath}`));
      }
      console.log();
    }

    // Config files to delete
    const filesToDelete = summary.configFiles.filter(f => f.action === 'delete');
    if (filesToDelete.length > 0) {
      console.log(PALETTE.white('▌ Config files (will be deleted, no user content):'));
      for (const file of filesToDelete) {
        const relativePath = path.relative(process.cwd(), file.path);
        console.log(PALETTE.midGray(`  - ${relativePath}`));
      }
      console.log();
    }

    // Slash command paths
    if (summary.slashCommandPaths.length > 0) {
      console.log(PALETTE.white('▌ Slash commands:'));
      for (const slashPath of summary.slashCommandPaths) {
        // Check if this is a global path (starts with home directory)
        const homeDir = os.homedir();
        const normalizedSlashPath = path.resolve(slashPath);
        const normalizedHomeDir = path.resolve(homeDir);
        const isGlobalPath = normalizedSlashPath.startsWith(normalizedHomeDir + path.sep);

        const displayPath = isGlobalPath
          ? slashPath.replace(homeDir, '~')
          : path.relative(process.cwd(), slashPath);
        console.log(PALETTE.midGray(`  - ${displayPath}`));
      }
      console.log();
    }
  }

  private async performUninstallation(
    summary: UninstallSummary,
    openspecPath: string,
    projectPath: string
  ): Promise<UninstallResult> {
    const result: UninstallResult = {
      openspecDirRemoved: false,
      configFilesModified: [],
      configFilesDeleted: [],
      slashCommandsRemoved: [],
      errors: [],
    };

    // Remove openspec directory
    const dirSpinner = ora({
      text: 'Removing OpenSpec directory...',
      stream: process.stdout,
      color: 'gray',
    }).start();

    try {
      await FileSystemUtils.deleteDirectory(openspecPath);
      result.openspecDirRemoved = true;
      dirSpinner.stopAndPersist({
        symbol: PALETTE.white('▌'),
        text: PALETTE.white('OpenSpec directory removed'),
      });
    } catch (error: any) {
      result.errors.push(`Failed to remove openspec directory: ${error.message}`);
      dirSpinner.stopAndPersist({
        symbol: PALETTE.white('▌'),
        text: PALETTE.white('OpenSpec directory removal failed'),
      });
    }

    // Clean config files
    if (summary.configFiles.length > 0) {
      const configSpinner = ora({
        text: 'Cleaning AI tool configurations...',
        stream: process.stdout,
        color: 'gray',
      }).start();

      for (const file of summary.configFiles) {
        try {
          if (file.action === 'delete') {
            await FileSystemUtils.deleteFile(file.path);
            result.configFilesDeleted.push(file.path);
          } else {
            const content = await FileSystemUtils.readFile(file.path);
            const stripped = FileSystemUtils.stripManagedBlock(
              content,
              OPENSPEC_MARKERS.start,
              OPENSPEC_MARKERS.end
            );
            await FileSystemUtils.writeFile(file.path, stripped);
            result.configFilesModified.push(file.path);
          }
        } catch (error: any) {
          result.errors.push(`Failed to process ${file.path}: ${error.message}`);
        }
      }

      configSpinner.stopAndPersist({
        symbol: PALETTE.white('▌'),
        text: PALETTE.white('AI tool configurations cleaned'),
      });
    }

    // Remove slash commands
    if (summary.slashCommandPaths.length > 0) {
      const slashSpinner = ora({
        text: 'Removing slash commands...',
        stream: process.stdout,
        color: 'gray',
      }).start();

      for (const slashPath of summary.slashCommandPaths) {
        try {
          // Check if it's a file or directory
          const stats = await FileSystemUtils.fileExists(slashPath);
          if (stats) {
            const isDir = await FileSystemUtils.directoryExists(slashPath);
            if (isDir) {
              await FileSystemUtils.deleteDirectory(slashPath);
            } else {
              await FileSystemUtils.deleteFile(slashPath);
            }
            result.slashCommandsRemoved.push(slashPath);

            // Clean up empty parent directories (only for project-relative paths)
            const normalizedProjectPath = path.resolve(projectPath);
            const normalizedSlashPath = path.resolve(slashPath);
            const isProjectRelative = normalizedSlashPath.startsWith(normalizedProjectPath + path.sep) ||
                                     normalizedSlashPath === normalizedProjectPath;

            if (isProjectRelative) {
              await this.cleanupEmptyParentDirectories(slashPath, projectPath);
            }
          }
        } catch (error: any) {
          result.errors.push(`Failed to remove ${slashPath}: ${error.message}`);
        }
      }

      slashSpinner.stopAndPersist({
        symbol: PALETTE.white('▌'),
        text: PALETTE.white('Slash commands removed'),
      });
    }

    return result;
  }

  private async cleanupEmptyParentDirectories(
    deletedPath: string,
    projectPath: string
  ): Promise<void> {
    let currentDir = path.dirname(deletedPath);

    // Don't delete beyond the project directory
    while (currentDir !== projectPath && currentDir !== path.dirname(currentDir)) {
      try {
        const isEmpty = await FileSystemUtils.isDirectoryEmpty(currentDir);
        if (isEmpty) {
          await FileSystemUtils.deleteDirectory(currentDir);
          currentDir = path.dirname(currentDir);
        } else {
          break;
        }
      } catch {
        // If we can't check or delete, stop cleanup
        break;
      }
    }
  }

  private displayResults(result: UninstallResult): void {
    console.log();

    if (result.errors.length === 0) {
      ora().succeed(PALETTE.white('OpenSpec uninstalled successfully!'));
    } else {
      ora().warn(PALETTE.white('OpenSpec partially uninstalled'));
    }

    console.log();

    if (result.openspecDirRemoved) {
      console.log(PALETTE.white('▌ Removed: openspec/ directory'));
    }

    if (result.configFilesModified.length > 0) {
      console.log(PALETTE.white('▌ Modified (OpenSpec blocks removed):'));
      for (const file of result.configFilesModified) {
        const relativePath = path.relative(process.cwd(), file);
        console.log(PALETTE.midGray(`  - ${relativePath}`));
      }
    }

    if (result.configFilesDeleted.length > 0) {
      console.log(PALETTE.white('▌ Deleted (no user content):'));
      for (const file of result.configFilesDeleted) {
        const relativePath = path.relative(process.cwd(), file);
        console.log(PALETTE.midGray(`  - ${relativePath}`));
      }
    }

    if (result.slashCommandsRemoved.length > 0) {
      console.log(PALETTE.white('▌ Slash commands removed:'));
      for (const slashPath of result.slashCommandsRemoved) {
        // Check if this is a global path (starts with home directory)
        const homeDir = os.homedir();
        const normalizedSlashPath = path.resolve(slashPath);
        const normalizedHomeDir = path.resolve(homeDir);
        const isGlobalPath = normalizedSlashPath.startsWith(normalizedHomeDir + path.sep);

        const displayPath = isGlobalPath
          ? slashPath.replace(homeDir, '~')
          : path.relative(process.cwd(), slashPath);
        console.log(PALETTE.midGray(`  - ${displayPath}`));
      }
    }

    if (result.errors.length > 0) {
      console.log();
      console.log(PALETTE.white('▌ Errors:'));
      for (const error of result.errors) {
        console.log(PALETTE.midGray(`  - ${error}`));
      }
    }

    console.log();
  }
}
