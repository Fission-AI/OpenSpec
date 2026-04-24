import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FileSystemUtils } from '../../utils/file-system.js';

export async function ensureWritableSetupTarget(targetPath: string): Promise<string> {
  const resolvedPath = path.resolve(targetPath);

  if (!(await FileSystemUtils.ensureWritePermissions(resolvedPath))) {
    throw new Error(`Insufficient permissions to write to ${resolvedPath}`);
  }

  return resolvedPath;
}

export async function ensureSetupDirectories(directoryPaths: string[]): Promise<void> {
  for (const directoryPath of directoryPaths) {
    await FileSystemUtils.createDirectory(directoryPath);
  }
}

export async function ensureGitignoreEntries(
  rootPath: string,
  entries: string[]
): Promise<'created' | 'updated' | 'exists'> {
  const gitignorePath = path.join(rootPath, '.gitignore');
  const normalizedEntries = [...new Set(entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0))];

  if (normalizedEntries.length === 0) {
    return 'exists';
  }

  let existingContent = '';
  try {
    existingContent = await fs.readFile(gitignorePath, 'utf-8');
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const existingLines = new Set(
    existingContent
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );
  const missingEntries = normalizedEntries.filter((entry) => !existingLines.has(entry));

  if (missingEntries.length === 0) {
    return 'exists';
  }

  const nextContent = existingContent.length === 0
    ? `${missingEntries.join('\n')}\n`
    : `${existingContent.replace(/\s*$/u, '')}\n${missingEntries.join('\n')}\n`;

  await FileSystemUtils.writeFile(gitignorePath, nextContent);

  return existingContent.length === 0 ? 'created' : 'updated';
}
