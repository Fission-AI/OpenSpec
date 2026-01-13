import path from 'path';
import { FileSystemUtils } from '../utils/file-system.js';
import { resolveOpenSpecDir } from './path-resolver.js';
import { ToolRegistry } from './configurators/registry.js';
import { SlashCommandRegistry } from './configurators/slash/registry.js';
import { agentsTemplate } from './templates/agents-template.js';

export interface UpdateResult {
  openspecPath: string;
  updatedFiles: string[];
  createdFiles: string[];
  failedFiles: string[];
  updatedSlashFiles: string[];
  failedSlashTools: string[];
  errorDetails: Record<string, string>;
}

export async function runUpdate(projectPath: string): Promise<UpdateResult> {
  const resolvedProjectPath = path.resolve(projectPath);
  const openspecPath = await resolveOpenSpecDir(resolvedProjectPath);

  // 1. Check openspec directory exists
  if (!await FileSystemUtils.directoryExists(openspecPath)) {
    throw new Error(`No OpenSpec directory found. Run 'openspec init' first.`);
  }

  const updatedFiles: string[] = [];
  const createdFiles: string[] = [];
  const failedFiles: string[] = [];
  const updatedSlashFiles: string[] = [];
  const failedSlashTools: string[] = [];
  const errorDetails: Record<string, string> = {};

  // 2. Update internal AGENTS.md (full replacement)
  const internalAgentsPath = path.join(openspecPath, 'AGENTS.md');
  const internalAgentsName = path.join(path.basename(openspecPath), 'AGENTS.md');
  try {
    await FileSystemUtils.writeFile(internalAgentsPath, agentsTemplate);
    updatedFiles.push(internalAgentsName);
  } catch (error: any) {
    failedFiles.push(internalAgentsName);
    errorDetails[internalAgentsName] = error.message;
  }

  // 3. Update existing AI tool configuration files only
  const configurators = ToolRegistry.getAll();
  const slashConfigurators = SlashCommandRegistry.getAll();

  for (const configurator of configurators) {
    const configFilePath = path.join(
      resolvedProjectPath,
      configurator.configFileName
    );
    const fileExists = await FileSystemUtils.fileExists(configFilePath);
    const shouldConfigure =
      fileExists || configurator.configFileName === 'AGENTS.md';

    if (!shouldConfigure) {
      continue;
    }

    try {
      if (fileExists && !await FileSystemUtils.canWriteFile(configFilePath)) {
        throw new Error(
          `Insufficient permissions to modify ${configurator.configFileName}`
        );
      }

      await configurator.configure(resolvedProjectPath, openspecPath);
      
      // Don't double-add if it was already added by the internal agents step (unlikely but safe)
      if (!updatedFiles.includes(configurator.configFileName)) {
        updatedFiles.push(configurator.configFileName);
      }

      if (!fileExists) {
        createdFiles.push(configurator.configFileName);
      }
    } catch (error: any) {
      failedFiles.push(configurator.configFileName);
      errorDetails[configurator.configFileName] = error.message;
    }
  }

  for (const slashConfigurator of slashConfigurators) {
    if (!slashConfigurator.isAvailable) {
      continue;
    }

    try {
      const updated = await slashConfigurator.updateExisting(
        resolvedProjectPath,
        openspecPath
      );
      updatedSlashFiles.push(...updated);
    } catch (error: any) {
      failedSlashTools.push(slashConfigurator.toolId);
      errorDetails[`slash:${slashConfigurator.toolId}`] = error.message;
    }
  }

  return {
    openspecPath,
    updatedFiles,
    createdFiles,
    failedFiles,
    updatedSlashFiles,
    failedSlashTools,
    errorDetails
  };
}
