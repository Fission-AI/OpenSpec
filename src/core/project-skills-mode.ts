/**
 * A project's choice between its own skills and each person's machine-wide
 * install, saved as `skills: global | project` in `openspec/config.yaml`.
 * The file is hand-written and commented, so the key is set through the YAML
 * document model and everything else in it survives.
 */
import path from 'path';
import { isMap, parseDocument } from 'yaml';
import { OPENSPEC_DIR_NAME } from './config.js';
import type { FileView } from './file-view.js';
import { readProjectConfig, resolveConfigFilePath } from './project-config.js';

export type ProjectSkillsMode = 'global' | 'project';

export function readProjectSkillsMode(projectPath: string): ProjectSkillsMode | undefined {
  return readProjectConfig(projectPath)?.skills;
}

/**
 * The config file to save the choice in, and its new text. Undefined when the
 * file exists but isn't YAML that can be edited safely; such a file is left
 * alone (it is already ignored, with a warning).
 */
export function planProjectSkillsMode(
  projectPath: string,
  mode: ProjectSkillsMode,
  view: FileView
): { path: string; content: string } | undefined {
  const configPath = resolveConfigFilePath(projectPath) ?? path.join(projectPath, OPENSPEC_DIR_NAME, 'config.yaml');
  let existing = '';
  try {
    existing = view.read(configPath);
  } catch {
    existing = '';
  }
  const parsed = parseDocument(existing);
  if (parsed.errors.length > 0) return undefined;
  if (parsed.contents !== null && !isMap(parsed.contents)) return undefined;
  // An empty or comment-only file parses to no contents; setIn fills them in
  // and keeps the comments.
  parsed.setIn(['skills'], mode);
  return { path: configPath, content: parsed.toString() };
}
