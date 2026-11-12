/**
 * The machine-wide (`--global`) install: OpenSpec's skills once in
 * `~/.agents/skills/`, with a link in the home skills folder of each tool that
 * doesn't read that folder, the layout `npx skills add -g` writes. It reuses
 * the project installer with a home layout, so the same rules hold: only text
 * OpenSpec wrote is replaced or removed, and nothing is written through a link
 * or outside the folder it belongs to.
 */
import * as fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { AI_TOOLS, type AIToolOption } from './config.js';
import { DISK_VIEW, type FileView } from './file-view.js';
import { FileSystemUtils } from '../utils/file-system.js';
import { getGlobalConfig } from './global-config.js';
import { getProfileWorkflows } from './profiles.js';
import { hasSkillToolList, readSkillToolList, skillToolListPath } from './shared-skill-target.js';
import { installSharedSkills, type SharedSkillInstallResult, type SkillLayout } from './shared/shared-skill-install.js';
import { readNpxSkillsLock, resolveHomeDir, resolveHomeSharedSkillsDir, resolveHomeSkillsReach } from './shared/home-skill-paths.js';
import { usesSharedSkills } from './shared/skill-paths.js';
import { realFileOps, UpdatePlanRecorder, type UpdatePlan } from './update-plan.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

export interface GlobalSkillsInput {
  /**
   * The tools to set up for this machine. Omitted: the tools already set up
   * (`openspec update --global`). Empty: remove the global install.
   */
  toolIds?: readonly string[];
  dryRun?: boolean;
  home?: string;
  env?: NodeJS.ProcessEnv;
}

export interface GlobalSkillsResult {
  /** Tools set up for this machine after the run. */
  tools: string[];
  /** Tools asked for that have no known home skills folder. */
  refused: string[];
  /** Tools the run removed from the global install. */
  dropped: string[];
  install: SharedSkillInstallResult;
  /** The planned changes, for a dry run. */
  plan?: UpdatePlan;
  /** Whether anything was installed before this run. */
  wasInstalled: boolean;
  /** Skills newly left to `npx skills`, which installed them here. */
  leftToNpx: string[];
}

/** Whether a tool can be set up for this machine. */
export function supportsGlobalSkills(toolId: string, options: { home?: string; env?: NodeJS.ProcessEnv } = {}): boolean {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  return Boolean(tool && usesSharedSkills(tool) && resolveHomeSkillsReach(toolId, options).kind !== 'none');
}

/**
 * Marks `~/.agents/skills/` as a `--global` install. The tool list alone
 * can't: running a project `init` in the home folder leaves the same list.
 */
const GLOBAL_MARKER = '.openspec-global';
const GLOBAL_MARKER_TEXT =
  'Installed by `openspec init --global`. Refresh with `openspec update --global`; remove with `openspec init --global --tools none`.\n';

function globalMarkerPath(home: string): string {
  return path.join(resolveHomeSharedSkillsDir(home), GLOBAL_MARKER);
}

/**
 * `~/.agents` or `~/.agents/skills` linked somewhere else (a dotfiles
 * repository) is never written or removed through, not even OpenSpec's own
 * records in it.
 */
export function assertHomeSkillsInHome(home: string = resolveHomeDir(), view: FileView = DISK_VIEW): void {
  const sharedDir = resolveHomeSharedSkillsDir(home);
  if (view.exists(sharedDir) || view.linkTarget?.(sharedDir) !== undefined || view.linkTarget?.(path.dirname(sharedDir)) !== undefined) {
    try {
      FileSystemUtils.assertPathWithin(home, sharedDir);
    } catch {
      throw new Error(
        `${displayHomePath(sharedDir, home)} links outside your home folder, ` +
          'and OpenSpec writes machine-wide skills only inside it. Nothing was changed.'
      );
    }
  }
}

/** Whether the home folder is itself an OpenSpec project. */
function homeIsProject(home: string, view: FileView): boolean {
  // Only OpenSpec's own files: `specs/` or `changes/` alone are common names
  // in any repository cloned to `~/openspec`.
  return ['config.yaml', 'project.md'].some((entry) => view.exists(path.join(home, 'openspec', entry)));
}

/**
 * A project in the home folder would share `~/.agents/skills` with the
 * machine-wide install, and each would take the other's skills for its own.
 */
export function assertNotGlobalHome(projectPath: string, home: string = resolveHomeDir()): void {
  let canonicalHome: string;
  try {
    canonicalHome = FileSystemUtils.canonicalizeExistingPath(home);
  } catch {
    return;
  }
  if (canonicalHome === projectPath && hasGlobalSkillInstall(home)) {
    throw new Error(
      "Your home folder holds the machine-wide skills (openspec init --global), so it can't also be a project. " +
        'Set up the project in a folder of its own, or remove the machine-wide skills first: openspec init --global --tools none'
    );
  }
}

