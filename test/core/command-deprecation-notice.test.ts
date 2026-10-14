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
        'Command files are deprecated: the next major version of OpenSpec installs skills only by default.',
        '  Switch to skills now: openspec config set delivery skills && openspec update',
        '  Keep commands for now: openspec config set delivery both',
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
