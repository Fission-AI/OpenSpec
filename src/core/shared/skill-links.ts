/**
 * Links from a tool's own `skills/` folder to the one shared copy in
 * `.agents/skills/`, the way `npx skills` installs for tools that don't read
 * the shared folder. One link per skill folder, relative, so it survives
 * moving or cloning the project. Where a link can't be made, a plain copy.
 */
import path from 'path';
import * as fs from 'fs';
import { isReleasedGeneratedContent, normalizeGeneratedContent } from './generated-fingerprint.js';

/**
 * What sits where a skill's link belongs:
 * - `missing`: nothing yet;
 * - `link`: a link to the shared copy;
 * - `copy`: a plain copy equal to the shared one (the no-link fallback);
 * - `released`: an untouched copy an earlier release wrote, safe to replace;
 * - `user`: anything else (an edited copy, another link, extra files): kept.
 */
export type SkillLinkSpot = 'missing' | 'link' | 'copy' | 'released' | 'user';

function linkPointsTo(linkPath: string, targetDir: string): boolean {
  try {
    const target = fs.readlinkSync(linkPath);
    return path.resolve(path.dirname(linkPath), target) === path.resolve(targetDir) ||
      fs.realpathSync(linkPath) === fs.realpathSync(targetDir);
  } catch {
    return false;
  }
}

/**
 * Classifies a skill's link spot. `sharedContent` is the SKILL.md the shared
 * copy holds (or will hold, in a dry run).
 */
export function classifySkillLinkSpot(linkPath: string, targetDir: string, sharedContent: string): SkillLinkSpot {
  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(linkPath);
  } catch {
    return 'missing';
  }
  if (stats.isSymbolicLink()) return linkPointsTo(linkPath, targetDir) ? 'link' : 'user';
  if (!stats.isDirectory()) return 'user';
  let entries: string[];
  try {
    entries = fs.readdirSync(linkPath);
  } catch {
    return 'user';
  }
  if (entries.length !== 1 || entries[0] !== 'SKILL.md') return 'user';
  const skillFile = path.join(linkPath, 'SKILL.md');
  let content: string;
  try {
    if (!fs.lstatSync(skillFile).isFile()) return 'user';
    content = fs.readFileSync(skillFile, 'utf-8');
  } catch {
    return 'user';
  }
  if (normalizeGeneratedContent(content) === normalizeGeneratedContent(sharedContent)) return 'copy';
  return isReleasedGeneratedContent(content) ? 'released' : 'user';
}

/**
 * Makes `linkPath` a relative link to `targetDir`, replacing a `copy` or
 * `released` spot, or a plain copy when the link can't be made. Callers must
 * classify first: this never replaces a `user` spot.
 */
export function createSkillLink(
  linkPath: string,
  targetDir: string,
  symlink: (target: string, linkPath: string, type: 'dir') => void = fs.symlinkSync
): 'link' | 'copy' {
  const parent = path.dirname(linkPath);
  fs.mkdirSync(parent, { recursive: true });
  if (fs.existsSync(linkPath) || isSymlink(linkPath)) {
    fs.rmSync(linkPath, { recursive: true, force: true });
  }
  // Relative to the real parent, so a linked `skills/` folder still resolves.
  const relative = path.relative(fs.realpathSync(parent), fs.realpathSync(targetDir));
  try {
    symlink(relative, linkPath, 'dir');
    return 'link';
  } catch {
    fs.cpSync(targetDir, linkPath, { recursive: true });
    return 'copy';
  }
}

function isSymlink(filePath: string): boolean {
  try {
    return fs.lstatSync(filePath).isSymbolicLink();
  } catch {
    return false;
  }
}
