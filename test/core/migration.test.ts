import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import { AI_TOOLS, type AIToolOption } from '../../src/core/config.js';
import { CommandAdapterRegistry } from '../../src/core/command-generation/index.js';
import { saveGlobalConfig, getGlobalConfigPath } from '../../src/core/global-config.js';
import { migrateIfNeeded, scanInstalledWorkflows } from '../../src/core/migration.js';

const CLAUDE_TOOL = AI_TOOLS.find((tool) => tool.value === 'claude') as AIToolOption | undefined;
const HERMES_TOOL = AI_TOOLS.find((tool) => tool.value === 'hermes') as AIToolOption | undefined;

function ensureClaudeTool(): AIToolOption {
  if (!CLAUDE_TOOL) {
    throw new Error('Claude tool definition not found');
  }
  return CLAUDE_TOOL;
}

function ensureHermesTool(): AIToolOption {
  if (!HERMES_TOOL) {
    throw new Error('Hermes tool definition not found');
  }
  return HERMES_TOOL;
}

async function writeSkill(projectPath: string, dirName: string): Promise<void> {
  const skillFile = path.join(projectPath, '.claude', 'skills', dirName, 'SKILL.md');
  await fsp.mkdir(path.dirname(skillFile), { recursive: true });
  await fsp.writeFile(skillFile, 'name: test\n', 'utf-8');
}

async function writeManagedCommand(projectPath: string, workflowId: string): Promise<void> {
  const adapter = CommandAdapterRegistry.get('claude');
  if (!adapter) {
    throw new Error('Claude adapter not found');
  }
  const commandPath = adapter.getFilePath(workflowId);
  const fullPath = path.isAbsolute(commandPath)
    ? commandPath
    : path.join(projectPath, commandPath);
  await fsp.mkdir(path.dirname(fullPath), { recursive: true });
  await fsp.writeFile(fullPath, '# command\n', 'utf-8');
}

function readRawConfig(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(getGlobalConfigPath(), 'utf-8')) as Record<string, unknown>;
}

