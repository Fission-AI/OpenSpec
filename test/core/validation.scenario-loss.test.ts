import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { Validator } from '../../src/core/validation/validator.js';
import { buildUpdatedSpec, findSpecUpdates } from '../../src/core/specs-apply.js';

/**
 * validate reports the scenario loss archive refuses to apply (#1477).
 *
 * The point of these tests is parity: every case validate rejects must be one
 * archive already rejects, and every case archive accepts must stay valid.
 */
describe('validate: MODIFIED blocks that would drop a main-spec scenario (#1477)', () => {
  let testDir: string;
  let changesDir: string;
  let mainSpecsDir: string;

  const mainSpec = (body: string) =>
    `# widgets Specification\n\n## Purpose\nDefine widget behavior for these tests.\n\n## Requirements\n\n${body}\n`;

  const writeMainSpec = async (id: string, content: string) => {
    const file = path.join(mainSpecsDir, ...id.split('/'), 'spec.md');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  };

  const writeChange = async (changeName: string, specId: string, delta: string) => {
    const changeDir = path.join(changesDir, changeName);
    const specDir = path.join(changeDir, 'specs', ...specId.split('/'));
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(path.join(specDir, 'spec.md'), delta);
    return changeDir;
  };

  const validate = (changeDir: string) =>
    new Validator(true).validateChangeDeltaSpecs(changeDir, { mainSpecsDir });

  /** What archive would do with the same change: null when it applies cleanly. */
  const archiveError = async (changeDir: string): Promise<string | null> => {
    const updates = await findSpecUpdates(changeDir, mainSpecsDir);
    for (const update of updates) {
      try {
        await buildUpdatedSpec(update, path.basename(changeDir), { silent: true });
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    }
    return null;
  };

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-scenario-loss-'));
    changesDir = path.join(testDir, 'openspec', 'changes');
    mainSpecsDir = path.join(testDir, 'openspec', 'specs');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(mainSpecsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('errors when the MODIFIED block omits a scenario the main spec still has', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n#### Scenario: Second scenario\n- **WHEN** idle\n- **THEN** idle is reported`
      )
    );
    const changeDir = await writeChange(
      'rename-scenario',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    const issue = report.issues.find((i) => i.message.includes('omits scenario(s)'));
    expect(issue?.level).toBe('ERROR');
    expect(issue?.path).toBe('widgets/spec.md');
    expect(issue?.message).toContain('MODIFIED "Widget state"');
    expect(issue?.message).toContain('"Second scenario"');
    // Parity: archive rejects exactly this change today.
    expect(await archiveError(changeDir)).toContain('Second scenario');
  });

  it('counts repeated scenario names, so keeping one of two duplicates still errors', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Repeated\n- **WHEN** queried once\n- **THEN** the state is reported\n\n#### Scenario: Repeated\n- **WHEN** queried twice\n- **THEN** the state is reported again`
      )
    );
    const changeDir = await writeChange(
      'drop-duplicate',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Repeated\n- **WHEN** queried once\n- **THEN** the state is reported\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    expect(report.issues.map((i) => i.message).join('\n')).toContain('"Repeated"');
    expect(await archiveError(changeDir)).toContain('Repeated');
  });

  it('accepts a MODIFIED block that carries every current scenario over', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported`
      )
    );
    const changeDir = await writeChange(
      'keeps-all',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state promptly.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n#### Scenario: New scenario\n- **WHEN** it errors\n- **THEN** the error is reported\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(true);
    expect(await archiveError(changeDir)).toBeNull();
  });

  it('stays silent when the requirement header is not in the main spec (sister change in flight)', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported`
      )
    );
    const changeDir = await writeChange(
      'cross-change',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Widget colour\nThe system SHALL report the widget colour.\n\n#### Scenario: Colour queried\n- **WHEN** queried\n- **THEN** the colour is reported\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(true);
  });

  it('stays silent when the main spec file does not exist yet', async () => {
    const changeDir = await writeChange(
      'greenfield',
      'gadgets',
      `## MODIFIED Requirements\n\n### Requirement: Gadget state\nThe system SHALL report the gadget state.\n\n#### Scenario: Gadget queried\n- **WHEN** queried\n- **THEN** the state is reported\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(true);
  });

  it('ignores a #### Scenario: sample inside a fenced block in the main spec', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Real scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n\`\`\`markdown\n#### Scenario: Sample inside a fence\n- **WHEN** copied\n- **THEN** it is only an example\n\`\`\``
      )
    );
    const changeDir = await writeChange(
      'fenced-sample',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state clearly.\n\n#### Scenario: Real scenario\n- **WHEN** queried\n- **THEN** the state is reported\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(true);
    expect(await archiveError(changeDir)).toBeNull();
  });

  it('resolves nested capability layouts against the matching main spec', async () => {
    await writeMainSpec(
      'platform/session',
      mainSpec(
        `### Requirement: Session start\nThe system SHALL start a session.\n\n#### Scenario: Started\n- **WHEN** requested\n- **THEN** a session starts\n\n#### Scenario: Resumed\n- **WHEN** resumed\n- **THEN** the session continues`
      )
    );
    const changeDir = await writeChange(
      'nested-drop',
      'platform/session',
      `## MODIFIED Requirements\n\n### Requirement: Session start\nThe system SHALL start a session quickly.\n\n#### Scenario: Started\n- **WHEN** requested\n- **THEN** a session starts\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    const issue = report.issues.find((i) => i.message.includes('omits scenario(s)'));
    expect(issue?.path).toBe('platform/session/spec.md');
    expect(issue?.message).toContain('"Resumed"');
  });

  it('checks a MODIFIED that names the new header of a rename in the same delta', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Old name\nThe system SHALL do the old thing.\n\n#### Scenario: Kept\n- **WHEN** invoked\n- **THEN** it works\n\n#### Scenario: Dropped\n- **WHEN** retried\n- **THEN** it still works`
      )
    );
    const changeDir = await writeChange(
      'rename-then-modify',
      'widgets',
      `## RENAMED Requirements\n\n- FROM: \`### Requirement: Old name\`\n- TO: \`### Requirement: New name\`\n\n## MODIFIED Requirements\n\n### Requirement: New name\nThe system SHALL do the new thing.\n\n#### Scenario: Kept\n- **WHEN** invoked\n- **THEN** it works\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    expect(report.issues.map((i) => i.message).join('\n')).toContain('"Dropped"');
    expect(await archiveError(changeDir)).toContain('Dropped');
  });

  it('reads a CRLF main spec the same way archive does', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n#### Scenario: Second scenario\n- **WHEN** idle\n- **THEN** idle is reported`
      ).replace(/\n/g, '\r\n')
    );
    const changeDir = await writeChange(
      'crlf-drop',
      'widgets',
      `## MODIFIED Requirements\r\n\r\n### Requirement: Widget state\r\nThe system SHALL report the widget state.\r\n\r\n#### Scenario: Existing scenario\r\n- **WHEN** queried\r\n- **THEN** the state is reported\r\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    expect(report.issues.map((i) => i.message).join('\n')).toContain('"Second scenario"');
    expect(await archiveError(changeDir)).toContain('Second scenario');
  });

  it('runs no main-spec check when the caller passes no main specs directory', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n#### Scenario: Second scenario\n- **WHEN** idle\n- **THEN** idle is reported`
      )
    );
    const changeDir = await writeChange(
      'no-root',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n`
    );

    const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(true);
  });
});
