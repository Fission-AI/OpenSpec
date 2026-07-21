import { describe, it, expect } from 'vitest';
import {
  getSkillReferenceTransformer,
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

describe('getSkillReferenceTransformer', () => {
  it('uses the default /<name> form for tools without a custom prefix', () => {
    expect(getSkillReferenceTransformer('vibe')).toBe(transformToSkillReferences);
    expect(getSkillReferenceTransformer('hermes')('/opsx:apply')).toBe('/openspec-apply-change');
  });

  it('uses /skill:<name> for Kimi Code, per its documented invocation syntax', () => {
    const transformer = getSkillReferenceTransformer('kimi');
    expect(transformer('/opsx:propose')).toBe('/skill:openspec-propose');
    expect(transformer('Run `/opsx:apply` then /opsx:archive')).toBe(
      'Run `/skill:openspec-apply-change` then /skill:openspec-archive-change'
    );
    expect(transformer('/opsx:unknown-command')).toBe('/opsx:unknown-command');
  });
});

describe('getTransformerForTool', () => {
  it('selects skill references for skills-only delivery for every tool', () => {
    expect(getTransformerForTool('claude', 'skills', 'adapter-backed')).toBe(transformToSkillReferences);
    expect(getTransformerForTool('codex', 'skills', 'skills-invocable')).toBe(transformToSkillReferences);
    // hyphen-command tools must not fall back to hyphen commands when no commands are generated
    expect(getTransformerForTool('opencode', 'skills', 'adapter-backed')).toBe(transformToSkillReferences);
    expect(getTransformerForTool('pi', 'skills', 'adapter-backed')).toBe(transformToSkillReferences);
    expect(getTransformerForTool('oh-my-pi', 'skills', 'adapter-backed')).toBe(transformToSkillReferences);
  });

  it('selects skill references for tools without a command surface, regardless of delivery', () => {
    // Tools like Kimi Code or Mistral Vibe have no command adapter, so their
    // skills must never reference /opsx:* commands that were not generated.
    expect(getTransformerForTool('vibe', 'both', 'none')).toBe(transformToSkillReferences);
    expect(getTransformerForTool('hermes', 'both', 'none')).toBe(transformToSkillReferences);
    // Kimi Code documents /skill:<name> invocations (docs/supported-tools.md)
    for (const delivery of ['both', 'commands', 'skills'] as const) {
      const transformer = getTransformerForTool('kimi', delivery, 'none');
      expect(transformer?.('/opsx:propose')).toBe('/skill:openspec-propose');
    }
  });

  it('selects hyphen commands for opencode, pi, and oh-my-pi when commands are generated', () => {
    expect(getTransformerForTool('opencode', 'both', 'adapter-backed')).toBe(transformToHyphenCommands);
    expect(getTransformerForTool('opencode', 'commands', 'adapter-backed')).toBe(transformToHyphenCommands);
    expect(getTransformerForTool('pi', 'both', 'adapter-backed')).toBe(transformToHyphenCommands);
    expect(getTransformerForTool('pi', 'commands', 'adapter-backed')).toBe(transformToHyphenCommands);
    expect(getTransformerForTool('oh-my-pi', 'both', 'adapter-backed')).toBe(transformToHyphenCommands);
    expect(getTransformerForTool('oh-my-pi', 'commands', 'adapter-backed')).toBe(transformToHyphenCommands);
  });

  it('selects no transformer for adapter-backed and skills-invocable tools when commands are generated', () => {
    expect(getTransformerForTool('claude', 'both', 'adapter-backed')).toBeUndefined();
    expect(getTransformerForTool('claude', 'commands', 'adapter-backed')).toBeUndefined();
    expect(getTransformerForTool('codex', 'both', 'skills-invocable')).toBeUndefined();
  });
});
