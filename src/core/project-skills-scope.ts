/**
 * The team's choice to keep OpenSpec's skills in the repository, recorded as
 * `skillsScope: project` in `openspec/config.yaml`. It sits with the project's
 * other settings, so it is reviewed and committed like them, and a teammate
 * who pulls it is not asked again.
 */

import { Document, isMap, parseDocument } from 'yaml';
import { FileSystemUtils } from '../utils/file-system.js';
import { readProjectConfig, resolveConfigFilePath } from './project-config.js';

const KEY = 'skillsScope';

/** Whether the project recorded that its skills stay in the repository. */
export function keepsProjectSkills(projectPath: string): boolean {
  return readProjectConfig(projectPath)?.skillsScope === 'project';
}

/**
 * Record the choice. Edits the one key and keeps the rest of the file as
 * written, comments included. Returns the file to commit, or undefined when
 * the config can't be edited safely (YAML that doesn't parse, or a root that
 * isn't a map): the choice is then not saved and update asks again.
 */
export async function rememberProjectSkills(projectPath: string): Promise<string | undefined> {
  const configPath = resolveConfigFilePath(projectPath);
  if (!configPath) {
    const file = FileSystemUtils.resolveProjectArtifactPath(projectPath, 'openspec/config.yaml');
    await FileSystemUtils.writeFile(file, `schema: spec-driven\n${KEY}: project\n`);
    return file;
  }
  FileSystemUtils.assertProjectArtifactPath(projectPath, configPath);
  const parsed = parseDocument(await FileSystemUtils.readFile(configPath));
  if (parsed.errors.length > 0 || (parsed.contents !== null && !isMap(parsed.contents))) return undefined;
  const doc: Document = parsed;
  doc.set(KEY, 'project');
  await FileSystemUtils.writeFile(configPath, doc.toString());
  return configPath;
}

/**
 * Drop the recorded choice once the project's skills have left the
 * repository, so the config doesn't go on saying they are kept there. Leaves
 * a config it can't edit safely as it is.
 */
export async function forgetProjectSkills(projectPath: string): Promise<void> {
  const configPath = resolveConfigFilePath(projectPath);
  if (!configPath) return;
  FileSystemUtils.assertProjectArtifactPath(projectPath, configPath);
  const parsed = parseDocument(await FileSystemUtils.readFile(configPath));
  if (parsed.errors.length > 0 || !isMap(parsed.contents) || !parsed.has(KEY)) return;
  parsed.delete(KEY);
  await FileSystemUtils.writeFile(configPath, parsed.toString());
}
