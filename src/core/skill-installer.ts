import { installSkills, removeSkills } from 'skills';
import { parse, stringify } from 'yaml';
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

export async function installReleaseSkills(targets: Targets, names: string[], version: string): Promise<Map<string, Error>> {
  const failures = new Map<string, Error>();
  if (!names.length) return failures;
  const contents = expectedSkillContents(version);
  // The skills ship inside this package, so installing them needs no network
  // and always gives the text of the version that is installed.
  const source = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-skills-'));
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
      lockfile: targets.scope === 'global',
      // Git cannot carry a Windows junction into a teammate's checkout.
      mode: targets.scope === 'project' && process.platform === 'win32' ? 'copy' : 'auto',
    });
  } finally {
    await fs.rm(source, { recursive: true, force: true });
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
