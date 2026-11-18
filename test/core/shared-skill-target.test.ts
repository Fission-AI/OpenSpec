import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { AI_TOOLS } from '../../src/core/config.js';
import {
  formatSkillToolList,
  hasOwnFolderSkills,
  isToolListed,
  readSkillToolList,
  skillToolListPath, hasLockedOpenSpecSkills } from '../../src/core/shared-skill-target.js';
import type { FileView } from '../../src/core/file-view.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const RELEASED = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/released-output');
const released = (dir: string) => readFileSync(path.join(RELEASED, dir, 'openspec-propose/SKILL.md'), 'utf8');

const tool = (id: string) => AI_TOOLS.find((t) => t.value === id)!;

describe('the list of tools set up in a project', () => {
  let project: string;

  beforeEach(async () => {
    project = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-tool-list-')));
  });

  afterEach(async () => {
    await fs.rm(project, { recursive: true, force: true });
  });

  async function write(rel: string, content: string) {
    const file = path.join(project, rel);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }

  it('lives in .agents/skills and lists one sorted id per line', () => {
    expect(skillToolListPath(project)).toBe(path.join(project, '.agents', 'skills', '.openspec-target'));
    expect(formatSkillToolList(['kiro', 'claude', 'cursor', 'claude'])).toBe('claude\ncursor\nkiro\n');
  });

  it('reads every listed tool and ignores ids it does not know', async () => {
    await write('.agents/skills/.openspec-target', 'claude\r\ncursor\n\nnot-a-tool\n');
    expect(readSkillToolList(project)).toEqual(['claude', 'cursor']);
    expect(isToolListed(project, 'cursor')).toBe(true);
    expect(isToolListed(project, 'codex')).toBe(false);
  });

  it('reads the single id a release before 2.0 wrote', async () => {
    await write('.agents/skills/.openspec-target', 'codex\n');
    expect(readSkillToolList(project)).toEqual(['codex']);
  });

  it('infers the tool an unlisted folder from before the list was written for', async () => {
    await write('.agents/skills/openspec-propose/SKILL.md', released('v1.9.0-codex-agents-skills'));
    expect(readSkillToolList(project)).toEqual(['codex']);
    await write('.agents/skills/openspec-propose/SKILL.md', released('v1.9.0-agents-skills'));
    expect(readSkillToolList(project)).toEqual(['agents']);
  });

  it('never infers a tool from a skill OpenSpec did not write', async () => {
    await write('.agents/skills/openspec-explore/SKILL.md', 'Run `$openspec-propose`.');
    expect(readSkillToolList(project)).toEqual([]);
  });

  describe('a folder `npx skills add` filled, with no list file', () => {
    const lock = (skills: Record<string, unknown>) => write('skills-lock.json', JSON.stringify({ version: 2, skills }));

    it('finds the skills but never lists a tool, so update cannot change them', async () => {
      await write('.agents/skills/openspec-explore/SKILL.md', 'Any wording at all.');
      for (const source of [
        'Fission-AI/OpenSpec',
        'fission-ai/openspec',
        'Fission-AI/OpenSpec/skills',
        'https://github.com/Fission-AI/OpenSpec.git',
        'git@github.com:Fission-AI/OpenSpec.git',
      ]) {
        await lock({ 'openspec-explore': { source, sourceType: 'github' } });
        expect(hasLockedOpenSpecSkills(project), source).toBe(true);
        expect(readSkillToolList(project), source).toEqual([]);
      }
    });

    it('finds nothing when the lock file names another source or another skill', async () => {
      await write('.agents/skills/openspec-explore/SKILL.md', 'Any wording at all.');
      await lock({ 'openspec-explore': { source: 'someone/openspec-fork' } });
      expect(hasLockedOpenSpecSkills(project)).toBe(false);
      await lock({ 'other-skill': { source: 'Fission-AI/OpenSpec' } });
      expect(hasLockedOpenSpecSkills(project)).toBe(false);
    });

    it('finds nothing when the recorded skill is no longer in the folder', async () => {
      await lock({ 'openspec-explore': { source: 'Fission-AI/OpenSpec' } });
      expect(hasLockedOpenSpecSkills(project)).toBe(false);
      await write('.agents/skills/openspec-propose/SKILL.md', 'Any wording at all.');
      expect(hasLockedOpenSpecSkills(project)).toBe(false);
    });

    it('finds skills the package copied into a tool folder', async () => {
      await write('.claude/skills/openspec-explore/SKILL.md', 'Any wording at all.');
      await lock({ 'openspec-explore': { source: 'Fission-AI/OpenSpec' } });
      expect(hasLockedOpenSpecSkills(project)).toBe(true);
    });

    it('leaves a project OpenSpec manages to OpenSpec', async () => {
      await write('.agents/skills/openspec-explore/SKILL.md', 'Any wording at all.');
      await write('.agents/skills/.openspec-target', 'claude\n');
      await lock({ 'openspec-explore': { source: 'Fission-AI/OpenSpec' } });
      expect(hasLockedOpenSpecSkills(project)).toBe(false);
    });

    it('finds nothing in a lock file that does not parse', async () => {
      await write('.agents/skills/openspec-explore/SKILL.md', 'Any wording at all.');
      await write('skills-lock.json', '{ not json');
      expect(hasLockedOpenSpecSkills(project)).toBe(false);
      await write('skills-lock.json', 'null');
      expect(hasLockedOpenSpecSkills(project)).toBe(false);
    });
  });

  it('lists nothing for a project without one, and never guesses from the shared wording', async () => {
    expect(readSkillToolList(project)).toEqual([]);
    await write('.agents/skills/openspec-explore/SKILL.md', 'Run `openspec-propose`.');
    expect(readSkillToolList(project)).toEqual([]);
  });

  it('reads through the view it is given, not the disk', async () => {
    const view: FileView = {
      exists: (p) => p === skillToolListPath(project),
      read: () => 'kiro\n',
      isDirectory: () => false,
    };
    expect(readSkillToolList(project, view)).toEqual(['kiro']);
    expect(readSkillToolList(project)).toEqual([]);
  });

  it('sees skills in a tool own folder: a pre-2.0 copy or its links', async () => {
    expect(hasOwnFolderSkills(project, tool('cursor'))).toBe(false);
    await write('.cursor/skills/openspec-explore/SKILL.md', 'old copy');
    expect(hasOwnFolderSkills(project, tool('cursor'))).toBe(true);

    await write('.agents/skills/openspec-explore/SKILL.md', 'shared');
    await fs.mkdir(path.join(project, '.claude', 'skills'), { recursive: true });
    await fs.symlink(
      path.join('..', '..', '.agents', 'skills', 'openspec-explore'),
      path.join(project, '.claude', 'skills', 'openspec-explore'),
      'dir'
    );
    expect(hasOwnFolderSkills(project, tool('claude'))).toBe(true);
    // Codex's own folder is the shared one: it has no separate former copy.
    expect(hasOwnFolderSkills(project, tool('codex'))).toBe(false);
  });
});
