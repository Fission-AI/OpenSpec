import { describe, expect, it } from 'vitest';

import {
  formatIdeRestart,
  resolveIdeRestartSurface,
} from '../../src/core/shared/ide-restart.js';

describe('resolveIdeRestartSurface', () => {
  it('names commands when an IDE-resident tool received command files', () => {
    expect(resolveIdeRestartSurface(['cursor'], 'both')).toBe('commands');
    expect(resolveIdeRestartSurface(['cursor'], 'commands')).toBe('commands');
  });

  it('names skills when the IDE-resident tool only received skills', () => {
    expect(resolveIdeRestartSurface(['cursor'], 'skills')).toBe('skills');
  });

  it('stays silent for CLI-resident tools, which pick files up immediately', () => {
    expect(resolveIdeRestartSurface(['claude'], 'both')).toBeNull();
    expect(resolveIdeRestartSurface(['codex'], 'skills')).toBeNull();
  });

  it('does not borrow generation from a co-configured CLI tool', () => {
    // claude and codex both received a surface here; neither is IDE-resident,
    // so nothing is waiting on a restart and no hint is due.
    expect(resolveIdeRestartSurface(['claude', 'codex'], 'both')).toBeNull();
  });

  it('handles duplicates and empty input', () => {
    expect(resolveIdeRestartSurface(['cursor', 'cursor', 'claude'], 'commands')).toBe(
      'commands'
    );
    expect(resolveIdeRestartSurface([], 'both')).toBeNull();
  });
});

describe('formatIdeRestart', () => {
  it('produces the same sentence init and update both print', () => {
    expect(formatIdeRestart(['cursor'], 'both')).toBe(
      'Restart your IDE for the new commands to take effect.'
    );
    expect(formatIdeRestart(['cursor'], 'skills')).toBe(
      'Restart your IDE for the new skills to take effect.'
    );
  });

  it('returns null when no restart is needed', () => {
    expect(formatIdeRestart(['claude'], 'both')).toBeNull();
  });
});
