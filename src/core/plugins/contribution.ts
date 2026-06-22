/**
 * Plugin-contributed skills.
 *
 * Active plugins may ship skill directories (each a folder containing a SKILL.md)
 * that OpenSpec installs into AI tool skill directories alongside core skills,
 * using the same delivery pipeline. Contributed artifacts are tracked by their
 * plugin-namespaced directory name so they can be removed safely; malformed
 * contributions are skipped with a warning rather than aborting init/update.
 *
 * Filesystem safety (defense-in-depth):
 *  - skill `dir`/`source` are validated as safe at manifest load AND re-checked here;
 *  - source containment is re-verified (via realpath) immediately before each copy;
 *  - an ownership marker is written into every installed skill dir, and a directory
 *    is only overwritten/removed when it carries OpenSpec's marker — so a plugin can
 *    never clobber a core skill or an unrelated user directory via a colliding name.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolvePlugins, activePlugins } from './resolver.js';
import { isSafeSkillDirName, isSafeSkillSource } from './manifest.js';

/** Marker file written into every plugin-installed skill directory. */
const OWNERSHIP_MARKER = '.openspec-plugin-skill.json';

/**
 * True when `child` resolves to a location strictly inside `parent`.
 * Defense-in-depth: even though manifests are validated, every filesystem
 * operation re-checks containment so a crafted path can never escape.
 */
function isPathInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Real (symlink-resolved) path, or null if it does not exist. */
function realpathOrNull(p: string): string | null {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return null;
  }
}

/** True when `dir` exists and was installed by OpenSpec for a plugin. */
function isOwnedSkillDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, OWNERSHIP_MARKER));
}

export interface ContributedSkill {
  pluginId: string;
  /** Absolute plugin package root, used to re-check source containment at copy time. */
  packageRoot: string;
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
      skills.push({
        pluginId: plugin.id,
        packageRoot: plugin.packageRoot,
        dirName: skill.dir,
        sourceDir,
      });
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
 * Whether a tool's skills directory is out of sync with the active plugin set:
 * an active contributed skill is missing, or an OpenSpec-owned skill dir belongs
 * to a plugin that is no longer active and should be removed. Used by `update` to
 * decide that plugin work is pending even when core tool assets are current.
 */
export function hasContributionDrift(
  toolSkillsDir: string,
  contributedSkills: ContributedSkill[],
  knownContributedDirs: string[],
  shouldGenerateSkills: boolean
): boolean {
  if (!shouldGenerateSkills) {
    // Commands-only delivery: any owned contributed dir still present needs removal.
    return knownContributedDirs.some((d) => isOwnedSkillDir(path.join(toolSkillsDir, d)));
  }
  const activeDirs = new Set(contributedSkills.map((s) => s.dirName));
  const missingActive = contributedSkills.some(
    (s) => !fs.existsSync(path.join(toolSkillsDir, s.dirName, 'SKILL.md'))
  );
  const staleInactive = knownContributedDirs.some(
    (d) => !activeDirs.has(d) && isOwnedSkillDir(path.join(toolSkillsDir, d))
  );
  return missingActive || staleInactive;
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

    // Re-verify the source stays inside the plugin package, resolving symlinks,
    // immediately before copying (guards against a swapped source after collection).
    const realPackageRoot = realpathOrNull(skill.packageRoot);
    const realSource = realpathOrNull(skill.sourceDir);
    if (!realPackageRoot || !realSource || !isPathInside(realPackageRoot, realSource)) {
      console.warn(`Warning: plugin skill "${skill.dirName}" source is not inside its package; skipping.`);
      continue;
    }
    if (!fs.existsSync(path.join(realSource, 'SKILL.md'))) continue;

    // Ownership: never overwrite a directory we did not install (core skill or user dir).
    if (fs.existsSync(dest) && !isOwnedSkillDir(dest)) {
      console.warn(
        `Warning: plugin skill "${skill.dirName}" collides with an existing non-plugin directory; skipping to avoid overwriting it.`
      );
      continue;
    }

    try {
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(realSource, dest, { recursive: true });
      fs.writeFileSync(
        path.join(dest, OWNERSHIP_MARKER),
        JSON.stringify({ plugin: skill.pluginId, managedBy: 'openspec' }) + '\n'
      );
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
 * Remove a contributed skill directory by name. Returns true if it was removed.
 * Only a directory OpenSpec installed (carrying the ownership marker) is touched —
 * a colliding name pointing at a core skill or user directory is left intact.
 */
export function removeContributedSkill(toolSkillsDir: string, dirName: string): boolean {
  // Never delete based on a name that isn't a single safe segment, and re-check
  // containment so a crafted name can never target a path outside the skills dir.
  if (!isSafeSkillDirName(dirName)) return false;
  const dest = path.resolve(toolSkillsDir, dirName);
  if (!isPathInside(toolSkillsDir, dest)) return false;
  if (!fs.existsSync(dest)) return false;
  if (!isOwnedSkillDir(dest)) return false; // not ours — do not delete
  fs.rmSync(dest, { recursive: true, force: true });
  return true;
}
