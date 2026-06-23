import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  collectContributedSkills,
  collectKnownPluginSkillRefs,
  hasContributionDrift,
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

  it('installs a contributed skill into a tool skills dir and marks ownership', () => {
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
    // Ownership marker written so cleanup can tell our dirs from core/user dirs.
    expect(fs.existsSync(path.join(toolSkillsDir, 'good-orient', '.openspec-plugin-skill.json'))).toBe(true);
  });

  it('removes a plugin-owned skill but not unowned (core/user) directories', () => {
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    // Install a real plugin skill (gets the ownership marker).
    writePluginWithSkill(projectRoot, 'good-engine', {
      id: 'good-engine',
      namespace: 'good',
      skillDir: 'good-orient',
      withSkillFile: true,
    });
    installContributedSkills(toolSkillsDir, collectContributedSkills(projectRoot));
    // A core/user skill dir WITHOUT the marker.
    fs.mkdirSync(path.join(toolSkillsDir, 'openspec-explore'), { recursive: true });
    fs.writeFileSync(path.join(toolSkillsDir, 'openspec-explore', 'SKILL.md'), '#');

    expect(removeContributedSkill(toolSkillsDir, 'good-orient', 'good-engine')).toBe(true);
    expect(fs.existsSync(path.join(toolSkillsDir, 'good-orient'))).toBe(false);
    // Unowned dir of the same shape must not be removed even if asked by name.
    expect(removeContributedSkill(toolSkillsDir, 'openspec-explore', 'good-engine')).toBe(false);
    expect(fs.existsSync(path.join(toolSkillsDir, 'openspec-explore'))).toBe(true);
  });

  it('does not overwrite an existing non-plugin directory on name collision', () => {
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    // Pre-existing core/user dir with no ownership marker.
    fs.mkdirSync(path.join(toolSkillsDir, 'good-orient'), { recursive: true });
    fs.writeFileSync(path.join(toolSkillsDir, 'good-orient', 'SKILL.md'), 'CORE');

    writePluginWithSkill(projectRoot, 'good-engine', {
      id: 'good-engine',
      namespace: 'good',
      skillDir: 'good-orient',
      withSkillFile: true,
    });
    const installed = installContributedSkills(toolSkillsDir, collectContributedSkills(projectRoot));
    expect(installed).toEqual([]); // refused
    expect(fs.readFileSync(path.join(toolSkillsDir, 'good-orient', 'SKILL.md'), 'utf-8')).toBe('CORE');
  });

  it('refuses to install a skill whose dirName escapes the tool dir (POSIX and Windows separators)', () => {
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    fs.mkdirSync(toolSkillsDir, { recursive: true });
    const pkg = path.join(tempDir, 'pkg');
    const src = path.join(pkg, 'skills', 'x');
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, 'SKILL.md'), '#');

    expect(
      installContributedSkills(toolSkillsDir, [
        { pluginId: 'evil', packageRoot: pkg, dirName: '../../escaped', sourceDir: src },
      ])
    ).toEqual([]);
    expect(
      installContributedSkills(toolSkillsDir, [
        { pluginId: 'evil', packageRoot: pkg, dirName: '..\\..\\escaped', sourceDir: src },
      ])
    ).toEqual([]);
    expect(fs.existsSync(path.join(projectRoot, '.claude', 'escaped'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'escaped'))).toBe(false);
  });

  it('refuses to install when the source escapes the plugin package', () => {
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    fs.mkdirSync(toolSkillsDir, { recursive: true });
    const pkg = path.join(tempDir, 'pkg');
    fs.mkdirSync(pkg, { recursive: true });
    // Source outside the declared package root.
    const outside = path.join(tempDir, 'outside-skill');
    fs.mkdirSync(outside, { recursive: true });
    fs.writeFileSync(path.join(outside, 'SKILL.md'), '#');

    expect(
      installContributedSkills(toolSkillsDir, [
        { pluginId: 'evil', packageRoot: pkg, dirName: 'good', sourceDir: outside },
      ])
    ).toEqual([]);
    expect(fs.existsSync(path.join(toolSkillsDir, 'good'))).toBe(false);
  });

  it('refuses to remove a path that escapes the tool dir (POSIX and Windows separators)', () => {
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    fs.mkdirSync(toolSkillsDir, { recursive: true });
    // Sentinel outside the skills dir that must not be deleted.
    const sentinel = path.join(projectRoot, '.claude', 'KEEP.md');
    fs.writeFileSync(sentinel, 'do not delete');

    expect(removeContributedSkill(toolSkillsDir, '../KEEP.md', 'evil')).toBe(false);
    expect(removeContributedSkill(toolSkillsDir, '..\\KEEP.md', 'evil')).toBe(false);
    expect(fs.existsSync(sentinel)).toBe(true);
  });

  it('reports known plugin skill dirs across resolved plugins', () => {
    writePluginWithSkill(projectRoot, 'good-engine', {
      id: 'good-engine',
      namespace: 'good',
      skillDir: 'good-orient',
      withSkillFile: true,
    });
    expect(collectKnownPluginSkillRefs(projectRoot)).toContainEqual({
      dirName: 'good-orient',
      pluginId: 'good-engine',
    });
  });

  it('detects drift: active skill not yet installed, and inactive owned skill present', () => {
    writePluginWithSkill(projectRoot, 'good-engine', {
      id: 'good-engine',
      namespace: 'good',
      skillDir: 'good-orient',
      withSkillFile: true,
    });
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    fs.mkdirSync(toolSkillsDir, { recursive: true });
    const contributed = collectContributedSkills(projectRoot);
    const known = collectKnownPluginSkillRefs(projectRoot);

    // Active skill not installed yet -> drift.
    expect(hasContributionDrift(toolSkillsDir, contributed, known, true)).toBe(true);

    // After install -> no drift.
    installContributedSkills(toolSkillsDir, contributed);
    expect(hasContributionDrift(toolSkillsDir, contributed, known, true)).toBe(false);

    // If the plugin becomes inactive but its owned dir remains -> drift (needs cleanup).
    expect(hasContributionDrift(toolSkillsDir, [], known, true)).toBe(true);

    // Commands-only delivery with an owned dir present -> drift (needs removal).
    expect(hasContributionDrift(toolSkillsDir, [], known, false)).toBe(true);
  });

  it('binds ownership to the plugin: a second plugin cannot clobber the first', () => {
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    fs.mkdirSync(toolSkillsDir, { recursive: true });
    const srcA = path.join(tempDir, 'pkgA', 'skills', 'shared');
    const srcB = path.join(tempDir, 'pkgB', 'skills', 'shared');
    fs.mkdirSync(srcA, { recursive: true });
    fs.mkdirSync(srcB, { recursive: true });
    fs.writeFileSync(path.join(srcA, 'SKILL.md'), 'FROM-A');
    fs.writeFileSync(path.join(srcB, 'SKILL.md'), 'FROM-B');

    // Plugin A installs "shared".
    expect(
      installContributedSkills(toolSkillsDir, [
        { pluginId: 'A', version: '1.0.0', packageRoot: path.join(tempDir, 'pkgA'), dirName: 'shared', sourceDir: srcA },
      ])
    ).toEqual(['shared']);

    // Plugin B with the same dirName is refused; A's content is intact.
    expect(
      installContributedSkills(toolSkillsDir, [
        { pluginId: 'B', version: '1.0.0', packageRoot: path.join(tempDir, 'pkgB'), dirName: 'shared', sourceDir: srcB },
      ])
    ).toEqual([]);
    expect(fs.readFileSync(path.join(toolSkillsDir, 'shared', 'SKILL.md'), 'utf-8')).toBe('FROM-A');

    // B cannot remove A's directory; A can.
    expect(removeContributedSkill(toolSkillsDir, 'shared', 'B')).toBe(false);
    expect(fs.existsSync(path.join(toolSkillsDir, 'shared'))).toBe(true);
    expect(removeContributedSkill(toolSkillsDir, 'shared', 'A')).toBe(true);
    expect(fs.existsSync(path.join(toolSkillsDir, 'shared'))).toBe(false);
  });

  it('detects drift when the plugin version changes (upgrade refresh)', () => {
    const toolSkillsDir = path.join(projectRoot, '.claude', 'skills');
    fs.mkdirSync(toolSkillsDir, { recursive: true });
    const base = [{ pluginId: 'p', packageRoot: projectRoot, dirName: 'p-orient', sourceDir: '' }];

    // Install at v1 by writing a real source then installing.
    const src = path.join(projectRoot, 'node_modules', 'p', 'skills', 'p-orient');
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, 'SKILL.md'), '#');
    const refs = [{ dirName: 'p-orient', pluginId: 'p' }];
    const v1 = [{ ...base[0], version: '1.0.0', sourceDir: src }];
    installContributedSkills(toolSkillsDir, v1);
    expect(hasContributionDrift(toolSkillsDir, v1, refs, true)).toBe(false);

    // Same dir, new plugin version -> drift (needs refresh).
    const v2 = [{ ...base[0], version: '2.0.0', sourceDir: src }];
    expect(hasContributionDrift(toolSkillsDir, v2, refs, true)).toBe(true);
  });
});
