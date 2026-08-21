import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import { AI_TOOLS, type AIToolOption } from '../../src/core/config.js';
import { CommandAdapterRegistry } from '../../src/core/command-generation/index.js';
import { saveGlobalConfig, getGlobalConfigPath } from '../../src/core/global-config.js';
import {
  findLegacyToolMigrations,
  migrateIfNeeded,
  migrateLegacyToolDirs,
  scanInstalledWorkflows,
} from '../../src/core/migration.js';

const CLAUDE_TOOL = AI_TOOLS.find((tool) => tool.value === 'claude') as AIToolOption | undefined;

function ensureClaudeTool(): AIToolOption {
  if (!CLAUDE_TOOL) {
    throw new Error('Claude tool definition not found');
  }
  return CLAUDE_TOOL;
}

async function writeSkill(projectPath: string, dirName: string, toolRoot = '.claude'): Promise<void> {
  const skillFile = path.join(projectPath, toolRoot, 'skills', dirName, 'SKILL.md');
  await fsp.mkdir(path.dirname(skillFile), { recursive: true });
  await fsp.writeFile(skillFile, 'name: test\n', 'utf-8');
}

function requireTool(toolId: string): AIToolOption {
  const tool = AI_TOOLS.find((candidate) => candidate.value === toolId);
  if (!tool) {
    throw new Error(`${toolId} tool definition not found`);
  }
  return tool;
}

function captureMigrationLogs(projectDir: string, tools: AIToolOption[]): string[] {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    migrateIfNeeded(projectDir, tools);
    return logSpy.mock.calls.flat().map(String);
  } finally {
    logSpy.mockRestore();
  }
}

