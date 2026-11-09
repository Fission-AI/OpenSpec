import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifySkillLinkSpot, createSkillLink } from '../../../src/core/shared/skill-links.js';
import { AI_TOOLS } from '../../../src/core/config.js';
import {
  resolveFormerOwnSkillsDir,
  resolveSharedSkillsDir,
  resolveSkillLinkDir,
  usesSharedSkills,
} from '../../../src/core/shared/skill-paths.js';

const fixtures = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures/released-output');
const tool = (id: string) => AI_TOOLS.find((t) => t.value === id)!;

describe('shared skill paths', () => {
  it('puts every project-skill tool in .agents/skills except Amazon Q and global tools', () => {
    expect(resolveSharedSkillsDir('/p')).toBe(path.join('/p', '.agents', 'skills'));
    expect(usesSharedSkills(tool('cursor'))).toBe(true);
    expect(usesSharedSkills(tool('codex'))).toBe(true);
    expect(usesSharedSkills(tool('amazon-q'))).toBe(false);
    expect(usesSharedSkills(tool('minimax-code'))).toBe(false);
  });

  it('links only the tools that may not read .agents/skills', () => {
    const linked = AI_TOOLS.filter((t) => resolveSkillLinkDir('/p', t)).map((t) => t.value).sort();
    expect(linked).toEqual([
      'claude', 'codeartsagent', 'codebuddy', 'codestudio', 'continue', 'easycode', 'forgecode',
      'gigacode', 'hermes', 'iflow', 'kiro', 'lingma', 'rovodev', 'veai',
    ]);
    expect(resolveSkillLinkDir('/p', tool('claude'))).toBe(path.join('/p', '.claude', 'skills'));
  });

  it('treats each tool own skills folder as a former location, except .agents itself', () => {
    expect(resolveFormerOwnSkillsDir('/p', tool('cursor'))).toBe(path.join('/p', '.cursor', 'skills'));
    expect(resolveFormerOwnSkillsDir('/p', tool('codex'))).toBeUndefined();
  });
});

describe('skill links', () => {
  let root: string;
  let shared: string;
  let link: string;
  const content = '---\nname: openspec-propose\n---\nPropose.\n';

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-links-')));
    shared = path.join(root, '.agents', 'skills', 'openspec-propose');
    link = path.join(root, '.claude', 'skills', 'openspec-propose');
    fs.mkdirSync(shared, { recursive: true });
    fs.writeFileSync(path.join(shared, 'SKILL.md'), content);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('makes a relative link that reads the shared copy', () => {
    expect(classifySkillLinkSpot(link, shared, content)).toBe('missing');
    expect(createSkillLink(link, shared)).toBe('link');
    expect(fs.readlinkSync(link)).toBe(path.join('..', '..', '.agents', 'skills', 'openspec-propose'));
    expect(fs.readFileSync(path.join(link, 'SKILL.md'), 'utf-8')).toBe(content);
    expect(classifySkillLinkSpot(link, shared, content)).toBe('link');
  });

  it('falls back to a plain copy when a link cannot be made', () => {
    const refuse = () => {
      throw Object.assign(new Error('EPERM'), { code: 'EPERM' });
    };
    expect(createSkillLink(link, shared, refuse)).toBe('copy');
    expect(fs.lstatSync(link).isSymbolicLink()).toBe(false);
    expect(classifySkillLinkSpot(link, shared, content)).toBe('copy');
  });

  it('recognizes an untouched copy from an earlier release', () => {
    fs.mkdirSync(link, { recursive: true });
    fs.copyFileSync(path.join(fixtures, 'v1.0.0-codex-prompt-opsx-new.md'), path.join(link, 'SKILL.md'));
    expect(classifySkillLinkSpot(link, shared, content)).toBe('released');
  });

  it('keeps anything the user owns', () => {
    fs.mkdirSync(link, { recursive: true });
    fs.writeFileSync(path.join(link, 'SKILL.md'), 'my own skill');
    expect(classifySkillLinkSpot(link, shared, content)).toBe('user');

    fs.writeFileSync(path.join(link, 'SKILL.md'), content);
    fs.writeFileSync(path.join(link, 'notes.md'), 'extra');
    expect(classifySkillLinkSpot(link, shared, content)).toBe('user');

    fs.rmSync(link, { recursive: true });
    const elsewhere = path.join(root, 'elsewhere');
    fs.mkdirSync(elsewhere);
    fs.symlinkSync(elsewhere, link, 'dir');
    expect(classifySkillLinkSpot(link, shared, content)).toBe('user');
  });
});
