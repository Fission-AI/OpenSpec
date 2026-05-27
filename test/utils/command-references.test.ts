import { describe, it, expect } from 'vitest';
import { transformToHyphenCommands } from '../../src/utils/command-references.js';

describe('transformToHyphenCommands', () => {
  describe('basic transformations', () => {
    it('should transform single command reference', () => {
      expect(transformToHyphenCommands('/pastel:new')).toBe('/pastel-new');
    });

    it('should transform multiple command references', () => {
      const input = '/pastel:new and /pastel:apply';
      const expected = '/pastel-new and /pastel-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should transform command reference in context', () => {
      const input = 'Use /pastel:apply to implement tasks';
      const expected = 'Use /pastel-apply to implement tasks';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/pastel:continue` to proceed';
      const expected = 'Run `/pastel-continue` to proceed';
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
      const input = '/ops:new pastel: /other:command';
      expect(transformToHyphenCommands(input)).toBe(input);
    });

    it('should handle multiple occurrences on same line', () => {
      const input = '/pastel:new /pastel:continue /pastel:apply';
      const expected = '/pastel-new /pastel-continue /pastel-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('multiline content', () => {
    it('should transform references across multiple lines', () => {
      const input = `Use /pastel:new to start
Then /pastel:continue to proceed
Finally /pastel:apply to implement`;
      const expected = `Use /pastel-new to start
Then /pastel-continue to proceed
Finally /pastel-apply to implement`;
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
      it(`should transform /pastel:${cmd}`, () => {
        expect(transformToHyphenCommands(`/pastel:${cmd}`)).toBe(`/pastel-${cmd}`);
      });
    }
  });
});