async function writeManagedCommand(
  projectPath: string,
  workflowId: string,
  toolId = 'claude'
): Promise<void> {
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) {
    throw new Error(`${toolId} adapter not found`);
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
    projectDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'openspec-migration-project-'));
    configHome = await fsp.mkdtemp(path.join(os.tmpdir(), 'openspec-migration-config-'));
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

  it('keeps dry-run legacy results aligned with migration timing', async () => {
    await writeSkill(projectDir, 'openspec-explore', '.codex');
    await writeSkill(projectDir, 'openspec-explore', '.agents');

    expect(findLegacyToolMigrations(projectDir)).toEqual([]);
    expect(findLegacyToolMigrations(projectDir, 'after-generation')).toEqual([
      expect.objectContaining({
        toolId: 'codex',
        from: '.codex',
        to: '.agents',
        skillDirs: 1,
      }),
    ]);
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

  it('prints the $-prefixed propose reference when migrating a codex-only project', async () => {
    // Codex is skills-invocable with no slash surface: it invokes skills as
    // Migration hints target the selected tool, so keep Codex's $<name> form.
    await writeSkill(projectDir, 'openspec-propose', '.codex');

    const message = captureMigrationLogs(projectDir, [requireTool('codex')]).find((entry) =>
      entry.includes('New in this version')
    );
    expect(message).toBeTruthy();
    expect(message).toContain('$openspec-propose');
    expect(message).not.toContain('/openspec-propose');
    expect(message).not.toContain('/opsx:propose');
  });

  it('prints the hyphen propose reference when migrating a qwen-only project', async () => {
    // Qwen invokes commands by filename (.qwen/commands/opsx-propose.md ->
    // /opsx-propose), so the upgrade message must not advertise the colon form
    // its palette never registers.
    await writeManagedCommand(projectDir, 'apply', 'qwen');

    const message = captureMigrationLogs(projectDir, [requireTool('qwen')]).find((entry) =>
      entry.includes('New in this version')
    );
    expect(message).toContain('/opsx-propose');
    expect(message).not.toContain('/opsx:propose');
  });

  it('prints the @ propose reference when migrating an amazon-q-only project', async () => {
    // Amazon Q's generated files land in its prompt library, invoked as
    // @opsx-propose. It registers no slash command, so the upgrade message
    // must advertise neither the colon nor the plain hyphen form.
    await writeManagedCommand(projectDir, 'apply', 'amazon-q');

    const message = captureMigrationLogs(projectDir, [requireTool('amazon-q')]).find((entry) =>
      entry.includes('New in this version')
    );
    expect(message).toContain('@opsx-propose');
    expect(message).not.toContain('/opsx:propose');
    expect(message).not.toContain('/opsx-propose');
  });

  it('falls back to the skill name when amazon-q and a slash tool disagree', async () => {
    // @opsx-propose and /opsx-propose are both "flat", so a style-only model
    // would wrongly treat these as agreeing and advertise one form to both.
    await writeManagedCommand(projectDir, 'apply', 'amazon-q');
    await writeManagedCommand(projectDir, 'apply', 'qwen');

    const message = captureMigrationLogs(projectDir, [
      requireTool('amazon-q'),
      requireTool('qwen'),
    ]).find((entry) => entry.includes('New in this version'));
    expect(message).toContain('the openspec-propose skill');
    expect(message).not.toContain('@opsx-propose');
    expect(message).not.toContain('/opsx-propose');
  });

  it('falls back to the skill name when a namespaced and a flat tool disagree', async () => {
    // Claude registers /opsx:propose, Qwen registers /opsx-propose: no single
    // slash form is right for both, so neither may be advertised.
    await writeManagedCommand(projectDir, 'apply', 'claude');
    await writeManagedCommand(projectDir, 'apply', 'qwen');

    const message = captureMigrationLogs(projectDir, [
      requireTool('claude'),
      requireTool('qwen'),
    ]).find((entry) => entry.includes('New in this version'));
    expect(message).toContain('the openspec-propose skill');
    expect(message).not.toContain('/opsx:propose');
    expect(message).not.toContain('/opsx-propose');
  });

  it('prints the documented /skill: propose reference when migrating a kimi-only project', async () => {
    await writeSkill(projectDir, 'openspec-propose', '.kimi-code');

    const message = captureMigrationLogs(projectDir, [requireTool('kimi')]).find((entry) =>
      entry.includes('New in this version')
    );
    expect(message).toContain('/skill:openspec-propose');
    expect(message).not.toContain('/opsx:propose');
  });

  it('falls back to a syntax-neutral reference when detected tools disagree (codex+kimi)', async () => {
    await writeSkill(projectDir, 'openspec-propose', '.codex');
    await writeSkill(projectDir, 'openspec-propose', '.kimi-code');

    const message = captureMigrationLogs(projectDir, [requireTool('codex'), requireTool('kimi')]).find((entry) =>
      entry.includes('New in this version')
    );
    expect(message).toContain('the openspec-propose skill');
    expect(message).not.toContain('/skill:');
    expect(message).not.toContain('/opsx:propose');
  });

  it('falls back to a syntax-neutral reference when command and skill-only tools mix (claude+kimi)', async () => {
    // Claude will get /opsx:* commands but Kimi cannot invoke them; the one
    // shared message must not advertise a form that is wrong for either tool
    await writeManagedCommand(projectDir, 'propose');
    await writeSkill(projectDir, 'openspec-propose', '.kimi-code');

    const message = captureMigrationLogs(projectDir, [ensureClaudeTool(), requireTool('kimi')]).find((entry) =>
      entry.includes('New in this version')
    );
    expect(message).toContain('the openspec-propose skill');
    expect(message).not.toContain('/opsx:propose');
    expect(message).not.toContain('/skill:');
  });

  it('does not advertise /opsx:propose when explicit delivery is skills', async () => {
    // Adapter-backed tool, but the effective delivery will never generate
    // commands — the message must use the skill reference instead
    saveGlobalConfig({
      featureFlags: {},
      delivery: 'skills',
    });
    await writeSkill(projectDir, 'openspec-propose');

    const message = captureMigrationLogs(projectDir, [ensureClaudeTool()]).find((entry) =>
      entry.includes('New in this version')
    );
    expect(message).toContain('/openspec-propose');
    expect(message).not.toContain('/opsx:propose');
  });

  it('advertises /opsx:propose when commands are installed for an adapter-backed tool', async () => {
    await writeManagedCommand(projectDir, 'propose');

    const message = captureMigrationLogs(projectDir, [ensureClaudeTool()]).find((entry) =>
      entry.includes('New in this version')
    );
    expect(message).toContain('/opsx:propose');
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

  it('does not count generic shared skills as installed Codex workflows', async () => {
    await writeSkill(projectDir, 'openspec-explore', '.agents');
    await fsp.writeFile(
      path.join(projectDir, '.agents', 'skills', '.openspec-target'),
      'agents\n',
      'utf-8'
    );

    expect(scanInstalledWorkflows(projectDir, [requireTool('codex')])).toEqual([]);
    expect(scanInstalledWorkflows(projectDir, [requireTool('agents')])).toEqual(['explore']);
  });
  describe('Antigravity .agent -> .agents', () => {
    it('moves managed skills and commands once the replacement exists', async () => {
      await writeSkill(projectDir, 'openspec-explore', '.agent');
      const legacyCommand = path.join(projectDir, '.agent', 'workflows', 'opsx-explore.md');
      await fsp.mkdir(path.dirname(legacyCommand), { recursive: true });
      await fsp.writeFile(legacyCommand, '# command\n', 'utf-8');

      // Nothing moves before the tool has generated its replacement tree.
      expect(findLegacyToolMigrations(projectDir)).toEqual([]);

      await writeSkill(projectDir, 'openspec-explore', '.agents');
      await writeManagedCommand(projectDir, 'explore', 'antigravity');

      expect(
        migrateLegacyToolDirs(projectDir, ['antigravity'], 'after-generation')
      ).toEqual([
        expect.objectContaining({
          toolId: 'antigravity',
          from: '.agent',
          to: '.agents',
          skillDirs: 1,
          commandFiles: 1,
          keptInPlace: 0,
        }),
      ]);

      expect(fs.existsSync(legacyCommand)).toBe(false);
      expect(
        fs.existsSync(path.join(projectDir, '.agent', 'skills', 'openspec-explore', 'SKILL.md'))
      ).toBe(false);
      expect(
        fs.existsSync(path.join(projectDir, '.agents', 'workflows', 'opsx-explore.md'))
      ).toBe(true);
    });

    it('keeps a divergent legacy skill instead of dropping it', async () => {
      const legacySkill = path.join(
        projectDir,
        '.agent',
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      await fsp.mkdir(path.dirname(legacySkill), { recursive: true });
      await fsp.writeFile(legacySkill, '# hand-edited\n', 'utf-8');
      await writeSkill(projectDir, 'openspec-explore', '.agents');

      expect(
        migrateLegacyToolDirs(projectDir, ['antigravity'], 'after-generation')
      ).toEqual([
        expect.objectContaining({ toolId: 'antigravity', skillDirs: 0, keptInPlace: 1 }),
      ]);
      expect(fs.readFileSync(legacySkill, 'utf-8')).toBe('# hand-edited\n');
    });

    it('leaves a legacy command alone when no replacement was generated', async () => {
      // Skills-only delivery and a deselected workflow both leave the current
      // root without that command. Moving the legacy file there would install
      // a command OpenSpec just decided not to write.
      await writeSkill(projectDir, 'openspec-explore', '.agents');
      const legacyCommand = path.join(projectDir, '.agent', 'workflows', 'opsx-explore.md');
      await fsp.mkdir(path.dirname(legacyCommand), { recursive: true });
      await fsp.writeFile(legacyCommand, '# command\n', 'utf-8');

      expect(
        migrateLegacyToolDirs(projectDir, ['antigravity'], 'after-generation')
      ).toEqual([]);
      expect(fs.existsSync(legacyCommand)).toBe(true);
      expect(
        fs.existsSync(path.join(projectDir, '.agents', 'workflows', 'opsx-explore.md'))
      ).toBe(false);
    });

    it('keeps commands delivery when the command files still sit under .agent', async () => {
      // The commands are only findable at the legacy root until migration runs.
      // Inferring `skills` here would make the next update delete them.
      await writeSkill(projectDir, 'openspec-explore', '.agent');
      const legacyCommand = path.join(projectDir, '.agent', 'workflows', 'opsx-explore.md');
      await fsp.mkdir(path.dirname(legacyCommand), { recursive: true });
      await fsp.writeFile(legacyCommand, '# command\n', 'utf-8');

      migrateIfNeeded(projectDir, [requireTool('antigravity')]);

      expect(readRawConfig().delivery).toBe('both');
    });

    it('leaves files the user keeps under .agent alone', async () => {
      const userFile = path.join(projectDir, '.agent', 'workflows', 'my-workflow.md');
      await fsp.mkdir(path.dirname(userFile), { recursive: true });
      await fsp.writeFile(userFile, '# mine\n', 'utf-8');
      await writeSkill(projectDir, 'openspec-explore', '.agents');

      migrateLegacyToolDirs(projectDir, ['antigravity'], 'after-generation');

      expect(fs.existsSync(userFile)).toBe(true);
    });
  });
});
