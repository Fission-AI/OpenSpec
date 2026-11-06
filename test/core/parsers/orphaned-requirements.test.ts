import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { isUnrecognizedDeltaSection, parseDeltaSpec } from '../../../src/core/parsers/requirement-blocks.js';
import { buildUpdatedSpec, findSpecUpdates } from '../../../src/core/specs-apply.js';
import { Validator } from '../../../src/core/validation/validator.js';

/**
 * A canonical `### Requirement:` block written outside every delta section is
 * ignored by the reader. It used to be ignored in complete silence, which is
 * inconsistent with the adjacent mistake: a non-canonical `###` header INSIDE a
 * delta section has been reported as INFO since #498. The well-formed block in
 * the wrong place - the costlier error, because it reads exactly like one that
 * would apply - said nothing at all.
 */
describe('parseDeltaSpec (requirements outside delta sections)', () => {
  it('reports a requirement under an unrecognised section', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '### Requirement: Applied',
        'a',
        '',
        '## Notes',
        '### Requirement: Ignored',
        'b',
      ].join('\n')
    );

    expect(plan.added.map((b) => b.name)).toEqual(['Applied']);
    expect(plan.orphanedRequirements).toEqual([
      { name: 'Ignored', section: 'Notes', line: 6 },
    ]);
  });

  it('reports a requirement written above the first section', () => {
    const plan = parseDeltaSpec(
      ['### Requirement: Stray', 'a', '', '## ADDED Requirements', '### Requirement: Applied', 'b'].join(
        '\n'
      )
    );

    expect(plan.added.map((b) => b.name)).toEqual(['Applied']);
    expect(plan.orphanedRequirements).toEqual([
      { name: 'Stray', section: null, line: 1 },
    ]);
  });

  it('reports a requirement under a misspelled delta header', () => {
    const plan = parseDeltaSpec(
      ['## Add Requirements', '### Requirement: Typo Section', 'a'].join('\n')
    );

    expect(plan.added).toEqual([]);
    expect(plan.orphanedRequirements).toEqual([
      { name: 'Typo Section', section: 'Add Requirements', line: 2 },
    ]);
  });

  it('reports several orphans in document order', () => {
    const plan = parseDeltaSpec(
      [
        '## Notes',
        '### Requirement: One',
        '## ADDED Requirements',
        '### Requirement: Applied',
        '## Context',
        '### Requirement: Two',
      ].join('\n')
    );

    expect(plan.orphanedRequirements.map((o) => [o.name, o.line])).toEqual([
      ['One', 2],
      ['Two', 6],
    ]);
  });

  it('reports nothing when every requirement sits in a delta section', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '### Requirement: A',
        'a',
        '## MODIFIED Requirements',
        '### Requirement: B',
        'b',
        '## REMOVED Requirements',
        '### Requirement: C',
        '## RENAMED Requirements',
        '- FROM: `### Requirement: D`',
        '- TO: `### Requirement: E`',
      ].join('\n')
    );

    expect(plan.orphanedRequirements).toEqual([]);
  });

  it('accepts every casing of the delta headers without reporting', () => {
    const plan = parseDeltaSpec(
      ['## added requirements', '### Requirement: A', '## Modified Requirements', '### Requirement: B'].join(
        '\n'
      )
    );
    expect(plan.orphanedRequirements).toEqual([]);
  });

  it('does not report a requirement shown inside a code fence', () => {
    const plan = parseDeltaSpec(
      [
        '## Notes',
        'An example of the format:',
        '',
        '```markdown',
        '### Requirement: Just An Example',
        '```',
      ].join('\n')
    );

    expect(plan.orphanedRequirements).toEqual([]);
  });

  it('does not report a delta section that legitimately has a Purpose above it', () => {
    const plan = parseDeltaSpec(
      [
        '## Purpose',
        'Describes a brand new capability.',
        '',
        '## ADDED Requirements',
        '### Requirement: A',
        'a',
      ].join('\n')
    );

    expect(plan.orphanedRequirements).toEqual([]);
  });

  it('reports a requirement under a header the reader does not match exactly', () => {
    // The reader folds only case, so a doubled space is not a delta section to
    // it. Treating the header as one here would drop the block silently again.
    const plan = parseDeltaSpec(
      ['## ADDED  Requirements', '### Requirement: Spaced', 'a'].join('\n')
    );

    expect(plan.added).toEqual([]);
    expect(plan.orphanedRequirements).toEqual([
      { name: 'Spaced', section: 'ADDED  Requirements', line: 2 },
    ]);
  });

  it('does not report requirements under a repeated delta header', () => {
    const plan = parseDeltaSpec(
      [
        '## ADDED Requirements',
        '### Requirement: First',
        'a',
        '',
        '## Notes',
        'prose only',
        '',
        '## ADDED Requirements',
        '### Requirement: Second',
        'b',
      ].join('\n')
    );

    expect(plan.added.map((b) => b.name)).toEqual(['First', 'Second']);
    expect(plan.orphanedRequirements).toEqual([]);
  });
});

