import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  collectContributedSkills,
  collectKnownPluginSkillDirs,
  installContributedSkills,
  removeContributedSkill,
} from '../../../src/core/plugins/contribution.js';
import { clearPluginResolutionCache } from '../../../src/core/plugins/resolver.js';

function writePluginWithSkill(
  projectRoot: string,
  pkgName: string,
  opts: { id: string; namespace: string; skillDir: string; withSkillFile: boolean }
): void {
  const dir = path.join(projectRoot, 'node_modules', pkgName);
  fs.mkdirSync(path.join(dir, 'skills', opts.skillDir), { recursive: true });
  if (opts.withSkillFile) {
    fs.writeFileSync(
      path.join(dir, 'skills', opts.skillDir, 'SKILL.md'),
      `# ${opts.skillDir}\nA contributed skill.\n`
    );
  }
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: pkgName,
      version: '1.0.0',
      bin: 'cli.js',
      openspec: {
        manifestVersion: 1,
        id: opts.id,
        namespace: opts.namespace,
        bin: 'cli.js',
        openspecCompat: '>=1.0.0',
        skills: [{ dir: opts.skillDir, source: `skills/${opts.skillDir}` }],
      },
    })
  );
}

describe('plugins/contribution', () => {
  let tempDir: string;
  let projectRoot: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-contrib-'));
    projectRoot = path.join(tempDir, 'project');
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = path.join(tempDir, 'config');
    process.env.XDG_DATA_HOME = path.join(tempDir, 'data');
    clearPluginResolutionCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearPluginResolutionCache();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('collects skills with a SKILL.md and skips those without', () => {
    writePluginWithSkill(projectRoot, 'good-engine', {
      id: 'good-engine',
      namespace: 'good',
      skillDir: 'good-orient',
      withSkillFile: true,
    });
    writePluginWithSkill(projectRoot, 'bad-engine', {
      id: 'bad-engine',
      namespace: 'bad',
      skillDir: 'bad-orient',
      withSkillFile: false,
    });

    const skills = collectContributedSkills(projectRoot);
    const dirs = skills.map((s) => s.dirName);
    expect(dirs).toContain('good-orient');
    expect(dirs).not.toContain('bad-orient');
  });

  it('installs a contributed skill into a tool skills dir', () => {
    writePluginWithSkill(projectRoot, 'good-engine', {
      id: 'good-engine',
      namespace: 'good',
      skillDir: 'good-orient',
      withSkillFile: true,
    });
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    const installed = installContributedSkills(toolSkillsDir, collectContributedSkills(projectRoot));
    expect(installed).toEqual(['good-orient']);
    expect(fs.existsSync(path.join(toolSkillsDir, 'good-orient', 'SKILL.md'))).toBe(true);
  });

  it('removes only the named contributed skill', () => {
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    fs.mkdirSync(path.join(toolSkillsDir, 'good-orient'), { recursive: true });
    fs.writeFileSync(path.join(toolSkillsDir, 'good-orient', 'SKILL.md'), '#');
    fs.mkdirSync(path.join(toolSkillsDir, 'openspec-explore'), { recursive: true });

    expect(removeContributedSkill(toolSkillsDir, 'good-orient')).toBe(true);
    expect(fs.existsSync(path.join(toolSkillsDir, 'good-orient'))).toBe(false);
    // Unrelated core skill left untouched.
    expect(fs.existsSync(path.join(toolSkillsDir, 'openspec-explore'))).toBe(true);
  });

  it('refuses to install a skill whose dirName escapes the tool dir', () => {
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    fs.mkdirSync(toolSkillsDir, { recursive: true });
    // A source that exists, but a malicious install dirName.
    const src = path.join(tempDir, 'src-skill');
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, 'SKILL.md'), '#');

    const installed = installContributedSkills(toolSkillsDir, [
      { pluginId: 'evil', dirName: '../../escaped', sourceDir: src },
    ]);
    expect(installed).toEqual([]);
    expect(fs.existsSync(path.join(projectRoot, '.claude', 'escaped'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'escaped'))).toBe(false);
  });

  it('refuses to remove a path that escapes the tool dir', () => {
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    fs.mkdirSync(toolSkillsDir, { recursive: true });
    // Sentinel outside the skills dir that must not be deleted.
    const sentinel = path.join(projectRoot, '.claude', 'KEEP.md');
    fs.writeFileSync(sentinel, 'do not delete');

    expect(removeContributedSkill(toolSkillsDir, '../KEEP.md')).toBe(false);
    expect(fs.existsSync(sentinel)).toBe(true);
  });

  it('reports known plugin skill dirs across resolved plugins', () => {
    writePluginWithSkill(projectRoot, 'good-engine', {
      id: 'good-engine',
      namespace: 'good',
      skillDir: 'good-orient',
      withSkillFile: true,
    });
    expect(collectKnownPluginSkillDirs(projectRoot)).toContain('good-orient');
  });
});
