import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

async function runConfigCommand(args: string[]): Promise<void> {
  const { registerConfigCommand } = await import('../../src/cli/commands/config.js');
  const program = new Command();
  registerConfigCommand(program);
  await program.parseAsync(['node', 'openspec', 'config', ...args]);
}

async function getPromptMocks(): Promise<{
  select: ReturnType<typeof vi.fn>;
  checkbox: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
}> {
  const prompts = await import('@inquirer/prompts');
  return {
    select: prompts.select as unknown as ReturnType<typeof vi.fn>,
    checkbox: prompts.checkbox as unknown as ReturnType<typeof vi.fn>,
    confirm: prompts.confirm as unknown as ReturnType<typeof vi.fn>,
  };
}

describe('diffProfileState workflow formatting', () => {
  it('uses explicit "removed" wording when workflows are deleted', async () => {
    const { diffProfileState } = await import('../../src/commands/config.js');

    const diff = diffProfileState(
      { profile: 'custom', delivery: 'both', workflows: ['propose', 'sync'] },
      { profile: 'custom', delivery: 'both', workflows: ['propose'] },
    );

    expect(diff.hasChanges).toBe(true);
    expect(diff.lines).toEqual(['workflows: removed sync']);
  });

  it('uses explicit labels when workflows are added and removed', async () => {
    const { diffProfileState } = await import('../../src/commands/config.js');

    const diff = diffProfileState(
      { profile: 'custom', delivery: 'both', workflows: ['propose', 'sync'] },
      { profile: 'custom', delivery: 'both', workflows: ['propose', 'verify'] },
    );

    expect(diff.hasChanges).toBe(true);
    expect(diff.lines).toEqual(['workflows: added verify; removed sync']);
  });
});

describe('deriveProfileFromWorkflowSelection', () => {
  it('returns custom for an empty workflow selection', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');
    expect(deriveProfileFromWorkflowSelection([])).toBe('custom');
  });

  it('returns custom when selection is a superset of core workflows', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');
    expect(deriveProfileFromWorkflowSelection(['propose', 'explore', 'apply', 'update', 'sync', 'archive', 'new'])).toBe('custom');
  });

  it('returns core when selection has exactly core workflows in different order', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');
    expect(deriveProfileFromWorkflowSelection(['archive', 'sync', 'update', 'apply', 'explore', 'propose'])).toBe('core');
  });
});

