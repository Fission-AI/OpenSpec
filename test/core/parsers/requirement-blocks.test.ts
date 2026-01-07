import { describe, it, expect } from 'vitest';
import { parseDeltaSpec } from '../../../src/core/parsers/requirement-blocks.js';

describe('parseDeltaSpec - Line Ending and Whitespace Handling', () => {
  describe('CRLF line endings', () => {
    it('should parse requirement blocks with CRLF line endings', () => {
      const content = [
        '## ADDED Requirements',
        '',
        '### Requirement: Test Feature',
        'The system SHALL provide test functionality.',
        '',
        '#### Scenario: Basic test',
        '- **WHEN** user performs action',
        '- **THEN** system responds',
      ].join('\r\n');

      const plan = parseDeltaSpec(content);

      expect(plan.added).toHaveLength(1);
      expect(plan.added[0].name).toBe('Test Feature');
      expect(plan.added[0].raw).toContain('SHALL provide test functionality');
    });

    it('should parse requirement blocks with mixed line endings', () => {
      const content =
        '## ADDED Requirements\r\n' +
        '\n' +
        '### Requirement: Mixed Endings\r\n' +
        'The system SHALL handle mixed line endings.\n' +
        '\r\n' +
        '#### Scenario: Test scenario\r\n' +
        '- **WHEN** file has mixed endings\n' +
        '- **THEN** parser normalizes them\r\n';

      const plan = parseDeltaSpec(content);

      expect(plan.added).toHaveLength(1);
      expect(plan.added[0].name).toBe('Mixed Endings');
    });
  });

  describe('Flexible whitespace in requirement headers', () => {
    it('should parse requirement header with extra spaces after ###', () => {
      const content = [
        '## ADDED Requirements',
        '',
        '###  Requirement: Extra Spaces',
        'The system SHALL handle extra spaces.',
        '',
        '#### Scenario: Test',
        '- **WHEN** header has extra spaces',
        '- **THEN** it still parses',
      ].join('\n');

      const plan = parseDeltaSpec(content);

      expect(plan.added).toHaveLength(1);
      expect(plan.added[0].name).toBe('Extra Spaces');
    });

    it('should parse requirement header with no space after ###', () => {
      const content = [
        '## MODIFIED Requirements',
        '',
        '###Requirement: No Space',
        'The system SHALL handle no space after ###.',
        '',
        '#### Scenario: Test',
        '- **WHEN** header has no space',
        '- **THEN** it still parses',
      ].join('\n');

      const plan = parseDeltaSpec(content);

      expect(plan.modified).toHaveLength(1);
      expect(plan.modified[0].name).toBe('No Space');
    });

    it('should parse requirement header with tabs', () => {
      const content = [
        '## ADDED Requirements',
        '',
        '###\tRequirement: Tab Character',
        'The system SHALL handle tab characters.',
        '',
        '#### Scenario: Test',
        '- **WHEN** header has tab',
        '- **THEN** it still parses',
      ].join('\n');

      const plan = parseDeltaSpec(content);

      expect(plan.added).toHaveLength(1);
      expect(plan.added[0].name).toBe('Tab Character');
    });

    it('should parse multiple requirements with varying whitespace', () => {
      const content = [
        '## ADDED Requirements',
        '',
        '### Requirement: Normal Spacing',
        'The system SHALL work normally.',
        '',
        '#### Scenario: Test 1',
        '- **WHEN** normal',
        '- **THEN** works',
        '',
        '###  Requirement: Extra Spaces',
        'The system SHALL work with extra spaces.',
        '',
        '#### Scenario: Test 2',
        '- **WHEN** extra spaces',
        '- **THEN** works',
        '',
        '###Requirement: No Space',
        'The system SHALL work without space.',
        '',
        '#### Scenario: Test 3',
        '- **WHEN** no space',
        '- **THEN** works',
      ].join('\n');

      const plan = parseDeltaSpec(content);

      expect(plan.added).toHaveLength(3);
      expect(plan.added[0].name).toBe('Normal Spacing');
      expect(plan.added[1].name).toBe('Extra Spaces');
      expect(plan.added[2].name).toBe('No Space');
    });
  });

  describe('Diagnostic collection', () => {
    it('should collect diagnostics for near-miss headers', () => {
      const content = [
        '## ADDED Requirements',
        '',
        '### Some Header',
        'This is not a requirement.',
        '',
        '### Requirement: Valid',
        'The system SHALL work.',
        '',
        '#### Scenario: Test',
        '- **WHEN** valid',
        '- **THEN** works',
      ].join('\n');

      const plan = parseDeltaSpec(content, true);

      expect(plan.added).toHaveLength(1);
      expect(plan.added[0].name).toBe('Valid');

      expect(plan.diagnostics).toBeDefined();
      expect(plan.diagnostics?.added).toBeDefined();
      expect(plan.diagnostics?.added.length).toBeGreaterThan(0);
      expect(plan.diagnostics?.added[0].line).toContain('### Some Header');
      expect(plan.diagnostics?.added[0].reason).toContain('does not match requirement header pattern');
    });

    it('should collect diagnostics for ### lines without Requirement:', () => {
      const content = [
        '## MODIFIED Requirements',
        '',
        '### Wrong Format',
        'Some text.',
        '',
        '### Another Wrong',
        'More text.',
        '',
        '### Requirement: Correct',
        'The system SHALL work.',
        '',
        '#### Scenario: Test',
        '- **WHEN** correct',
        '- **THEN** works',
      ].join('\n');

      const plan = parseDeltaSpec(content, true);

      expect(plan.modified).toHaveLength(1);
      expect(plan.diagnostics?.modified).toHaveLength(2);
      expect(plan.diagnostics?.modified[0].line).toContain('### Wrong Format');
      expect(plan.diagnostics?.modified[1].line).toContain('### Another Wrong');
    });

    it('should not collect diagnostics when disabled', () => {
      const content = [
        '## ADDED Requirements',
        '',
        '### Some Header',
        'Not a requirement.',
      ].join('\n');

      const plan = parseDeltaSpec(content, false);

      expect(plan.diagnostics).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty sections correctly', () => {
      const content = [
        '## ADDED Requirements',
        '',
        '## MODIFIED Requirements',
      ].join('\n');

      const plan = parseDeltaSpec(content);

      expect(plan.added).toHaveLength(0);
      expect(plan.modified).toHaveLength(0);
      expect(plan.sectionPresence.added).toBe(true);
      expect(plan.sectionPresence.modified).toBe(true);
    });

    it('should handle requirement with trailing whitespace', () => {
      const content = [
        '## ADDED Requirements',
        '',
        '### Requirement: Trailing Spaces   ',
        'The system SHALL work.  ',
        '',
        '#### Scenario: Test  ',
        '- **WHEN** test  ',
        '- **THEN** works  ',
      ].join('\n');

      const plan = parseDeltaSpec(content);

      expect(plan.added).toHaveLength(1);
      expect(plan.added[0].name).toBe('Trailing Spaces');
    });

    it('should preserve scenario content correctly', () => {
      const content = [
        '## ADDED Requirements',
        '',
        '### Requirement: Multi-line Scenario',
        'The system SHALL support complex scenarios.',
        '',
        '#### Scenario: Complex test',
        '- **GIVEN** a complex setup',
        '  with multiple lines',
        '  and indentation',
        '- **WHEN** action occurs',
        '- **THEN** outcome is observed',
        '  with details',
      ].join('\n');

      const plan = parseDeltaSpec(content);

      expect(plan.added).toHaveLength(1);
      expect(plan.added[0].raw).toContain('GIVEN');
      expect(plan.added[0].raw).toContain('with multiple lines');
      expect(plan.added[0].raw).toContain('with details');
    });
  });

  describe('Regression tests', () => {
    it('should maintain backward compatibility with standard format', () => {
      const content = [
        '## ADDED Requirements',
        '',
        '### Requirement: Standard Format',
        'The system SHALL work as expected.',
        '',
        '#### Scenario: Standard test',
        '- **WHEN** using standard format',
        '- **THEN** everything works',
        '',
        '## MODIFIED Requirements',
        '',
        '### Requirement: Another Standard',
        'The system SHALL be modified correctly.',
        '',
        '#### Scenario: Modification test',
        '- **WHEN** modifying',
        '- **THEN** changes apply',
      ].join('\n');

      const plan = parseDeltaSpec(content);

      expect(plan.added).toHaveLength(1);
      expect(plan.modified).toHaveLength(1);
      expect(plan.added[0].name).toBe('Standard Format');
      expect(plan.modified[0].name).toBe('Another Standard');
    });
  });
});