/** Whether this home folder holds a `--global` install. */
export function hasGlobalSkillInstall(home: string = resolveHomeDir(), view: FileView = DISK_VIEW): boolean {
  return view.exists(globalMarkerPath(home));
}

/** The tools set up for this machine with `openspec init --global`. */
export function readGlobalSkillTools(home: string = resolveHomeDir(), view: FileView = DISK_VIEW): string[] {
  if (!view.exists(globalMarkerPath(home))) return [];
  return hasSkillToolList(home, view) ? readSkillToolList(home, view) : [];
}

/** A home layout: links in each tool's home skills folder, nothing else touched. */
export function homeSkillLayout(home: string, env: NodeJS.ProcessEnv = process.env): SkillLayout {
  return {
    linkDirFor: (tool) => {
      const reach = resolveHomeSkillsReach(tool.value, { home, env });
      return reach.kind === 'link' ? reach.dir : undefined;
    },
    // Earlier releases never wrote a tool's home folder (MiniMax aside, which
    // is not a shared-folder tool), so there are no old copies to move.
    formerOwnDirFor: () => undefined,
    // A tool folder inside the home folder must resolve inside it, so one
    // linked to a dotfiles repository is refused like `~/.agents` is. One set
    // outside home on purpose (CLAUDE_CONFIG_DIR=/work/claude) is bounded by
    // itself.
    boundFor: (tool) => {
      const reach = resolveHomeSkillsReach(tool.value, { home, env });
      if (reach.kind !== 'link') return home;
      // Compared as real paths, so a home reached through a link (`/home` ->
      // `/var/home`) or a folder named through one can't slip past.
      const rel = path.relative(realPathOf(home), realPathOf(path.dirname(reach.base)));
      return rel.startsWith('..') || path.isAbsolute(rel) ? reach.base : home;
    },
  };
}