describe('config profile interactive flow', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;
  let originalTTY: boolean | undefined;
  let originalExitCode: number | undefined;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  function setupDriftedProjectArtifacts(projectDir: string): void {
    fs.mkdirSync(path.join(projectDir, 'openspec'), { recursive: true });
    const exploreSkillPath = path.join(projectDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
    fs.mkdirSync(path.dirname(exploreSkillPath), { recursive: true });
    fs.writeFileSync(exploreSkillPath, 'name: openspec-explore\n', 'utf-8');
  }

  function setupSyncedCoreBothArtifacts(projectDir: string): void {
    fs.mkdirSync(path.join(projectDir, 'openspec'), { recursive: true });
    const coreSkillDirs = [
      'openspec-propose',
      'openspec-explore',
      'openspec-apply-change',
      'openspec-update-change',
      'openspec-sync-specs',
      'openspec-archive-change',
    ];
    // As 2.0 writes them: one shared copy, Claude's links to it, Claude listed.
    for (const dirName of coreSkillDirs) {
      const sharedDir = path.join(projectDir, '.agents', 'skills', dirName);
      fs.mkdirSync(sharedDir, { recursive: true });
      fs.writeFileSync(path.join(sharedDir, 'SKILL.md'), `name: ${dirName}\n`, 'utf-8');
      const linkPath = path.join(projectDir, '.claude', 'skills', dirName);
      fs.mkdirSync(path.dirname(linkPath), { recursive: true });
      fs.symlinkSync(
        process.platform === 'win32' ? sharedDir : path.join('..', '..', '.agents', 'skills', dirName),
        linkPath,
        process.platform === 'win32' ? 'junction' : 'dir'
      );
    }
    fs.writeFileSync(path.join(projectDir, '.agents', 'skills', '.openspec-target'), 'claude own-files\n', 'utf-8');

  }

  function addExtraVerifyWorkflowArtifacts(projectDir: string): void {
    // As 2.0 writes it: the shared copy and Claude's link to it.
    const dirName = 'openspec-verify-change';
    const sharedDir = path.join(projectDir, '.agents', 'skills', dirName);
    fs.mkdirSync(sharedDir, { recursive: true });
    fs.writeFileSync(path.join(sharedDir, 'SKILL.md'), `name: ${dirName}\n`, 'utf-8');
    fs.symlinkSync(
      process.platform === 'win32' ? sharedDir : path.join('..', '..', '.agents', 'skills', dirName),
      path.join(projectDir, '.claude', 'skills', dirName),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
  }

  beforeEach(() => {
    vi.resetModules();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-config-profile-test-'));

    originalEnv = { ...process.env };
    originalCwd = process.cwd();
    originalTTY = (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY;
    originalExitCode = process.exitCode;

    process.env.XDG_CONFIG_HOME = tempDir;
    // Never the real home: Codex prompts there would count as a tool here.
    process.env.CODEX_HOME = path.join(tempDir, 'codex-home');
    // Nor for global-skill tools (MiniMax Code's ~/.minimax/skills): an
    // in-process update would detect and rewrite them.
    process.env.HOME = path.join(tempDir, 'home');
    process.env.USERPROFILE = path.join(tempDir, 'home');
    process.chdir(tempDir);
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = true;
    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = originalEnv;
    process.chdir(originalCwd);
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = originalTTY;
    process.exitCode = originalExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('action picker should use configure wording and describe each path', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    const firstCall = select.mock.calls[0][0];
    expect(firstCall.message).toBe('What do you want to configure?');
    // OpenSpec 2.0 installs skills only, so there is no delivery to configure.
    expect(firstCall.choices.map((choice: { value: string }) => choice.value)).toEqual(['workflows', 'keep']);
    expect(firstCall.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: 'workflows',
        description: 'Change which workflow actions are available',
      }),
      expect.objectContaining({
        value: 'keep',
        name: 'Keep current settings (exit)',
      }),
    ]));
  });

  it('workflows-only action should not invoke delivery prompt', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { ALL_WORKFLOWS } = await import('../../src/core/profiles.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore']);

    await runConfigCommand(['profile']);

    expect(select).toHaveBeenCalledTimes(1);
    expect(checkbox).toHaveBeenCalledTimes(1);
    const checkboxCall = checkbox.mock.calls[0][0];
    expect(checkboxCall.pageSize).toBe(ALL_WORKFLOWS.length);
    expect(checkboxCall.theme).toEqual({
      icon: {
        checked: '[x]',
        unchecked: '[ ]',
      },
    });
    const proposeChoice = checkboxCall.choices.find((choice: { value: string }) => choice.value === 'propose');
    const onboardChoice = checkboxCall.choices.find((choice: { value: string }) => choice.value === 'onboard');
    expect(proposeChoice.checked).toBe(true);
    expect(onboardChoice.checked).toBe(false);
    expect(getGlobalConfig().workflows).toEqual(['propose', 'explore']);
  });

  it('workflow picker should use friendly names with descriptions', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply', 'sync', 'archive']);

    await runConfigCommand(['profile']);

    const checkboxCall = checkbox.mock.calls[0][0];
    expect(checkboxCall.message).toBe('Select workflows to make available:');
    expect(checkboxCall.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: 'propose',
        name: 'Propose change',
        description: 'Create proposal, design, and tasks from a request',
      }),
      expect.objectContaining({
        value: 'verify',
        name: 'Verify change',
        description: 'Run verification checks against a change',
      }),
    ]));
  });

  it('selecting current values only should be a no-op and should not ask apply', async () => {
    const { saveGlobalConfig, getGlobalConfigPath } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    const configPath = getGlobalConfigPath();
    const beforeContent = fs.readFileSync(configPath, 'utf-8');

    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply', 'update', 'sync', 'archive']);

    await runConfigCommand(['profile']);

    const afterContent = fs.readFileSync(configPath, 'utf-8');
    expect(afterContent).toBe(beforeContent);
    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
  });

  it('should preserve a custom profile when dependency expansion matches the core set', async () => {
    const { saveGlobalConfig, getGlobalConfig, getGlobalConfigPath } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({
      featureFlags: {},
      profile: 'custom',
      delivery: 'both',
      workflows: ['propose', 'explore', 'apply', 'update', 'archive'],
    });
    const configPath = getGlobalConfigPath();
    const beforeContent = fs.readFileSync(configPath, 'utf-8');

    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply', 'update', 'sync', 'archive']);

    await runConfigCommand(['profile']);

    expect(getGlobalConfig().profile).toBe('custom');
    expect(fs.readFileSync(configPath, 'utf-8')).toBe(beforeContent);
    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
  });

  it('keep action should warn when project files drift from global config', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    setupDriftedProjectArtifacts(tempDir);
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Global config is not applied to this project.'));
  });

  it('keep action should not warn when project files are already synced', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    setupSyncedCoreBothArtifacts(tempDir);
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    const allLogs = consoleLogSpy.mock.calls.map((args) => args.map(String).join(' '));
    expect(allLogs.some((line) => line.includes('Warning: Global config is not applied to this project.'))).toBe(false);
  });

  it('effective no-op after prompts should warn when project files drift', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    setupDriftedProjectArtifacts(tempDir);
    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply', 'update', 'sync', 'archive']);

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Global config is not applied to this project.'));
  });

  it('keep action should warn when project has extra workflows beyond global config', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    setupSyncedCoreBothArtifacts(tempDir);
    addExtraVerifyWorkflowArtifacts(tempDir);
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Global config is not applied to this project.'));
  });

  it('changed config should save and ask apply when inside project', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });

    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply']);
    confirm.mockResolvedValueOnce(false);

    await runConfigCommand(['profile']);

    expect(getGlobalConfig().workflows).toEqual(['propose', 'explore', 'apply']);
    expect(confirm).toHaveBeenCalledWith({
      message: 'Apply changes to this project now?',
      default: true,
    });
  });

  it('confirmed project apply should update in process without resolving openspec from PATH', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    const emptyBinDir = path.join(tempDir, 'empty-bin');
    fs.mkdirSync(emptyBinDir);
    vi.stubEnv('PATH', emptyBinDir);

    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply']);
    confirm.mockResolvedValueOnce(true);

    await runConfigCommand(['profile']);

    expect(getGlobalConfig().workflows).toEqual(['propose', 'explore', 'apply']);
    expect(process.exitCode).toBeUndefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('No configured tools found.');
    expect(consoleLogSpy).toHaveBeenCalledWith('Run `openspec update` in your other projects to apply.');
  });

  it('confirmed project apply should report the update failure reason', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { UpdateCommand } = await import('../../src/core/update.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    const executeSpy = vi.spyOn(UpdateCommand.prototype, 'execute')
      .mockRejectedValueOnce(new Error('permission denied'));

    select.mockResolvedValueOnce('workflows');
    checkbox.mockResolvedValueOnce(['propose', 'explore', 'apply']);
    confirm.mockResolvedValueOnce(true);

    try {
      await runConfigCommand(['profile']);
    } finally {
      executeSpy.mockRestore();
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith('`openspec update` failed: permission denied');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Please run it manually to apply the profile changes.');
    expect(process.exitCode).toBe(1);
  });

  it('core preset should preserve delivery setting', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'custom', delivery: 'skills', workflows: ['explore'] });

    await runConfigCommand(['profile', 'core']);

    const config = getGlobalConfig();
    expect(config.profile).toBe('core');
    expect(config.delivery).toBe('skills');
    expect(config.workflows).toEqual(['propose', 'explore', 'apply', 'update', 'sync', 'archive']);
    expect(select).not.toHaveBeenCalled();
    expect(checkbox).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('Ctrl+C should cancel without stack trace and set interrupted exit code', async () => {
    const { select, checkbox, confirm } = await getPromptMocks();
    const cancellationError = new Error('User force closed the prompt with SIGINT');
    cancellationError.name = 'ExitPromptError';

    select.mockRejectedValueOnce(cancellationError);

    await expect(runConfigCommand(['profile'])).resolves.toBeUndefined();

    expect(consoleLogSpy).toHaveBeenCalledWith('Config profile cancelled.');
    expect(process.exitCode).toBe(130);
    expect(checkbox).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
});
