import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { forgetProjectSkills, keepsProjectSkills, rememberProjectSkills } from '../../src/core/project-skills-scope.js';

describe("a project's choice to keep its skills in the repository", () => {
  let dir: string;
  const config = () => path.join(dir, 'openspec', 'config.yaml');

  beforeEach(async () => {
    dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-skills-scope-')));
    await fs.mkdir(path.join(dir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('is not made until it is recorded', async () => {
    await fs.writeFile(config(), 'schema: spec-driven\n');

    expect(keepsProjectSkills(dir)).toBe(false);
  });

  it('is recorded in openspec/config.yaml, leaving the rest of the file as written', async () => {
    const before = '# Team settings\nschema: spec-driven\n\n# Shown to every agent\ncontext: |\n  We ship on Fridays.\ngithubCopilot:\n  cloudAgent: true\n';
    await fs.writeFile(config(), before);

    const saved = await rememberProjectSkills(dir);

    expect(saved).toBe(config());
    expect(await fs.readFile(config(), 'utf8')).toBe(`${before}skillsScope: project\n`);
    expect(keepsProjectSkills(dir)).toBe(true);
  });

  it('is recorded once, however often it is made', async () => {
    await fs.writeFile(config(), 'schema: spec-driven\n');
    await rememberProjectSkills(dir);
    await rememberProjectSkills(dir);

    expect(await fs.readFile(config(), 'utf8')).toBe('schema: spec-driven\nskillsScope: project\n');
  });

  it('creates the config when the project has none', async () => {
    const saved = await rememberProjectSkills(dir);

    expect(saved).toBe(config());
    expect(await fs.readFile(config(), 'utf8')).toBe('schema: spec-driven\nskillsScope: project\n');
    expect(keepsProjectSkills(dir)).toBe(true);
  });

  it('is dropped when the skills leave the repository, and nothing else in the file changes', async () => {
    const before = '# Team settings\nschema: spec-driven\ncontext: |\n  We ship on Fridays.\n';
    await fs.writeFile(config(), before);
    await rememberProjectSkills(dir);

    await forgetProjectSkills(dir);

    expect(await fs.readFile(config(), 'utf8')).toBe(before);
    expect(keepsProjectSkills(dir)).toBe(false);
    // Nothing to drop: the file is not rewritten.
    await forgetProjectSkills(dir);
    expect(await fs.readFile(config(), 'utf8')).toBe(before);
  });

  it.each([
    ['YAML that does not parse', 'schema: spec-driven\n\tbad: [unclosed\n'],
    ['a root that is not a map', '- one\n- two\n'],
  ])('leaves a config with %s untouched and reports nothing saved', async (_label, text) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.writeFile(config(), text);

    expect(await rememberProjectSkills(dir)).toBeUndefined();
    expect(await fs.readFile(config(), 'utf8')).toBe(text);
    expect(keepsProjectSkills(dir)).toBe(false);
  });

  it('reads only the value project as keeping the skills, and warns about a value it does not know', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await fs.writeFile(config(), 'schema: spec-driven\nskillsScope: global\n');
    expect(keepsProjectSkills(dir)).toBe(false);
    expect(warn).not.toHaveBeenCalled();

    await fs.writeFile(config(), 'schema: spec-driven\nskillsScope: sometimes\n');
    expect(keepsProjectSkills(dir)).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Invalid 'skillsScope' field"));
  });
});
