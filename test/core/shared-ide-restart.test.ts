import { afterEach, describe, expect, it, vi } from 'vitest';

import { CommandAdapterRegistry } from '../../src/core/command-generation/index.js';

import {
  formatIdeRestart,
  resolveIdeRestartSurface,
} from '../../src/core/shared/ide-restart.js';

describe('resolveIdeRestartSurface', () => {
  afterEach(() => vi.restoreAllMocks());

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

  it.each([
    ['commands', null],
    ['both', 'skills'],
  ] as const)('does not borrow CLI commands when delivery is %s', (delivery, expected) => {
    // Model an IDE tool without an adapter: it receives no files with commands
    // delivery, and only skills with both. Claude still receives commands.
    const hasAdapter = CommandAdapterRegistry.has.bind(CommandAdapterRegistry);
    vi.spyOn(CommandAdapterRegistry, 'has').mockImplementation(
      (toolId) => toolId !== 'cursor' && hasAdapter(toolId)
    );

    expect(resolveIdeRestartSurface(['claude', 'cursor'], delivery)).toBe(expected);
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
      'Restart your IDE to refresh commands.'
    );
    expect(formatIdeRestart(['cursor'], 'skills')).toBe(
      'Restart your IDE to refresh skills.'
    );
  });

  it('returns null when no restart is needed', () => {
    expect(formatIdeRestart(['claude'], 'both')).toBeNull();
  });
});
