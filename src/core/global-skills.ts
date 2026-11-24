import os from 'node:os';
import path from 'node:path';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { getSupportedAgents } from 'skills';
import { AI_TOOLS, installerAgent, OPENSPEC_SKILL_NAMES } from './config.js';
import { getGlobalDataDir } from './global-config.js';
import { withRouter } from './profiles.js';
import { getConfiguredTools } from './shared/tool-detection.js';
import { expectedSkillFiles, installReleaseSkills, removeManagedSkills, type SkillScope } from './skill-installer.js';

export type { SkillScope };
export const SKILL_SCOPES: readonly SkillScope[] = ['global', 'project'];

export function supportsGlobalSkills(toolId: string): boolean {
  return installerAgent(toolId).globalSkillsDir !== null;
}

export function isHomeFolder(projectPath: string): boolean {
  const real = (target: string): string => {
    try {
      return realpathSync.native(target);
    } catch {
      return path.resolve(target);
    }
  };
  return real(projectPath) === real(os.homedir());
}

/**
 * Whether the project holds OpenSpec skills or commands of its own. The home
 * folder never does: what sits in its `.agents/skills` is the global install.
 */
export function projectHasOwnSkills(projectPath: string): boolean {
  if (isHomeFolder(projectPath)) return false;
  return getConfiguredTools(projectPath).some(
    (id) => !AI_TOOLS.find((tool) => tool.value === id)?.globalSkillsDir
  );
}

function globalDirectories() {
  const shared = path.join(os.homedir(), '.agents', 'skills');
  const dirs = new Map<string, string>([['universal', shared]]);
  for (const agent of getSupportedAgents()) {
    // These two universal agents read a dedicated folder at global scope.
    if ((!agent.universal || agent.id === 'antigravity' || agent.id === 'antigravity-cli') && agent.globalSkillsDir) {
      dirs.set(agent.id, agent.globalSkillsDir);
    }
  }
  return dirs;
}

export async function readGlobalSkills() {
  const agents: string[] = [];
  const skills = new Set<string>();
  for (const [agent, dir] of globalDirectories()) {
    const names = OPENSPEC_SKILL_NAMES.filter(name => existsSync(path.join(dir, name, 'SKILL.md')));
    if (names.length) agents.push(agent);
    for (const name of names) skills.add(name);
  }
  return { skills: [...skills], agents };
}

type GlobalInstallInput = {
  toolIds?: readonly string[];
  workflows: readonly string[];
  version: string;
  dryRun?: boolean;
  force?: boolean;
};

export async function installGlobalSkills(input: GlobalInstallInput) {
  const refresh = async () => {
    const before = await readGlobalSkills();
    const agents = [...new Set(['universal', ...before.agents, ...(input.toolIds ?? []).map(id => installerAgent(id).id)])];
    const expected = expectedSkillFiles(input.version, withRouter(input.workflows));
    const skills = [...expected.keys()];
    const removedSkills = before.skills.filter(name => !expected.has(name));
    const dirs = globalDirectories();
    const current = agents.every(agent => skills.every(name => {
      const dir = dirs.get(agent) ?? dirs.get('universal')!;
      return [...expected.get(name)!].every(([file, text]) => {
        try {
          return readFileSync(path.join(dir, name, file), 'utf8').replaceAll('\r\n', '\n') === text;
        } catch {
          return false;
        }
      });
    }));
    const unchanged = current && !input.force && !removedSkills.length;
    if (!unchanged && !input.dryRun) {
      const targets = { scope: 'global', agents } as const;
      const failures = await installReleaseSkills(targets, skills, input.version);
      if (failures.size) throw new Error([...failures.values()].map(error => error.message).join('\n'));
      // Drop excluded workflows only after all selected skills are available.
      const universal = getSupportedAgents().filter(agent => agent.universal && agent.globalSkillsDir).map(agent => agent.id);
      await removeManagedSkills({ ...targets, agents: [...new Set([...agents, ...universal])] }, removedSkills);
      // The package can fail to remove a tool's copy without reporting it.
      const left = [...new Set(agents.flatMap(agent => {
        const dir = dirs.get(agent) ?? dirs.get('universal')!;
        return removedSkills.map(name => path.join(dir, name)).filter(spot => lstatSync(spot, { throwIfNoEntry: false }));
      }))];
      if (left.length) {
        throw new Error(`Could not remove ${left.join(', ')}. Remove ${left.length === 1 ? 'it' : 'them'} by hand, then run openspec update again.`);
      }
    }
    return { skills, removedSkills, unchanged };
  };
  return input.dryRun ? refresh() : withGlobalSkillsLock(refresh);
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

const LOCK_WAIT_MS = 60_000;
const LOCK_STALE_MS = 10 * 60_000;

/** Serialize machine-wide installs because the package shares one lock file between projects. */
async function withGlobalSkillsLock<T>(work: () => Promise<T>): Promise<T> {
  const lock = path.join(getGlobalDataDir(), 'global-skills.lock');
  const owner = path.join(lock, 'pid');
  const deadline = Date.now() + LOCK_WAIT_MS;
  let held = false;
  for (;;) {
    try {
      mkdirSync(path.dirname(lock), { recursive: true });
      mkdirSync(lock);
      writeFileSync(owner, String(process.pid));
      held = true;
      break;
    } catch (error) {
      // A data folder that can't be written is no reason to stop: go on without the lock.
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') break;
    }
    let age: number;
    try {
      age = Date.now() - statSync(lock).mtimeMs;
    } catch {
      // Nothing is at the lock's place: the data folder itself can't hold one. Go on without it.
      break;
    }
    // Left by a run that was cut short: its process is gone, or it never said whose it was.
    let pid = Number.NaN;
    try {
      pid = Number(readFileSync(owner, 'utf8').trim());
    } catch {
      // No readable owner.
    }
    const abandoned = Number.isInteger(pid) && pid > 0 ? !isRunning(pid) : age > LOCK_STALE_MS;
    if (abandoned) {
      rmSync(lock, { recursive: true, force: true });
      continue;
    }
    if (Date.now() > deadline) {
      throw new Error(
        'Another openspec run is still changing the skills for this machine. Run this again when it has finished. ' +
          `If no other run is going, delete ${lock}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  try {
    return await work();
  } finally {
    if (held) rmSync(lock, { recursive: true, force: true });
  }
}

/** A problem from the `skills` package, with the fix it suggests when it has one. */
export function describeSkillsError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const fix = (error as { fix?: unknown }).fix;
  return typeof fix === 'string' && fix.length > 0 ? `${error.message} ${fix}` : error.message;
}

/** What to tell the user about skills a global refresh removes because the profile leaves them out. */
export function describeRemovedSkills(names: readonly string[], done = true): string | undefined {
  if (names.length === 0) return undefined;
  const one = names.length === 1;
  return (
    `${done ? 'Removed' : 'Update will remove'} ${names.length} skill${one ? '' : 's'} your workflow profile doesn't include: ` +
    `${names.join(', ')}. To keep ${one ? 'it' : 'them'}, add ${one ? 'its workflow' : 'their workflows'} with: openspec config profile`
  );
}

