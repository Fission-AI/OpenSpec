import { installSkills, removeSkills } from 'skills';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformToSharedSkillReferences } from '../utils/command-references.js';
import { generateSkillContent, getSkillTemplates, stripVolatileFrontmatter } from './shared/skill-generation.js';
import { getStandaloneBinaryPath } from './version-check.js';

export type SkillScope = 'global' | 'project';

const allContents = new Map<string, Map<string, string>>();
export function bundledSkillContents(version: string, workflows?: readonly string[]) {
  if (!workflows && allContents.has(version)) return allContents.get(version)!;
  const contents = new Map(getSkillTemplates(workflows).map(({ template, dirName }) => [
    dirName, stripVolatileFrontmatter(generateSkillContent(template, version, transformToSharedSkillReferences)),
  ]));
  if (!workflows) allContents.set(version, contents);
  return contents;
}

type Targets = { scope: SkillScope; cwd?: string; agents: readonly string[] };

export async function installBundledSkills(targets: Targets, names: string[], version: string): Promise<Map<string, Error>> {
  const failures = new Map<string, Error>();
  if (!names.length) return failures;
  let temporarySource: string | undefined;
  try {
    let source: string;
    if (getStandaloneBinaryPath()) {
      temporarySource = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-skills-'));
      source = temporarySource;
      for (const [name, text] of bundledSkillContents(version)) {
        await fs.mkdir(path.join(source, name));
        await fs.writeFile(path.join(source, name, 'SKILL.md'), text);
      }
    } else {
      source = fileURLToPath(new URL('../../skills/', import.meta.url));
    }
    const result = await installSkills(source, {
      ...targets, skills: names, telemetry: false, lockfile: targets.scope === 'global',
      // Git cannot carry a Windows junction into a teammate's checkout.
      mode: targets.scope === 'project' && process.platform === 'win32' ? 'copy' : 'auto',
    });
    const contents = bundledSkillContents(version);
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
  } finally {
    if (temporarySource) await fs.rm(temporarySource, { recursive: true, force: true });
  }
}

export async function removeManagedSkills(targets: Targets, names: string[]): Promise<void> {
  if (!names.length) return;
  const result = await removeSkills(names, { ...targets, telemetry: false, lockfile: targets.scope === 'global' });
  if (result.failed.length) throw new Error(result.failed.map(failure => failure.message).join('\n'));
}
