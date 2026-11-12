/**
 * A project's choice between its own skills and each person's machine-wide
 * install, saved as `skills: global | project` in `openspec/config.yaml`.
 * The file is hand-written and commented, so the key is set through the YAML
 * document model and everything else in it survives.
 */
import path from 'path';
import { readFileSync } from 'fs';
import { isMap, parse as parseYaml, parseDocument } from 'yaml';
import { OPENSPEC_DIR_NAME } from './config.js';
import type { FileView } from './file-view.js';
import { resolveConfigFilePath } from './project-config.js';

export type ProjectSkillsMode = 'global' | 'project';

/**
 * The project's `skills:` setting, read quietly: init and update run this on
 * every project, and must not repeat warnings about the rest of a config they
 * would otherwise never print (the commands that use those fields still do).
 */
export function readProjectSkillsMode(projectPath: string): ProjectSkillsMode | undefined {
  const configPath = resolveConfigFilePath(projectPath);
  if (!configPath) return undefined;
  try {
    const raw = parseYaml(readFileSync(configPath, 'utf-8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const value = (raw as Record<string, unknown>).skills;
    return value === 'global' || value === 'project' ? value : undefined;
  } catch {
    return undefined;
  }
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
