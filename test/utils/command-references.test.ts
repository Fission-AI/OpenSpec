import { describe, it, expect } from 'vitest';
import { transformToHyphenCommands } from '../../src/utils/command-references.js';

describe('transformToHyphenCommands', () => {
  describe('basic transformations', () => {
    it('should transform single command reference', () => {
      expect(transformToHyphenCommands('/pstl:new')).toBe('/pstl-new');
    });

    it('should transform multiple command references', () => {
      const input = '/pstl:new and /pstl:apply';
      const expected = '/pstl-new and /pstl-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should transform command reference in context', () => {
      const input = 'Use /pstl:apply to implement tasks';
      const expected = 'Use /pstl-apply to implement tasks';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/pstl:continue` to proceed';
      const expected = 'Run `/pstl-continue` to proceed';
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
      const input = '/ops:new pstl: /other:command';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should handle multiple occurrences on same line', () => {
      const input = '/pstl:new /pstl:continue /pstl:apply';
      const expected = '/pstl-new /pstl-continue /pstl-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('multiline content', () => {
    it('should transform references across multiple lines', () => {
      const input = `Use /pstl:new to start
Then /pstl:continue to proceed
Finally /pstl:apply to implement`;
      const expected = `Use /pstl-new to start
Then /pstl-continue to proceed
Finally /pstl-apply to implement`;
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
      it(`should transform /pstl:${cmd}`, () => {
        expect(transformToHyphenCommands(`/pstl:${cmd}`)).toBe(`/pstl-${cmd}`);
      });
    }
  });
});
