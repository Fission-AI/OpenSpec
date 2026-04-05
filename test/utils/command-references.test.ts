import { describe, it, expect } from 'vitest';
import { transformToHyphenCommands } from '../../src/utils/command-references.js';

describe('transformToHyphenCommands', () => {
  describe('basic transformations', () => {
    it('should transform single command reference', () => {
      expect(transformToHyphenCommands('/openspec:new')).toBe('/openspec-new');
    });

    it('should transform multiple command references', () => {
      const input = '/openspec:new and /openspec:apply';
      const expected = '/openspec-new and /openspec-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should transform command reference in context', () => {
      const input = 'Use /openspec:apply to implement tasks';
      const expected = 'Use /openspec-apply to implement tasks';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/openspec:continue` to proceed';
      const expected = 'Run `/openspec-continue` to proceed';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should return unchanged text with no command references', () => {
      const input = 'This is plain text without commands';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should return empty string unchanged', () => {
      expect(transformToHyphenCommands('')).toBe('');
    });

    it('should not transform similar but non-matching patterns', () => {
      const input = '/ops:new opsx: /other:command';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should handle multiple occurrences on same line', () => {
      const input = '/openspec:new /openspec:continue /openspec:apply';
      const expected = '/openspec-new /openspec-continue /openspec-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('multiline content', () => {
    it('should transform references across multiple lines', () => {
      const input = `Use /openspec:new to start
Then /openspec:continue to proceed
Finally /openspec:apply to implement`;
      const expected = `Use /openspec-new to start
Then /openspec-continue to proceed
Finally /openspec-apply to implement`;
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('all known commands', () => {
    const commands = [
      'new',
      'continue',
      'apply',
      'ff',
      'sync',
      'archive',
      'bulk-archive',
      'verify',
      'explore',
      'onboard',
    ];

    for (const cmd of commands) {
      it(`should transform /openspec:${cmd}`, () => {
        expect(transformToHyphenCommands(`/openspec:${cmd}`)).toBe(`/openspec-${cmd}`);
      });
    }
  });
});
