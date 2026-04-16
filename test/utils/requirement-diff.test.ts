import { describe, it, expect } from 'vitest';
import {
  extractRequirementBlock,
  diffRequirementBlock,
  buildRenameMap,
} from '../../src/utils/requirement-diff.js';

const SAMPLE_SPEC = `# sample Specification

## Purpose
A test spec.

## Requirements
### Requirement: Load project config

The system SHALL read config.

#### Scenario: Valid config
- **WHEN** config exists
- **THEN** parse it

### Requirement: Support .yml alias

The system SHALL accept .yml.

#### Scenario: yml extension
- **WHEN** config.yml exists
- **THEN** read it

### Requirement: Enforce size limit

The system SHALL reject large configs.

#### Scenario: Over limit
- **WHEN** config > 50KB
- **THEN** reject
`;

describe('extractRequirementBlock', () => {
  it('returns the full block for an exact name match', () => {
    const block = extractRequirementBlock(SAMPLE_SPEC, 'Load project config');
    expect(block).not.toBeNull();
    expect(block).toContain('### Requirement: Load project config');
    expect(block).toContain('The system SHALL read config.');
    expect(block).toContain('#### Scenario: Valid config');
    // Should NOT contain the next requirement
    expect(block).not.toContain('Support .yml alias');
  });

  it('matches case-insensitively', () => {
    const block = extractRequirementBlock(SAMPLE_SPEC, 'load PROJECT config');
    expect(block).not.toBeNull();
    expect(block).toContain('### Requirement: Load project config');
  });

  it('matches with extra whitespace', () => {
    const block = extractRequirementBlock(SAMPLE_SPEC, '  Load project config  ');
    expect(block).not.toBeNull();
    expect(block).toContain('### Requirement: Load project config');
  });

  it('returns null when name does not match', () => {
    const block = extractRequirementBlock(SAMPLE_SPEC, 'Nonexistent requirement');
    expect(block).toBeNull();
  });

  it('extracts the last requirement in a file (no following header)', () => {
    const block = extractRequirementBlock(SAMPLE_SPEC, 'Enforce size limit');
    expect(block).not.toBeNull();
    expect(block).toContain('### Requirement: Enforce size limit');
    expect(block).toContain('#### Scenario: Over limit');
  });

  it('does not match requirement headers outside the Requirements section', () => {
    const specWithPreamble = `# Spec

## Purpose
Test purpose.

### Requirement: Preamble header

This is not inside a Requirements section.

## Requirements

### Requirement: Real requirement

The system SHALL do something.

#### Scenario: Works
- **WHEN** called
- **THEN** works
`;
    // The preamble header is outside ## Requirements, so it should not be found
    const preambleBlock = extractRequirementBlock(specWithPreamble, 'Preamble header');
    expect(preambleBlock).toBeNull();

    const realBlock = extractRequirementBlock(specWithPreamble, 'Real requirement');
    expect(realBlock).not.toBeNull();
    expect(realBlock).toContain('The system SHALL do something.');
  });

  it('handles Windows-style line endings', () => {
    const windowsSpec = SAMPLE_SPEC.replace(/\n/g, '\r\n');
    const block = extractRequirementBlock(windowsSpec, 'Load project config');
    expect(block).not.toBeNull();
    expect(block).toContain('### Requirement: Load project config');
  });
});

describe('diffRequirementBlock', () => {
  it('produces a diff when base and delta differ', () => {
    const base = '### Requirement: Foo\n\nThe system SHALL do A.\n\n#### Scenario: A\n- **WHEN** called\n- **THEN** A';
    const delta = '### Requirement: Foo\n\nThe system SHALL do B.\n\n#### Scenario: A\n- **WHEN** called\n- **THEN** B';

    const diff = diffRequirementBlock(base, delta, 'test');
    expect(diff).toContain('-The system SHALL do A.');
    expect(diff).toContain('+The system SHALL do B.');
    // Should not contain header lines
    expect(diff).not.toContain('Index:');
    expect(diff).not.toContain('---');
    expect(diff).not.toContain('+++');
    expect(diff).not.toContain('@@');
  });

  it('shows all additions when base is null', () => {
    const delta = '### Requirement: New\n\nThe system SHALL exist.\n\n#### Scenario: Exists\n- **WHEN** checked\n- **THEN** exists';

    const diff = diffRequirementBlock(null, delta, 'test');
    expect(diff).toContain('+### Requirement: New');
    expect(diff).toContain('+The system SHALL exist.');
    expect(diff).not.toContain('No newline');
  });

  it('produces empty output for identical blocks', () => {
    const content = '### Requirement: Same\n\nThe system SHALL stay.\n\n#### Scenario: Same\n- **WHEN** called\n- **THEN** same';

    const diff = diffRequirementBlock(content, content, 'test');
    expect(diff).toBe('');
  });
});

describe('buildRenameMap', () => {
  it('builds map from single rename', () => {
    const map = buildRenameMap([{ from: 'Old name', to: 'New name' }]);
    expect(map.get('new name')).toBe('Old name');
  });

  it('builds map from multiple renames', () => {
    const map = buildRenameMap([
      { from: 'Alpha', to: 'Bravo' },
      { from: 'Charlie', to: 'Delta' },
    ]);
    expect(map.size).toBe(2);
    expect(map.get('bravo')).toBe('Alpha');
    expect(map.get('delta')).toBe('Charlie');
  });

  it('returns empty map for empty list', () => {
    const map = buildRenameMap([]);
    expect(map.size).toBe(0);
  });
});
