import { describe, it, expect } from 'vitest';
import {
  extractRequirementsSection,
  parseDeltaSpec,
  parseScenarios,
} from '../../../src/core/parsers/requirement-blocks.js';

describe('requirement-blocks: fenced code block handling', () => {
  describe('extractRequirementsSection', () => {
    it('should not split on ## headers inside fenced code blocks', () => {
      const content = [
        '# Test Spec',
        '',
        '## Requirements',
        '',
        '### Requirement: Feature A',
        '',
        'Some description.',
        '',
        '```',
        '## This Is Not A Section',
        '### Requirement: This Is Not Real',
        '```',
        '',
        '### Requirement: Feature B',
        '',
        'Another description.',
      ].join('\n');

      const parts = extractRequirementsSection(content);
      expect(parts.bodyBlocks).toHaveLength(2);
      expect(parts.bodyBlocks[0].name).toBe('Feature A');
      expect(parts.bodyBlocks[1].name).toBe('Feature B');
      // Feature A should contain the full code block
      expect(parts.bodyBlocks[0].raw).toContain('## This Is Not A Section');
      expect(parts.bodyBlocks[0].raw).toContain('### Requirement: This Is Not Real');
    });

    it('should handle language-tagged fenced code blocks', () => {
      const content = [
        '# Test Spec',
        '',
        '## Requirements',
        '',
        '### Requirement: Feature A',
        '',
        '```markdown',
        '## Fake Section',
        '### Requirement: Fake Requirement',
        '```',
        '',
        '### Requirement: Feature B',
        '',
        'Description.',
      ].join('\n');

      const parts = extractRequirementsSection(content);
      expect(parts.bodyBlocks).toHaveLength(2);
      expect(parts.bodyBlocks[0].name).toBe('Feature A');
      expect(parts.bodyBlocks[1].name).toBe('Feature B');
    });

    it('should preserve all requirements when code block is in the middle', () => {
      const content = [
        '# Spec',
        '',
        '## Requirements',
        '',
        '### Requirement: First',
        '',
        'Description 1.',
        '',
        '### Requirement: Second (has code block)',
        '',
        '- WHEN something happens',
        '- THEN show this template:',
        '',
        '```',
        '# Template Title',
        '## Section A',
        '## Section B',
        '### Requirement: Not Real',
        '```',
        '',
        '### Requirement: Third',
        '',
        'Description 3.',
        '',
        '### Requirement: Fourth',
        '',
        'Description 4.',
      ].join('\n');

      const parts = extractRequirementsSection(content);
      expect(parts.bodyBlocks).toHaveLength(4);
      expect(parts.bodyBlocks.map(b => b.name)).toEqual([
        'First',
        'Second (has code block)',
        'Third',
        'Fourth',
      ]);
      // Second block should contain the entire code block
      expect(parts.bodyBlocks[1].raw).toContain('# Template Title');
      expect(parts.bodyBlocks[1].raw).toContain('## Section A');
    });
  });

  describe('parseDeltaSpec', () => {
    it('should parse ADDED requirements with code blocks correctly', () => {
      const content = [
        '# Delta Spec',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Feature A',
        '',
        'Has a code block:',
        '',
        '```',
        '## Not A Section',
        '### Requirement: Not Real',
        '```',
        '',
        '### Requirement: Feature B',
        '',
        'Simple description.',
        '',
        '### Requirement: Feature C',
        '',
        'Another one.',
      ].join('\n');

      const plan = parseDeltaSpec(content);
      expect(plan.added).toHaveLength(3);
      expect(plan.added.map(a => a.name)).toEqual(['Feature A', 'Feature B', 'Feature C']);
      // Feature A should contain the code block content
      expect(plan.added[0].raw).toContain('## Not A Section');
    });

    it('should not confuse code block content with MODIFIED/REMOVED sections', () => {
      const content = [
        '# Delta',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Template Example',
        '',
        '```',
        '## MODIFIED Requirements',
        '## REMOVED Requirements',
        '```',
        '',
        '### Requirement: Real Second',
        '',
        'Description.',
      ].join('\n');

      const plan = parseDeltaSpec(content);
      expect(plan.added).toHaveLength(2);
      expect(plan.modified).toHaveLength(0);
      expect(plan.removed).toHaveLength(0);
    });
  });

  describe('parseDeltaSpec — tilde fences (F3)', () => {
    it('should not split on ## headers inside tilde fences', () => {
      const content = [
        '# Delta Spec',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: Feature A',
        '',
        'Has tilde fence:',
        '',
        '~~~',
        '## Not A Section',
        '### Requirement: Not Real',
        '~~~',
        '',
        '### Requirement: Feature B',
        '',
        'Simple.',
      ].join('\n');

      const plan = parseDeltaSpec(content);
      expect(plan.added).toHaveLength(2);
      expect(plan.added[0].name).toBe('Feature A');
      expect(plan.added[1].name).toBe('Feature B');
      expect(plan.added[0].raw).toContain('## Not A Section');
    });
  });

  describe('parseScenarios — indented fences (F3)', () => {
    it('should not split on #### Scenario: inside indented backtick fences', () => {
      const block = {
        headerLine: '### Requirement: Test',
        name: 'Test',
        raw: [
          '### Requirement: Test',
          '',
          'The system MUST handle fences.',
          '',
          '#### Scenario: Real scenario',
          '- WHEN something happens',
          '- THEN show template:',
          '',
          '   ```',
          '   #### Scenario: Fake scenario',
          '   - WHEN fake',
          '   ```',
          '',
          '#### Scenario: Second real scenario',
          '- WHEN other thing',
          '- THEN result',
        ].join('\n'),
      };

      const parsed = parseScenarios(block);
      expect(parsed.scenarios).toHaveLength(2);
      expect(parsed.scenarios[0].name).toBe('Real scenario');
      expect(parsed.scenarios[1].name).toBe('Second real scenario');
      expect(parsed.scenarios[0].raw).toContain('#### Scenario: Fake scenario');
    });
  });
});
