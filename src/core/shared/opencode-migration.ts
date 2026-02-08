import path from 'path';
import * as fs from 'fs';
import { FileSystemUtils } from '../../utils/file-system.js';

export async function migrateOpenCodeCommands(
  projectPath: string,
  canPrompt: boolean
): Promise<void> {
  const legacyDir = path.join(projectPath, '.opencode', 'command');
  if (!await FileSystemUtils.directoryExists(legacyDir)) {
    return;
  }

  const nextDir = path.join(projectPath, '.opencode', 'commands');
  await FileSystemUtils.createDirectory(nextDir);

  const entries = await fs.promises.readdir(legacyDir, { withFileTypes: true });
  let changedAny = false;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const sourcePath = path.join(legacyDir, entry.name);
    const destinationPath = path.join(nextDir, entry.name);
    // Prefer the new location on conflicts: keep destination, discard legacy.
    if (await FileSystemUtils.fileExists(destinationPath)) {
      await fs.promises.unlink(sourcePath);
      changedAny = true;
      continue;
    }

    try {
      await fs.promises.rename(sourcePath, destinationPath);
    } catch (error: any) {
      if (error?.code !== 'EXDEV') {
        throw error;
      }
      // Fallback for cross-device moves.
      await fs.promises.copyFile(sourcePath, destinationPath);
      await fs.promises.unlink(sourcePath);
    }
    changedAny = true;
  }

  const remaining = await fs.promises.readdir(legacyDir);
  if (changedAny && remaining.length === 0 && canPrompt) {
    const { confirm } = await import('@inquirer/prompts');
    const shouldRemove = await confirm({
      message: 'OpenCode commands have moved to .opencode/commands. The old .opencode/command directory is now empty and can be removed. Delete it?',
      default: true,
    });
    if (shouldRemove) {
      await fs.promises.rm(legacyDir, { recursive: true, force: true });
    }
  }
}