describe('migration', () => {
  let projectDir: string;
  let configHome: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    projectDir = path.join(os.tmpdir(), `openspec-migration-project-${randomUUID()}`);
    configHome = path.join(os.tmpdir(), `openspec-migration-config-${randomUUID()}`);
    await fsp.mkdir(projectDir, { recursive: true });
    await fsp.mkdir(configHome, { recursive: true });
    originalEnv = { ...process.env };
    process.env.XDG_CONFIG_HOME = configHome;
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fsp.rm(projectDir, { recursive: true, force: true });
    await fsp.rm(configHome, { recursive: true, force: true });
  });

  it('migrates to custom skills delivery when only managed skills are detected', async () => {
    await writeSkill(projectDir, 'openspec-explore');
    await writeSkill(projectDir, 'openspec-apply-change');

    migrateIfNeeded(projectDir, [ensureClaudeTool()]);

    const config = readRawConfig();
    expect(config.profile).toBe('custom');
    expect(config.delivery).toBe('skills');
    expect(config.workflows).toEqual(['explore', 'apply']);
  });

  it('migrates to custom commands delivery when only managed commands are detected', async () => {
    await writeManagedCommand(projectDir, 'explore');
    await writeManagedCommand(projectDir, 'archive');

    migrateIfNeeded(projectDir, [ensureClaudeTool()]);

    const config = readRawConfig();
    expect(config.profile).toBe('custom');
    expect(config.delivery).toBe('commands');
    expect(config.workflows).toEqual(['explore', 'archive']);
  });

  it('migrates to custom both delivery when managed skills and commands are detected', async () => {
    await writeSkill(projectDir, 'openspec-explore');
    await writeManagedCommand(projectDir, 'apply');

    migrateIfNeeded(projectDir, [ensureClaudeTool()]);

    const config = readRawConfig();
    expect(config.profile).toBe('custom');
    expect(config.delivery).toBe('both');
    expect(config.workflows).toEqual(['explore', 'apply']);
  });

  it('does not migrate when profile is already explicitly configured', async () => {
    saveGlobalConfig({
      featureFlags: {},
      profile: 'core',
      delivery: 'both',
    });
    await writeSkill(projectDir, 'openspec-explore');

    migrateIfNeeded(projectDir, [ensureClaudeTool()]);

    const config = readRawConfig();
    expect(config.profile).toBe('core');
    expect(config.delivery).toBe('both');
    expect(config.workflows).toBeUndefined();
  });

  it('preserves explicit delivery value during migration', async () => {
    // Raw config has explicit delivery but no profile yet.
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'both',
    });
    await writeSkill(projectDir, 'openspec-explore');

    migrateIfNeeded(projectDir, [ensureClaudeTool()]);

    const config = readRawConfig();
    expect(config.profile).toBe('custom');
    expect(config.delivery).toBe('both');
    expect(config.workflows).toEqual(['explore']);
  });

  it('does not migrate when no managed workflow artifacts are detected', async () => {
    migrateIfNeeded(projectDir, [ensureClaudeTool()]);

    expect(fs.existsSync(getGlobalConfigPath())).toBe(false);
  });

  it('ignores unknown custom skill and command files when scanning workflows', async () => {
    await writeSkill(projectDir, 'my-custom-skill');
    const customCommandPath = path.join(projectDir, '.claude', 'commands', 'opsx', 'my-custom.md');
    await fsp.mkdir(path.dirname(customCommandPath), { recursive: true });
    await fsp.writeFile(customCommandPath, '# custom\n', 'utf-8');

    const workflows = scanInstalledWorkflows(projectDir, [ensureClaudeTool()]);
    expect(workflows).toEqual([]);

    migrateIfNeeded(projectDir, [ensureClaudeTool()]);
    expect(fs.existsSync(getGlobalConfigPath())).toBe(false);
  });

  describe('Hermes global-install isolation', () => {
    let fakeHome: string;
    let homedirSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
      // Redirect os.homedir() so the global ~/.hermes/skills path is
      // fully under our control.
      fakeHome = path.join(os.tmpdir(), `openspec-hermes-home-${randomUUID()}`);
      await fsp.mkdir(fakeHome, { recursive: true });
      homedirSpy = vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);
    });

    afterEach(async () => {
      homedirSpy.mockRestore();
      await fsp.rm(fakeHome, { recursive: true, force: true });
    });

    async function writeGlobalHermesSkill(skillName: string): Promise<void> {
      const skillFile = path.join(fakeHome, '.hermes', 'skills', skillName, 'SKILL.md');
      await fsp.mkdir(path.dirname(skillFile), { recursive: true });
      await fsp.writeFile(skillFile, '---\nmetadata:\n  generatedBy: "1.6.0"\n---\n', 'utf-8');
    }

    it('does not inherit global Hermes skills when project marker is absent', async () => {
      // Global ~/.hermes/skills has two OpenSpec skills installed by another project.
      await writeGlobalHermesSkill('openspec-explore');
      await writeGlobalHermesSkill('openspec-new-change');
      // Project has .hermes/ (detected by getAvailableTools) but NO marker
      // directory .hermes/skills/ — so it was never configured for OpenSpec.
      await fsp.mkdir(path.join(projectDir, '.hermes'), { recursive: true });

      const hermes = ensureHermesTool();
      const workflows = scanInstalledWorkflows(projectDir, [hermes]);
      expect(workflows).toEqual([]);

      migrateIfNeeded(projectDir, [hermes]);
      expect(fs.existsSync(getGlobalConfigPath())).toBe(false);
    });

    it('scans global Hermes skills when project marker exists', async () => {
      await writeGlobalHermesSkill('openspec-explore');
      await writeGlobalHermesSkill('openspec-apply-change');
      // Project-local marker directory exists → OpenSpec was initialized here.
      await fsp.mkdir(path.join(projectDir, '.hermes', 'skills'), { recursive: true });

      const hermes = ensureHermesTool();
      const workflows = scanInstalledWorkflows(projectDir, [hermes]);
      expect(workflows).toEqual(['explore', 'apply']);

      migrateIfNeeded(projectDir, [hermes]);
      const config = readRawConfig();
      expect(config.profile).toBe('custom');
      expect(config.workflows).toEqual(['explore', 'apply']);
      expect(config.delivery).toBe('skills');
    });
  });
});
