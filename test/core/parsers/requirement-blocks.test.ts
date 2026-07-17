import { describe, it, expect } from 'vitest';
import { extractRequirementsSection, parseDeltaSpec } from '../../../src/core/parsers/requirement-blocks.js';

describe('extractRequirementsSection', () => {
  it('parses canonical ### Requirement: headers', () => {
    const result = extractRequirementsSection(`## Requirements\n### Requirement: Foo\nThe system SHALL foo.\n`);
    expect(result.bodyBlocks.length).toBe(1);
    expect(result.bodyBlocks[0].name).toBe('Foo');
  });

  it('regression: parses mixed-case ### requirement: headers without silently dropping them', () => {
    const variants = [
      '### requirement: Lowercase',
      '### REQUIREMENT: Uppercase',
      '### Requirement: Canonical',
    ];
    for (const header of variants) {
      const result = extractRequirementsSection(`## Requirements\n${header}\nThe system SHALL foo.\n`);
      expect(result.bodyBlocks.length).toBeGreaterThan(0);
      expect(result.bodyBlocks[0].name).toBe(header.replace(/^###\s*requirement:\s*/i, ''));
    }
  });

  it('regression: parses ###Requirement: header with no space after ### without silently dropping it', () => {
    const result = extractRequirementsSection(`## Requirements\n###Requirement: NoSpace\nThe system SHALL foo.\n`);
    expect(result.bodyBlocks.length).toBe(1);
    expect(result.bodyBlocks[0].name).toBe('NoSpace');
  });

  it('regression: multiple blocks where first uses no-space header are all parsed', () => {
    const content = `## Requirements\n###Requirement: First\nThe system SHALL first.\n\n### Requirement: Second\nThe system SHALL second.\n`;
    const result = extractRequirementsSection(content);
    expect(result.bodyBlocks.length).toBe(2);
    expect(result.bodyBlocks[0].name).toBe('First');
    expect(result.bodyBlocks[1].name).toBe('Second');
  });
});

describe('parseDeltaSpec', () => {
  it('regression: parses ###Requirement: header with no space in delta ADDED section', () => {
    const content = `## ADDED Requirements\n###Requirement: NoSpace\nThe system SHALL foo.\n`;
    const result = parseDeltaSpec(content);
    expect(result.added.length).toBe(1);
    expect(result.added[0].name).toBe('NoSpace');
  });

  it('ignores requirement headers and delta sections inside fenced code blocks', () => {
    const content = [
      '## ADDED Requirements',
      '',
      '### Requirement: Real requirement',
      'The system SHALL do the thing.',
      '',
      '#### Scenario: It works',
      '- **WHEN** a user acts',
      '- **THEN** it succeeds',
      '',
      'Authors may document the delta format like this:',
      '',
      '```markdown',
      '## ADDED Requirements',
      '### Requirement: Example only',
      '#### Scenario: Example scenario',
      '```',
      '',
    ].join('\n');

    const result = parseDeltaSpec(content);
    expect(result.added.map((b) => b.name)).toEqual(['Real requirement']);
    // The fenced example stays inside the real requirement block instead of
    // becoming a phantom requirement.
    expect(result.added[0].raw).toContain('```markdown');
  });

  it('ignores REMOVED bullets and RENAMED pairs inside fenced code blocks', () => {
    const content = [
      '## REMOVED Requirements',
      '- `### Requirement: Actually removed`',
      '',
      '```markdown',
      '- `### Requirement: Documented example`',
      '```',
      '',
      '## RENAMED Requirements',
      '- FROM: `### Requirement: Old name`',
      '- TO: `### Requirement: New name`',
      '',
      '```markdown',
      '- FROM: `### Requirement: Example old`',
      '- TO: `### Requirement: Example new`',
      '```',
      '',
    ].join('\n');

    const result = parseDeltaSpec(content);
    expect(result.removed).toEqual(['Actually removed']);
    expect(result.renamed).toEqual([{ from: 'Old name', to: 'New name' }]);
  });
});

describe('extractRequirementsSection (fenced code blocks)', () => {
  it('does not treat requirement headers inside fenced code blocks as real requirements', () => {
    const content = [
      '# Spec',
      '',
      '## Requirements',
      '',
      '### Requirement: Real requirement',
      'The system SHALL do the thing.',
      '',
      'Example of the format authors should follow:',
      '',
      '```markdown',
      '### Requirement: Example only',
      '```',
      '',
    ].join('\n');

    const result = extractRequirementsSection(content);
    expect(result.bodyBlocks.map((b) => b.name)).toEqual(['Real requirement']);
  });
});
