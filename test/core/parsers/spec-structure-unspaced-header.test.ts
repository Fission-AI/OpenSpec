import { describe, it, expect } from 'vitest';
import { extractRequirementsSection } from '../../../src/core/parsers/requirement-blocks.js';
import { findMainSpecStructureIssues } from '../../../src/core/parsers/spec-structure.js';

/**
 * The requirement reader accepts `###Requirement: Foo` (no space after the
 * hashes), so the structure check must see the same header. Otherwise a
 * duplicate or misplaced requirement written that way passes validation.
 */
describe('findMainSpecStructureIssues with an unspaced requirement header', () => {
  it('reports a duplicate when one copy has no space after ###', () => {
    const spec = [
      '# Spec',
      '',
      '## Requirements',
      '',
      '###Requirement: Foo',
      'The system SHALL do a.',
      '',
      '#### Scenario: a',
      '- ok',
      '',
      '### Requirement: Foo',
      'The system SHALL do b.',
      '',
      '#### Scenario: b',
      '- ok',
      '',
    ].join('\n');

    expect(extractRequirementsSection(spec).bodyBlocks.map((b) => b.name)).toEqual(['Foo', 'Foo']);
    const issues = findMainSpecStructureIssues(spec);
    expect(issues.map((i) => [i.kind, i.line])).toEqual([['duplicate-requirement', 11]]);
  });

  it('reports an unspaced requirement header outside ## Requirements', () => {
    const spec = ['# Spec', '', '## Purpose', '', '###Requirement: Foo', 'The system SHALL do a.', ''].join('\n');
    const issues = findMainSpecStructureIssues(spec);
    expect(issues.map((i) => [i.kind, i.line])).toEqual([['requirement-outside-requirements', 5]]);
  });
});
