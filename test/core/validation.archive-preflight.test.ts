import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { Validator } from '../../src/core/validation/validator.js';
import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';

/**
 * validate reports the deltas archive would refuse to apply (#1112).
 *
 * Every test here asserts parity in both directions: a warning validate emits
 * must correspond to an error archive actually throws, and a change archive
 * accepts must produce no warning. Reporting a change that archives cleanly
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

  /** The preflight warning, so assertions cannot pass on an unrelated issue. */
  const blocker = (report: { issues: Array<{ level: string; message: string }> }) =>
    report.issues.find((i) => i.message.startsWith('Archive would refuse this delta:'));

  /** What archive does with the same change: null when it applies cleanly. */
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
    await fs.rm(testDir, { recursive: true, force: true });
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
