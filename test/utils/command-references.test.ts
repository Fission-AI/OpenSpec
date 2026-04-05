import { describe, it, expect } from 'vitest';
import { transformToHyphenCommands, transformToSkillReferences } from '../../src/utils/command-references.js';

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

describe('transformToSkillReferences', () => {
  it('should transform known workflow references to skill references', () => {
    const input = 'Use /opsx:apply then /opsx:archive';
    const expected = 'Use /openspec-apply-change then /openspec-archive-change';
    expect(transformToSkillReferences(input)).toBe(expected);
  });

  it('should transform all known workflow references', () => {
    const mappings = {
      '/opsx:apply': '/openspec-apply-change',
      '/opsx:archive': '/openspec-archive-change',
      '/opsx:verify': '/openspec-verify-change',
      '/opsx:continue': '/openspec-continue-change',
      '/opsx:propose': '/openspec-propose',
      '/opsx:explore': '/openspec-explore',
      '/opsx:ff': '/openspec-ff-change',
      '/opsx:new': '/openspec-new-change',
      '/opsx:sync': '/openspec-sync-specs',
      '/opsx:bulk-archive': '/openspec-bulk-archive-change',
      '/opsx:onboard': '/openspec-onboard',
    };

    for (const [input, expected] of Object.entries(mappings)) {
      expect(transformToSkillReferences(input)).toBe(expected);
    }
  });

  it('should leave unknown workflow references unchanged', () => {
    const input = 'Unknown /opsx:unknown should stay untouched';
    expect(transformToSkillReferences(input)).toBe(input);
  });

  it('should leave non-command text unchanged', () => {
    const input = 'This is plain text without command references';
    expect(transformToSkillReferences(input)).toBe(input);
  });
});
