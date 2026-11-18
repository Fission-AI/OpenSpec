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

const REQUIREMENT_DELTA = [
  '## MODIFIED Requirements',
  '',
  '### Requirement: Existing requirement name',
  'The system SHALL do something.',
  '',
  '#### Scenario: A scenario',
  '- **WHEN** something happens',
  '- **THEN** something follows',
];

// The blocks as reported. #2255's is not valid YAML (`by` and `at` repeat), so
// recognizing frontmatter must not depend on parsing it.
const FRONTMATTER_2255 = [
  '---',
  'doc_template_version: "1.0.0"',
  'type: spec_change',
  'title: ""',
  'description: ""',
  'tags: ',
  '- "spec_change" ',
  '- "other tags"',
  'status: draft # Optional: draft | active | stable | deprecated',
  'generated: ',
  'by: "{who}" ',
  'at: "YYYY-MM-DDTHH:mm:ss+08:00" # ISO 8601',
  'verified: ',
  'by: "{who}" ',
  'at: "YYYY-MM-DDTHH:mm:ss+08:00" # ISO 8601',
  'revision: ',
  '- version: "1.0" ',
  'date: "YYYY-MM-DD" ',
  'detail: >- ',
  '<!--detail-->',
  '---',
];
const FRONTMATTER_2272 = [
  '---',
  "schema_version: '1.0'",
  'created:',
  "  date: '2026-11-18T12:09:45Z'",
  "  agent: { name: some-tool, version: '1.0' }",
  '---',
];

describe('parseDeltaSpec frontmatter', () => {
  it.each([
    ['#2255', FRONTMATTER_2255, '\n'],
    ['#2255 with CRLF', FRONTMATTER_2255, '\r\n'],
    ['#2272', FRONTMATTER_2272, '\n'],
    ['#2272 with CRLF', FRONTMATTER_2272, '\r\n'],
  ])('does not report the block from %s', (_name, frontmatter, eol) => {
    const plan = parseDeltaSpec([...frontmatter, ...REQUIREMENT_DELTA].join(eol));

    expect(plan.unappliedContent).toEqual([]);
    expect(plan.hasFrontmatter).toBe(true);
    expect(plan.modified.map((block) => block.name)).toEqual(['Existing requirement name']);
  });

  it('still reports prose after the block', () => {
    const plan = parseDeltaSpec(['---', 'a: 1', '---', 'Dropped prose.', ...REQUIREMENT_DELTA].join('\n'));

    expect(plan.unappliedContent).toEqual([{ section: null, line: 4 }]);
  });

  it.each([
    ['is not on the first line', ['', '---', 'a: 1', '---', ...REQUIREMENT_DELTA], 2],
    ['is never closed', ['---', 'a: 1', ...REQUIREMENT_DELTA], 1],
  ])('still reports a block that %s', (_name, lines, line) => {
    const plan = parseDeltaSpec(lines.join('\n'));

    expect(plan.hasFrontmatter).toBe(false);
    expect(plan.unappliedContent).toEqual([{ section: null, line }]);
  });

  // Two thematic breaks can wrap real sections. Those must stay visible to the merge.
  it('does not mistake thematic breaks around a delta section for frontmatter', () => {
    const plan = parseDeltaSpec(['---', ...REQUIREMENT_DELTA, '---', '## Notes', 'Dropped.'].join('\n'));

    expect(plan.hasFrontmatter).toBe(false);
    expect(plan.modified.map((block) => block.name)).toEqual(['Existing requirement name']);
    expect(plan.unappliedContent).toContainEqual({ section: 'Notes', line: 11 });
  });

  // Prose between two thematic breaks is text archive drops, so it must still warn.
  it.each([
    ['plain prose', ['---', 'Important context for reviewers.', '---']],
    ['a title and prose', ['---', '# Billing delta', 'Important context.', '---']],
    ['only a hashtag note', ['---', '#release Keep this compatibility note.', '---']],
    ['a quoted phrase with no key', ['---', '"Keep this: it matters', '---']],
  ])('still reports %s between thematic breaks', (_name, block) => {
    const plan = parseDeltaSpec([...block, ...REQUIREMENT_DELTA].join('\n'));

    expect(plan.hasFrontmatter).toBe(false);
    expect(plan.unappliedContent).toEqual([{ section: null, line: 1 }]);
  });

  it.each([
    ['a leading YAML comment', ['---', '# generated by a tool', 'owner: team-a', '---']],
    ['non-English keys', ['---', '标题: 规格', '---']],
    ['a quoted key', ['---', '"owner": team-a', '---']],
    ['a quoted key with spaces', ['---', '"release owner": team-a', '---']],
    ['a single-quoted key with spaces', ['---', "'release owner': team-a", '---']],
    ['an indented leading comment', ['---', '  # generated by a tool', 'owner: team-a', '---']],
    ['a double-hash comment', ['---', 'owner: team-a', '##generated', '---']],
    ['an empty value', ['---', 'owner:', '---']],
    ['an empty block', ['---', '---']],
  ])('accepts a block with %s', (_name, block) => {
    const plan = parseDeltaSpec([...block, ...REQUIREMENT_DELTA].join('\n'));

    expect(plan.hasFrontmatter).toBe(true);
    expect(plan.unappliedContent).toEqual([]);
  });

  it('does not let a code fence inside the block hide the requirements', () => {
    const plan = parseDeltaSpec(['---', 'sample: |', '```', '---', ...REQUIREMENT_DELTA].join('\n'));

    expect(plan.modified.map((block) => block.name)).toEqual(['Existing requirement name']);
    expect(plan.unappliedContent).toEqual([]);
  });

  it('does not let an open HTML comment inside the block hide later warnings', () => {
    const plan = parseDeltaSpec(
      ['---', 'note: <!-- draft', '---', ...REQUIREMENT_DELTA, '## Notes', 'Dropped.'].join('\n')
    );

    expect(plan.unappliedContent).toEqual([{ section: 'Notes', line: 12 }]);
  });

  it('still reports a requirement written inside the delimiters', () => {
    const plan = parseDeltaSpec(
      ['---', 'a: 1', '### Requirement: Hidden', 'The system SHALL hide.', '---', ...REQUIREMENT_DELTA].join('\n')
    );

    expect(plan.hasFrontmatter).toBe(false);
    expect(plan.orphanedRequirements.map((orphan) => orphan.name)).toEqual(['Hidden']);
  });
});

