import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';
import { headingId } from '../../src/core/parsers/requirement-blocks.js';
import { Validator } from '../../src/core/validation/validator.js';

/**
 * Stable IDs (#2167): a requirement or scenario heading may start with an ID,
 * and validate and archive match a MODIFIED block on that ID before its name,
 * so a renamed heading that keeps its ID is the same requirement or scenario.
 */
describe('headingId', () => {
  it.each([
    ['AUTH-3 Users sign in', 'AUTH-3'],
    ['AUTH-3.1 Correct password', 'AUTH-3.1'],
    ['REQ-UA-004 Second factor', 'REQ-UA-004'],
    ['SCN-UA-004-1 Valid code', 'SCN-UA-004-1'],
    ['[cap-012] Correct password', 'cap-012'],
    ['NAV-5', 'NAV-5'],
  ])('reads %j as %j', (name, id) => {
    expect(headingId(name)).toBe(id);
  });

  it.each(['Step-2 rollout', 'Users sign in', 'V2 API', 'AUTH-3x Users', 'auth-3 Users', '[cap-NNN] Placeholder', 'Parse C# projects'])(
    'finds no ID in %j',
    (name) => {
      expect(headingId(name)).toBeUndefined();
    }
  );
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
  const requirement = (name: string, scenarios: string[]) => [
    `### Requirement: ${name}`,
    `The system SHALL handle ${name.toLowerCase()}.`,
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
  const modified = (...requirements: string[][]) => ['## MODIFIED Requirements', '', ...requirements.flat()].join('\n');
  const added = (...requirements: string[][]) => ['## ADDED Requirements', '', ...requirements.flat()].join('\n');

  const MAIN = spec(
    requirement('AUTH-1 Accounts', ['AUTH-1.1 New account']),
    requirement('AUTH-3 Users sign in', ['AUTH-3.1 Correct password', 'AUTH-3.2 Wrong password']),
    requirement('AUTH-4 Sessions expire', ['AUTH-4.1 Idle timeout'])
  );

  async function build(main: string, delta: string) {
    const specsRoot = path.join(tempDir, 'openspec', 'specs');
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.mkdir(path.join(specsRoot, 'auth'), { recursive: true });
    await fs.mkdir(path.join(changeDir, 'specs', 'auth'), { recursive: true });
    await fs.writeFile(path.join(specsRoot, 'auth', 'spec.md'), main);
    await fs.writeFile(path.join(changeDir, 'specs', 'auth', 'spec.md'), delta);
    const [update] = await findSpecUpdates(changeDir, specsRoot);
    return { update, changeDir, specsRoot, run: () => buildUpdatedSpec(update, 'c', { silent: true }) };
  }

  const headings = (rebuilt: string) => rebuilt.split('\n').filter((line) => line.startsWith('### Requirement:'));

  it('renames a requirement that keeps its ID, in place', async () => {
    const { run } = await build(
      MAIN,
      modified(requirement('AUTH-3 Users log in', ['AUTH-3.1 Correct password', 'AUTH-3.2 Wrong password']))
    );
    const { rebuilt } = await run();
    expect(headings(rebuilt)).toEqual([
      '### Requirement: AUTH-1 Accounts',
      '### Requirement: AUTH-3 Users log in',
      '### Requirement: AUTH-4 Sessions expire',
    ]);
  });

  it('accepts a renamed scenario that keeps its ID', async () => {
    const { run } = await build(
      MAIN,
      modified(requirement('AUTH-3 Users sign in', ['AUTH-3.1 Valid password', 'AUTH-3.2 Wrong password']))
    );
    const { rebuilt } = await run();
    expect(rebuilt).toContain('#### Scenario: AUTH-3.1 Valid password');
    expect(rebuilt).not.toContain('Correct password');
  });

  it('still refuses a dropped scenario, naming it', async () => {
    const { run } = await build(MAIN, modified(requirement('AUTH-3 Users log in', ['AUTH-3.1 Correct password'])));
    await expect(run()).rejects.toThrow(/"AUTH-3\.2 Wrong password"/);
  });

  it('does not let a different ID cover a dropped scenario by sharing its name', async () => {
    const { run } = await build(
      MAIN,
      modified(requirement('AUTH-3 Users sign in', ['AUTH-3.9 Correct password', 'AUTH-3.2 Wrong password']))
    );
    await expect(run()).rejects.toThrow(/"AUTH-3\.1 Correct password"/);
  });

  it('refuses a rename that also drops the ID', async () => {
    const { run } = await build(
      MAIN,
      modified(requirement('Users log in', ['AUTH-3.1 Correct password', 'AUTH-3.2 Wrong password']))
    );
    await expect(run()).rejects.toThrow(/MODIFIED failed for header "### Requirement: Users log in" - not found/);
  });

  it('lets an existing requirement and its scenarios gain IDs', async () => {
    const legacy = spec(requirement('Users sign in', ['Correct password', 'Wrong password']));
    const { run } = await build(
      legacy,
      modified(requirement('AUTH-3 Users sign in', ['AUTH-3.1 Correct password', 'AUTH-3.2 Wrong password']))
    );
    const { rebuilt } = await run();
    expect(headings(rebuilt)).toEqual(['### Requirement: AUTH-3 Users sign in']);
  });

  it('does not treat gaining an ID and a new name at once as a rename', async () => {
    const legacy = spec(requirement('Users sign in', ['Correct password']));
    const { run } = await build(legacy, modified(requirement('AUTH-3 Users log in', ['AUTH-3.1 Correct password'])));
    await expect(run()).rejects.toThrow(/not found/);
  });

  it('refuses an ADDED requirement that reuses an existing ID', async () => {
    const { run } = await build(MAIN, added(requirement('AUTH-4 Remember me', ['AUTH-4.9 Checkbox ticked'])));
    await expect(run()).rejects.toThrow(
      /ID AUTH-4 would be used by more than one requirement: "AUTH-4 Sessions expire", "AUTH-4 Remember me"/
    );
  });

  it('refuses two MODIFIED blocks that share an ID', async () => {
    const { run } = await build(
      MAIN,
      modified(
        requirement('AUTH-3 Users log in', ['AUTH-3.1 Correct password', 'AUTH-3.2 Wrong password']),
        requirement('AUTH-3 Users sign on', ['AUTH-3.1 Correct password', 'AUTH-3.2 Wrong password'])
      )
    );
    await expect(run()).rejects.toThrow(/duplicate ID AUTH-3 in MODIFIED/);
  });

  it('matches by name only when the main spec already repeats an ID', async () => {
    const duplicated = spec(
      requirement('AUTH-3 Users sign in', ['AUTH-3.1 Correct password']),
      requirement('AUTH-3 Remember me', ['AUTH-3.2 Checkbox ticked'])
    );
    const { run } = await build(duplicated, modified(requirement('AUTH-3 Users log in', ['AUTH-3.1 Correct password'])));
    await expect(run()).rejects.toThrow(/not found/);

    const byName = await build(
      duplicated,
      modified(requirement('AUTH-3 Remember me', ['AUTH-3.2 Checkbox ticked', 'AUTH-3.3 Checkbox clear']))
    );
    await expect(byName.run()).resolves.toBeDefined();
  });

  it('validate agrees with archive', async () => {
    const validate = async (delta: string) => {
      const { changeDir, specsRoot } = await build(MAIN, delta);
      const report = await new Validator().validateChangeDeltaSpecs(changeDir, { mainSpecsDir: specsRoot });
      return report.issues.filter((issue) => issue.level === 'ERROR').map((issue) => issue.message);
    };

    expect(
      await validate(modified(requirement('AUTH-3 Users log in', ['AUTH-3.1 Valid password', 'AUTH-3.2 Wrong password'])))
    ).toEqual([]);
    expect(await validate(modified(requirement('AUTH-3 Users log in', ['AUTH-3.1 Valid password'])))).toEqual([
      expect.stringContaining('omits scenario(s) the current spec still has: "AUTH-3.2 Wrong password"'),
    ]);
    expect(
      await validate(
        added(requirement('AUTH-7 Remember me', ['AUTH-7.1 Ticked']), requirement('AUTH-7 Lockout', ['AUTH-7.2 Locked']))
      )
    ).toEqual([expect.stringContaining('Duplicate ID in ADDED: "AUTH-7"')]);
  });

  it('warns about a main spec that repeats an ID', async () => {
    const duplicated = spec(
      requirement('AUTH-3 Users sign in', ['AUTH-3.1 Correct password']),
      requirement('AUTH-3 Remember me', ['AUTH-3.2 Checkbox ticked'])
    );
    const report = await new Validator().validateSpecContent('auth', duplicated);
    expect(report.valid).toBe(true);
    expect(report.issues).toContainEqual(
      expect.objectContaining({ level: 'WARNING', message: expect.stringContaining('ID "AUTH-3" is used by more than one requirement') })
    );
  });
});