export async function runGlobalSkills(input: GlobalSkillsInput): Promise<GlobalSkillsResult> {
  const env = input.env ?? process.env;
  const home = input.home ?? resolveHomeDir(env);
  const recorder = input.dryRun ? new UpdatePlanRecorder(home) : undefined;
  const view = recorder?.view ?? DISK_VIEW;
  assertHomeSkillsInHome(home, view);
  const before = readGlobalSkillTools(home, view);
  // A home folder that was set up as a project holds that project's skills
  // here. Taking them over would change what that project's tools load.
  if (before.length === 0 && hasSkillToolList(home, view)) {
    throw new Error(
      `${displayHomePath(resolveHomeSharedSkillsDir(home), home)} already holds a project's OpenSpec skills: ` +
        'your home folder was set up with `openspec init`. Set up that project somewhere else, ' +
        `or delete ${displayHomePath(skillToolListPath(home), home)}, then run openspec init --global again.`
    );
  }
  const asked = input.toolIds ?? before;
  // A new install only: one already here keeps being refreshed (the project
  // side refuses to touch it), and `--tools none` still removes it.
  if (before.length === 0 && asked.length > 0 && homeIsProject(home, view)) {
    throw new Error(
      'Your home folder is an OpenSpec project (it has openspec/config.yaml), so machine-wide skills would share its ' +
        '.agents/skills. Set up that project in a folder of its own first.'
    );
  }
  const refused = asked.filter((id) => !supportsGlobalSkills(id, { home, env }));
  const wanted = asked.filter((id) => !refused.includes(id));
  // Naming only tools that can't be set up for a machine is a mistake, not a
  // request to remove everything (that is `--tools none`).
  if (asked.length > 0 && wanted.length === 0) {
    const names = refused.map((id) => AI_TOOLS.find((tool) => tool.value === id)?.name ?? id).join(', ');
    throw new Error(
      `${names} ${refused.length === 1 ? 'has' : 'have'} no machine-wide skills folder OpenSpec knows of, so nothing was changed. ` +
        `Set ${refused.length === 1 ? 'it' : 'them'} up per project instead: openspec init --tools ${refused.join(',')}`
    );
  }
  const dropped = before.filter((id) => !wanted.includes(id));

  const npxSkills = readNpxSkillsLock({ home, env });
  const globalConfig = getGlobalConfig();
  const workflows = getProfileWorkflows(globalConfig.profile ?? 'core', globalConfig.workflows);
  const toOption = (id: string) => AI_TOOLS.find((tool) => tool.value === id);
  const options = (ids: readonly string[]) =>
    ids.map(toOption).filter((t): t is AIToolOption => t !== undefined);
  // With tools left, a dropped tool only loses its links. With none left, the
  // dropped tools are passed with no workflows, so the installer's deselect
  // path removes the skills, their links and the list (edited skills stay).
  const install = await installSharedSkills({
    // The home folder isn't in git: an edit replaced here would be gone.
    backupEdited: true,
    projectPath: home,
    tools: options(wanted.length > 0 ? wanted : dropped),
    unlinkTools: wanted.length > 0 ? options(dropped) : [],
    version: OPENSPEC_VERSION,
    workflowsFor: (toolId) => (wanted.includes(toolId) ? workflows : []),
    ops: recorder ?? realFileOps,
    view,
    writesToDisk: !input.dryRun,
    layout: homeSkillLayout(home, env),
    // A skill `npx skills` installed here is its to update and remove;
    // writing over it would only start a tug of war between the two.
    keepSkills: npxSkills,
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('outside the allowed directory')) throw error;
    // `~/.agents` or `~/.agents/skills` links somewhere else, such as a
    // dotfiles repository: nothing is written through it.
    throw new Error(
      `${displayHomePath(resolveHomeSharedSkillsDir(home), home)} links outside your home folder, ` +
        'and OpenSpec writes machine-wide skills only inside it. Nothing was changed.'
    );
  });
  // A skill the user edited stays after a removal, and the installer keeps the
  // tool list to record it. With no tool left the list must go, or the next
  // `update --global` would set them up again; the edited skill is still
  // recognized as the user's by its text.
  // The plan says what the real run would also report.
  if (recorder) {
    if (install.refreshedEdited.length > 0) {
      recorder.addNote(
        'edited-skills',
        `Update will replace your edits in ${install.refreshedEdited.map((rel) => displayHomePath(path.join(home, rel), home)).join(', ')}, ` +
          'saving a copy of each beside it first (SKILL.md.bak).'
      );
    }
    for (const [toolId, error] of install.toolFailures) recorder.addFailure(toolId, friendlyToolError(toolId, error, home, env));
  }
  const ops = recorder ?? realFileOps;
  const listPath = skillToolListPath(home);
  const markerPath = globalMarkerPath(home);
  if (wanted.length === 0) {
    if (view.exists(listPath)) await ops.removeFile(listPath, 'openspec');
    if (view.exists(markerPath)) await ops.removeFile(markerPath, 'openspec');
    if (!input.dryRun) {
      removeIfEmpty(resolveHomeSharedSkillsDir(home));
      removeIfEmpty(path.dirname(resolveHomeSharedSkillsDir(home)));
    }
  } else if (!view.exists(markerPath)) {
    await ops.writeFile(markerPath, GLOBAL_MARKER_TEXT, 'openspec');
  }

  return {
    tools: wanted,
    refused,
    dropped,
    install,
    plan: recorder?.getPlan(),
    wasInstalled: before.length > 0,
    leftToNpx: install.kept
      .filter((rel) => rel.startsWith('.agents/skills/'))
      .map((rel) => rel.slice('.agents/skills/'.length))
      .filter((name) => npxSkills.has(name)),
  };
}

/** A path with its existing part resolved through links; the rest as written. */
function realPathOf(p: string): string {
  const rest: string[] = [];
  for (let current = path.resolve(p); ; current = path.dirname(current)) {
    try {
      return path.join(fs.realpathSync.native(current), ...rest.reverse());
    } catch {
      if (path.dirname(current) === current) return path.resolve(p);
      rest.push(path.basename(current));
    }
  }
}

