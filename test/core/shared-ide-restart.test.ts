import { describe, expect, it } from 'vitest';

import {
  formatIdeRestart,
  resolveIdeRestartSurface,
} from '../../src/core/shared/ide-restart.js';

describe('resolveIdeRestartSurface', () => {
  it('names skills for an IDE-resident tool under every delivery setting (2.0 has no commands)', () => {
    for (const delivery of ['both', 'skills', 'commands'] as const) {
      expect(resolveIdeRestartSurface(['cursor'], delivery), delivery).toBe('skills');
    }
  });

  it('stays silent for CLI-resident tools, which pick files up immediately', () => {
    expect(resolveIdeRestartSurface(['claude'], 'both')).toBeNull();
    expect(resolveIdeRestartSurface(['codex'], 'skills')).toBeNull();
  });

  it('handles duplicates and empty input', () => {
    expect(resolveIdeRestartSurface(['cursor', 'cursor', 'claude'], 'both')).toBe('skills');
    expect(resolveIdeRestartSurface([], 'both')).toBeNull();
  });
});

describe('formatIdeRestart', () => {
  it('produces the same sentence init and update both print', () => {
    expect(formatIdeRestart(['cursor'], 'both')).toBe('Restart your IDE to refresh skills.');
    expect(formatIdeRestart(['cursor'], 'commands')).toBe('Restart your IDE to refresh skills.');
  });

  it('returns null when no restart is needed', () => {
    expect(formatIdeRestart(['claude'], 'both')).toBeNull();
  });
});
