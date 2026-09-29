import path from 'path';
import { FileSystemUtils } from '../../utils/file-system.js';

/** OpenSpec's own opt-in; OPENCODE_CONFIG_DIR alone never moves commands. */
export const OPENCODE_SHARED_COMMANDS_ENV = 'OPENSPEC_OPENCODE_SHARED_COMMANDS';

/** Shared OpenCode config root, or undefined unless shared commands are opted into. */
export function getOpenCodeSharedRoot(): string | undefined {
  if (process.env[OPENCODE_SHARED_COMMANDS_ENV] !== '1') return undefined;
  const configDir = process.env.OPENCODE_CONFIG_DIR;
  return configDir ? path.resolve(configDir) : undefined;
}

/** Resolve command writes, allowing only OpenCode's explicitly configured shared root. */
export function resolveCommandArtifactPath(
  projectPath: string,
  toolId: string,
  commandPath: string
): string {
  const root = toolId === 'opencode' ? getOpenCodeSharedRoot() : undefined;
  if (root && path.isAbsolute(commandPath)) {
    FileSystemUtils.assertPathWithin(root, commandPath);
    FileSystemUtils.assertPathWithin(path.join(root, 'commands'), commandPath);
    return commandPath;
  }
  return FileSystemUtils.resolveProjectArtifactPath(projectPath, commandPath);
}
