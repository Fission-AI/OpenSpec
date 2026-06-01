import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { promises as fsp } from 'node:fs';
import { AI_TOOLS, type AIToolOption } from '../../src/core/config.js';
import { CommandAdapterRegistry } from '../../src/core/command-generation/index.js';
import { scanInstalledWorkflows } from '../../src/core/migration.js';

const CLAUDE_TOOL = AI_TOOLS.find((tool) => tool.value === 'claude') as AIToolOption | undefined;

function ensureClaudeTool(): AIToolOption {
  if (!CLAUDE_TOOL) throw new Error('Claude tool definition not found');
  return CLAUDE_TOOL;
}

async function writeSkill(projectPath: string, dirName: string): Promise<void> {
  const skillFile = path.join(projectPath, '.claude', 'skills', dirName, 'SKILL.md');
  await fsp.mkdir(path.dirname(skillFile), { recursive: true });
  await fsp.writeFile(skillFile, 'name: test\n', 'utf-8');
}

async function writeManagedCommand(projectPath: string, workflowId: string): Promise<void> {
  const adapter = CommandAdapterRegistry.get('claude');
  if (!adapter) throw new Error('Claude adapter not found');
  const commandPath = adapter.getFilePath(workflowId);
  const fullPath = path.isAbsolute(commandPath) ? commandPath : path.join(projectPath, commandPath);
  await fsp.mkdir(path.dirname(fullPath), { recursive: true });
  await fsp.writeFile(fullPath, '# command\n', 'utf-8');
}

describe('migration', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = path.join(os.tmpdir(), `pscode-migration-project-${randomUUID()}`);
    await fsp.mkdir(projectDir, { recursive: true });
  });

  afterEach(async () => {
    await fsp.rm(projectDir, { recursive: true, force: true });
  });

  describe('scanInstalledWorkflows', () => {
    it('detects skill-only workflows', async () => {
      await writeSkill(projectDir, 'pscode-explore');
      await writeSkill(projectDir, 'pscode-apply-change');

      const workflows = scanInstalledWorkflows(projectDir, [ensureClaudeTool()]);
      expect(workflows).toContain('explore');
      expect(workflows).toContain('apply');
    });

    it('detects command-only workflows', async () => {
      await writeManagedCommand(projectDir, 'explore');
      await writeManagedCommand(projectDir, 'complete');

      const workflows = scanInstalledWorkflows(projectDir, [ensureClaudeTool()]);
      expect(workflows).toContain('explore');
      expect(workflows).toContain('complete');
    });

    it('detects workflows from both skills and commands', async () => {
      await writeSkill(projectDir, 'pscode-explore');
      await writeManagedCommand(projectDir, 'apply');

      const workflows = scanInstalledWorkflows(projectDir, [ensureClaudeTool()]);
      expect(workflows).toContain('explore');
      expect(workflows).toContain('apply');
    });

    it('ignores unknown custom skill directories', async () => {
      await writeSkill(projectDir, 'my-custom-skill');

      const workflows = scanInstalledWorkflows(projectDir, [ensureClaudeTool()]);
      expect(workflows).toEqual([]);
    });

    it('returns empty array when no artifacts exist', async () => {
      const workflows = scanInstalledWorkflows(projectDir, [ensureClaudeTool()]);
      expect(workflows).toEqual([]);
    });
  });
});
