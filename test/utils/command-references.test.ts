import { describe, it, expect } from 'vitest';
import {
  getSkillReferencePrefix,
  transformToHyphenCommands,
  transformToSkillReferences,
  transformToToolSkillReferences,
} from '../../src/utils/command-references.js';

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
  it('should transform command references to skill names', () => {
    expect(transformToSkillReferences('/opsx:apply')).toBe('openspec-apply-change');
  });

  it('should apply an optional skill invocation prefix', () => {
    expect(transformToSkillReferences('Run /opsx:propose', '/skill:')).toBe(
      'Run /skill:openspec-propose'
    );
  });

  it('should transform multiple workflow references', () => {
    const input = 'Use /opsx:new, then /opsx:continue and /opsx:archive';
    const expected = 'Use openspec-new-change, then openspec-continue-change and openspec-archive-change';
    expect(transformToSkillReferences(input)).toBe(expected);
  });

  it('should leave unknown command references unchanged', () => {
    expect(transformToSkillReferences('/opsx:unknown')).toBe('/opsx:unknown');
  });

  it('should use Kimi skill invocation prefix for tool-specific references', () => {
    expect(getSkillReferencePrefix('kimi')).toBe('/skill:');
    expect(transformToToolSkillReferences('/opsx:apply', 'kimi')).toBe('/skill:openspec-apply-change');
  });

  it('should use plain skill names for tools without a specific prefix', () => {
    expect(getSkillReferencePrefix('vibe')).toBe('');
    expect(transformToToolSkillReferences('/opsx:apply', 'vibe')).toBe('openspec-apply-change');
  });
});
