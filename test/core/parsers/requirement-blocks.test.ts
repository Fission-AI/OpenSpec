import { describe, it, expect } from 'vitest';
import {
  extractRequirementsSection,
  parseDeltaSpec,
  findMissingCurrentScenarios,
  type RequirementBlock,
} from '../../../src/core/parsers/requirement-blocks.js';

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
  it('strips a UTF-8 BOM so a delta section on the first line still parses', () => {
    // Windows editors and PowerShell redirects prepend a BOM; without
    // stripping it the first line never matches "## ADDED Requirements" and
    // validate reports "No delta sections found" for a well-formed file.
    const content = `﻿## ADDED Requirements\n### Requirement: BOM survivor\nThe system SHALL parse.\n\n#### Scenario: Parses\n- **WHEN** a BOM prefixes the file\n- **THEN** the delta is found\n`;
    const result = parseDeltaSpec(content);
    expect(result.sectionPresence.added).toBe(true);
    expect(result.added.length).toBe(1);
    expect(result.added[0].name).toBe('BOM survivor');
  });

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

describe('findMissingCurrentScenarios: level-4 header parity', () => {
  // Only .raw is read; a minimal block keeps these focused on scenario parsing.
  const block = (raw: string): RequirementBlock => ({ headerLine: raw.split('\n')[0], name: '', raw });
  const req = (...scenarios: string[]) =>
    block(['### Requirement: Widget state', 'The system SHALL report it.', '', ...scenarios].join('\n'));

  it('does not treat a level-5 (#####) header as a dropped scenario', () => {
    // `#### ` requires exactly four hashes then whitespace, matching countScenarios;
    // `##### Deep detail` is body, not a scenario, so dropping it is no loss.
    const current = req('#### Scenario: Kept', '- **WHEN** a', '- **THEN** b', '', '##### Deep detail', '- a nested note');
    const incoming = req('#### Scenario: Kept', '- **WHEN** a', '- **THEN** b');
    expect(findMissingCurrentScenarios(current, incoming)).toEqual([]);
  });

  it('does not treat an unlabeled #### header inside a fence as a scenario', () => {
    const current = req(
      '#### Scenario: Real',
      '- **WHEN** a',
      '- **THEN** b',
      '',
      '```markdown',
      '#### Edge case',
      '- only an example',
      '```'
    );
    const incoming = req('#### Scenario: Real', '- **WHEN** a', '- **THEN** b');
    expect(findMissingCurrentScenarios(current, incoming)).toEqual([]);
  });

  it('normalizes an optional Scenario: label, so relabeling is not a loss', () => {
    const current = req('#### Edge case', '- **WHEN** a', '- **THEN** b');
    const incoming = req('#### Scenario: Edge case', '- **WHEN** a', '- **THEN** b');
    expect(findMissingCurrentScenarios(current, incoming)).toEqual([]);
  });

  it('counts unlabeled scenarios by multiplicity, like labeled ones', () => {
    const current = req(
      '#### Edge case',
      '- **WHEN** a',
      '- **THEN** b',
      '',
      '#### Edge case',
      '- **WHEN** c',
      '- **THEN** d'
    );
    const incoming = req('#### Edge case', '- **WHEN** a', '- **THEN** b');
    expect(findMissingCurrentScenarios(current, incoming)).toEqual(['Edge case']);
  });

  it('does not let a fenced #### in the incoming block satisfy a real scenario', () => {
    // Symmetry with the current-side fence test: masking must apply to the
    // incoming block too, or a fenced sample in the MODIFIED delta would count
    // as coverage and hide a genuine drop (validate passes, archive deletes).
    const current = req('#### Scenario: Real', '- **WHEN** a', '- **THEN** b');
    const incoming = req(
      '```markdown',
      '#### Scenario: Real',
      '- only an example',
      '```'
    );
    expect(findMissingCurrentScenarios(current, incoming)).toEqual(['Real']);
  });

  it('normalizes a lowercase scenario: label the same as Scenario:', () => {
    const current = req('#### Scenario: Edge case', '- **WHEN** a', '- **THEN** b');
    const incoming = req('#### scenario: Edge case', '- **WHEN** a', '- **THEN** b');
    expect(findMissingCurrentScenarios(current, incoming)).toEqual([]);
  });

  it('treats an ATX-closed header as the same scenario as its open form', () => {
    // `#### Foo ####` renders as `Foo` in CommonMark; the loss guard must fold
    // the two so relabeling one side does not read as a dropped scenario.
    const current = req('#### Scenario: Edge case', '- **WHEN** a', '- **THEN** b');
    const incoming = req('#### Scenario: Edge case ####', '- **WHEN** a', '- **THEN** b');
    expect(findMissingCurrentScenarios(current, incoming)).toEqual([]);
  });
});
