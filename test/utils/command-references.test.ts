import { describe, it, expect } from 'vitest';
import {
  getTransformerForTool,
  transformToHyphenCommands,
  transformToSkillReferences,
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
      'update',
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
  describe('all known commands', () => {
    const mappings: Array<[string, string]> = [
      ['explore', '/openspec-explore'],
      ['new', '/openspec-new-change'],
      ['continue', '/openspec-continue-change'],
      ['apply', '/openspec-apply-change'],
      ['update', '/openspec-update-change'],
      ['ff', '/openspec-ff-change'],
      ['sync', '/openspec-sync-specs'],
      ['archive', '/openspec-archive-change'],
      ['bulk-archive', '/openspec-bulk-archive-change'],
      ['verify', '/openspec-verify-change'],
      ['onboard', '/openspec-onboard'],
      ['propose', '/openspec-propose'],
    ];

    for (const [cmd, skillRef] of mappings) {
      it(`should transform /opsx:${cmd} to ${skillRef}`, () => {
        expect(transformToSkillReferences(`/opsx:${cmd}`)).toBe(skillRef);
      });
    }
  });

  describe('basic transformations', () => {
    it('should transform command reference in context', () => {
      const input = 'Use /opsx:apply to implement tasks';
      const expected = 'Use /openspec-apply-change to implement tasks';
      expect(transformToSkillReferences(input)).toBe(expected);
    });

    it('should transform multiple command references', () => {
      const input = 'Run /opsx:apply then /opsx:archive';
      const expected = 'Run /openspec-apply-change then /openspec-archive-change';
      expect(transformToSkillReferences(input)).toBe(expected);
    });

    it('should handle backtick-quoted commands', () => {
      const input = 'Run `/opsx:continue` to proceed';
      const expected = 'Run `/openspec-continue-change` to proceed';
      expect(transformToSkillReferences(input)).toBe(expected);
    });

    it('should transform references across multiple lines', () => {
      const input = `Use /opsx:new to start
Then /opsx:apply to implement`;
      const expected = `Use /openspec-new-change to start
Then /openspec-apply-change to implement`;
      expect(transformToSkillReferences(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should return unchanged text with no command references', () => {
      const input = 'This is plain text without commands';
      expect(transformToSkillReferences(input)).toBe(input);
    });

    it('should return empty string unchanged', () => {
      expect(transformToSkillReferences('')).toBe('');
    });

    it('should leave unknown command references unchanged', () => {
      const input = 'Try /opsx:unknown-command here';
      expect(transformToSkillReferences(input)).toBe(input);
    });

    it('should not transform similar but non-matching patterns', () => {
      const input = '/ops:new opsx: /other:command';
      expect(transformToSkillReferences(input)).toBe(input);
    });

    it('should transform longest matching command (bulk-archive vs archive)', () => {
      const input = '/opsx:bulk-archive and /opsx:archive';
      const expected = '/openspec-bulk-archive-change and /openspec-archive-change';
      expect(transformToSkillReferences(input)).toBe(expected);
    });
  });
});

describe('getTransformerForTool', () => {
  it('selects skill references for skills-only delivery for every tool', () => {
    expect(getTransformerForTool('claude', 'skills')).toBe(transformToSkillReferences);
    expect(getTransformerForTool('codex', 'skills')).toBe(transformToSkillReferences);
    // hyphen-command tools must not fall back to hyphen commands when no commands are generated
    expect(getTransformerForTool('opencode', 'skills')).toBe(transformToSkillReferences);
    expect(getTransformerForTool('pi', 'skills')).toBe(transformToSkillReferences);
    expect(getTransformerForTool('oh-my-pi', 'skills')).toBe(transformToSkillReferences);
  });

  it('selects hyphen commands for opencode, pi, and oh-my-pi when commands are generated', () => {
    expect(getTransformerForTool('opencode', 'both')).toBe(transformToHyphenCommands);
    expect(getTransformerForTool('opencode', 'commands')).toBe(transformToHyphenCommands);
    expect(getTransformerForTool('pi', 'both')).toBe(transformToHyphenCommands);
    expect(getTransformerForTool('pi', 'commands')).toBe(transformToHyphenCommands);
    expect(getTransformerForTool('oh-my-pi', 'both')).toBe(transformToHyphenCommands);
    expect(getTransformerForTool('oh-my-pi', 'commands')).toBe(transformToHyphenCommands);
  });

  it('selects no transformer for other tools when commands are generated', () => {
    expect(getTransformerForTool('claude', 'both')).toBeUndefined();
    expect(getTransformerForTool('claude', 'commands')).toBeUndefined();
  });
});
