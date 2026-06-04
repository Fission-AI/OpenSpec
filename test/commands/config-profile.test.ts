import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

async function runConfigCommand(args: string[]): Promise<void> {
  const { registerConfigCommand } = await import('../../src/commands/config.js');
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
    expect(deriveProfileFromWorkflowSelection(['propose', 'explore', 'apply', 'sync', 'archive', 'new'])).toBe('custom');
  });

  it('returns core when selection has exactly core workflows in different order', async () => {
    const { deriveProfileFromWorkflowSelection } = await import('../../src/commands/config.js');
    expect(deriveProfileFromWorkflowSelection(['archive', 'sync', 'apply', 'explore', 'propose'])).toBe('core');
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
      'openspec-sync-specs',
      'openspec-archive-change',
    ];
    for (const dirName of coreSkillDirs) {
      const skillPath = path.join(projectDir, '.claude', 'skills', dirName, 'SKILL.md');
      fs.mkdirSync(path.dirname(skillPath), { recursive: true });
      fs.writeFileSync(skillPath, `name: ${dirName}\n`, 'utf-8');
    }

    const coreCommands = ['propose', 'explore', 'apply', 'sync', 'archive'];
    for (const commandId of coreCommands) {
      const commandPath = path.join(projectDir, '.claude', 'commands', 'opsx', `${commandId}.md`);
      fs.mkdirSync(path.dirname(commandPath), { recursive: true });
      fs.writeFileSync(commandPath, `# ${commandId}\n`, 'utf-8');
    }
  }

  function addExtraVerifyWorkflowArtifacts(projectDir: string): void {
    const verifySkillPath = path.join(projectDir, '.claude', 'skills', 'openspec-verify-change', 'SKILL.md');
    fs.mkdirSync(path.dirname(verifySkillPath), { recursive: true });
    fs.writeFileSync(verifySkillPath, 'name: openspec-verify-change\n', 'utf-8');

    const verifyCommandPath = path.join(projectDir, '.claude', 'commands', 'opsx', 'verify.md');
    fs.mkdirSync(path.dirname(verifyCommandPath), { recursive: true });
    fs.writeFileSync(verifyCommandPath, '# verify\n', 'utf-8');
  }

  function setupWorkspaceState(
    workspaceRoot: string,
    options: { driftedSkills?: boolean } = {}
  ): void {
    const metadataDir = path.join(workspaceRoot, '.openspec-workspace');
    fs.mkdirSync(metadataDir, { recursive: true });
    fs.writeFileSync(
      path.join(metadataDir, 'workspace.yaml'),
      'version: 1\nname: platform\nlinks: {}\n',
      'utf-8'
    );

    const workspaceSkills = options.driftedSkills
      ? [
          'workspace_skills:',
          '  selected_agents:',
          '    - codex',
          '  last_applied_profile: custom',
          '  last_applied_delivery: both',
          '  last_applied_workflow_ids:',
          '    - explore',
        ].join('\n')
      : [
          'workspace_skills:',
          '  selected_agents:',
          '    - codex',
          '  last_applied_profile: core',
          '  last_applied_delivery: both',
          '  last_applied_workflow_ids:',
          '    - propose',
          '    - explore',
          '    - apply',
          '    - sync',
          '    - archive',
        ].join('\n');

    fs.writeFileSync(
      path.join(metadataDir, 'local.yaml'),
      `version: 1\npaths: {}\n${workspaceSkills}\n`,
      'utf-8'
    );
  }

  beforeEach(() => {
    vi.resetModules();

    tempDir = path.join(os.tmpdir(), `openspec-config-profile-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(tempDir, { recursive: true });

    originalEnv = { ...process.env };
    originalCwd = process.cwd();
    originalTTY = (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY;
    originalExitCode = process.exitCode;

    process.env.XDG_CONFIG_HOME = tempDir;
    process.chdir(tempDir);
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = true;
    process.exitCode = undefined;

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(execSync).mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    process.chdir(originalCwd);
    (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY = originalTTY;
    process.exitCode = originalExitCode;
    fs.rmSync(tempDir, { recursive: true, force: true });

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('delivery-only action should not invoke workflow checkbox prompt', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });
    select.mockResolvedValueOnce('delivery');
    select.mockResolvedValueOnce('skills');

    await runConfigCommand(['profile']);

    expect(checkbox).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledTimes(2);
    expect(getGlobalConfig().delivery).toBe('skills');
  });

  it('action picker should use configure wording and describe each path', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    const firstCall = select.mock.calls[0][0];
    expect(firstCall.message).toBe('What do you want to configure?');
    expect(firstCall.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: 'delivery',
        description: 'Change where workflows are installed',
      }),
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

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });
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

  it('delivery picker should mark current option inline', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'custom', delivery: 'commands', workflows: ['explore'] });
    select.mockResolvedValueOnce('delivery');
    select.mockResolvedValueOnce('commands');

    await runConfigCommand(['profile']);

    expect(select).toHaveBeenCalledTimes(2);
    const secondCall = select.mock.calls[1][0];
    expect(secondCall.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: 'commands', name: 'Commands only [current]' }),
    ]));
  });

  it('workflow picker should use friendly names with descriptions', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });
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
    const { select, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });
    const configPath = getGlobalConfigPath();
    const beforeContent = fs.readFileSync(configPath, 'utf-8');

    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    select.mockResolvedValueOnce('delivery');
    select.mockResolvedValueOnce('both');

    await runConfigCommand(['profile']);

    const afterContent = fs.readFileSync(configPath, 'utf-8');
    expect(afterContent).toBe(beforeContent);
    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
  });

  it('keep action should warn when project files drift from global config', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });
    setupDriftedProjectArtifacts(tempDir);
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Global config is not applied to this project.'));
  });

  it('keep action should not warn when project files are already synced', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });
    setupSyncedCoreBothArtifacts(tempDir);
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    const allLogs = consoleLogSpy.mock.calls.map((args) => args.map(String).join(' '));
    expect(allLogs.some((line) => line.includes('Warning: Global config is not applied to this project.'))).toBe(false);
  });

  it('effective no-op after prompts should warn when project files drift', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });
    setupDriftedProjectArtifacts(tempDir);
    select.mockResolvedValueOnce('delivery');
    select.mockResolvedValueOnce('both');

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Global config is not applied to this project.'));
  });

  it('keep action should warn when project has extra workflows beyond global config', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });
    setupSyncedCoreBothArtifacts(tempDir);
    addExtraVerifyWorkflowArtifacts(tempDir);
    select.mockResolvedValueOnce('keep');

    await runConfigCommand(['profile']);

    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Global config is not applied to this project.'));
  });

  it('changed config should save and ask apply when inside project', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });

    select.mockResolvedValueOnce('delivery');
    select.mockResolvedValueOnce('skills');
    confirm.mockResolvedValueOnce(false);

    await runConfigCommand(['profile']);

    expect(getGlobalConfig().delivery).toBe('skills');
    expect(confirm).toHaveBeenCalledWith({
      message: 'Apply changes to this project now?',
      default: true,
    });
  });

  it('changed config should ask to apply to the current workspace and print workspace guidance when declined', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, confirm } = await getPromptMocks();

    setupWorkspaceState(tempDir);
    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });

    select.mockResolvedValueOnce('delivery');
    select.mockResolvedValueOnce('skills');
    confirm.mockResolvedValueOnce(false);

    await runConfigCommand(['profile']);

    expect(getGlobalConfig().delivery).toBe('skills');
    expect(confirm).toHaveBeenCalledWith({
      message: 'Apply changes to this workspace now?',
      default: true,
    });
    expect(execSync).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('Config updated. Run `openspec workspace update` to apply it to workspace-local skills.');
  });

  it('confirmed workspace apply should run workspace update instead of repo-local update', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, confirm } = await getPromptMocks();

    setupWorkspaceState(tempDir);
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });

    select.mockResolvedValueOnce('delivery');
    select.mockResolvedValueOnce('skills');
    confirm.mockResolvedValueOnce(true);

    await runConfigCommand(['profile']);

    expect(execSync).toHaveBeenCalledWith('npx openspec workspace update', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    expect(execSync).not.toHaveBeenCalledWith('npx openspec update', expect.anything());
  });

  it('no-op inside a workspace should warn when workspace skills drift', async () => {
    const { saveGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, confirm } = await getPromptMocks();

    setupWorkspaceState(tempDir, { driftedSkills: true });
    saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'sync', 'archive'] });

    select.mockResolvedValueOnce('delivery');
    select.mockResolvedValueOnce('both');

    await runConfigCommand(['profile']);

    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('No config changes.');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Workspace-local agent skills are out of sync'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('openspec workspace update'));
  });

  it('core preset should preserve delivery setting', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    saveGlobalConfig({ featureFlags: {}, profile: 'custom', delivery: 'skills', workflows: ['explore'] });

    await runConfigCommand(['profile', 'core']);

    const config = getGlobalConfig();
    expect(config.profile).toBe('core');
    expect(config.delivery).toBe('skills');
    expect(config.workflows).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
    expect(select).not.toHaveBeenCalled();
    expect(checkbox).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('core preset inside a workspace should stay non-interactive and print workspace update guidance', async () => {
    const { saveGlobalConfig, getGlobalConfig } = await import('../../src/core/global-config.js');
    const { select, checkbox, confirm } = await getPromptMocks();

    setupWorkspaceState(tempDir, { driftedSkills: true });
    saveGlobalConfig({ featureFlags: {}, profile: 'custom', delivery: 'skills', workflows: ['explore'] });

    await runConfigCommand(['profile', 'core']);

    const config = getGlobalConfig();
    expect(config.profile).toBe('core');
    expect(config.delivery).toBe('skills');
    expect(select).not.toHaveBeenCalled();
    expect(checkbox).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith('Config updated. Run `openspec workspace update` to apply it to workspace-local skills.');
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
