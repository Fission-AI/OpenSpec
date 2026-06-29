import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import {
  includesGitHubCopilot,
  generateCopilotSetupSteps,
  generateCopilotAgentFile,
  COPILOT_CLOUD_FILES,
  removeCopilotCloudFiles,
  writeCopilotCloudFiles,
} from '../../src/core/github-copilot/cloud-agent.js';

describe('GitHub Copilot Cloud Agent', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-copilot-cloud-agent-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('includesGitHubCopilot', () => {
    it('returns true when github-copilot is in the list', () => {
      expect(includesGitHubCopilot(['claude', 'github-copilot', 'cursor'])).toBe(true);
    });

    it('returns false when github-copilot is not in the list', () => {
      expect(includesGitHubCopilot(['claude', 'cursor'])).toBe(false);
    });

    it('returns false for empty list', () => {
      expect(includesGitHubCopilot([])).toBe(false);
    });
  });

  describe('generateCopilotSetupSteps', () => {
    it('generates valid YAML workflow content', () => {
      const content = generateCopilotSetupSteps();
      expect(content).toContain('name: "Copilot Setup Steps"');
      expect(content).toContain('copilot-setup-steps:');
      expect(content).toContain('runs-on: ubuntu-latest');
      expect(content).toContain('npm install -g @fission-ai/openspec');
      expect(content).toContain('openspec --version');
    });
  });

  describe('generateCopilotAgentFile', () => {
    it('generates agent markdown with frontmatter', () => {
      const content = generateCopilotAgentFile();
      expect(content).toContain('name: OpenSpec');
      expect(content).toContain('description:');
      expect(content).toContain('tools:');
      expect(content).toContain('execute');
      expect(content).toContain('# OpenSpec Agent');
      expect(content).toContain('openspec list');
      expect(content).toContain('openspec validate');
    });
  });

  describe('COPILOT_CLOUD_FILES', () => {
    it('has correct file paths', () => {
      expect(COPILOT_CLOUD_FILES.setupSteps).toContain('copilot-setup-steps.yml');
      expect(COPILOT_CLOUD_FILES.agent).toContain('openspec.agent.md');
    });
  });

  describe('writeCopilotCloudFiles', () => {
    it('writes missing cloud files and creates parent directories', async () => {
      const result = await writeCopilotCloudFiles(tempDir);

      expect(result).toEqual({ setupStepsWritten: true, agentWritten: true });
      await expect(fs.stat(path.join(tempDir, COPILOT_CLOUD_FILES.setupSteps))).resolves.toBeTruthy();
      await expect(fs.stat(path.join(tempDir, COPILOT_CLOUD_FILES.agent))).resolves.toBeTruthy();
    });

    it('skips existing files by default', async () => {
      const setupStepsPath = path.join(tempDir, COPILOT_CLOUD_FILES.setupSteps);
      const agentPath = path.join(tempDir, COPILOT_CLOUD_FILES.agent);
      await fs.mkdir(path.dirname(setupStepsPath), { recursive: true });
      await fs.mkdir(path.dirname(agentPath), { recursive: true });
      await fs.writeFile(setupStepsPath, 'custom setup');
      await fs.writeFile(agentPath, 'custom agent');

      const result = await writeCopilotCloudFiles(tempDir);

      expect(result).toEqual({ setupStepsWritten: false, agentWritten: false });
      await expect(fs.readFile(setupStepsPath, 'utf8')).resolves.toBe('custom setup');
      await expect(fs.readFile(agentPath, 'utf8')).resolves.toBe('custom agent');
    });

    it('overwrites existing files when force is true', async () => {
      const setupStepsPath = path.join(tempDir, COPILOT_CLOUD_FILES.setupSteps);
      const agentPath = path.join(tempDir, COPILOT_CLOUD_FILES.agent);
      await fs.mkdir(path.dirname(setupStepsPath), { recursive: true });
      await fs.mkdir(path.dirname(agentPath), { recursive: true });
      await fs.writeFile(setupStepsPath, 'custom setup');
      await fs.writeFile(agentPath, 'custom agent');

      const result = await writeCopilotCloudFiles(tempDir, { force: true });

      expect(result).toEqual({ setupStepsWritten: true, agentWritten: true });
      await expect(fs.readFile(setupStepsPath, 'utf8')).resolves.toContain('copilot-setup-steps:');
      await expect(fs.readFile(agentPath, 'utf8')).resolves.toContain('# OpenSpec Agent');
    });
  });

  describe('removeCopilotCloudFiles', () => {
    it('removes only existing cloud files and returns the removal count', async () => {
      const setupStepsPath = path.join(tempDir, COPILOT_CLOUD_FILES.setupSteps);
      const agentPath = path.join(tempDir, COPILOT_CLOUD_FILES.agent);
      await fs.mkdir(path.dirname(setupStepsPath), { recursive: true });
      await fs.writeFile(setupStepsPath, 'custom setup');

      const removed = await removeCopilotCloudFiles(tempDir);

      expect(removed).toBe(1);
      await expect(fs.stat(setupStepsPath)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(fs.stat(agentPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });
  });
});
