import path from 'path';
import { FileSystemUtils } from '../utils/file-system.js';
import { runUpdate, UpdateResult } from './update-logic.js';

export class UpdateCommand {
  async execute(projectPath: string): Promise<void> {
    const result = await runUpdate(projectPath);

    const { openspecPath, updatedFiles, createdFiles, failedFiles, updatedSlashFiles, failedSlashTools, errorDetails } = result;

    // Log individual failures
    for (const [file, error] of Object.entries(errorDetails)) {
        if (file.startsWith('slash:')) {
            const toolId = file.split(':')[1];
            console.error(`Failed to update slash commands for ${toolId}: ${error}`);
        } else {
            console.error(`Failed to update ${file}: ${error}`);
        }
    }

    const summaryParts: string[] = [];
    const openspecDirName = path.basename(openspecPath);
    const instructionFiles: string[] = [`${openspecDirName}/AGENTS.md`];

    if (updatedFiles.includes('AGENTS.md')) {
      instructionFiles.push(
        createdFiles.includes('AGENTS.md') ? 'AGENTS.md (created)' : 'AGENTS.md'
      );
    }

    summaryParts.push(
      `Updated OpenSpec instructions (${instructionFiles.join(', ')})`
    );

    const aiToolFiles = updatedFiles.filter((file) => file !== 'AGENTS.md');
    if (aiToolFiles.length > 0) {
      summaryParts.push(`Updated AI tool files: ${aiToolFiles.join(', ')}`);
    }

    if (updatedSlashFiles.length > 0) {
      // Normalize to forward slashes for cross-platform log consistency
      const normalized = updatedSlashFiles.map((p) => FileSystemUtils.toPosixPath(p));
      summaryParts.push(`Updated slash commands: ${normalized.join(', ')}`);
    }

    const failedItems = [
      ...failedFiles,
      ...failedSlashTools.map(
        (toolId) => `slash command refresh (${toolId})`
      ),
    ];

    if (failedItems.length > 0) {
      summaryParts.push(`Failed to update: ${failedItems.join(', ')}`);
    }

    console.log(summaryParts.join(' | '));
  }
}
