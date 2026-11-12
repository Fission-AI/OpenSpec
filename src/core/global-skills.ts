/**
 * The machine-wide (`--global`) install: OpenSpec's skills once in
 * `~/.agents/skills/`, with a link in the home skills folder of each tool that
 * doesn't read that folder, the layout `npx skills add -g` writes. It reuses
 * the project installer with a home layout, so the same rules hold: only text
 * OpenSpec wrote is replaced or removed, and nothing is written through a link
 * or outside the folder it belongs to.
 */
import path from 'path';
import { createRequire } from 'module';
import { AI_TOOLS, type AIToolOption } from './config.js';
import { DISK_VIEW, type FileView } from './file-view.js';
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

/** The tools set up for this machine, from `~/.agents/skills/.openspec-target`. */
export function readGlobalSkillTools(home: string = resolveHomeDir(), view: FileView = DISK_VIEW): string[] {
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
    boundFor: (tool) => {
      const reach = resolveHomeSkillsReach(tool.value, { home, env });
      return reach.kind === 'link' ? reach.base : home;
    },
  };
}

export async function runGlobalSkills(input: GlobalSkillsInput): Promise<GlobalSkillsResult> {
  const env = input.env ?? process.env;
  const home = input.home ?? resolveHomeDir(env);
  const recorder = input.dryRun ? new UpdatePlanRecorder(home) : undefined;
  const view = recorder?.view ?? DISK_VIEW;
  const before = readGlobalSkillTools(home, view);
  const asked = input.toolIds ?? before;
  const refused = asked.filter((id) => !supportsGlobalSkills(id, { home, env }));
  const wanted = asked.filter((id) => !refused.includes(id));
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
  });
  // A skill the user edited stays after a removal, and the installer keeps the
  // tool list to record it. With no tool left the list must go, or the next
  // `update --global` would set them up again; the edited skill is still
  // recognized as the user's by its text.
  const listPath = skillToolListPath(home);
  if (wanted.length === 0 && view.exists(listPath)) {
    await (recorder ?? realFileOps).removeFile(listPath, 'openspec');
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
    errors.push(`${toolName(id)} was not set up: ${error.message}`);
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
        'OpenSpec refreshes these on every update and keeps no copy. Keep lasting changes in a skill of your own under another name.'
    );
  }
  return { lines, warnings, errors };
}

/** A dry-run plan with paths as the user sees them. */
export function homePlan(plan: UpdatePlan, home: string = resolveHomeDir()): UpdatePlan {
  return { ...plan, changes: plan.changes.map((change) => ({ ...change, path: displayRelative(change.path, home) })) };
}

export { resolveHomeSharedSkillsDir };
