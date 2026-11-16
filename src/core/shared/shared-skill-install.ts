import path from 'node:path';
import { realpathSync } from 'node:fs';
import { getSupportedAgents } from 'skills';
import { installerAgent, OPENSPEC_SKILL_NAMES, type AIToolOption } from '../config.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { normalizeGeneratedFile } from './generated-fingerprint.js';
import type { FileView } from '../file-view.js';
import type { UpdateFileOps } from '../update-plan.js';
import { pruneEmptyParents } from '../released-output-sweep.js';
import { formatSkillToolList, readListedToolsWithOwnFiles, skillToolListPath } from '../shared-skill-target.js';
import { bundledSkillContents, installBundledSkills, removeManagedSkills } from '../skill-installer.js';
import { resolveFormerOwnSkillsDir, resolveSharedSkillsDir, resolveSkillLinkDir, usesSharedSkills } from './skill-paths.js';

interface SharedSkillInstallInput {
  projectPath: string;
  tools: readonly AIToolOption[];
  version: string;
  workflowsFor: (toolId: string) => readonly string[];
  ops: UpdateFileOps;
  view: FileView;
  writesToDisk: boolean;
}

export interface SharedSkillInstallResult {
  writtenSkillCount: number;
  removedSkillCount: number;
  toolFailures: Map<string, Error>;
}

function readSkill(dir: string, name: string, view: FileView) {
  try {
    return normalizeGeneratedFile(view.read(path.join(dir, name, 'SKILL.md')));
  } catch {
    return undefined;
  }
}

function present(dir: string, view: FileView) {
  return view.exists(dir) || view.linkTarget?.(dir) !== undefined;
}

export function ownSkillFolderNeedsWork(project: string, tool: AIToolOption, wanted: ReadonlySet<string>, view: FileView) {
  const shared = resolveSharedSkillsDir(project);
  const target = resolveSkillLinkDir(project, tool);
  const former = resolveFormerOwnSkillsDir(project, tool);
  return OPENSPEC_SKILL_NAMES.some(name => {
    if (target && wanted.has(name)) {
      const content = readSkill(target, name, view);
      return content === undefined || content !== readSkill(shared, name, view);
    }
    return Boolean(former && present(path.join(former, name), view) &&
      !(view.linkTarget?.(path.join(former, name)) && !target && wanted.has(name)));
  });
}

