import { describe, it, expect } from 'vitest';
import {
  COMMAND_DEPRECATION_URL,
  formatCommandDeprecationNotice,
} from '../../src/core/command-surface.js';

describe('formatCommandDeprecationNotice', () => {
  it.each(['both', 'commands'] as const)(
    'announces the change when delivery %s still generates command files',
    (delivery) => {
      expect(formatCommandDeprecationNotice(['claude'], delivery)).toEqual([
        'Command files are deprecated and go away in OpenSpec 2.0. Your OpenSpec skills stay and do the same work.',
        '  Switch now: openspec config set delivery skills && openspec update',
        '  This removes only the command files OpenSpec generated; any you edited are kept and listed.',
        `  Details: ${COMMAND_DEPRECATION_URL}`,
      ]);
    }
  );

  it('says nothing to a project already on skills-only delivery', () => {
    expect(formatCommandDeprecationNotice(['claude', 'cursor'], 'skills')).toEqual([]);
  });

  it('says nothing when no configured tool gets command files', () => {
    // Codex is skills-invocable and has no command adapter, so a Codex-only
    // project is unaffected by the deprecation even on the default delivery.
    expect(formatCommandDeprecationNotice(['codex'], 'both')).toEqual([]);
    expect(formatCommandDeprecationNotice([], 'both')).toEqual([]);
  });

  it('announces it once for a mixed project where one tool gets commands', () => {
    expect(formatCommandDeprecationNotice(['codex', 'claude'], 'both')).toHaveLength(4);
  });
});
