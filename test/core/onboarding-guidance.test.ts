import { describe, expect, it } from 'vitest';
import { buildOnboardingGuidance } from '../../src/core/onboarding-guidance.js';

describe('buildOnboardingGuidance', () => {
  it('uses colon syntax for Claude Code command examples', () => {
    const lines = buildOnboardingGuidance({
      workflows: ['propose', 'explore', 'apply', 'archive'],
      delivery: 'both',
      toolIds: ['claude'],
    });

    expect(lines).toContain('Available workflows: propose, explore, apply, archive');
    expect(lines).toContain('Delivery: both (skills + commands)');
    expect(lines).toContain('  Claude Code: /opsx:propose "your idea"');
  });

  it('uses hyphen syntax for OpenCode command examples', () => {
    const lines = buildOnboardingGuidance({
      workflows: ['propose', 'explore', 'apply', 'archive'],
      delivery: 'both',
      toolIds: ['opencode'],
    });

    expect(lines).toContain('  OpenCode: /opsx-propose "your idea"');
  });

  it('falls back to skill invocations for skills-only delivery', () => {
    const lines = buildOnboardingGuidance({
      workflows: ['propose', 'explore', 'apply', 'archive'],
      delivery: 'skills',
      toolIds: ['claude'],
    });

    expect(lines).toContain('  Claude Code: /openspec-propose "your idea"');
    expect(lines).toContain('Command files were not generated because delivery is set to skills-only.');
  });

  it('explains skill-based tools when no command adapter exists', () => {
    const lines = buildOnboardingGuidance({
      workflows: ['propose', 'explore', 'apply', 'archive'],
      delivery: 'both',
      toolIds: ['forgecode'],
    });

    expect(lines).toContain('  ForgeCode: /openspec-propose "your idea"');
    expect(lines).toContain('These tools use skill-based invocations here: ForgeCode.');
  });
});
