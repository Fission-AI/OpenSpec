import { describe, it, expect } from 'vitest';
import {
  transformToHyphenCommands,
  transformCommandReferences,
  formatCommandInvocation,
  formatCommandFamily,
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

describe('transformCommandReferences', () => {
  it('should preserve colon style as-is', () => {
    const input = 'Run /opsx:new then /opsx:apply';
    expect(transformCommandReferences(input, 'opsx-colon')).toBe(input);
  });

  it('should transform to hyphen style', () => {
    const input = 'Run /opsx:new then /opsx:apply';
    expect(transformCommandReferences(input, 'opsx-hyphen')).toBe('Run /opsx-new then /opsx-apply');
  });

  it('should transform to openspec skill invocation style', () => {
    const input = 'Run /opsx:new then /opsx:continue then /opsx:apply';
    expect(transformCommandReferences(input, 'openspec-hyphen')).toBe(
      'Run /openspec-new-change then /openspec-continue-change then /openspec-apply-change'
    );
  });
});

describe('formatCommandInvocation', () => {
  it('should format opsx colon syntax', () => {
    expect(formatCommandInvocation('propose', 'opsx-colon')).toBe('/opsx:propose');
  });

  it('should format opsx hyphen syntax', () => {
    expect(formatCommandInvocation('propose', 'opsx-hyphen')).toBe('/opsx-propose');
  });

  it('should format openspec skill syntax for known workflow IDs', () => {
    expect(formatCommandInvocation('new', 'openspec-hyphen')).toBe('/openspec-new-change');
    expect(formatCommandInvocation('sync', 'openspec-hyphen')).toBe('/openspec-sync-specs');
  });
});

describe('formatCommandFamily', () => {
  it('should format wildcard hint for opsx colon style', () => {
    expect(formatCommandFamily('opsx-colon')).toBe('/opsx:*');
  });

  it('should format wildcard hint for opsx hyphen style', () => {
    expect(formatCommandFamily('opsx-hyphen')).toBe('/opsx-*');
  });

  it('should format wildcard hint for openspec hyphen style', () => {
    expect(formatCommandFamily('openspec-hyphen')).toBe('/openspec-*');
  });
});
