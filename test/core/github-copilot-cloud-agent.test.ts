import { describe, it, expect } from 'vitest';
import {
  includesGitHubCopilot,
  generateCopilotSetupSteps,
  generateCopilotAgentFile,
  COPILOT_CLOUD_FILES,
} from '../../src/core/github-copilot/cloud-agent.js';

describe('GitHub Copilot Cloud Agent', () => {
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
      expect(content).toContain('terminal');
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
});
