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
});
