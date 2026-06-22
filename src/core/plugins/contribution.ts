/**
 * Plugin-contributed skills.
 *
 * Active plugins may ship skill directories (each a folder containing a SKILL.md)
 * that OpenSpec installs into AI tool skill directories alongside core skills,
 * using the same delivery pipeline. Contributed artifacts are tracked by their
 * plugin-namespaced directory name so they can be removed safely; malformed
 * contributions are skipped with a warning rather than aborting init/update.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolvePlugins, activePlugins } from './resolver.js';
import { isSafeSkillDirName, isSafeSkillSource } from './manifest.js';

/**
 * True when `child` resolves to a location strictly inside `parent`.
 * Defense-in-depth: even though manifests are validated, every filesystem
 * operation re-checks containment so a crafted path can never escape.
 */
function isPathInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

export interface ContributedSkill {
  pluginId: string;
  /** Directory name the skill is installed as. */
  dirName: string;
  /** Absolute path to the skill source directory within the plugin package. */
  sourceDir: string;
}

/**
 * Collect installable contributed skills from the active plugins for a project.
 * A skill is included only when its source directory exists and contains a
 * SKILL.md; otherwise it is skipped with a warning.
 */
export function collectContributedSkills(projectRoot: string): ContributedSkill[] {
  const plugins = activePlugins(resolvePlugins(projectRoot));
  const skills: ContributedSkill[] = [];

  for (const plugin of plugins) {
    for (const skill of plugin.manifest.skills ?? []) {
      // Defense-in-depth: reject traversal even if a manifest bypassed validation.
      if (!isSafeSkillDirName(skill.dir) || !isSafeSkillSource(skill.source)) {
        console.warn(
          `Warning: plugin "${plugin.id}" declares an unsafe skill path ("${skill.dir}" / "${skill.source}"); skipping.`
        );
        continue;
      }
      const sourceDir = path.resolve(plugin.packageRoot, skill.source);
      if (!isPathInside(plugin.packageRoot, sourceDir)) {
        console.warn(
          `Warning: plugin "${plugin.id}" skill source escapes its package; skipping.`
        );
        continue;
      }
      const skillFile = path.join(sourceDir, 'SKILL.md');
      if (!fs.existsSync(skillFile)) {
        console.warn(
          `Warning: plugin "${plugin.id}" skill "${skill.dir}" is missing a SKILL.md at ${skill.source}; skipping.`
        );
        continue;
      }
      skills.push({ pluginId: plugin.id, dirName: skill.dir, sourceDir });
    }
  }

  return skills;
}

/**
 * All skill directory names declared by resolved plugins (active or not).
 * Used to clean up skills belonging to plugins that have been disabled or made
 * incompatible while their package is still installed.
 */
export function collectKnownPluginSkillDirs(projectRoot: string): string[] {
  const names = new Set<string>();
  for (const plugin of resolvePlugins(projectRoot).plugins) {
    for (const skill of plugin.manifest.skills ?? []) {
      // Only ever track safe single-segment names — these feed directory removal.
      if (isSafeSkillDirName(skill.dir)) {
        names.add(skill.dir);
      }
    }
  }
  return [...names];
}

/**
 * Install contributed skills into a tool's skills directory.
 * Returns the directory names successfully installed.
 */
export function installContributedSkills(
  toolSkillsDir: string,
  skills: ContributedSkill[]
): string[] {
  const installed: string[] = [];
  for (const skill of skills) {
    if (!isSafeSkillDirName(skill.dirName)) continue;
    const dest = path.resolve(toolSkillsDir, skill.dirName);
    if (!isPathInside(toolSkillsDir, dest)) continue;
    try {
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(skill.sourceDir, dest, { recursive: true });
      installed.push(skill.dirName);
    } catch (error) {
      console.warn(
        `Warning: failed to install plugin skill "${skill.dirName}": ${(error as Error).message}`
      );
    }
  }
  return installed;
}

/**
 * Remove a contributed skill directory by name. Returns true if it existed.
 * Only the named, plugin-owned directory is touched.
 */
export function removeContributedSkill(toolSkillsDir: string, dirName: string): boolean {
  // Never delete based on a name that isn't a single safe segment, and re-check
  // containment so a crafted name can never target a path outside the skills dir.
  if (!isSafeSkillDirName(dirName)) return false;
  const dest = path.resolve(toolSkillsDir, dirName);
  if (!isPathInside(toolSkillsDir, dest)) return false;
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
    return true;
  }
  return false;
}
