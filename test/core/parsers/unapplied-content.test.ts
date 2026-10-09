import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { parseDeltaSpec } from '../../../src/core/parsers/requirement-blocks.js';
import { buildUpdatedSpec, findSpecUpdates } from '../../../src/core/specs-apply.js';
import { Validator } from '../../../src/core/validation/validator.js';

// Archive carries requirement blocks only. Text written anywhere else in a delta
// used to vanish with no warning while `validate --strict` passed.
const DELTA = [
  '# billing delta', // 1 - a title is not reported
  'Context above the first section.', // 2
  '## ADDED Requirements', // 3
  'Intro prose.', // 4
  '### Requirement: Invoices', // 5
  'The system SHALL generate invoices.', // 6
  '', // 7
  '#### Scenario: Period closes', // 8
  '- **WHEN** a', // 9
  '- **THEN** b', // 10
  'Trailing note, carried with the block.', // 11
  '## Acceptance Criteria', // 12
  '- Invoices reconcile.', // 13
].join('\n');

describe('parseDeltaSpec unappliedContent', () => {
  it('reports text above the first section, leading prose, and non-delta sections', () => {
    expect(parseDeltaSpec(DELTA).unappliedContent).toEqual([
      { section: null, line: 2 },
      { section: 'ADDED Requirements', line: 4 },
      { section: 'Acceptance Criteria', line: 12 },
    ]);
  });

  it('does not exempt a commented-out Purpose, and honours the --!> terminator', () => {
    const plan = parseDeltaSpec(
      ['<!--', '## Purpose', '--!>', 'Real prose.', '## ADDED Requirements', '### Requirement: A', 'a', '## Notes', 'n'].join(
        '\n'
      )
    );
    expect(plan.unappliedContent).toEqual([
      { section: 'Purpose', line: 2 },
      { section: 'Notes', line: 8 },
    ]);
  });

  // The merge splits sections on every `## ` line outside a fence, comment or not.
  // Reading boundaries from comment-masked lines disagreed with it both ways.
  it('reads section boundaries exactly as the merge does', () => {
    // `<!--` in inline code and a later `-->` are not a comment to the merge;
    // masking across them hid `## ADDED Requirements` and blamed a carried requirement.
    const inlineOpener = parseDeltaSpec(
      ['# Delta: strip `<!--` openers', '## ADDED Requirements', '### Requirement: A', 'Flow: ingest --> render', 'The system SHALL a.'].join('\n')
    );
    expect(inlineOpener.added.map((b) => b.name)).toEqual(['A']);
    expect(inlineOpener.unappliedContent).toEqual([]);

    // A header inside a comment is still a section to the merge, so the
    // requirement after the comment is carried, not text above the first section.
    const commentedHeader = parseDeltaSpec(
      ['<!-- add requirements below', '## ADDED Requirements', '-->', '### Requirement: A', 'The system SHALL a.'].join('\n')
    );
    expect(commentedHeader.added.map((b) => b.name)).toEqual(['A']);
    expect(commentedHeader.unappliedContent).toEqual([]);

    // ...and text after a commented-out `## Notes` is dropped by the merge.
    const commentedNotes = parseDeltaSpec(
      ['## ADDED Requirements', '### Requirement: A', 'a', '<!--', '## Notes', '-->', 'Dropped.'].join('\n')
    );
    expect(commentedNotes.added[0].raw).not.toContain('Dropped.');
    expect(commentedNotes.unappliedContent).toEqual([{ section: 'Notes', line: 5 }]);
  });

  it('does not let a `<!--` inside a code fence hide later sections', () => {
    const plan = parseDeltaSpec(
      ['## ADDED Requirements', '### Requirement: A', 'a', '```html', '<!-- unterminated sample', '```', '## Notes', 'Dropped.'].join('\n')
    );
    expect(plan.unappliedContent).toEqual([{ section: 'Notes', line: 7 }]);
  });

  it('ignores Purpose, REMOVED/RENAMED bodies, HTML comments, fences, and stray ### headers', () => {
    const plan = parseDeltaSpec(
      [
        '<!--',
        'Multi-line instructions.',
        '-->',
        '## Purpose',
        'A new capability.',
        '## ADDED Requirements',
        '<!-- add requirements below -->',
        '### Documentation Requirements',
        '### Requirement: A',
        'a',
        '```markdown',
        '## Notes',
        '```',
        '## REMOVED Requirements',
        '### Requirement: B',
        '**Reason**: obsolete',
        '## RENAMED Requirements',
        '- FROM: `### Requirement: C`',
        '- TO: `### Requirement: D`',
      ].join('\n')
    );
    expect(plan.unappliedContent).toEqual([]);
  });
});

describe('archive and validate report unapplied content', () => {
  let tempDir: string;
  let changeDir: string;
  let specsRoot: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-unapplied-'));
    specsRoot = path.join(tempDir, 'openspec', 'specs');
    changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
    await fs.mkdir(specsRoot, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'specs', 'billing', 'spec.md'), DELTA);
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('archive warns and still carries only the requirement', async () => {
    const [update] = await findSpecUpdates(changeDir, specsRoot);
    const built = await buildUpdatedSpec(update, 'c', { silent: true });

    expect(built.warnings).toContain(
      'billing - section "## Acceptance Criteria" (line 12) is not carried into the main spec.'
    );
    expect(built.rebuilt).toContain('### Requirement: Invoices');
    expect(built.rebuilt).not.toContain('Acceptance Criteria');
  });

  it('validate warns, which fails --strict', async () => {
    const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);
    const lost = report.issues.filter((issue) => /not carried into the main spec/.test(issue.message));

    expect(lost.map((issue) => [issue.level, issue.line])).toEqual([
      ['WARNING', 2],
      ['WARNING', 4],
      ['WARNING', 12],
    ]);
    expect(report.valid).toBe(false);
  });
});
