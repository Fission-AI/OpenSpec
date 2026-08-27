import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { Validator } from '../../src/core/validation/validator.js';
import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';

/**
 * validate reports the deltas archive would refuse to apply (#1112).
 *
 * Compare findings against archive's merge builder, not its later validation
 * and retirement checks. A delta the builder accepts must produce no finding.
 * Reporting a change that merges cleanly
 * would send an author to rewrite working work, which is worse than the gap
 * this closes.
 */
describe('validate: deltas archive would refuse (#1112)', () => {
  let testDir: string;
  let changesDir: string;
  let mainSpecsDir: string;

  const REQUIREMENT = `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported`;

  const mainSpec = (body: string) =>
    `# widgets Specification\n\n## Purpose\nDefine widget behavior for these tests.\n\n## Requirements\n\n${body}\n`;

  const writeMainSpec = async (id: string, body: string) => {
    const file = path.join(mainSpecsDir, ...id.split('/'), 'spec.md');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, mainSpec(body));
  };

  const writeChange = async (changeName: string, specId: string, delta: string) => {
    const changeDir = path.join(changesDir, changeName);
    const specDir = path.join(changeDir, 'specs', ...specId.split('/'));
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(path.join(specDir, 'spec.md'), delta);
    return changeDir;
  };

  const validate = (changeDir: string, strict = false) =>
    new Validator(strict).validateChangeDeltaSpecs(changeDir, { mainSpecsDir });

  /** The preflight finding, so assertions cannot pass on an unrelated issue. */
  const blocker = (report: { issues: Array<{ level: string; message: string }> }) =>
    report.issues.find((i) => i.message.startsWith('Archive would refuse this delta:'));

  /** What archive's merge builder does: null when the delta applies cleanly. */
  const archiveError = async (changeDir: string): Promise<string | null> => {
    for (const update of await findSpecUpdates(changeDir, mainSpecsDir)) {
      try {
        await buildUpdatedSpec(update, path.basename(changeDir), { silent: true });
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    }
    return null;
  };

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-preflight-'));
    changesDir = path.join(testDir, 'openspec', 'changes');
    mainSpecsDir = path.join(testDir, 'openspec', 'specs');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(mainSpecsDir, { recursive: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it.each(['EMFILE', 'EIO', 'EACCES'])(
    'does not misreport a target read failure (%s) as a missing requirement',
    async (code) => {
      await writeMainSpec('widgets', REQUIREMENT);
      const changeDir = await writeChange('c1', 'widgets', `## MODIFIED Requirements\n\n${REQUIREMENT}\n`);
      const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
      const readFile = fs.readFile;
      const failure = Object.assign(new Error(`${code}: cannot read target`), { code });
      const spy = vi.spyOn(fs, 'readFile').mockImplementation(async (file, ...rest) => {
        if (path.resolve(String(file)) === update.target) throw failure;
        return readFile(file, ...(rest as []));
      });

      const report = await validate(changeDir);
      expect(spy.mock.calls.some(([file]) => path.resolve(String(file)) === update.target)).toBe(true);
      expect(blocker(report)).toBeUndefined();
      await expect(buildUpdatedSpec(update, 'c1', { silent: true })).rejects.toBe(failure);
    }
  );

  it.each([
    ['already-synced addition', `## ADDED Requirements\n\n${REQUIREMENT}\n`],
    ['already-synced removal', '## REMOVED Requirements\n\n### Requirement: Gone\n'],
  ])('stays silent on an %s', async (_name, delta) => {
    await writeMainSpec('widgets', REQUIREMENT);
    const changeDir = await writeChange('c1', 'widgets', delta);
    expect(blocker(await validate(changeDir))).toBeUndefined();
    expect(await archiveError(changeDir)).toBeNull();
  });

  it('reports a rename target collision', async () => {
    await writeMainSpec('widgets', `${REQUIREMENT}\n\n${REQUIREMENT.replace('Widget state', 'Gadget state')}`);
    const changeDir = await writeChange('c1', 'widgets', '## RENAMED Requirements\n\n- FROM: `### Requirement: Widget state`\n- TO: `### Requirement: Gadget state`\n');
    const error = await archiveError(changeDir);
    expect(error).toContain('already exists');
    expect(blocker(await validate(changeDir))?.message).toBe(`Archive would refuse this delta: ${error}`);
  });

  it.each([
    ['MODIFIED', `## MODIFIED Requirements\n\n${REQUIREMENT}\n`],
    ['RENAMED', '## RENAMED Requirements\n\n- FROM: `### Requirement: Widget state`\n- TO: `### Requirement: Gadget state`\n'],
  ])('reports %s against a capability that does not exist', async (_operation, delta) => {
    const changeDir = await writeChange('c1', 'new-capability', delta);
    const error = await archiveError(changeDir);
    expect(error).toContain('target spec does not exist');
    expect(blocker(await validate(changeDir))?.message).toBe(`Archive would refuse this delta: ${error}`);
  });

  it('keeps library validation unchanged when mainSpecsDir is omitted', async () => {
    const changeDir = await writeChange('c1', 'widgets', `## MODIFIED Requirements\n\n${REQUIREMENT}\n`);
    const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);
    expect(report.valid).toBe(true);
    expect(blocker(report)).toBeUndefined();
  });

  it('does not synthesize a new baseline for ADDED when the existing spec cannot be read', async () => {
    await writeMainSpec('widgets', REQUIREMENT);
    const changeDir = await writeChange('c1', 'widgets', `## ADDED Requirements\n\n${REQUIREMENT.replace('Widget state', 'Gadget state')}\n`);
    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);
    const readFile = fs.readFile;
    const failure = Object.assign(new Error('EIO: cannot read target'), { code: 'EIO' });
    vi.spyOn(fs, 'readFile').mockImplementation(async (file, ...rest) => {
      if (path.resolve(String(file)) === update.target) throw failure;
      return readFile(file, ...(rest as []));
    });
    await expect(buildUpdatedSpec(update, 'c1', { silent: true })).rejects.toBe(failure);
  });

  it('reports a nested capability without suppressing findings for other files', async () => {
    await writeMainSpec('area/widgets', REQUIREMENT);
    const changeDir = await writeChange('c1', 'area/widgets', `## MODIFIED Requirements\n\n${REQUIREMENT.replace('Widget state', 'Missing')}\n`);
    await writeChange('c1', 'invalid', '## ADDED Requirements\n\nNo entries.\n');
    const report = await validate(changeDir);
    expect(report.issues.filter((issue) => issue.level === 'INFO')).toEqual([
      expect.objectContaining({ path: 'area/widgets/spec.md', message: `Archive would refuse this delta: ${await archiveError(changeDir)}` }),
    ]);
  });

  it('does not create or rewrite spec files or print merge warnings', async () => {
    await writeMainSpec('widgets', REQUIREMENT);
    const changeDir = await writeChange('c1', 'widgets', `## ADDED Requirements\n\n${REQUIREMENT}\n`);
    await writeChange('c1', 'new-capability', `## ADDED Requirements\n\n${REQUIREMENT}\n`);
    const mainFile = path.join(mainSpecsDir, 'widgets', 'spec.md');
    const deltaFile = path.join(changeDir, 'specs', 'widgets', 'spec.md');
    const before = await Promise.all([fs.readFile(mainFile, 'utf8'), fs.readFile(deltaFile, 'utf8')]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await validate(changeDir);
    expect(await Promise.all([fs.readFile(mainFile, 'utf8'), fs.readFile(deltaFile, 'utf8')])).toEqual(before);
    await expect(fs.stat(path.join(mainSpecsDir, 'new-capability'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(log).not.toHaveBeenCalled();
  });

  it('reports a MODIFIED naming a requirement the main spec does not have', async () => {
    await writeMainSpec('widgets', REQUIREMENT);
    const changeDir = await writeChange(
      'c1',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Gadget state\nThe system SHALL report the gadget state.\n\n#### Scenario: Queried\n- **WHEN** queried\n- **THEN** reported\n`
    );

    const issue = blocker(await validate(changeDir));
    expect(issue?.message).toContain('MODIFIED failed for header "### Requirement: Gadget state"');
    expect(await archiveError(changeDir)).not.toBeNull();
  });

  it('reports an ADDED whose requirement already exists in the main spec', async () => {
    await writeMainSpec('widgets', REQUIREMENT);
    const changeDir = await writeChange(
      'c1',
      'widgets',
      `## ADDED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state twice.\n\n#### Scenario: Queried\n- **WHEN** queried\n- **THEN** reported\n`
    );

    expect(blocker(await validate(changeDir))?.message).toContain('already exists');
    expect(await archiveError(changeDir)).not.toBeNull();
  });

  it('reports a RENAMED whose source is not in the main spec', async () => {
    await writeMainSpec('widgets', REQUIREMENT);
    const changeDir = await writeChange(
      'c1',
      'widgets',
      `## RENAMED Requirements\n\n- FROM: \`### Requirement: Gadget state\`\n- TO: \`### Requirement: Doodad state\`\n`
    );

    expect(blocker(await validate(changeDir))?.message).toContain('source not found');
    expect(await archiveError(changeDir)).not.toBeNull();
  });

  it('stays silent on a delta that applies cleanly', async () => {
    await writeMainSpec('widgets', REQUIREMENT);
    const changeDir = await writeChange(
      'c1',
      'widgets',
      `## ADDED Requirements\n\n### Requirement: Gadget state\nThe system SHALL report the gadget state.\n\n#### Scenario: Queried\n- **WHEN** queried\n- **THEN** reported\n`
    );

    expect(blocker(await validate(changeDir))).toBeUndefined();
    expect(await archiveError(changeDir)).toBeNull();
  });

  it('stays silent on a rename the baseline already absorbed', async () => {
    // Source gone, target present: specs-apply reads this as an early-synced
    // rename and applies it as a no-op. A preflight with its own copy of the
    // rules would call it a missing source and fail a change that archives.
    await writeMainSpec('widgets', REQUIREMENT.replace('Widget state', 'Doodad state'));
    const changeDir = await writeChange(
      'c1',
      'widgets',
      `## RENAMED Requirements\n\n- FROM: \`### Requirement: Widget state\`\n- TO: \`### Requirement: Doodad state\`\n`
    );

    expect(blocker(await validate(changeDir))).toBeUndefined();
    expect(await archiveError(changeDir)).toBeNull();
  });

  it('stays silent when the capability is new, so there is nothing to apply against', async () => {
    const changeDir = await writeChange(
      'c1',
      'gizmos',
      `## ADDED Requirements\n\n### Requirement: Gizmo state\nThe system SHALL report the gizmo state.\n\n#### Scenario: Queried\n- **WHEN** queried\n- **THEN** reported\n`
    );

    expect(blocker(await validate(changeDir))).toBeUndefined();
    expect(await archiveError(changeDir)).toBeNull();
  });

  it('reports without changing the verdict, in strict mode too', async () => {
    await writeMainSpec('widgets', REQUIREMENT);
    const changeDir = await writeChange(
      'c1',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Gadget state\nThe system SHALL report the gadget state.\n\n#### Scenario: Queried\n- **WHEN** queried\n- **THEN** reported\n`
    );

    // The same shape is a typo'd header and a change modifying a sibling's
    // unarchived requirement, and validate stays valid for the second one
    // today. Telling the two apart needs the opt-in marker #1112 asks for, so
    // this reports the collision and leaves the verdict where it was.
    for (const strict of [false, true]) {
      const report = await validate(changeDir, strict);
      expect(report.valid).toBe(true);
      expect(blocker(report)?.level).toBe('INFO');
    }
  });

  it('does not restate a delta with no parsed sections, reported after the loop', async () => {
    // missingHeaderSpecs / emptySectionSpecs are collected inside the loop but
    // their errors are pushed after it, so a preflight keyed on issues raised
    // so far would not see them and would add a second finding for a file the
    // validator is about to name properly.
    await writeMainSpec('widgets', REQUIREMENT);
    const changeDir = await writeChange('c1', 'widgets', '# notes\n\nNo delta headers here.\n');

    const report = await validate(changeDir);
    expect(report.issues.some((i) => i.message.startsWith('No delta sections found'))).toBe(true);
    expect(blocker(report)).toBeUndefined();
  });

  it('does not restate a section that parsed no requirement entries', async () => {
    await writeMainSpec('widgets', REQUIREMENT);
    const changeDir = await writeChange('c1', 'widgets', '## ADDED Requirements\n\nNothing here.\n');

    const report = await validate(changeDir);
    expect(report.issues.some((i) => i.message.includes('no requirement entries parsed'))).toBe(true);
    expect(blocker(report)).toBeUndefined();
  });

  it('does not restate a failure the delta checks already named', async () => {
    // The scenario-loss check reports this one in wording that names the
    // dropped scenario; buildUpdatedSpec throws on it too, a few steps later.
    await writeMainSpec(
      'widgets',
      `${REQUIREMENT}\n\n#### Scenario: Second scenario\n- **WHEN** idle\n- **THEN** idle is reported`
    );
    const changeDir = await writeChange(
      'c1',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n`
    );

    const report = await validate(changeDir);
    expect(report.issues.some((i) => i.level === 'ERROR')).toBe(true);
    expect(blocker(report)).toBeUndefined();
    expect(await archiveError(changeDir)).not.toBeNull();
  });
});
