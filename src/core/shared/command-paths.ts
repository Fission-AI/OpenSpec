import path from 'path';
import { FileSystemUtils } from '../../utils/file-system.js';

/** Resolve command writes, allowing only OpenCode's explicitly configured shared root. */
export function resolveCommandArtifactPath(
  projectPath: string,
  toolId: string,
  commandPath: string
): string {
  const configDir = toolId === 'opencode' ? process.env.OPENCODE_CONFIG_DIR : undefined;
  if (configDir && path.isAbsolute(commandPath)) {
    const root = path.resolve(configDir);
    FileSystemUtils.assertPathWithin(root, commandPath);
    FileSystemUtils.assertPathWithin(path.join(root, 'commands'), commandPath);
    return commandPath;
  }
  return FileSystemUtils.resolveProjectArtifactPath(projectPath, commandPath);
}