describe('buildUpdatedSpec (requirements outside delta sections)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-orphan-req-'));
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const MAIN_SPEC = [
    '# billing Specification',
    '',
    '## Purpose',
    'Defines how billing behaves for customers and operators.',
    '',
    '## Requirements',
    '### Requirement: Invoice Generation',
    'The system SHALL generate an invoice for every completed billing period.',
    '',
    '#### Scenario: Period closes',
    '- **WHEN** a billing period closes',
    '- **THEN** an invoice is generated',
    '',
  ].join('\n');

  /**
   * Write a main spec and a delta into a temp project, then run the merge and
   * return its result without touching any real project.
   */
  async function build(deltaBody: string) {
    const specsRoot = path.join(tempDir, 'openspec', 'specs');
    const specsDir = path.join(specsRoot, 'billing');
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 'spec.md'), MAIN_SPEC);
    await fs.writeFile(path.join(changeDir, 'specs', 'billing', 'spec.md'), deltaBody);
    const [update] = await findSpecUpdates(changeDir, specsRoot);
    return buildUpdatedSpec(update, 'c', { silent: true });
  }

  it('warns rather than silently dropping the requirement', async () => {
    const built = await build(
      [
        '## ADDED Requirements',
        '### Requirement: Dunning Notices',
        'The system SHALL send a dunning notice when an invoice is 7 days overdue.',
        '',
        '#### Scenario: Invoice overdue',
        '- **WHEN** a',
        '- **THEN** b',
        '',
        '## Notes',
        '### Requirement: Credit Notes',
        'The system SHALL issue a credit note when an invoice is voided.',
      ].join('\n')
    );

    expect(built.warnings.some((w) => w.includes('Credit Notes'))).toBe(true);
    expect(built.warnings.some((w) => w.includes('## Notes'))).toBe(true);
    // Behaviour is unchanged: the orphan is still not applied, only reported.
    expect(built.rebuilt).not.toContain('### Requirement: Credit Notes');
    expect(built.rebuilt).toContain('### Requirement: Dunning Notices');
  });

  it('emits no such warning for a well-formed delta', async () => {
    const built = await build(
      [
        '## ADDED Requirements',
        '### Requirement: Dunning Notices',
        'The system SHALL send a dunning notice.',
        '',
        '#### Scenario: Invoice overdue',
        '- **WHEN** a',
        '- **THEN** b',
      ].join('\n')
    );

    expect(built.warnings.filter((w) => w.includes('not a delta section'))).toEqual([]);
  });
});

describe('validate <change> (requirements outside delta sections)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-orphan-validate-'));
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Validate a change whose only content is the given delta spec, in a temp
   * project, and return the report.
   */
  async function validateDelta(deltaBody: string) {
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
    await fs.writeFile(path.join(changeDir, 'specs', 'billing', 'spec.md'), deltaBody);
    return new Validator().validateChangeDeltaSpecs(changeDir);
  }

  it('reports the orphan as a warning without failing the change', async () => {
    const report = await validateDelta(
      [
        '## ADDED Requirements',
        '### Requirement: Applied',
        'The system SHALL do a thing.',
        '',
        '#### Scenario: S',
        '- **WHEN** a',
        '- **THEN** b',
        '',
        '## Notes',
        '### Requirement: Ignored',
        'The system SHALL do another thing.',
      ].join('\n')
    );

    const warnings = report.issues.filter((issue) => issue.level === 'WARNING');
    expect(warnings.some((issue) => /Requirement "Ignored" is under "## Notes"/.test(issue.message))).toBe(
      true
    );
    // A warning must not change the verdict.
    expect(report.issues.filter((i) => i.level === 'ERROR')).toEqual([]);
  });
});

/**
 * #2195: a requirement under an unrecognized `## ... Requirements` header reads
 * as a delta operation the author meant to apply. Dropping it with only a
 * warning let validate and archive exit 0 while losing it, so both now fail.
 * Orphans under prose sections or above the first `## ` keep the #1804 warning.
 */