describe('frontmatter through validate and archive', () => {
  let tempDir: string;
  let changeDir: string;
  let specsRoot: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-frontmatter-'));
    specsRoot = path.join(tempDir, 'openspec', 'specs');
    changeDir = path.join(tempDir, 'openspec', 'changes', 'c');
    await fs.mkdir(path.join(changeDir, 'specs', 'example'), { recursive: true });
    await fs.mkdir(path.join(specsRoot, 'example'), { recursive: true });
    await fs.writeFile(
      path.join(specsRoot, 'example', 'spec.md'),
      [
        '---',
        'owner: team-a',
        '---',
        '# example Specification',
        '',
        '## Purpose',
        'Example capability.',
        '',
        '## Requirements',
        '',
        '### Requirement: Existing requirement name',
        'The system SHALL do the original thing.',
        '',
        '#### Scenario: A scenario',
        '- **WHEN** something happens',
        '- **THEN** something follows',
        '',
      ].join('\n')
    );
  });
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it.each([
    ['#2255', FRONTMATTER_2255],
    ['#2272', FRONTMATTER_2272],
  ])('passes --strict with the block from %s', async (_name, frontmatter) => {
    await fs.writeFile(
      path.join(changeDir, 'specs', 'example', 'spec.md'),
      [...frontmatter, ...REQUIREMENT_DELTA].join('\r\n')
    );

    const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);

    expect(report.issues).toEqual([]);
    expect(report.valid).toBe(true);
  });

  it('archive says the block stays with the change and keeps the main spec frontmatter', async () => {
    await fs.writeFile(
      path.join(changeDir, 'specs', 'example', 'spec.md'),
      [...FRONTMATTER_2272, ...REQUIREMENT_DELTA].join('\n')
    );

    const [update] = await findSpecUpdates(changeDir, specsRoot);
    const built = await buildUpdatedSpec(update, 'c', { silent: true });

    expect(built.warnings).toEqual([
      'example - frontmatter (line 1) is not carried into the main spec. It stays with the change.',
    ]);
    expect(built.rebuilt.startsWith('---\nowner: team-a\n---\n')).toBe(true);
    expect(built.rebuilt).not.toContain('schema_version');
  });

  it('still fails a delta that holds only frontmatter', async () => {
    await fs.writeFile(path.join(changeDir, 'specs', 'example', 'spec.md'), FRONTMATTER_2272.join('\n'));

    const report = await new Validator(true).validateChangeDeltaSpecs(changeDir);

    expect(report.valid).toBe(false);
  });

  it.each([
    ['LF', '', '\n'],
    ['CRLF with a BOM', '﻿', '\r\n'],
  ])('carries the Purpose of a new capability past the block (%s)', async (_name, bom, eol) => {
    const purpose = 'Fresh capability purpose text that is long enough to carry into the new main spec.';
    await fs.rm(path.join(changeDir, 'specs', 'example'), { recursive: true });
    await fs.mkdir(path.join(changeDir, 'specs', 'fresh'), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'specs', 'fresh', 'spec.md'),
      bom +
        [
          '---',
          'note: <!-- draft',
          '---',
          '## Purpose',
          purpose,
          '',
          '## ADDED Requirements',
          '',
          '### Requirement: Fresh',
          'The system SHALL do something fresh.',
          '',
          '#### Scenario: A scenario',
          '- **WHEN** something happens',
          '- **THEN** something follows',
        ].join(eol)
    );

    const [update] = await findSpecUpdates(changeDir, specsRoot);
    const built = await buildUpdatedSpec(update, 'c', { silent: true });

    expect(built.rebuilt).toContain(purpose);
    expect(built.rebuilt).not.toContain('note:');
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
