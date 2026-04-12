/**
 * Output Consistency Tests
 *
 * Verifies that init, update, and migration produce consistent
 * onboarding output using the shared helpers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';
import { saveGlobalConfig, getGlobalConfig } from '../../src/core/global-config.js';

const { confirmMock, showWelcomeScreenMock, searchableMultiSelectMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  showWelcomeScreenMock: vi.fn().mockResolvedValue(undefined),
  searchableMultiSelectMock: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: confirmMock,
}));

vi.mock('../../src/ui/welcome-screen.js', () => ({
  showWelcomeScreen: showWelcomeScreenMock,
}));

vi.mock('../../src/prompts/searchable-multi-select.js', () => ({
  searchableMultiSelect: searchableMultiSelectMock,
}));

// Strip ANSI escape codes for content assertions
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001B\[[\d;]*m/g, '');
}

function collectOutput(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls
    .map((call) => call.map(String).join(' '))
    .join('\n');
}

describe('init and update output consistency', () => {
  let testDir: string;
  let configTempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-output-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    originalEnv = { ...process.env };
    configTempDir = path.join(os.tmpdir(), `openspec-config-output-${Date.now()}`);
    await fs.mkdir(configTempDir, { recursive: true });
    process.env.XDG_CONFIG_HOME = configTempDir;

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(true);
    showWelcomeScreenMock.mockClear();
    searchableMultiSelectMock.mockReset();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(configTempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('init should include getting-started with /opsx:propose for core profile', async () => {
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const output = stripAnsi(collectOutput(consoleSpy));
    expect(output).toContain('Getting started');
    expect(output).toContain('/opsx:propose');
  });

  it('init should include links in output', async () => {
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const output = stripAnsi(collectOutput(consoleSpy));
    expect(output).toContain('https://github.com/Fission-AI/OpenSpec');
    expect(output).toContain('https://github.com/Fission-AI/OpenSpec/issues');
  });

  it('init should include IDE restart message', async () => {
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const output = stripAnsi(collectOutput(consoleSpy));
    expect(output).toContain('Restart your IDE');
  });

  it('update should include IDE restart message after updating tools', async () => {
    // First init
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    consoleSpy.mockClear();

    // Force update
    const updateCommand = new UpdateCommand({ force: true });
    await updateCommand.execute(testDir);

    const output = stripAnsi(collectOutput(consoleSpy));
    expect(output).toContain('Restart your IDE');
  });

  it('init and update should use the same IDE restart wording', async () => {
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const initOutput = stripAnsi(collectOutput(consoleSpy));
    const initRestartLine = initOutput.split('\n').find((l) => l.includes('Restart your IDE'));

    consoleSpy.mockClear();

    const updateCommand = new UpdateCommand({ force: true });
    await updateCommand.execute(testDir);

    const updateOutput = stripAnsi(collectOutput(consoleSpy));
    const updateRestartLine = updateOutput.split('\n').find((l) => l.includes('Restart your IDE'));

    expect(initRestartLine).toBe(updateRestartLine);
  });

  it('init should show /opsx:new for custom profile without propose', async () => {
    saveGlobalConfig({
      featureFlags: {},
      profile: 'custom',
      delivery: 'both',
      workflows: ['explore', 'new', 'apply'],
    });

    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const output = stripAnsi(collectOutput(consoleSpy));
    expect(output).toContain('Getting started');
    expect(output).toContain('/opsx:new');
    expect(output).not.toContain('/opsx:propose');
  });

  it('migration output should include propose hint', async () => {
    // Pre-create existing skills to trigger migration
    const skillsDir = path.join(testDir, '.claude', 'skills', 'openspec-explore');
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'SKILL.md'), 'old content');

    // Create openspec dir to trigger extend mode
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });

    // Run init (which triggers migrateIfNeeded in extend mode)
    const initCommand = new InitCommand({ tools: 'claude', force: true });
    await initCommand.execute(testDir);

    const output = stripAnsi(collectOutput(consoleSpy));
    // Migration should mention propose
    expect(output).toContain('/opsx:propose');
  });
});
