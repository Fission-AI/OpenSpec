import { installSkills, removeSkills } from 'skills';
import { parse, stringify } from 'yaml';
import { promises as fs } from 'node:fs';
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

/** The tag the release workflow creates when it publishes a version to npm. */
const RELEASE_TAG_PREFIX = '@fission-ai/openspec@';

/**
 * The package's error for a failed fetch carries a stack trace in its message.
 * A missing Git gets a sentence that says so; any other error keeps its first
 * lines and loses the trace.
 */
function readableInstallError(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  // Node's wording, then the standalone binary's.
  if (/spawn git ENOENT|Executable not found in \$PATH: "git"/.test(error.message)) {
    return new Error('Git is needed to install the OpenSpec skills, and it is not on your PATH. Install Git and run this again.');
  }
  const lines = error.message.split('\n').filter(line => !/^\s+at /.test(line));
  if (lines.length === error.message.split('\n').length) return error;
  return new Error(lines.join('\n').trimEnd());
}

/** Git's wording when the tag asked for is not in the repository. */
function isMissingRef(error: unknown): boolean {
  return error instanceof Error && /Remote branch \S+ not found/i.test(error.message);
}

export async function installReleaseSkills(targets: Targets, names: string[], version: string): Promise<Map<string, Error>> {
  const failures = new Map<string, Error>();
  if (!names.length) return failures;
  const install = (ref: string) => installSkills('Fission-AI/OpenSpec/skills', {
    ...targets,
    ref,
    skills: names,
    telemetry: false,
    lockfile: targets.scope === 'global',
    // Git cannot carry a Windows junction into a teammate's checkout.
    mode: targets.scope === 'project' && process.platform === 'win32' ? 'copy' : 'auto',
  });
  // A release is published under `@fission-ai/openspec@<version>`, and `v<version>`
  // is added afterward. Both name the same commit, so until the short tag
  // exists the release's own tag is used. Any other failure is reported.
  const result = await install(`v${version}`).catch((missing: unknown) => {
    if (!isMissingRef(missing)) throw readableInstallError(missing);
    return install(`${RELEASE_TAG_PREFIX}${version}`).catch((error: unknown) => {
      // Neither tag exists: say so in terms of the one people look for.
      throw isMissingRef(error) ? missing : readableInstallError(error);
    });
  });
  const contents = expectedSkillContents(version);
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
