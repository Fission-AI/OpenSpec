import { describe, it, expect, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { scenarioStepCoverage } from '../../src/core/parsers/requirement-text.js';
import { Validator } from '../../src/core/validation/validator.js';
import { runCLI } from '../helpers/run-cli.js';

/**
 * A scenario whose steps assert nothing — only AND lines, or plain prose —
 * passes every gate: it counts as a scenario, it archives, and it lands in the
 * main spec. Yet it can never fail a test built from it: nothing triggers it
 * (no WHEN/GIVEN) and nothing is asserted (no THEN). The empty-body case is
 * #1857's; this file covers the one level deeper: the body exists, but it is
 * not a scenario.
 *
 * The check is a WARNING, the missing-SHALL/MUST posture: plain `validate` and
 * `archive` keep agreeing, and `--strict` — which fails on any warning — is
 * the bar that enforces it.
 */

const REQUIREMENT_TEXT = 'The system SHALL issue a credit note when an invoice is voided.';

const scenario = (name: string, ...steps: string[]) => [`#### Scenario: ${name}`, ...steps];

const WITH_STEPS = scenario(
  'Invoice voided',
  '- **WHEN** an invoice is voided',
  '- **THEN** a credit note is issued'
);

const ONLY_AND = scenario('Invoice voided', '- **AND** the ledger is balanced');

const NO_OUTCOME = scenario(
  'Invoice voided',
  '- **WHEN** an invoice is voided',
  '- **AND** the ledger is balanced'
);

describe('scenarioStepCoverage reads only real steps', () => {
  it('finds the trigger and the outcome in a normal scenario', () => {
    expect(scenarioStepCoverage(WITH_STEPS.join('\n'))).toEqual({
      hasTrigger: true,
      hasOutcome: true,
    });
  });

  it('accepts GIVEN as the trigger half', () => {
    const raw = scenario('Voided', '- **GIVEN** a voided invoice', '- **THEN** a credit note is issued').join('\n');
    expect(scenarioStepCoverage(raw)).toEqual({ hasTrigger: true, hasOutcome: true });
  });

  it('accepts bolded title-case keywords: **When** is a step, not prose', () => {
    const raw = scenario('Wrapped', '**Given** a request', '**When** it is handled', '**Then** the behavior occurs').join('\n');
    expect(scenarioStepCoverage(raw)).toEqual({ hasTrigger: true, hasOutcome: true });
  });

  it('accepts a colon inside the bold: **Given:** is a step', () => {
    const raw = scenario('Labeled', '- **Given:** a request', '- **When:** it is handled', '- **Then:** the behavior occurs').join('\n');
    expect(scenarioStepCoverage(raw)).toEqual({ hasTrigger: true, hasOutcome: true });
  });

  it('AND lines carry neither half', () => {
    expect(scenarioStepCoverage(ONLY_AND.join('\n'))).toEqual({
      hasTrigger: false,
      hasOutcome: false,
    });
  });

  it('sees a missing outcome with the trigger present', () => {
    expect(scenarioStepCoverage(NO_OUTCOME.join('\n'))).toEqual({
      hasTrigger: true,
      hasOutcome: false,
    });
  });

  it('ignores keywords inside a fenced example: documentation, not steps', () => {
    const raw = [
      '#### Scenario: Invoice voided',
      '```text',
      'WHEN voided THEN a credit note is issued',
      '```',
    ].join('\n');
    expect(scenarioStepCoverage(raw)).toEqual({ hasTrigger: false, hasOutcome: false });
  });

  it('ignores the scenario header itself: a name is not a step', () => {
    const raw = ['#### Scenario: What happens THEN', '- **WHEN** an invoice is voided'].join('\n');
    expect(scenarioStepCoverage(raw)).toEqual({ hasTrigger: true, hasOutcome: false });
  });

  it('matches uppercase keywords only, the containsShallOrMust convention', () => {
    const raw = scenario('Voided', '- when an invoice is voided', '- then a credit note is issued').join('\n');
    expect(scenarioStepCoverage(raw)).toEqual({ hasTrigger: false, hasOutcome: false });
  });
});

const temps: string[] = [];
afterAll(async () => {
  await Promise.all(temps.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

/** A temp directory removed after the suite, so no test leaks one on failure. */
async function tempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

const deltaSpec = (section: 'ADDED' | 'MODIFIED', ...scenarios: string[]) =>
  [`## ${section} Requirements`, '### Requirement: Credit Notes', REQUIREMENT_TEXT, '', ...scenarios, ''].join(
    '\n'
  );

/** Write `delta` as change `edit`'s billing delta and validate it. */
async function validateDelta(delta: string, strict = false) {
  const changeDir = await tempDir('openspec-scenario-steps-');
  await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
  await fs.writeFile(path.join(changeDir, 'specs', 'billing', 'spec.md'), delta);
  return new Validator(strict).validateChangeDeltaSpecs(changeDir);
}

const stepWarnings = (report: { issues: Array<{ level: string; message: string }> }) =>
  report.issues.filter((issue) => issue.level === 'WARNING' && issue.message.includes('is missing a'));

describe('validate warns about a scenario that asserts nothing', () => {
  it('control: a scenario with WHEN and THEN draws no step warning', async () => {
    const report = await validateDelta(deltaSpec('ADDED', WITH_STEPS.join('\n')));
    expect(report.valid).toBe(true);
    expect(stepWarnings(report)).toEqual([]);
  });

  for (const section of ['ADDED', 'MODIFIED'] as const) {
    it(`names the ${section} requirement and the scenario, and says both halves are missing`, async () => {
      const report = await validateDelta(deltaSpec(section, ONLY_AND.join('\n')));
      expect(report.valid).toBe(true); // a warning, not a verdict change
      const warnings = stepWarnings(report);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toContain(`${section} "Credit Notes"`);
      expect(warnings[0].message).toContain('"Invoice voided"');
      expect(warnings[0].message).toContain('a WHEN/GIVEN step and a THEN step');
    });

    it(`fails --strict for ${section}`, async () => {
      const report = await validateDelta(deltaSpec(section, ONLY_AND.join('\n')), true);
      expect(report.valid).toBe(false);
    });
  }

  it('reports only the half that is missing', async () => {
    const report = await validateDelta(deltaSpec('ADDED', NO_OUTCOME.join('\n')));
    const warnings = stepWarnings(report);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('is missing a THEN step');
    expect(warnings[0].message).not.toContain('WHEN/GIVEN');
  });

  it('warns about one scenario, not the requirement, when its sibling is fine', async () => {
    const report = await validateDelta(deltaSpec('ADDED', WITH_STEPS.join('\n'), '', ONLY_AND.join('\n')));
    const warnings = stepWarnings(report);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('"Invoice voided"');
  });

  it('does not stack on the empty-body error: that hint already says what to add', async () => {
    const report = await validateDelta(deltaSpec('ADDED', '#### Scenario: Invoice voided'));
    expect(report.issues.filter((issue) => issue.message.includes('is missing a'))).toEqual([]);
    expect(report.valid).toBe(false); // the empty-body ERROR still fails it
  });

  it('treats a fenced-only body as steps-less: an example is documentation', async () => {
    const raw = ['#### Scenario: Invoice voided', '```text', 'WHEN voided THEN a credit note is issued', '```'].join(
      '\n'
    );
    const report = await validateDelta(deltaSpec('ADDED', raw));
    expect(stepWarnings(report)).toHaveLength(1);
  });

  it('leaves an unlabeled level-4 child alone: #### Notes is prose on purpose', async () => {
    const raw = ['#### Notes', 'The spec path counts every level-4 child as a scenario.'].join('\n');
    const report = await validateDelta(deltaSpec('ADDED', raw), true);
    expect(stepWarnings(report)).toEqual([]);
    expect(report.valid).toBe(true);
  });
});

describe('the main-spec path reports the same finding', () => {
  /** Render a billing spec whose single requirement carries these scenarios. */
  async function validateSpecContent(scenarios: string[]) {
    const content = [
      '# billing Specification',
      '',
      '## Purpose',
      'Define how billing documents are issued for these tests.',
      '',
      '## Requirements',
      '',
      '### Requirement: Credit Notes',
      REQUIREMENT_TEXT,
      '',
      ...scenarios,
      '',
    ].join('\n');
    return new Validator().validateSpecContent('billing', content);
  }

  it('warns, naming the requirement and the scenario, without failing the report', async () => {
    const report = await validateSpecContent(ONLY_AND);
    expect(report.valid).toBe(true);
    const warnings = stepWarnings(report);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('Requirement "Credit Notes"');
    expect(warnings[0].message).toContain('"Invoice voided"');
    expect(warnings[0].path).toBe('requirements[0].scenarios');
  });

  it('control: a scenario with steps draws no warning on the spec path either', async () => {
    const report = await validateSpecContent(WITH_STEPS);
    expect(stepWarnings(report)).toEqual([]);
  });
});

/**
 * The e2e point is the verdict triple: `--strict` now refuses a step-less
 * scenario, while plain `validate` and `archive` still accept it — the same
 * agreement #1857 established, kept for a finding archive has no opinion on.
 */
describe('validate and archive verdicts (e2e)', () => {
  /** Init a throwaway project (isolated HOME) and return its CLI runner. */
  async function projectWithScenarios(scenarios: string[]) {
    const base = await tempDir('openspec-scenario-steps-e2e-');
    const home = path.join(base, 'home');
    const project = path.join(base, 'project');
    await fs.mkdir(home, { recursive: true });
    await fs.mkdir(project, { recursive: true });
    const env = {
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      XDG_DATA_HOME: path.join(home, '.local', 'share'),
      OPENSPEC_NO_ANIMATION: '1',
    };
    const cli = (args: string[]) => runCLI(args, { cwd: project, env, timeoutMs: 60_000 });

    expect((await cli(['init', '--tools', 'claude'])).exitCode).toBe(0);
    expect((await cli(['new', 'change', 'edit'])).exitCode).toBe(0);
    const dir = path.join(project, 'openspec', 'changes', 'edit');
    await fs.mkdir(path.join(dir, 'specs', 'billing'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'proposal.md'),
      '# Credit notes\n\n## Why\nVoided invoices need a matching credit note so the ledger always balances.\n\n## What Changes\n- **billing**: adds credit notes\n'
    );
    await fs.writeFile(path.join(dir, 'tasks.md'), '## 1. Work\n- [x] 1.1 Done\n');
    await fs.writeFile(path.join(dir, 'specs', 'billing', 'spec.md'), deltaSpec('ADDED', ...scenarios));

    return {
      verdicts: async () => {
        const plain = JSON.parse((await cli(['validate', 'edit', '--json'])).stdout);
        const strict = JSON.parse((await cli(['validate', 'edit', '--strict', '--json'])).stdout);
        const archived = await cli(['archive', 'edit', '--yes']);
        return {
          valid: plain.items[0].valid as boolean,
          strictValid: strict.items[0].valid as boolean,
          archived: archived.exitCode === 0,
        };
      },
    };
  }

  it('control: a scenario with steps is valid everywhere and archives', async () => {
    const project = await projectWithScenarios([WITH_STEPS.join('\n')]);
    expect(await project.verdicts()).toEqual({ valid: true, strictValid: true, archived: true });
  }, 120_000);

  it('a step-less scenario: --strict refuses, plain validate and archive accept', async () => {
    const project = await projectWithScenarios([ONLY_AND.join('\n')]);
    expect(await project.verdicts()).toEqual({ valid: true, strictValid: false, archived: true });
  }, 120_000);
});
