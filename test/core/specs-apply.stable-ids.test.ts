import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';
import { headingId } from '../../src/core/parsers/requirement-blocks.js';
import { Validator } from '../../src/core/validation/validator.js';

/**
 * Stable IDs (#2167): a requirement or scenario heading may start with an ID in
 * square brackets, and validate and archive match a MODIFIED block on that ID
 * before its name, so a renamed heading that keeps its ID is the same
 * requirement or scenario.
 */
describe('headingId', () => {
  it.each([
    ['[AUTH-3] Users sign in', 'AUTH-3'],
    ['[AUTH-3.1] Correct password', 'AUTH-3.1'],
    ['[REQ-UA-004] Second factor', 'REQ-UA-004'],
    ['[cap-012] Correct password', 'cap-012'],
    ['[NAV-5]', 'NAV-5'],
  ])('reads %j as %j', (name, id) => {
    expect(headingId(name)).toBe(id);
  });

  // Without brackets, a leading version or standard name is ordinary text.
  it.each([
    'AUTH-3 Users sign in',
    'SHA-256 checksum verified',
    'HTTP-2 support',
    'UTF-8 input',
    'COVID-19 handling',
    'Step-2 rollout',
    '[WIP] Users sign in',
    '[cap-NNN] Placeholder',
    '[AUTH-3]Users sign in',
    'Parse C# projects',
  ])('finds no ID in %j', (name) => {
    expect(headingId(name)).toBeUndefined();
  });
});

