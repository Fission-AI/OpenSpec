import { describe, it, expect } from 'vitest';
import {
  isCommandsOnlyTool,
  shouldGenerateCommandsForTool,
  shouldGenerateSkillsForTool,
  shouldReconcileCommandFilesForTool,
  shouldRemoveSkillsForTool,
} from '../../src/core/command-surface.js';

const DELIVERIES = ['both', 'skills', 'commands'] as const;

describe('commands-only tools', () => {
  it('treats Amazon Q as commands-only, and an ordinary command tool as not', () => {
    expect(isCommandsOnlyTool('amazon-q')).toBe(true);
    expect(isCommandsOnlyTool('claude')).toBe(false);
    expect(isCommandsOnlyTool('codex')).toBe(false);
  });

  it.each(DELIVERIES)('gives Amazon Q commands and no skills under delivery %s', (delivery) => {
    expect(shouldGenerateCommandsForTool('amazon-q', delivery)).toBe(true);
    expect(shouldGenerateSkillsForTool('amazon-q', delivery)).toBe(false);
    // Its commands are its only surface, so they are never cleared as the
    // leftovers of a skills-only switch.
    expect(shouldReconcileCommandFilesForTool('amazon-q', delivery)).toBe(false);
  });

  it('leaves its leftover skills in place except where commands-only delivery always removed them', () => {
    expect(shouldRemoveSkillsForTool('amazon-q', 'both')).toBe(false);
    expect(shouldRemoveSkillsForTool('amazon-q', 'skills')).toBe(false);
    // Unchanged: `delivery: commands` already removed every tool's skills.
    expect(shouldRemoveSkillsForTool('amazon-q', 'commands')).toBe(true);
  });

  it('does not change any other tool', () => {
    expect(shouldGenerateCommandsForTool('claude', 'skills')).toBe(false);
    expect(shouldGenerateSkillsForTool('claude', 'skills')).toBe(true);
    expect(shouldReconcileCommandFilesForTool('claude', 'skills')).toBe(true);
    expect(shouldGenerateSkillsForTool('codex', 'commands')).toBe(true);
  });
});
