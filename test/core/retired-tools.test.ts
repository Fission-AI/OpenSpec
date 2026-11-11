import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  cleanUpRetiredTools,
  findRetiredTool,
  formatRetiredToolCleanup,
  formatRetiredToolError,
  type RetiredToolIo,
} from '../../src/core/retired-tools.js';
import { AI_TOOLS } from '../../src/core/config.js';
import { DISK_VIEW } from '../../src/core/file-view.js';

// Real files release 1.10.0 wrote for Amazon Q, kept byte for byte.
const FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/released-output/v1.10.0-amazonq'
);

describe('retired tools', () => {
  let root: string;
  let project: string;

  beforeEach(async () => {
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-retired-')));
    project = path.join(root, 'project');
    await fs.mkdir(project);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const disk: RetiredToolIo = {
    view: DISK_VIEW,
    remove: (fullPath) => fs.unlink(fullPath),
    prune: true,
  };

  async function copyFixture(rel: string, to: string, edit = ''): Promise<string> {
    const target = path.join(project, to);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, (await fs.readFile(path.join(FIXTURES, rel), 'utf8')) + edit);
    return target;
  }

  async function exists(rel: string): Promise<boolean> {
    return fs.access(path.join(project, rel)).then(() => true, () => false);
  }

  it('is no longer a tool OpenSpec sets up', () => {
    expect(AI_TOOLS.some((tool) => tool.value === 'amazon-q')).toBe(false);
    const amazonQ = findRetiredTool('amazon-q')!;
    expect(formatRetiredToolError(amazonQ)).toContain('Set up Kiro instead: openspec init --tools kiro');
  });

  it('removes what a release generated and the folder it emptied', async () => {
    await copyFixture('prompts/opsx-explore.md', '.amazonq/prompts/opsx-explore.md');
    await copyFixture('prompts/opsx-apply.md', '.amazonq/prompts/opsx-apply.md');
    await copyFixture('skills/openspec-explore/SKILL.md', '.amazonq/skills/openspec-explore/SKILL.md');

    const [result] = await cleanUpRetiredTools(project, disk);

    expect(result.removed.sort()).toEqual(
      [
        path.join('.amazonq', 'prompts', 'opsx-apply.md'),
        path.join('.amazonq', 'prompts', 'opsx-explore.md'),
        '.amazonq/skills/openspec-explore/SKILL.md',
      ].sort()
    );
    expect(result.kept).toEqual([]);
    expect(await exists('.amazonq')).toBe(false);
    expect(formatRetiredToolCleanup(result)[0]).toContain('openspec init --tools kiro');
    // Already set up: no advice to set it up.
    expect(formatRetiredToolCleanup(result, true)[0]).not.toContain('Set up Kiro');
  });

  it('keeps edited files and the user’s own files, and says so', async () => {
    await copyFixture('prompts/opsx-explore.md', '.amazonq/prompts/opsx-explore.md');
    const editedPrompt = await copyFixture('prompts/opsx-apply.md', '.amazonq/prompts/opsx-apply.md', '\nOur step.\n');
    const editedSkill = await copyFixture(
      'skills/openspec-explore/SKILL.md',
      '.amazonq/skills/openspec-explore/SKILL.md',
      '\nOur note.\n'
    );
    await fs.writeFile(path.join(project, '.amazonq', 'rules.md'), 'our rules\n');
    const promptBefore = await fs.readFile(editedPrompt, 'utf8');
    const skillBefore = await fs.readFile(editedSkill, 'utf8');

    const [result] = await cleanUpRetiredTools(project, disk);

    expect(result.removed).toEqual([path.join('.amazonq', 'prompts', 'opsx-explore.md')]);
    expect(result.kept.sort()).toEqual(
      [path.join('.amazonq', 'prompts', 'opsx-apply.md'), '.amazonq/skills/openspec-explore/SKILL.md'].sort()
    );
    expect(await fs.readFile(editedPrompt, 'utf8')).toBe(promptBefore);
    expect(await fs.readFile(editedSkill, 'utf8')).toBe(skillBefore);
    expect(await exists('.amazonq/rules.md')).toBe(true);
    expect(formatRetiredToolCleanup(result).join('\n')).toContain('Kept 2 files');
  });

  it('never reaches through a linked folder', async () => {
    const outside = path.join(root, 'outside');
    await fs.mkdir(path.join(outside, 'prompts'), { recursive: true });
    await fs.copyFile(path.join(FIXTURES, 'prompts/opsx-explore.md'), path.join(outside, 'prompts', 'opsx-explore.md'));
    await fs.symlink(outside, path.join(project, '.amazonq'), process.platform === 'win32' ? 'junction' : 'dir');

    expect(await cleanUpRetiredTools(project, disk)).toEqual([]);
    expect(await fs.readdir(path.join(outside, 'prompts'))).toEqual(['opsx-explore.md']);
  });

  it('plans without touching anything in a dry run', async () => {
    await copyFixture('prompts/opsx-explore.md', '.amazonq/prompts/opsx-explore.md');
    const planned: string[] = [];

    const [result] = await cleanUpRetiredTools(project, {
      view: DISK_VIEW,
      remove: async (fullPath) => {
        planned.push(path.relative(project, fullPath));
      },
      prune: false,
    });

    expect(planned).toEqual([path.join('.amazonq', 'prompts', 'opsx-explore.md')]);
    expect(result.removed).toEqual(planned);
    expect(await exists('.amazonq/prompts/opsx-explore.md')).toBe(true);
  });

  it('does nothing in a project without the tool', async () => {
    expect(await cleanUpRetiredTools(project, disk)).toEqual([]);
  });
});