function removeIfEmpty(dir: string): void {
  try {
    if (fs.lstatSync(dir).isDirectory() && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {
    // Missing or not removable: nothing to tidy.
  }
}

/** `~/.agents/skills` as the user sees it, for messages. */
export function displayHomePath(p: string, home: string = resolveHomeDir()): string {
  const rel = path.relative(home, p);
  if (rel === '') return '~';
  if (rel.startsWith('..') || path.isAbsolute(rel)) return p;
  return `~/${rel.split(path.sep).join('/')}`;
}

/** A path the installer reports relative to the home folder, as the user sees it. */
function displayRelative(rel: string, home: string): string {
  return displayHomePath(path.resolve(home, rel), home);
}

const toolName = (id: string) => AI_TOOLS.find((tool) => tool.value === id)?.name ?? id;

/** What `init --global` and `update --global` print. */
export function formatGlobalSkillsResult(
  result: GlobalSkillsResult,
  options: { home?: string; env?: NodeJS.ProcessEnv } = {}
): { lines: string[]; warnings: string[]; errors: string[] } {
  const env = options.env ?? process.env;
  const home = options.home ?? resolveHomeDir(env);
  const lines: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const working = result.tools.filter((id) => !result.install.toolFailures.has(id));
  const shared = displayHomePath(resolveHomeSharedSkillsDir(home), home);

  if (result.tools.length === 0) {
    lines.push(
      result.wasInstalled
        ? `Removed OpenSpec's skills from this machine (${shared}).`
        : 'Nothing is set up for this machine.'
    );
  } else {
    lines.push(`OpenSpec skills for this machine are in ${shared} (v${OPENSPEC_VERSION}).`);
    const linked: string[] = [];
    const reading: string[] = [];
    for (const id of working) {
      const reach = resolveHomeSkillsReach(id, { home, env });
      if (reach.kind === 'link') linked.push(`${toolName(id)} (${displayHomePath(reach.dir, home)})`);
      else reading.push(toolName(id));
    }
    if (linked.length > 0) lines.push(`Linked for ${linked.join(', ')}.`);
    if (reading.length > 0) lines.push(`Read directly by ${reading.join(', ')}.`);
  }
  if (result.tools.length > 0 && result.dropped.length > 0) {
    lines.push(`No longer set up for this machine: ${result.dropped.map(toolName).join(', ')}.`);
  }
  for (const id of result.refused) {
    warnings.push(
      `${toolName(id)} has no machine-wide skills folder OpenSpec knows of. Set it up per project instead: openspec init --tools ${id}`
    );
  }
  for (const [id, error] of result.install.toolFailures) {
    errors.push(`${toolName(id)} was not set up: ${friendlyToolError(id, error, home, env)}`);
  }
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const npxRel = new Set(result.leftToNpx.map((name) => `.agents/skills/${name}`));
  if (result.leftToNpx.length > 0) {
    const names = result.leftToNpx.join(' ');
    warnings.push(
      `Left ${result.leftToNpx.length} ${plural(result.leftToNpx.length, 'skill', 'skills')} to npx skills, which installed ` +
        `${plural(result.leftToNpx.length, 'it', 'them')} here: ${result.leftToNpx.join(', ')}. ` +
        `To have OpenSpec manage ${plural(result.leftToNpx.length, 'it', 'them')} instead, run: npx skills remove -g ${names}, then openspec update --global`
    );
  }
  const keptShared = result.install.kept.filter((rel) => rel.startsWith('.agents/skills/') && !npxRel.has(rel));
  const keptElsewhere = result.install.kept.filter((rel) => !rel.startsWith('.agents/skills/'));
  const show = (rels: readonly string[]) => rels.map((rel) => displayRelative(rel, home)).join(', ');
  if (keptShared.length > 0) {
    warnings.push(
      `Kept ${keptShared.length} ${plural(keptShared.length, 'skill', 'skills')} in ${shared} as your own: ${show(keptShared)}. ` +
        `OpenSpec won't update or remove ${plural(keptShared.length, 'it', 'them')}; delete one to have OpenSpec install its own.`
    );
  }
  if (keptElsewhere.length > 0) {
    warnings.push(
      `Kept ${keptElsewhere.length} ${plural(keptElsewhere.length, 'skill folder', 'skill folders')} with your own changes: ` +
        `${show(keptElsewhere)}. Nothing was overwritten.`
    );
  }
  const edited = result.install.refreshedEdited;
  if (edited.length > 0) {
    warnings.push(
      `Replaced your edits in ${edited.length} ${plural(edited.length, 'skill', 'skills')} OpenSpec installs: ${show(edited)}. ` +
        `${(result.install.backedUp?.length ?? 0) > 0 ? `Your text is saved in ${show(result.install.backedUp!)}. ` : ''}` +
        'OpenSpec refreshes these on every update; keep lasting changes in a skill of your own under another name.'
    );
  }
  return { lines, warnings, errors };
}

/** A tool failure as the user can act on it. */
function friendlyToolError(toolId: string, error: Error, home: string, env: NodeJS.ProcessEnv): string {
  const reach = resolveHomeSkillsReach(toolId, { home, env });
  if (reach.kind === 'link' && error.message.includes('outside the allowed directory')) {
    // Name the folder that is the link: the tool's folder or its skills folder.
    let linked = reach.dir;
    try {
      if (fs.lstatSync(reach.base).isSymbolicLink()) linked = reach.base;
    } catch {
      // Missing: the skills folder is the one to name.
    }
    return `${displayHomePath(linked, home)} links outside your home folder, so OpenSpec doesn't write into it.`;
  }
  return error.message;
}

/** A dry-run plan with paths as the user sees them. */
export function homePlan(plan: UpdatePlan, home: string = resolveHomeDir()): UpdatePlan {
  return { ...plan, changes: plan.changes.map((change) => ({ ...change, path: displayRelative(change.path, home) })) };
}

export { resolveHomeSharedSkillsDir };
