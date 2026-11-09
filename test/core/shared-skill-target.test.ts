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
  skillToolListPath,
} from '../../src/core/shared-skill-target.js';
import type { FileView } from '../../src/core/file-view.js';

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
    await write('.agents/skills/openspec-explore/SKILL.md', 'Run `$openspec-propose`.');
    expect(readSkillToolList(project)).toEqual(['codex']);
    await write('.agents/skills/openspec-explore/SKILL.md', 'Run `/openspec-propose`.');
    expect(readSkillToolList(project)).toEqual(['agents']);
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
