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
 * - `released`: an untouched copy an earlier release wrote, or a link git
 *   checked out as a file, safe to replace;
 * - `user`: anything else (an edited copy, another link, extra files): kept.
 */
export type SkillLinkSpot = 'missing' | 'link' | 'copy' | 'released' | 'user';

/**
 * Files an operating system drops into any folder it shows (Finder, Explorer,
 * network and FAT volumes). They hold nothing of the user's, so they never make
 * a skill folder the user's.
 */
const OS_JUNK = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
const isOsJunk = (name: string) => OS_JUNK.has(name) || name.startsWith('._');

/**
 * The text of the link OpenSpec makes at `linkPath` to `targetDir` (always
 * `<project>/.agents/skills/<skill>`): relative to the real folder the link
 * sits in, and through `.agents` as written rather than where `.agents`
 * itself may point, so a linked `.agents` can move without breaking it.
 */
export function skillLinkText(linkPath: string, targetDir: string): string {
  const projectRoot = path.dirname(path.dirname(path.dirname(targetDir)));
  const target = path.join(realOrSelf(projectRoot), path.relative(projectRoot, targetDir));
  return path.relative(realOrSelf(path.dirname(linkPath)), target);
}

function realOrSelf(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

function linkPointsTo(linkPath: string, linked: string, targetDir: string): boolean {
  const normalized = linked.replace(/\\/g, '/');
  if (path.resolve(path.dirname(linkPath), normalized) === path.resolve(targetDir)) return true;
  if (path.resolve(realOrSelf(path.dirname(linkPath)), normalized) === path.resolve(realOrSelf(path.dirname(targetDir)), path.basename(targetDir))) return true;
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
  sharedContent: string | readonly string[],
  view: FileView = DISK_VIEW
): SkillLinkSpot {
  // Everything through the view, so a dry run sees what it planned earlier
  // (a link it made, files a move put here) the way the real run sees disk.
  const linked = view.linkTarget?.(linkPath);
  if (linked !== undefined) return linkPointsTo(linkPath, linked, targetDir) ? 'link' : 'user';
  if (!view.exists(linkPath)) return 'missing';
  if (!view.isDirectory(linkPath)) {
    // Git without link support (Windows' default `core.symlinks=false`)
    // checks a committed link out as a small file holding its target path.
    // It is OpenSpec's, and needs replacing: 'released' asks for exactly that.
    return isCheckedOutLink(linkPath, targetDir, view) ? 'released' : 'user';
  }
  let entries: string[];
  try {
    entries = view.listDirectory ? view.listDirectory(linkPath) : fs.readdirSync(linkPath);
  } catch {
    return 'user';
  }
  entries = entries.filter((name) => !isOsJunk(name));
  if (entries.length !== 1 || entries[0] !== 'SKILL.md') return 'user';
  const skillFile = path.join(linkPath, 'SKILL.md');
  if (view.linkTarget?.(skillFile) !== undefined || view.isDirectory(skillFile)) return 'user';
  let content: string;
  try {
    content = view.read(skillFile);
  } catch {
    return 'user';
  }
  if (matchesAny(content, sharedContent)) return 'copy';
  return isReleasedGeneratedContent(content) ? 'released' : 'user';
}

/**
 * Whether a regular file is what git writes for a link to `targetDir` when it
 * can't make links: the link's own text, nothing else (either slash).
 */
export function isCheckedOutLink(filePath: string, targetDir: string, view: FileView = DISK_VIEW): boolean {
  let text: string;
  try {
    text = view.read(filePath);
  } catch {
    return false;
  }
  if (text.length > 1024) return false;
  const linked = text.trim();
  if (linked === '' || linked.includes('\n')) return false;
  return linkPointsTo(filePath, linked, targetDir);
}

/** Whether content equals any of the shared copy's texts (current or previous). */
function matchesAny(content: string, sharedContent: string | readonly string[]): boolean {
  const normalized = normalizeGeneratedContent(content);
  const texts = typeof sharedContent === 'string' ? [sharedContent] : sharedContent;
  return texts.some((text) => normalizeGeneratedContent(text) === normalized);
}

/**
 * Classifies only the SKILL.md in a skill folder, ignoring anything else the
 * folder holds: OpenSpec's file can be untouched even when the user keeps
 * notes beside it.
 */
export function classifySkillFile(
  skillDir: string,
  sharedContent: string | readonly string[],
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
  if (matchesAny(content, sharedContent)) return 'copy';
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
  try {
    symlink(skillLinkText(linkPath, targetDir), linkPath, 'dir');
    return 'link';
  } catch {
    // Only the skill itself: anything else in the shared folder (OS junk, a
    // user's notes) is not OpenSpec's to copy.
    fs.mkdirSync(linkPath, { recursive: true });
    fs.copyFileSync(path.join(targetDir, 'SKILL.md'), path.join(linkPath, 'SKILL.md'));
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
