import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  hasProjectConfigDrift,
  WORKFLOW_TO_SKILL_DIR,
} from '../../src/core/profile-sync-drift.js';
import { CORE_WORKFLOWS } from '../../src/core/profiles.js';
import { CommandAdapterRegistry } from '../../src/core/command-generation/index.js';

function writeSkill(projectDir: string, workflowId: string, toolDir = '.claude'): void {
  const skillDirName = WORKFLOW_TO_SKILL_DIR[workflowId as keyof typeof WORKFLOW_TO_SKILL_DIR];
  const skillPath = path.join(projectDir, toolDir, 'skills', skillDirName, 'SKILL.md');
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(skillPath, `name: ${skillDirName}\n`);
}

function writeCommand(projectDir: string, workflowId: string, toolId = 'claude'): void {
  const adapter = CommandAdapterRegistry.get(toolId);
  if (!adapter) throw new Error(`${toolId} adapter unavailable in test environment`);
  const cmdPath = adapter.getFilePath(workflowId);
  const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectDir, cmdPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `# ${workflowId}\n`);
}

function setupCoreSkills(projectDir: string, toolDir = '.claude'): void {
  for (const workflow of CORE_WORKFLOWS) {
    writeSkill(projectDir, workflow, toolDir);
  }
}

function setupCoreCommands(projectDir: string, toolId = 'claude'): void {
  for (const workflow of CORE_WORKFLOWS) {
    writeCommand(projectDir, workflow, toolId);
  }
}

describe('profile sync drift detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-profile-sync-drift-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects drift for skills-only delivery when commands still exist', () => {
    setupCoreSkills(tempDir);
    setupCoreCommands(tempDir);

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'skills');
    expect(hasDrift).toBe(true);
  });

  it('detects drift for commands-only delivery when skills still exist', () => {
    setupCoreCommands(tempDir);
    setupCoreSkills(tempDir);

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'commands');
    expect(hasDrift).toBe(true);
  });

  it('detects drift when required profile workflow files are missing', () => {
    writeSkill(tempDir, 'explore');

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'both');
    expect(hasDrift).toBe(true);
  });

  it('returns false when project files match core profile and delivery', () => {
    setupCoreSkills(tempDir);
    setupCoreCommands(tempDir);

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'both');
    expect(hasDrift).toBe(false);
  });

  it('detects drift when extra workflows are installed for both delivery', () => {
    setupCoreSkills(tempDir);
    setupCoreCommands(tempDir);
    writeSkill(tempDir, 'new');
    writeCommand(tempDir, 'new');

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'both');
    expect(hasDrift).toBe(true);
  });

  it('treats Codex as skills-only even when delivery is commands', () => {
    setupCoreSkills(tempDir, '.codex');

    const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'commands');
    expect(hasDrift).toBe(false);
  });

  it('detects deprecated Codex prompt files as drift', () => {
    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = path.join(tempDir, 'codex-home');

    try {
      setupCoreSkills(tempDir, '.codex');
      writeCommand(tempDir, 'apply', 'codex');

      const hasDrift = hasProjectConfigDrift(tempDir, CORE_WORKFLOWS, 'both');
      expect(hasDrift).toBe(true);
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });
});
