import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  /** Two scenarios in the main spec; the delta below keeps only the first. */
  const TWO_SCENARIO_REQUIREMENT = `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n#### Scenario: Second scenario\n- **WHEN** idle\n- **THEN** idle is reported`;
  const DELTA_KEEPING_ONE = `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n`;

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

  /** The scenario-loss issue, so assertions cannot pass on an unrelated error. */
  const lossIssue = (report: { issues: Array<{ level: string; path: string; message: string }> }) =>
    report.issues.find((i) => i.message.includes('omits scenario(s)'));

  const validate = (changeDir: string) =>
    new Validator(true).validateChangeDeltaSpecs(changeDir, { mainSpecsDir });

  /**
   * What archive would do with the same change: null when it applies cleanly.
   * It shares the comparison itself with the validator (that is the point of the
   * refactor), so what it cross-checks is the layer above: spec discovery, which
   * requirement block the MODIFIED lands on, and archive's operation order.
   */
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
      mainSpec(TWO_SCENARIO_REQUIREMENT)
    );
    const changeDir = await writeChange(
      'rename-scenario',
      'widgets',
      DELTA_KEEPING_ONE
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    const issue = report.issues.find((i) => i.message.includes('omits scenario(s)'));
    expect(issue?.level).toBe('ERROR');
    expect(issue?.path).toBe('widgets/spec.md');
    expect(issue?.message).toContain('MODIFIED "Widget state"');
    expect(issue?.message).toContain('"Second scenario"');
    // Parity: archive refuses this change today, naming the same scenario.
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
    expect(lossIssue(report)?.message).toContain('"Repeated"');
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
    expect(lossIssue(report)?.message).toContain('"Dropped"');
    expect(await archiveError(changeDir)).toContain('Dropped');
  });

  it('follows a chain of renames back to the block the main spec still holds', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Alpha\nThe system SHALL do the alpha thing.\n\n#### Scenario: Kept\n- **WHEN** invoked\n- **THEN** it works\n\n#### Scenario: Dropped\n- **WHEN** retried\n- **THEN** it still works`
      )
    );
    const changeDir = await writeChange(
      'rename-chain',
      'widgets',
      `## RENAMED Requirements\n\n- FROM: \`### Requirement: Alpha\`\n- TO: \`### Requirement: Bravo\`\n- FROM: \`### Requirement: Bravo\`\n- TO: \`### Requirement: Charlie\`\n\n## MODIFIED Requirements\n\n### Requirement: Charlie\nThe system SHALL do the charlie thing.\n\n#### Scenario: Kept\n- **WHEN** invoked\n- **THEN** it works\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    expect(lossIssue(report)?.message).toContain('"Dropped"');
    expect(await archiveError(changeDir)).toContain('Dropped');
  });

  it('reads a CRLF main spec the same way archive does', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(TWO_SCENARIO_REQUIREMENT).replace(/\n/g, '\r\n')
    );
    const changeDir = await writeChange(
      'crlf-drop',
      'widgets',
      `## MODIFIED Requirements\r\n\r\n### Requirement: Widget state\r\nThe system SHALL report the widget state.\r\n\r\n#### Scenario: Existing scenario\r\n- **WHEN** queried\r\n- **THEN** the state is reported\r\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    expect(lossIssue(report)?.message).toContain('"Second scenario"');
    expect(await archiveError(changeDir)).toContain('Second scenario');
  });

  it('runs no main-spec check when the caller passes no main specs directory', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(TWO_SCENARIO_REQUIREMENT)
    );
    const changeDir = await writeChange(
      'no-root',
      'widgets',
      DELTA_KEEPING_ONE
    );

    const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(true);
  });

  it('fails the change in the default (non-strict) mode too', async () => {
    // --strict is opt-in, so the shipped default is the mode that matters most.
    await writeMainSpec('widgets', mainSpec(TWO_SCENARIO_REQUIREMENT));
    const changeDir = await writeChange('non-strict', 'widgets', DELTA_KEEPING_ONE);

    const report = await new Validator(false).validateChangeDeltaSpecs(changeDir, { mainSpecsDir });

    expect(report.valid).toBe(false);
    expect(lossIssue(report)?.level).toBe('ERROR');
  });

  it('terminates on a rename cycle instead of walking it forever', async () => {
    // Two guards keep the rename walk out of a cycle (the rename-away skip and
    // the visited set). A hang here is unrecoverable — it blocks the event loop,
    // so no test timeout can interrupt it — which is why the input is pinned.
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Untouched\nThe system SHALL do the untouched thing.\n\n#### Scenario: Only\n- **WHEN** invoked\n- **THEN** it works`
      )
    );
    const changeDir = await writeChange(
      'rename-cycle',
      'widgets',
      `## RENAMED Requirements\n\n- FROM: \`### Requirement: Alpha\`\n- TO: \`### Requirement: Bravo\`\n- FROM: \`### Requirement: Bravo\`\n- TO: \`### Requirement: Alpha\`\n\n## MODIFIED Requirements\n\n### Requirement: Alpha\nThe system SHALL do the alpha thing.\n\n#### Scenario: Only\n- **WHEN** invoked\n- **THEN** it works\n`
    );

    const report = await validate(changeDir);

    expect(report).toBeDefined();
    expect(lossIssue(report)).toBeUndefined();
  });

  it('ignores a fenced scenario sample inside the MODIFIED block itself', async () => {
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n#### Scenario: Second scenario\n- **WHEN** idle\n- **THEN** idle is reported`
      )
    );
    // The delta quotes "Second scenario" inside a fence; a fenced sample is not
    // a scenario, so it must not satisfy the requirement to carry it over.
    const changeDir = await writeChange(
      'fenced-in-delta',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n\`\`\`markdown\n#### Scenario: Second scenario\n- **WHEN** idle\n- **THEN** idle is reported\n\`\`\`\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    expect(lossIssue(report)?.message).toContain('"Second scenario"');
    expect(await archiveError(changeDir)).toContain('Second scenario');
  });

  it('says so when the main spec exists but cannot be read', async () => {
    // A directory where spec.md belongs reads as EISDIR: not absent, and archive
    // aborts on it, so reporting beats calling the change valid.
    await fs.mkdir(path.join(mainSpecsDir, 'widgets', 'spec.md'), { recursive: true });
    const changeDir = await writeChange('unreadable-main-spec', 'widgets', DELTA_KEEPING_ONE);

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    const issue = report.issues.find((i) => i.message.includes('Could not read'));
    expect(issue?.level).toBe('ERROR');
    expect(issue?.message).toContain('widgets/spec.md');
    expect(issue?.message).toContain('EISDIR');
    expect(await archiveError(changeDir)).not.toBeNull();
  });

  it('stays silent on a read error that says nothing about the file', async () => {
    // A resource error (EMFILE and friends) means the process is busy, not that
    // the change is wrong - `validate --all` reads six changes at once, so it
    // must not turn one into a verdict.
    await writeMainSpec('widgets', mainSpec(TWO_SCENARIO_REQUIREMENT));
    const changeDir = await writeChange('transient-read-error', 'widgets', DELTA_KEEPING_ONE);
    // Only the main spec read fails: the delta must still be read, or the check
    // never runs and the test proves nothing.
    const mainSpecFile = path.join(mainSpecsDir, 'widgets', 'spec.md');
    const readFile = fs.readFile;
    const spy = vi.spyOn(fs, 'readFile').mockImplementation(async (file, ...rest) => {
      if (String(file) === mainSpecFile) {
        throw Object.assign(new Error('EMFILE: too many open files'), { code: 'EMFILE' });
      }
      return (readFile as unknown as typeof fs.readFile)(file, ...(rest as []));
    });

    try {
      const report = await validate(changeDir);
      expect(spy.mock.calls.some(([file]) => String(file) === mainSpecFile)).toBe(true);
      expect(report.issues.some((i) => i.message.includes('Could not read'))).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('detects a dropped level-4 scenario whose header is not labeled "Scenario:"', async () => {
    // The spec path (SCENARIO_HEADER / countScenarios) counts EVERY `#### `
    // child of a requirement as a scenario, so archive replaces the whole block
    // and drops an unlabeled `#### Edge case`. The loss check must see it too,
    // or the drop is silent (validate passes, archive deletes it with no error).
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n#### Edge case\n- **WHEN** disabled\n- **THEN** nothing is reported`
      )
    );
    const changeDir = await writeChange(
      'drop-unlabeled-scenario',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    expect(lossIssue(report)?.message).toContain('"Edge case"');
    // Parity: archive refuses the same change, naming the same scenario.
    expect(await archiveError(changeDir)).toContain('Edge case');
  });

  it('detects a dropped labeled scenario even when an unlabeled sibling is kept', async () => {
    // The reverse of the case above: labels and non-labels are counted the same
    // way, in both directions, so dropping the labeled one is still caught.
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Labeled\n- **WHEN** queried\n- **THEN** the state is reported\n\n#### Unlabeled\n- **WHEN** idle\n- **THEN** idle is reported`
      )
    );
    const changeDir = await writeChange(
      'drop-labeled-keep-unlabeled',
      'widgets',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Unlabeled\n- **WHEN** idle\n- **THEN** idle is reported\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    expect(lossIssue(report)?.message).toContain('"Labeled"');
    expect(await archiveError(changeDir)).toContain('Labeled');
  });

  it('does not name scenarios for a MODIFIED the same delta renames away', async () => {
    // The block this MODIFIED would land on is not the one it names, so any
    // scenario reported here would send the author after the wrong requirement.
    // The contradiction itself is still reported by the RENAMED/MODIFIED check.
    await writeMainSpec(
      'widgets',
      mainSpec(
        `### Requirement: Old name\nThe system SHALL do the old thing.\n\n#### Scenario: Kept\n- **WHEN** invoked\n- **THEN** it works\n\n#### Scenario: Dropped\n- **WHEN** retried\n- **THEN** it still works`
      )
    );
    const changeDir = await writeChange(
      'modifies-renamed-away',
      'widgets',
      `## RENAMED Requirements\n\n- FROM: \`### Requirement: Old name\`\n- TO: \`### Requirement: New name\`\n\n## MODIFIED Requirements\n\n### Requirement: Old name\nThe system SHALL do the old thing.\n\n#### Scenario: Kept\n- **WHEN** invoked\n- **THEN** it works\n`
    );

    const report = await validate(changeDir);

    expect(report.valid).toBe(false);
    expect(lossIssue(report)).toBeUndefined();
    expect(report.issues.map((i) => i.message).join('\n')).toContain('MODIFIED references old name from RENAMED');
  });
});