export async function installSharedSkills(input: SharedSkillInstallInput): Promise<SharedSkillInstallResult> {
  const { projectPath, ops, view } = input;
  const tools = input.tools.filter(usesSharedSkills);
  const result: SharedSkillInstallResult = { writtenSkillCount: 0, removedSkillCount: 0, toolFailures: new Map() };
  if (!tools.length) return result;
  const shared = resolveSharedSkillsDir(projectPath);
  FileSystemUtils.assertPathWithin(projectPath, shared);
  const workflows = [...new Set(tools.flatMap(tool => [...input.workflowsFor(tool.value)]))];
  const contents = bundledSkillContents(input.version, workflows);
  const agents = new Set(['universal']);
  const targets = new Map<string, string>([[shared, 'openspec']]);
  const legacy = new Set<string>();
  const sharedPath = FileSystemUtils.canonicalizeExistingPath(shared);
  const sharesFolder = (dir: string) => path.relative(sharedPath, FileSystemUtils.canonicalizeExistingPath(dir)) === '';
  for (const tool of tools) {
    const target = resolveSkillLinkDir(projectPath, tool);
    const former = resolveFormerOwnSkillsDir(projectPath, tool);
    try {
      if (target) FileSystemUtils.assertPathWithin(projectPath, target);
      if (!target || !sharesFolder(target)) {
        if (target) targets.set(target, tool.value);
        agents.add(installerAgent(tool.value).id);
      }
      const oldFolders = [former];
      if (!contents.size) oldFolders.push(...(tool.legacySkillsDirs ?? []).map(root => path.join(projectPath, root, 'skills')));
      for (const old of oldFolders) {
        if (!old || old === target || old === shared) continue;
        try {
          FileSystemUtils.assertPathWithin(projectPath, old);
          if (view.linkTarget?.(old)) continue;
          if (sharesFolder(old)) continue;
          legacy.add(old);
        } catch {
          // Earlier tools sometimes linked their entire skills folder to a shared home.
        }
      }
    } catch (error) {
      result.toolFailures.set(tool.value, error as Error);
    }
  }
  const install = new Set<string>();
  const remove = new Set<string>();
  for (const [dir, tool] of targets) {
    for (const name of OPENSPEC_SKILL_NAMES) {
      const spot = path.join(dir, name);
      const text = contents.get(name);
      if (text !== undefined) {
        if (readSkill(dir, name, view) === text) continue;
        install.add(name);
        if (!input.writesToDisk) {
          if (dir === shared || process.platform === 'win32') {
            if (present(spot, view)) await ops.removeDirectory(spot, tool);
            await ops.writeFile(path.join(spot, 'SKILL.md'), text, tool);
          }
          else await ops.linkSkill(spot, path.join(shared, name), tool);
        }
      } else if (present(spot, view)) {
        remove.add(name);
        if (!input.writesToDisk) await ops.removeDirectory(spot, tool);
      }
    }
  }
  if (input.writesToDisk) {
    const options = { scope: 'project', cwd: realpathSync(projectPath), agents: [...agents] } as const;
    const failures = await installBundledSkills(options, [...install], input.version);
    for (const tool of tools) {
      const failure = failures.get(installerAgent(tool.value).id) ?? failures.get('universal');
      if (failure) result.toolFailures.set(tool.value, failure);
    }
    if (failures.size) return result;
    // All universal agents share the canonical folder. Letting one keep it
    // would leave excluded workflows visible after removal.
    const removeAgents = new Set([...agents, ...getSupportedAgents().filter(agent => agent.universal).map(agent => agent.id)]);
    await removeManagedSkills({ ...options, agents: [...removeAgents] }, [...remove]);
    // The package cannot discover a built-in with missing or invalid
    // frontmatter, or remove an untracked copy under a non-hidden tool root.
    for (const dir of targets.keys()) {
      for (const name of remove) {
        const spot = path.join(dir, name);
        if (present(spot, view)) await ops.removeDirectory(spot, 'openspec');
      }
    }
  }
  // Only old OpenSpec layouts live outside the package's target directories.
  for (const dir of legacy) {
    for (const name of OPENSPEC_SKILL_NAMES) {
      const spot = path.join(dir, name);
      if (!present(spot, view)) continue;
      if (contents.has(name) && view.linkTarget?.(spot)) continue;
      await ops.removeDirectory(spot, 'openspec');
    }
  }
  const marker = skillToolListPath(projectPath);
  if (contents.size) {
    const own = new Set(tools.filter(tool => resolveSkillLinkDir(projectPath, tool)).map(tool => tool.value));
    const previousOwn = readListedToolsWithOwnFiles(projectPath, view);
    for (const tool of tools) {
      if (own.has(tool.value) || !previousOwn.has(tool.value)) continue;
      const former = resolveFormerOwnSkillsDir(projectPath, tool);
      if (former && [...contents.keys()].some(name => view.linkTarget?.(path.join(former, name)))) own.add(tool.value);
    }
    const list = formatSkillToolList(tools.map(tool => tool.value), own);
    if (!view.exists(marker) || view.read(marker) !== list) await ops.writeFile(marker, list, 'openspec');
  } else if (view.exists(marker)) {
    await ops.removeFile(marker, 'openspec');
  }
  if (input.writesToDisk) {
    const dirs = [...new Set([...targets.keys(), ...legacy])];
    await pruneEmptyParents(projectPath, dirs.map(dir => path.relative(projectPath, path.join(dir, '.removed'))));
  }
  result.writtenSkillCount = contents.size;
  result.removedSkillCount = remove.size;
  return result;
}
