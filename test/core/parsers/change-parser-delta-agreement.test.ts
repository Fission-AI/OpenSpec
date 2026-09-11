import { describe, it, expect, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ChangeParser } from '../../../src/core/parsers/change-parser.js';
import { parseDeltaSpec } from '../../../src/core/parsers/requirement-blocks.js';
import type { Change } from '../../../src/core/schemas/index.js';
import { runCLI } from '../../helpers/run-cli.js';

/**
 * `openspec show --json --deltas-only` reads deltas through ChangeParser, while
 * `archive` applies them through parseDeltaSpec. The two used to disagree:
 *
 * - A REMOVED written in the bullet form was invisible to ChangeParser, so it
 *   fell back to the proposal's "What Changes" prose and reported an invented
 *   MODIFIED, while archive deleted the requirement.
 * - A repeated section header was read only once (the #1802 case).
 * - A RENAMED line written with `*` or `+` was dropped (the #1800 case).
 *
 * The inspection command OpenSpec recommends must report what archive applies.
 */

const PROPOSAL = [
  '# Edit billing',
  '',
  '## Why',
  'We need to keep the billing contract accurate for operators and customers over time.',
  '',
  '## What Changes',
  '- **billing**: updates billing requirements',
  '',
].join('\n');

const temps: string[] = [];
afterAll(async () => {
  await Promise.all(temps.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

/** Parse a change whose single delta spec, specs/billing/spec.md, is `delta`. */
async function parseChange(delta: string): Promise<Change> {
  const dir = await tempDir('openspec-change-deltas-');
  await fs.mkdir(path.join(dir, 'specs', 'billing'), { recursive: true });
  await fs.writeFile(path.join(dir, 'specs', 'billing', 'spec.md'), delta);
  return new ChangeParser(PROPOSAL, dir).parseChangeWithDeltas('edit');
}

const operations = (change: Change) => change.deltas.map((delta) => delta.operation);

describe('ChangeParser reads deltas the way archive applies them', () => {
  it('control: reads a header-form REMOVED as REMOVED', async () => {
    const change = await parseChange(
      ['## REMOVED Requirements', '', '### Requirement: Late Fees', '**Reason**: gone'].join('\n')
    );
    expect(operations(change)).toEqual(['REMOVED']);
  });

  for (const marker of ['-', '*', '+']) {
    it(`reads a bullet-form REMOVED written with "${marker}"`, async () => {
      const change = await parseChange(
        ['## REMOVED Requirements', '', `${marker} \`### Requirement: Late Fees\``].join('\n')
      );
      expect(operations(change)).toEqual(['REMOVED']);
      expect(change.deltas[0].spec).toBe('billing');
      expect(change.deltas[0].description).toContain('Late Fees');
    });
  }

  it('reports a bullet-form REMOVED exactly as the same removal written as a header', async () => {
    const bullet = await parseChange(['## REMOVED Requirements', '', '- `### Requirement: Late Fees`'].join('\n'));
    const header = await parseChange(['## REMOVED Requirements', '', '### Requirement: Late Fees'].join('\n'));
    expect(bullet.deltas).toEqual(header.deltas);
  });

  it('never invents a MODIFIED from the proposal prose for a bullet-form REMOVED', async () => {
    const change = await parseChange(['## REMOVED Requirements', '- `### Requirement: Late Fees`'].join('\n'));
    expect(operations(change)).not.toContain('MODIFIED');
    expect(change.deltas.map((delta) => delta.description)).not.toContain('updates billing requirements');
  });

  it('reads bullet and header REMOVED entries together, in document order', async () => {
    const change = await parseChange(
      [
        '## REMOVED Requirements',
        '',
        '- `### Requirement: Invoice Generation`',
        '',
        '### Requirement: Late Fees',
      ].join('\n')
    );
    expect(operations(change)).toEqual(['REMOVED', 'REMOVED']);
    expect(change.deltas[0].description).toContain('Invoice Generation');
    expect(change.deltas[1].description).toContain('Late Fees');
  });

  it('reads every copy of a repeated section header', async () => {
    const change = await parseChange(
      [
        '## ADDED Requirements',
        '### Requirement: Credit Notes',
        'The system SHALL issue a credit note when an invoice is voided.',
        '',
        '#### Scenario: Invoice voided',
        '- **WHEN** an invoice is voided',
        '- **THEN** a credit note is issued',
        '',
        '## REMOVED Requirements',
        '- `### Requirement: Late Fees`',
        '',
        '## ADDED Requirements',
        '### Requirement: Refunds',
        'The system SHALL refund a cancelled invoice.',
        '',
        '#### Scenario: Invoice cancelled',
        '- **WHEN** an invoice is cancelled',
        '- **THEN** a refund is issued',
        '',
        '## REMOVED Requirements',
        '- `### Requirement: Invoice Generation`',
      ].join('\n')
    );
    expect(operations(change)).toEqual(['ADDED', 'ADDED', 'REMOVED', 'REMOVED']);
    expect(change.deltas[0].requirement?.text).toBe('The system SHALL issue a credit note when an invoice is voided.');
    expect(change.deltas[1].requirement?.text).toBe('The system SHALL refund a cancelled invoice.');
    expect(change.deltas[1].requirement?.scenarios).toHaveLength(1);
  });

  for (const marker of ['*', '+']) {
    it(`reads a RENAMED pair written with "${marker}"`, async () => {
      const change = await parseChange(
        [
          '## RENAMED Requirements',
          `${marker} FROM: \`### Requirement: Late Fees\``,
          `${marker} TO: \`### Requirement: Overdue Penalties\``,
        ].join('\n')
      );
      expect(operations(change)).toEqual(['RENAMED']);
      expect(change.deltas[0].rename).toEqual({ from: 'Late Fees', to: 'Overdue Penalties' });
    });
  }

  it('reports the same entries, in the same numbers, as parseDeltaSpec', async () => {
    const delta = [
      '## ADDED Requirements',
      '### Requirement: Credit Notes',
      'The system SHALL issue a credit note when an invoice is voided.',
      '',
      '#### Scenario: Invoice voided',
      '- **WHEN** an invoice is voided',
      '- **THEN** a credit note is issued',
      '',
      '## MODIFIED Requirements',
      '### Requirement: Invoice Generation',
      'The system SHALL generate an invoice within one day of a completed billing period.',
      '',
      '#### Scenario: Period closes',
      '- **WHEN** a billing period closes',
      '- **THEN** an invoice is generated within one day',
      '',
      '## REMOVED Requirements',
      '+ `### Requirement: Late Fees`',
      '### Requirement: Paper Invoices',
      '**Reason**: replaced by email',
      '',
      '## RENAMED Requirements',
      '- FROM: `### Requirement: Refunds`',
      '- TO: `### Requirement: Refund Processing`',
      '',
      '## ADDED Requirements',
      '### Requirement: Dunning',
      'The system SHALL send a reminder for every overdue invoice.',
      '',
      '#### Scenario: Invoice overdue',
      '- **WHEN** an invoice becomes overdue',
      '- **THEN** a reminder is sent',
    ].join('\n');
    const plan = parseDeltaSpec(delta);
    const change = await parseChange(delta);
    const count = (operation: string) => operations(change).filter((op) => op === operation).length;

    expect(count('ADDED')).toBe(plan.added.length);
    expect(count('MODIFIED')).toBe(plan.modified.length);
    expect(count('REMOVED')).toBe(plan.removed.length);
    expect(count('RENAMED')).toBe(plan.renamed.length);
    expect(change.deltas).toHaveLength(6);
  });

  it('never reports proposal prose as a delta when the change has delta spec files', async () => {
    // A delta file whose sections hold no parseable entry: archive applies
    // nothing, so there is nothing to report.
    const change = await parseChange(['## ADDED Requirements', '', '- add credit notes'].join('\n'));
    expect(change.deltas).toEqual([]);
  });

  it('control: still reads the proposal prose when the change has no delta spec files', async () => {
    const dir = await tempDir('openspec-change-no-deltas-');
    const change = await new ChangeParser(PROPOSAL, dir).parseChangeWithDeltas('edit');
    expect(change.deltas).toEqual([
      { spec: 'billing', operation: 'MODIFIED', description: 'updates billing requirements' },
    ]);
  });
});

const SEED = [
  '## ADDED Requirements',
  '### Requirement: Invoice Generation',
  'The system SHALL generate an invoice for every completed billing period.',
  '',
  '#### Scenario: Period closes',
  '- **WHEN** a billing period closes',
  '- **THEN** an invoice is generated',
  '',
  '### Requirement: Late Fees',
  'The system SHALL apply a late fee to invoices overdue by 30 days.',
  '',
  '#### Scenario: Thirty days overdue',
  '- **WHEN** an invoice is 30 days overdue',
  '- **THEN** a late fee is applied',
  '',
].join('\n');

/**
 * A real project whose main billing spec was written by OpenSpec itself, by
 * archiving a seed change, plus an open `edit` change carrying `delta`.
 */
async function projectWithDelta(delta: string) {
  const base = await tempDir('openspec-show-deltas-e2e-');
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
  const writeChange = async (name: string, spec: string) => {
    expect((await cli(['new', 'change', name])).exitCode).toBe(0);
    const dir = path.join(project, 'openspec', 'changes', name);
    await fs.mkdir(path.join(dir, 'specs', 'billing'), { recursive: true });
    await fs.writeFile(path.join(dir, 'proposal.md'), PROPOSAL);
    await fs.writeFile(path.join(dir, 'tasks.md'), '## 1. Work\n- [x] 1.1 Done\n');
    await fs.writeFile(path.join(dir, 'specs', 'billing', 'spec.md'), spec);
  };

  expect((await cli(['init', '--tools', 'claude'])).exitCode).toBe(0);
  await writeChange('seed', SEED);
  expect((await cli(['archive', 'seed', '--yes'])).exitCode).toBe(0);
  await writeChange('edit', delta);

  const mainSpec = path.join(project, 'openspec', 'specs', 'billing', 'spec.md');
  return {
    cli,
    shownOperations: async () => {
      const result = await cli(['show', 'edit', '--json', '--deltas-only']);
      expect(result.exitCode).toBe(0);
      return (JSON.parse(result.stdout).deltas as Array<{ operation: string }>).map((d) => d.operation);
    },
    mainRequirements: async () =>
      (await fs.readFile(mainSpec, 'utf-8'))
        .split('\n')
        .filter((line) => line.startsWith('### Requirement:'))
        .map((line) => line.replace('### Requirement:', '').trim()),
  };
}

describe('show --json --deltas-only reports what archive applies (e2e)', () => {
  it('control: a header-form REMOVED is shown as REMOVED and archived as a removal', async () => {
    const project = await projectWithDelta(
      ['## REMOVED Requirements', '### Requirement: Late Fees', '**Reason**: no longer charged', ''].join('\n')
    );
    expect(await project.shownOperations()).toEqual(['REMOVED']);
    expect((await project.cli(['archive', 'edit', '--yes'])).exitCode).toBe(0);
    expect(await project.mainRequirements()).toEqual(['Invoice Generation']);
  }, 120_000);

  it('a bullet-form REMOVED is shown as the removal archive performs', async () => {
    const project = await projectWithDelta(['## REMOVED Requirements', '- `### Requirement: Late Fees`', ''].join('\n'));
    const shown = await project.shownOperations();

    expect((await project.cli(['archive', 'edit', '--yes'])).exitCode).toBe(0);
    expect(await project.mainRequirements()).toEqual(['Invoice Generation']);
    expect(shown).toEqual(['REMOVED']);
  }, 120_000);
});
