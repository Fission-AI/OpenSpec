import path from 'path';
import { FileSystemUtils } from '../utils/file-system.js';
import { DEFAULT_OPENSPEC_DIR_NAME, LEGACY_OPENSPEC_DIR_NAME } from './config.js';

/**
 * Resolves the path to the OpenSpec directory.
 * Priorities:
 * 1. Legacy `openspec/` directory if it exists.
 * 2. Default `.openspec/` directory otherwise.
 */
export async function resolveOpenSpecDir(projectRoot: string): Promise<string> {
  const legacyPath = path.join(projectRoot, LEGACY_OPENSPEC_DIR_NAME);
  
  if (await FileSystemUtils.directoryExists(legacyPath)) {
    return legacyPath;
  }
  
  return path.join(projectRoot, DEFAULT_OPENSPEC_DIR_NAME);
}
