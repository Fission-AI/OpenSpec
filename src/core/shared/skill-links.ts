/**
 * Links from a tool's own `skills/` folder to the one shared copy in
 * `.agents/skills/`, the way `npx skills` installs for tools that don't read
 * the shared folder. One link per skill folder, relative, so it survives
 * moving or cloning the project. Where a link can't be made, a plain copy.
 */
import path from 'path';
import * as fs from 'fs';
import { isReleasedGeneratedContent, normalizeGeneratedContent } from './generated-fingerprint.js';
import { DISK_VIEW, type FileView } from '../file-view.js';

/**
 * What sits where a skill's link belongs:
 * - `missing`: nothing yet;
 * - `link`: a link to the shared copy;
 * - `copy`: a plain copy equal to the shared one (the no-link fallback);
 * - `released`: an untouched copy an earlier release wrote, safe to replace;
 * - `user`: anything else (an edited copy, another link, extra files): kept.
 */
export type SkillLinkSpot = 'missing' | 'link' | 'copy' | 'released' | 'user';

function linkPointsTo(linkPath: string, linked: string, targetDir: string): boolean {
  if (path.resolve(linked) === path.resolve(targetDir)) return true;
  try {
    return fs.realpathSync(linkPath) === fs.realpathSync(targetDir);
  } catch {
    return false;
  }
}

/**
 * Classifies a skill's link spot. `sharedContent` is the SKILL.md the shared
 * copy holds (or will hold, in a dry run).
 */
export function classifySkillLinkSpot(
  linkPath: string,
  targetDir: string,
  sharedContent: string,
  view: FileView = DISK_VIEW
): SkillLinkSpot {
  // Everything through the view, so a dry run sees what it planned earlier
  // (a link it made, files a move put here) the way the real run sees disk.
  const linked = view.linkTarget?.(linkPath);
  if (linked !== undefined) return linkPointsTo(linkPath, linked, targetDir) ? 'link' : 'user';
  if (!view.exists(linkPath)) return 'missing';
  if (!view.isDirectory(linkPath)) return 'user';
  let entries: string[];
  try {
    entries = view.listDirectory ? view.listDirectory(linkPath) : fs.readdirSync(linkPath);
  } catch {
    return 'user';
  }
  if (entries.length !== 1 || entries[0] !== 'SKILL.md') return 'user';
  const skillFile = path.join(linkPath, 'SKILL.md');
  if (view.linkTarget?.(skillFile) !== undefined || view.isDirectory(skillFile)) return 'user';
  let content: string;
  try {
    content = view.read(skillFile);
  } catch {
    return 'user';
  }
  if (normalizeGeneratedContent(content) === normalizeGeneratedContent(sharedContent)) return 'copy';
  return isReleasedGeneratedContent(content) ? 'released' : 'user';
}

/**
 * Classifies only the SKILL.md in a skill folder, ignoring anything else the
 * folder holds: OpenSpec's file can be untouched even when the user keeps
 * notes beside it.
 */
export function classifySkillFile(
  skillDir: string,
  sharedContent: string,
  view: FileView = DISK_VIEW
): 'missing' | 'copy' | 'released' | 'user' {
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (view.linkTarget?.(skillDir) !== undefined || view.linkTarget?.(skillFile) !== undefined) return 'user';
  if (!view.exists(skillFile)) return 'missing';
  if (view.isDirectory(skillFile)) return 'user';
  let content: string;
  try {
    content = view.read(skillFile);
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
