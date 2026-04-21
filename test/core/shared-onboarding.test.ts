import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatGettingStarted,
  formatLinks,
  formatIdeRestart,
  printOnboardingFooter,
} from '../../src/core/shared/onboarding.js';

// Strip ANSI escape codes for content assertions
function stripAnsi(str: string): string {
  return str.replace(/\u001B\[\d+m/g, '');
}

describe('formatGettingStarted', () => {
  it('should show /opsx:propose when propose is in core profile', () => {
    const lines = formatGettingStarted({
      profile: 'core',
      hasConfiguredTools: true,
    });
    const plain = lines.map(stripAnsi);
    expect(plain).toContain('  Start your first change: /opsx:propose "your idea"');
    expect(plain.some((l) => l.includes('Getting started'))).toBe(true);
  });

  it('should show /opsx:new when custom profile has new but not propose', () => {
    const lines = formatGettingStarted({
      profile: 'custom',
      customWorkflows: ['explore', 'new', 'apply'],
      hasConfiguredTools: true,
    });
    const plain = lines.map(stripAnsi);
    expect(plain.some((l) => l.includes('/opsx:new'))).toBe(true);
    expect(plain.some((l) => l.includes('/opsx:propose'))).toBe(false);
  });

  it('should show /opsx:propose when custom profile includes propose', () => {
    const lines = formatGettingStarted({
      profile: 'custom',
      customWorkflows: ['propose', 'explore', 'apply'],
      hasConfiguredTools: true,
    });
    const plain = lines.map(stripAnsi);
    expect(plain.some((l) => l.includes('/opsx:propose'))).toBe(true);
  });

  it('should show fallback message when profile has neither propose nor new', () => {
    const lines = formatGettingStarted({
      profile: 'custom',
      customWorkflows: ['explore'],
      hasConfiguredTools: true,
    });
    const plain = lines.map(stripAnsi);
    expect(plain.some((l) => l.includes('openspec config profile'))).toBe(true);
  });

  it('should show fallback when custom profile has empty workflows', () => {
    const lines = formatGettingStarted({
      profile: 'custom',
      customWorkflows: [],
      hasConfiguredTools: false,
    });
    const plain = lines.map(stripAnsi);
    expect(plain.some((l) => l.includes('openspec config profile'))).toBe(true);
  });
});

describe('formatLinks', () => {
  it('should include repo and issues URLs', () => {
    const lines = formatLinks();
    const plain = lines.map(stripAnsi).join('\n');
    expect(plain).toContain('https://github.com/Fission-AI/OpenSpec');
    expect(plain).toContain('https://github.com/Fission-AI/OpenSpec/issues');
  });
});

describe('formatIdeRestart', () => {
  it('should mention IDE restart', () => {
    const msg = stripAnsi(formatIdeRestart());
    expect(msg).toContain('Restart your IDE');
  });
});

describe('printOnboardingFooter', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should print getting-started, links, and IDE restart when tools were configured', () => {
    printOnboardingFooter({
      profile: 'core',
      hasConfiguredTools: true,
    });

    const output = consoleSpy.mock.calls
      .map((call) => call.map(String).join(' '))
      .join('\n');
    const plain = stripAnsi(output);

    expect(plain).toContain('Getting started');
    expect(plain).toContain('/opsx:propose');
    expect(plain).toContain('https://github.com/Fission-AI/OpenSpec');
    expect(plain).toContain('Restart your IDE');
  });

  it('should not print IDE restart when no tools were configured', () => {
    printOnboardingFooter({
      profile: 'core',
      hasConfiguredTools: false,
    });

    const output = consoleSpy.mock.calls
      .map((call) => call.map(String).join(' '))
      .join('\n');
    const plain = stripAnsi(output);

    expect(plain).toContain('Getting started');
    expect(plain).not.toContain('Restart your IDE');
  });

  it('should produce identical output for init and update contexts with same profile', () => {
    // Simulate init context
    printOnboardingFooter({
      profile: 'core',
      hasConfiguredTools: true,
    });
    const initOutput = consoleSpy.mock.calls
      .map((call) => call.map(String).join(' '))
      .join('\n');

    consoleSpy.mockClear();

    // Simulate update context (same profile)
    printOnboardingFooter({
      profile: 'core',
      hasConfiguredTools: true,
    });
    const updateOutput = consoleSpy.mock.calls
      .map((call) => call.map(String).join(' '))
      .join('\n');

    expect(initOutput).toBe(updateOutput);
  });
});
