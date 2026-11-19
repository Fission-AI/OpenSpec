import { installSkills, removeSkills } from 'skills';
import { parse, stringify } from 'yaml';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { transformToSharedSkillReferences } from '../utils/command-references.js';
import { generateSkillContent, getSkillTemplates, stripVolatileFrontmatter } from './shared/skill-generation.js';

export type SkillScope = 'global' | 'project';

const allContents = new Map<string, Map<string, string>>();
export function expectedSkillContents(version: string, workflows?: readonly string[]) {
  if (!workflows && allContents.has(version)) return allContents.get(version)!;
  const contents = new Map(getSkillTemplates(workflows).map(({ template, dirName }) => [
    dirName, stripVolatileFrontmatter(generateSkillContent(template, version, transformToSharedSkillReferences)),
  ]));
  if (!workflows) allContents.set(version, contents);
  return contents;
}

/** Vercel writes Eve a copy with only the frontmatter its agent reads. */
export function projectSkillText(toolId: string, shared: string): string {
  if (toolId !== 'eve') return shared;
  const header = shared.match(/^---\n([\s\S]*?)\n---\n\n?/);
  if (!header) return shared;
  const fields = parse(header[1]);
  delete fields['allowed-tools'];
  return `---\n${stringify(fields)}---\n${shared.slice(header[0].length)}`;
}

type Targets = { scope: SkillScope; cwd?: string; agents: readonly string[] };

/** The hash GitHub reports for a skill folder that holds only this SKILL.md. */
function skillFolderHash(text: string): string {
  const gitObject = (type: string, body: Buffer) =>
    createHash('sha1').update(`${type} ${body.length}\0`).update(body).digest();
  const blob = gitObject('blob', Buffer.from(text));
  return gitObject('tree', Buffer.concat([Buffer.from('100644 SKILL.md\0'), blob])).toString('hex');
}

/**
 * Records global skills in the `skills` package's lock file as coming from this
 * release's GitHub tag, which holds the same text, so `npx skills update -g`,
 * `list` and `remove` treat them like any skill installed from GitHub.
 */
async function recordGlobalSkills(names: readonly string[], contents: ReadonlyMap<string, string>, version: string): Promise<void> {
  if (!names.length) return;
  const stateHome = process.env.XDG_STATE_HOME;
  const lockPath = stateHome
    ? path.join(stateHome, 'skills', '.skill-lock.json')
    : path.join(os.homedir(), '.agents', '.skill-lock.json');
  // The package starts over from a lock file it can't read or an older version of it.
  let lock: { version: number; skills: Record<string, Record<string, unknown>>; dismissed?: unknown } = { version: 3, skills: {}, dismissed: {} };
  try {
    const saved = JSON.parse(await fs.readFile(lockPath, 'utf8'));
    if (typeof saved.version === 'number' && saved.version >= 3 && saved.skills) lock = saved;
  } catch {
    // Nothing usable there yet.
  }
  const now = new Date().toISOString();
  for (const name of names) {
    lock.skills[name] = {
      source: 'Fission-AI/OpenSpec',
      sourceType: 'github',
      sourceUrl: 'https://github.com/Fission-AI/OpenSpec.git',
      ref: `v${version}`,
      skillPath: `skills/${name}/SKILL.md`,
      skillFolderHash: skillFolderHash(contents.get(name)!),
      installedAt: lock.skills[name]?.installedAt ?? now,
      updatedAt: now,
    };
  }
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  await fs.writeFile(lockPath, JSON.stringify(lock, null, 2));
}

export async function installReleaseSkills(targets: Targets, names: string[], version: string): Promise<Map<string, Error>> {
  const failures = new Map<string, Error>();
  if (!names.length) return failures;
  const contents = expectedSkillContents(version);
  // The skills ship inside this package, so installing them needs no network
  // and always gives the text of the version that is installed.
  // Absolute, or the installer reads a relative TMPDIR as a GitHub owner/repo.
  const source = path.resolve(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-skills-')));
  let result: Awaited<ReturnType<typeof installSkills>>;
  try {
    for (const name of names) {
      const dir = path.join(source, 'skills', name);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, 'SKILL.md'), contents.get(name)!);
    }
    result = await installSkills(source, {
      ...targets,
      skills: names,
      telemetry: false,
      lockfile: false,
      // Git cannot carry a Windows junction into a teammate's checkout.
      mode: targets.scope === 'project' && process.platform === 'win32' ? 'copy' : 'auto',
    });
  } finally {
    // A temp folder Windows still holds must not fail an install that worked.
    await fs.rm(source, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => undefined);
  }
  if (targets.scope === 'global') {
    try {
      await recordGlobalSkills([...new Set(result.installed.map(entry => entry.skill))], contents, version);
    } catch (error) {
      throw new Error(`Skills were installed but the lock file could not be updated: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const failure of result.failed) failures.set(failure.agent, new Error(failure.message));
  for (const skip of result.skipped) failures.set(skip.agent, new Error(`${skip.agent} skipped ${skip.skill}: ${skip.reason}`));
  for (const agent of targets.agents) {
    if (failures.has(agent)) continue;
    for (const name of names) {
      const entry = result.installed.find(target => target.agent === agent && target.skill === name);
      if (entry && targets.scope === 'project') continue;
      if (entry && (await fs.readFile(path.join(entry.path, 'SKILL.md'), 'utf8')).replaceAll('\r\n', '\n') === contents.get(name)) continue;
      failures.set(agent, new Error(`${agent} did not install ${name}`));
      break;
    }
  }
  return failures;
}

export async function removeManagedSkills(targets: Targets, names: string[]): Promise<void> {
  if (!names.length) return;
  const result = await removeSkills(names, { ...targets, telemetry: false, lockfile: targets.scope === 'global' });
  if (result.failed.length) throw new Error(result.failed.map(failure => failure.message).join('\n'));
}
