import * as nodeFs from 'node:fs';
import * as path from 'node:path';

const fs = nodeFs.promises;

export interface WorkspaceParsedLinkInput {
  name?: string;
  pathInput: string;
}

export interface WorkspaceLinkInputParseOptions {
  cwd?: string;
}

async function directoryExists(inputPath: string, cwd: string): Promise<boolean> {
  if (inputPath.length === 0) {
    return false;
  }

  const resolvedPath = path.isAbsolute(inputPath)
    ? path.resolve(inputPath)
    : path.resolve(cwd, inputPath);

  try {
    return (await fs.stat(resolvedPath)).isDirectory();
  } catch {
    return false;
  }
}

export async function parseWorkspaceSetupLinkInput(
  value: string,
  options: WorkspaceLinkInputParseOptions = {}
): Promise<WorkspaceParsedLinkInput> {
  const cwd = options.cwd ?? process.cwd();

  if (await directoryExists(value, cwd)) {
    return { pathInput: value };
  }

  const separatorIndex = value.indexOf('=');

  if (separatorIndex === -1) {
    return { pathInput: value };
  }

  return {
    name: value.slice(0, separatorIndex),
    pathInput: value.slice(separatorIndex + 1),
  };
}