describe('isUnrecognizedDeltaSection', () => {
  it.each([
    'DEPRECATED Requirements',
    'Add Requirements',
    'ADDED  Requirements',
    'Requirements',
    'deprecated requirement',
  ])('treats "## %s" as an unrecognized delta section', (section) => {
    expect(isUnrecognizedDeltaSection(section)).toBe(true);
  });

  it.each([
    'ADDED Requirements',
    'modified requirements',
    'REMOVED Requirements',
    'RENAMED Requirements',
    'Notes',
    'Purpose',
    'Behavior',
    'Requirements Notes',
  ])('does not treat "## %s" as one', (section) => {
    expect(isUnrecognizedDeltaSection(section)).toBe(false);
  });

  it('does not treat text above the first section as one', () => {
    expect(isUnrecognizedDeltaSection(null)).toBe(false);
  });
});

describe('unrecognized requirement-bearing delta sections (#2195)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-unrecognized-section-'));
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const ADDED = [
    '## ADDED Requirements',
    '### Requirement: Applied',
    'The system SHALL do a thing.',
    '',
    '#### Scenario: S',
    '- **WHEN** a',
    '- **THEN** b',
    '',
  ];

  async function writeChange(deltaBody: string) {
    const specsRoot = path.join(tempDir, 'openspec', 'specs');
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.mkdir(specsRoot, { recursive: true });
    await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
    await fs.writeFile(path.join(changeDir, 'specs', 'billing', 'spec.md'), deltaBody);
    return { specsRoot, changeDir };
  }

  async function errorsFor(deltaBody: string) {
    const { changeDir } = await writeChange(deltaBody);
    const report = await new Validator().validateChangeDeltaSpecs(changeDir);
    return report.issues.filter((i) => i.level === 'ERROR').map((i) => i.message);
  }

  async function buildFor(deltaBody: string) {
    const { specsRoot, changeDir } = await writeChange(deltaBody);
    const [update] = await findSpecUpdates(changeDir, specsRoot);
    return buildUpdatedSpec(update, 'c', { silent: true });
  }

  const DEPRECATED = [
    ...ADDED,
    '## DEPRECATED Requirements',
    '### Requirement: Ignored',
    'This requirement sits under a section the CLI does not recognise.',
  ].join('\n');

  it('fails validate when an applied section sits beside an unrecognized one', async () => {
    const errors = await errorsFor(DEPRECATED);
    expect(errors).toEqual([
      expect.stringMatching(
        /^Requirement "Ignored" is under "## DEPRECATED Requirements", which is not a delta section/
      ),
    ]);
  });

  it('fails validate for CRLF line endings too', async () => {
    const errors = await errorsFor(DEPRECATED.replace(/\n/g, '\r\n'));
    expect(errors.some((m) => m.includes('"## DEPRECATED Requirements"'))).toBe(true);
  });

  it('makes archive refuse instead of dropping the requirement (covers --no-validate)', async () => {
    await expect(buildFor(DEPRECATED)).rejects.toThrow(
      /requirement "Ignored" \(line 10\) is under "## DEPRECATED Requirements", which is not a delta section/
    );
  });

  it('keeps an orphan under a prose section a warning', async () => {
    const delta = [...ADDED, '## Notes', '### Requirement: Aside', 'Background only.'].join('\n');
    expect(await errorsFor(delta)).toEqual([]);
    const built = await buildFor(delta);
    expect(built.warnings.some((w) => w.includes('Aside'))).toBe(true);
  });

  it('keeps an orphan above the first section a warning', async () => {
    const delta = ['### Requirement: Stray', 'Text.', '', ...ADDED].join('\n');
    expect(await errorsFor(delta)).toEqual([]);
    await expect(buildFor(delta)).resolves.toBeDefined();
  });

  it('does not fail on a requirement commented out under an unrecognized section', async () => {
    const delta = [
      ...ADDED,
      '<!--',
      '## DEPRECATED Requirements',
      '### Requirement: Draft idea we did not ship',
      '-->',
    ].join('\n');
    expect(parseDeltaSpec(delta).orphanedRequirements).toEqual([]);
    expect(await errorsFor(delta)).toEqual([]);
    await expect(buildFor(delta)).resolves.toBeDefined();
  });

  it('does not fail on prose-only or fenced content under an unrecognized section', async () => {
    const delta = [
      '## Purpose',
      'Describes a new capability.',
      '',
      ...ADDED,
      '## DEPRECATED Requirements',
      'Nothing is deprecated yet. Example of the format:',
      '',
      '```markdown',
      '### Requirement: Just An Example',
      '```',
    ].join('\n');
    expect(await errorsFor(delta)).toEqual([]);
    await expect(buildFor(delta)).resolves.toBeDefined();
  });
});
