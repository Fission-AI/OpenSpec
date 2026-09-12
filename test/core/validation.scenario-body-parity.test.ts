import { describe, it, expect, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { countScenarios } from '../../src/core/parsers/requirement-text.js';
import { MarkdownParser } from '../../src/core/parsers/markdown-parser.js';
import { Validator } from '../../src/core/validation/validator.js';
import { runCLI } from '../helpers/run-cli.js';

/**
 * A scenario header with nothing under it used to pass `validate` and then fail
 * `archive`. The delta counter (countScenarios) counted every `####` header,
 * while the spec path (MarkdownParser.parseScenarios) keeps a scenario only
 * when its body has content. Archive validates the rebuilt spec on the spec
 * path, so it refused a change `validate` had just called valid.
 *
 * The point of these tests is parity: for every scenario shape, both counters
 * return the same number, and `validate` accepts exactly what `archive` applies.
 */

const REQUIREMENT_TEXT = 'The system SHALL issue a credit note when an invoice is voided.';

const CASES: Array<{ name: string; scenarios: string[]; expected: number }> = [
  {
    name: 'a scenario with steps',
    scenarios: ['#### Scenario: Invoice voided', '- **WHEN** an invoice is voided', '- **THEN** a credit note is issued'],
    expected: 1,
  },
  { name: 'a scenario header with no body', scenarios: ['#### Scenario: Invoice voided'], expected: 0 },
  {
    name: 'a scenario whose body is only blank and whitespace lines',
    scenarios: ['#### Scenario: Invoice voided', '', '   ', '\t'],
    expected: 0,
  },
  {
    name: 'two scenarios, one of them empty',
    scenarios: [
      '#### Scenario: Not written yet',
      '',
      '#### Scenario: Invoice voided',
      '- **WHEN** an invoice is voided',
      '- **THEN** a credit note is issued',
    ],
    expected: 1,
  },
  {
    name: 'a scenario whose body is only a fenced block',
    scenarios: ['#### Scenario: Invoice voided', '```text', 'WHEN voided THEN a credit note is issued', '```'],
    expected: 1,
  },
  { name: 'a closed scenario header with no body', scenarios: ['#### Scenario: Invoice voided ####'], expected: 0 },
  {
    name: 'a closed scenario header with steps',
    scenarios: ['#### Scenario: Invoice voided ####', '- **WHEN** an invoice is voided', '- **THEN** a credit note is issued'],
    expected: 1,
  },
  {
    name: 'a scenario whose body is only a deeper header',
    scenarios: ['#### Scenario: Invoice voided', '##### Notes'],
    expected: 1,
  },
  {
    name: 'a scenario header inside a fenced example',
    scenarios: ['```markdown', '#### Scenario: Example', '- **WHEN** x', '```'],
    expected: 0,
  },
];

/** The requirement block's lines after its `### Requirement:` header. */
const deltaBodyLines = (scenarios: string[]) => [REQUIREMENT_TEXT, '', ...scenarios];

/** How many scenarios the spec path keeps for the same requirement. */
function specPathScenarioCount(scenarios: string[]): number {
  const spec = [
    '# billing Specification',
    '',
    '## Purpose',
    'Define how billing documents are issued for these tests.',
    '',
    '## Requirements',
    '',
    '### Requirement: Credit Notes',
    ...deltaBodyLines(scenarios),
    '',
  ].join('\n');
  return new MarkdownParser(spec).parseSpec('billing').requirements[0].scenarios.length;
}

describe('scenario counting: delta path and spec path agree', () => {
  for (const { name, scenarios, expected } of CASES) {
    it(`counts ${name} the same on both paths`, () => {
      expect(specPathScenarioCount(scenarios)).toBe(expected);
      expect(countScenarios(deltaBodyLines(scenarios))).toBe(expected);
    });
  }
});

const temps: string[] = [];
afterAll(async () => {
  await Promise.all(temps.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

const deltaSpec = (section: 'ADDED' | 'MODIFIED', scenarios: string[]) =>
  [`## ${section} Requirements`, '### Requirement: Credit Notes', ...deltaBodyLines(scenarios), ''].join('\n');

describe('validate rejects a requirement whose only scenario is empty', () => {
  async function validateDelta(delta: string) {
    const changeDir = await tempDir('openspec-scenario-body-');
    await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
    await fs.writeFile(path.join(changeDir, 'specs', 'billing', 'spec.md'), delta);
    return new Validator().validateChangeDeltaSpecs(changeDir);
  }

  const scenarioErrors = (report: { issues: Array<{ level: string; message: string }> }) =>
    report.issues.filter((issue) => issue.level === 'ERROR' && issue.message.includes('scenario'));

  it('control: accepts a scenario with steps', async () => {
    const report = await validateDelta(deltaSpec('ADDED', CASES[0].scenarios));
    expect(report.valid).toBe(true);
  });

  for (const section of ['ADDED', 'MODIFIED'] as const) {
    it(`rejects a ${section} requirement whose only scenario has no body, naming it`, async () => {
      const report = await validateDelta(deltaSpec(section, ['#### Scenario: Invoice voided']));
      expect(report.valid).toBe(false);
      const errors = scenarioErrors(report);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain(`${section} "Credit Notes"`);
      // Say why a header the author can see does not count.
      expect(errors[0].message).toMatch(/no body|nothing under/i);
    });
  }

  it('rejects a scenario whose body is only whitespace', async () => {
    const report = await validateDelta(deltaSpec('ADDED', ['#### Scenario: Invoice voided', '   ', '\t']));
    expect(report.valid).toBe(false);
  });

  it('accepts two scenarios when only one is empty, as archive does', async () => {
    const report = await validateDelta(deltaSpec('ADDED', CASES[3].scenarios));
    expect(scenarioErrors(report)).toEqual([]);
  });
});

/**
 * A real project, created with `openspec init` and `openspec new change`, whose
 * change `edit` adds a Credit Notes requirement with the given scenarios.
 */
async function projectWithScenarios(scenarios: string[]) {
  const base = await tempDir('openspec-scenario-body-e2e-');
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
  await fs.writeFile(path.join(dir, 'specs', 'billing', 'spec.md'), deltaSpec('ADDED', scenarios));

  return {
    verdicts: async () => {
      const validated = JSON.parse((await cli(['validate', 'edit', '--json'])).stdout);
      const archived = await cli(['archive', 'edit', '--yes']);
      return { valid: validated.items[0].valid as boolean, archived: archived.exitCode === 0 };
    },
  };
}

describe('validate and archive give the same verdict (e2e)', () => {
  it('control: a scenario with steps is valid and archives', async () => {
    const project = await projectWithScenarios(CASES[0].scenarios);
    expect(await project.verdicts()).toEqual({ valid: true, archived: true });
  }, 120_000);

  it('a scenario header with no body is rejected by both', async () => {
    const project = await projectWithScenarios(['#### Scenario: Invoice voided']);
    expect(await project.verdicts()).toEqual({ valid: false, archived: false });
  }, 120_000);

  it('two scenarios where one is empty are accepted by both', async () => {
    const project = await projectWithScenarios(CASES[3].scenarios);
    expect(await project.verdicts()).toEqual({ valid: true, archived: true });
  }, 120_000);
});
