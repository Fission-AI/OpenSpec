import { describe, it, expect } from 'vitest';
import { transformToHyphenCommands, transformToCodexCommands } from '../../src/utils/command-references.js';

describe('transformToHyphenCommands', () => {
  describe('basic transformations', () => {
    it('should transform single command reference', () => {
      expect(transformToHyphenCommands('/opsx:new')).toBe('/opsx-new');
    });

    it('should transform multiple command references', () => {
      const input = '/opsx:new and /opsx:apply';
      const expected = '/opsx-new and /opsx-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should transform command reference in context', () => {
      const input = 'Use /opsx:apply to implement tasks';
      const expected = 'Use /opsx-apply to implement tasks';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/opsx:continue` to proceed';
      const expected = 'Run `/opsx-continue` to proceed';
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
      const input = '/opsx:new /opsx:continue /opsx:apply';
      const expected = '/opsx-new /opsx-continue /opsx-apply';
      expect(transformToHyphenCommands(input)).toBe(expected);
    });
  });

  describe('multiline content', () => {
    it('should transform references across multiple lines', () => {
      const input = `Use /opsx:new to start
Then /opsx:continue to proceed
Finally /opsx:apply to implement`;
      const expected = `Use /opsx-new to start
Then /opsx-continue to proceed
Finally /opsx-apply to implement`;
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
      it(`should transform /opsx:${cmd}`, () => {
        expect(transformToHyphenCommands(`/opsx:${cmd}`)).toBe(`/opsx-${cmd}`);
      });
    }
  });
});

describe('transformToCodexCommands', () => {
  describe('basic transformations', () => {
    it('should transform colon command references', () => {
      expect(transformToCodexCommands('/opsx:new')).toBe('/prompts:opsx-new');
    });

    it('should transform hyphen command references', () => {
      expect(transformToCodexCommands('/opsx-apply')).toBe('/prompts:opsx-apply');
    });

    it('should transform multiple command references', () => {
      const input = 'Use /opsx:new then /opsx-apply';
      const expected = 'Use /prompts:opsx-new then /prompts:opsx-apply';
      expect(transformToCodexCommands(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/opsx:continue` to proceed';
      const expected = 'Run `/prompts:opsx-continue` to proceed';
      expect(transformToCodexCommands(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should return unchanged text with no command references', () => {
      const input = 'This is plain text without commands';
      expect(transformToCodexCommands(input)).toBe(input);
    });

    it('should return empty string unchanged', () => {
      expect(transformToCodexCommands('')).toBe('');
    });

    it('should not transform similar but non-matching patterns', () => {
      const input = '/ops:new opsx: /other:command';
      expect(transformToCodexCommands(input)).toBe(input);
    });
  });
});