describe('buildUpdatedSpec (stable IDs)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-stable-ids-'));
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const scenario = (name: string) => [`#### Scenario: ${name}`, '- **WHEN** it happens', '- **THEN** it works', ''];
  const requirement = (name: string, scenarios: string[], text = `The system SHALL handle ${name.toLowerCase()}.`) => [
    `### Requirement: ${name}`,
    text,
    '',
    ...scenarios.flatMap(scenario),
  ];
  const spec = (...requirements: string[][]) =>
    [
      '# auth Specification',
      '',
      '## Purpose',
      'Defines how users sign in and stay signed in to the app.',
      '',
      '## Requirements',
      ...requirements.flat(),
    ].join('\n');
  const section = (title: string) => (...requirements: string[][]) =>
    [`## ${title} Requirements`, '', ...requirements.flat()].join('\n');
  const modified = section('MODIFIED');
  const added = section('ADDED');

  const MAIN = spec(
    requirement('[AUTH-1] Accounts', ['[AUTH-1.1] New account']),
    requirement('[AUTH-3] Users sign in', ['[AUTH-3.1] Correct password', '[AUTH-3.2] Wrong password']),
    requirement('[AUTH-4] Sessions expire', ['[AUTH-4.1] Idle timeout'])
  );

  async function build(main: string, delta: string) {
    const specsRoot = path.join(tempDir, 'openspec', 'specs');
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.rm(path.join(tempDir, 'openspec'), { recursive: true, force: true });
    await fs.mkdir(path.join(specsRoot, 'auth'), { recursive: true });
    await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
    await fs.writeFile(path.join(specsRoot, 'auth', 'spec.md'), main);
    await fs.writeFile(path.join(changeDir, 'specs', 'auth', 'spec.md'), delta);
    const [update] = await findSpecUpdates(changeDir, specsRoot);
    return { changeDir, specsRoot, run: () => buildUpdatedSpec(update, 'c', { silent: true }) };
  }

  async function validationErrors(main: string, delta: string) {
    const { changeDir, specsRoot } = await build(main, delta);
    const report = await new Validator().validateChangeDeltaSpecs(changeDir, { mainSpecsDir: specsRoot });
    return report.issues.filter((issue) => issue.level === 'ERROR').map((issue) => issue.message);
  }

  const headings = (rebuilt: string) => rebuilt.split('\n').filter((line) => line.startsWith('### Requirement:'));

  describe('renames', () => {
    it('renames a requirement that keeps its ID, in place', async () => {
      const { run } = await build(
        MAIN,
        modified(requirement('[AUTH-3] Users log in', ['[AUTH-3.1] Correct password', '[AUTH-3.2] Wrong password']))
      );
      expect(headings((await run()).rebuilt)).toEqual([
        '### Requirement: [AUTH-1] Accounts',
        '### Requirement: [AUTH-3] Users log in',
        '### Requirement: [AUTH-4] Sessions expire',
      ]);
    });

    it('accepts a renamed scenario that keeps its ID', async () => {
      const { run } = await build(
        MAIN,
        modified(requirement('[AUTH-3] Users sign in', ['[AUTH-3.1] Valid password', '[AUTH-3.2] Wrong password']))
      );
      const { rebuilt } = await run();
      expect(rebuilt).toContain('#### Scenario: [AUTH-3.1] Valid password');
      expect(rebuilt).not.toContain('Correct password');
    });

    it('lets an existing requirement and its scenarios gain IDs', async () => {
      const legacy = spec(requirement('Users sign in', ['Correct password', 'Wrong password']));
      const { run } = await build(
        legacy,
        modified(requirement('[AUTH-3] Users sign in', ['[AUTH-3.1] Correct password', '[AUTH-3.2] Wrong password']))
      );
      expect(headings((await run()).rebuilt)).toEqual(['### Requirement: [AUTH-3] Users sign in']);
    });

    it('lets headings that already start with a bare ID add brackets', async () => {
      const legacy = spec(requirement('NAV-5 Users sign in', ['NAV-5.1 Correct password']));
      const { run } = await build(
        legacy,
        modified(requirement('[NAV-5] Users sign in', ['[NAV-5.1] Correct password']))
      );
      const { rebuilt } = await run();
      expect(headings(rebuilt)).toEqual(['### Requirement: [NAV-5] Users sign in']);
      expect(rebuilt).toContain('#### Scenario: [NAV-5.1] Correct password');
    });
  });

  describe('refusals', () => {
    it('still refuses a dropped scenario, naming it', async () => {
      const { run } = await build(MAIN, modified(requirement('[AUTH-3] Users log in', ['[AUTH-3.1] Correct password'])));
      await expect(run()).rejects.toThrow(/"\[AUTH-3\.2\] Wrong password"/);
    });

    it('does not let a different ID cover a dropped scenario by sharing its name', async () => {
      const { run } = await build(
        MAIN,
        modified(requirement('[AUTH-3] Users sign in', ['[AUTH-3.9] Correct password', '[AUTH-3.2] Wrong password']))
      );
      await expect(run()).rejects.toThrow(/"\[AUTH-3\.1\] Correct password"/);
    });

    it('refuses a rename that also drops the ID', async () => {
      const { run } = await build(
        MAIN,
        modified(requirement('Users log in', ['[AUTH-3.1] Correct password', '[AUTH-3.2] Wrong password']))
      );
      await expect(run()).rejects.toThrow(/"### Requirement: Users log in" - not found/);
    });

    it('refuses a MODIFIED block that drops a scenario ID', async () => {
      const { run } = await build(
        MAIN,
        modified(requirement('[AUTH-3] Users sign in', ['Correct password', '[AUTH-3.2] Wrong password']))
      );
      await expect(run()).rejects.toThrow(/"\[AUTH-3\.1\] Correct password"/);
    });

    it('does not treat gaining an ID and a new name at once as a rename', async () => {
      const legacy = spec(requirement('Users sign in', ['Correct password']));
      const { run } = await build(legacy, modified(requirement('[AUTH-3] Users log in', ['[AUTH-3.1] Correct password'])));
      await expect(run()).rejects.toThrow(/not found/);
    });

    it('refuses two MODIFIED blocks that land on one requirement, one by name and one by ID', async () => {
      const legacy = spec(requirement('Login', ['Ok']), requirement('Logout', ['Bye']));
      const delta = modified(
        requirement('Login', ['Ok'], 'The system SHALL log users in. FIRST'),
        requirement('[AUTH-3] Login', ['[AUTH-3.1] Ok'], 'The system SHALL log users in. SECOND')
      );
      const { run } = await build(legacy, delta);
      await expect(run()).rejects.toThrow(/another MODIFIED block in this delta already changes "Login"/);
    });

    it('refuses a MODIFIED that would undo a RENAMED in the same delta', async () => {
      const delta = [
        '## RENAMED Requirements',
        '- FROM: `### Requirement: [AUTH-3] Users sign in`',
        '- TO: `### Requirement: [AUTH-3] Users log in`',
        '',
        modified(requirement('[AUTH-3] Users log on', ['[AUTH-3.1] Correct password', '[AUTH-3.2] Wrong password'])),
      ].join('\n');
      const { run } = await build(MAIN, delta);
      await expect(run()).rejects.toThrow(/RENAMED in this delta names it "\[AUTH-3\] Users log in"; use that header/);
    });

    it('refuses a rename onto a name that differs from another requirement only in case', async () => {
      const main = spec(requirement('[AUTH-3] Login', ['Ok']), requirement('[auth-3] log in', ['In']));
      const { run } = await build(main, modified(requirement('[AUTH-3] Log In', ['Ok'])));
      await expect(run()).rejects.toThrow(/"### Requirement: \[auth-3\] log in" already exists and differs only in case or spacing/);
    });
  });

  describe('duplicate IDs', () => {
    it('refuses an ADDED requirement that reuses an existing ID', async () => {
      const { run } = await build(MAIN, added(requirement('[AUTH-4] Remember me', ['[AUTH-4.9] Checkbox ticked'])));
      await expect(run()).rejects.toThrow(
        /ID AUTH-4 would be used by more than one requirement: "\[AUTH-4\] Sessions expire", "\[AUTH-4\] Remember me"/
      );
    });

    it('refuses two MODIFIED blocks that share an ID', async () => {
      const { run } = await build(
        MAIN,
        modified(
          requirement('[AUTH-3] Users log in', ['[AUTH-3.1] Correct password', '[AUTH-3.2] Wrong password']),
          requirement('[AUTH-3] Users sign on', ['[AUTH-3.1] Correct password', '[AUTH-3.2] Wrong password'])
        )
      );
      await expect(run()).rejects.toThrow(/duplicate ID AUTH-3 in MODIFIED/);
    });

    it('matches by name only when the main spec already repeats an ID', async () => {
      const duplicated = spec(
        requirement('[AUTH-3] Users sign in', ['[AUTH-3.1] Correct password']),
        requirement('[AUTH-3] Remember me', ['[AUTH-3.2] Checkbox ticked'])
      );
      const rename = await build(duplicated, modified(requirement('[AUTH-3] Users log in', ['[AUTH-3.1] Correct password'])));
      await expect(rename.run()).rejects.toThrow(/not found/);
      const byName = await build(
        duplicated,
        modified(requirement('[AUTH-3] Remember me', ['[AUTH-3.2] Checkbox ticked', '[AUTH-3.3] Checkbox clear']))
      );
      await expect(byName.run()).resolves.toBeDefined();
    });
  });

  // Headings that start with a version or standard name, but no brackets,
  // behave exactly as they did before stable IDs.
  describe('ordinary names that look like IDs', () => {
    it('still refuses a dropped scenario whose name starts with SHA-256', async () => {
      const main = spec(requirement('Upload integrity', ['SHA-256 checksum verified', 'Size limit enforced']));
      const { run } = await build(main, modified(requirement('Upload integrity', ['SHA-256 rejects tampered file', 'Size limit enforced'])));
      await expect(run()).rejects.toThrow(/"SHA-256 checksum verified"/);
    });

    it('does not rewrite HTTP-2 support for a MODIFIED HTTP-2 push', async () => {
      const main = spec(requirement('Login', ['Ok']), requirement('HTTP-2 support', ['Push']));
      const { run } = await build(main, modified(requirement('HTTP-2 push', ['Push'])));
      await expect(run()).rejects.toThrow(/"### Requirement: HTTP-2 push" - not found/);
    });

    it('adds UTF-8 input and UTF-8 output side by side', async () => {
      const main = spec(requirement('UTF-8 input', ['Accepts BOM']));
      const { run } = await build(main, added(requirement('UTF-8 output', ['Writes no BOM'])));
      await expect(run()).resolves.toBeDefined();
    });

    it('does not warn about repeated look-alike prefixes in a main spec', async () => {
      const main = spec(requirement('UTF-8 input', ['Accepts BOM']), requirement('UTF-8 output', ['Writes no BOM']));
      const report = await new Validator(true).validateSpecContent('auth', main);
      expect(report.issues.filter((issue) => /ID "/.test(issue.message))).toEqual([]);
    });
  });

  describe('validate agrees with archive', () => {
    it('passes a rename and reports a dropped scenario', async () => {
      expect(
        await validationErrors(
          MAIN,
          modified(requirement('[AUTH-3] Users log in', ['[AUTH-3.1] Valid password', '[AUTH-3.2] Wrong password']))
        )
      ).toEqual([]);
      expect(await validationErrors(MAIN, modified(requirement('[AUTH-3] Users log in', ['[AUTH-3.1] Valid password'])))).toEqual([
        expect.stringContaining('omits scenario(s) the current spec still has: "[AUTH-3.2] Wrong password"'),
      ]);
    });

    it('reports duplicate IDs within one delta', async () => {
      expect(
        await validationErrors(
          MAIN,
          added(requirement('[AUTH-7] Remember me', ['[AUTH-7.1] Ticked']), requirement('[AUTH-7] Lockout', ['[AUTH-7.2] Locked']))
        )
      ).toEqual([expect.stringContaining('Duplicate ID in ADDED: "AUTH-7"')]);
    });

    it('looks IDs up after the REMOVED that archive applies first', async () => {
      const main = spec(requirement('[AUTH-3] Login', ['Ok']), requirement('Sign in', ['X']));
      const delta = [
        '## REMOVED Requirements',
        '### Requirement: [AUTH-3] Login',
        '**Reason**: Merged into sign in.',
        '**Migration**: None.',
        '',
        modified(requirement('[AUTH-3] Sign in', ['X'])),
      ].join('\n');
      expect(await validationErrors(main, delta)).toEqual([]);
      const { run } = await build(main, delta);
      expect(headings((await run()).rebuilt)).toEqual(['### Requirement: [AUTH-3] Sign in']);
    });

    it('warns about a repeated scenario ID', async () => {
      const { changeDir, specsRoot } = await build(
        MAIN,
        modified(requirement('[AUTH-3] Users sign in', ['[AUTH-3.1] Correct password', '[AUTH-3.2] Wrong password', '[AUTH-3.2] Locked']))
      );
      const report = await new Validator().validateChangeDeltaSpecs(changeDir, { mainSpecsDir: specsRoot });
      expect(report.issues).toContainEqual(
        expect.objectContaining({ level: 'WARNING', message: expect.stringContaining('repeats scenario ID "AUTH-3.2"') })
      );
    });

    it('warns about a main spec that repeats an ID', async () => {
      const duplicated = spec(
        requirement('[AUTH-3] Users sign in', ['[AUTH-3.1] Correct password']),
        requirement('[AUTH-3] Remember me', ['[AUTH-3.2] Checkbox ticked'])
      );
      const report = await new Validator().validateSpecContent('auth', duplicated);
      expect(report.valid).toBe(true);
      expect(report.issues).toContainEqual(
        expect.objectContaining({ level: 'WARNING', message: expect.stringContaining('ID "AUTH-3" is used by more than one requirement') })
      );
    });
  });
});
