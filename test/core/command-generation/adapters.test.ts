import { describe, it, expect } from 'vitest';
import os from 'os';
import path from 'path';
import { amazonQAdapter } from '../../../src/core/command-generation/adapters/amazon-q.js';
import { antigravityAdapter } from '../../../src/core/command-generation/adapters/antigravity.js';
import { auggieAdapter } from '../../../src/core/command-generation/adapters/auggie.js';
import { claudeAdapter } from '../../../src/core/command-generation/adapters/claude.js';
import { clineAdapter } from '../../../src/core/command-generation/adapters/cline.js';
import { codexAdapter } from '../../../src/core/command-generation/adapters/codex.js';
import { codebuddyAdapter } from '../../../src/core/command-generation/adapters/codebuddy.js';
import { continueAdapter } from '../../../src/core/command-generation/adapters/continue.js';
import { costrictAdapter } from '../../../src/core/command-generation/adapters/costrict.js';
import { crushAdapter } from '../../../src/core/command-generation/adapters/crush.js';
import { cursorAdapter } from '../../../src/core/command-generation/adapters/cursor.js';
import { factoryAdapter } from '../../../src/core/command-generation/adapters/factory.js';
import { geminiAdapter } from '../../../src/core/command-generation/adapters/gemini.js';
import { githubCopilotAdapter } from '../../../src/core/command-generation/adapters/github-copilot.js';
import { iflowAdapter } from '../../../src/core/command-generation/adapters/iflow.js';
import { kilocodeAdapter } from '../../../src/core/command-generation/adapters/kilocode.js';
import { opencodeAdapter } from '../../../src/core/command-generation/adapters/opencode.js';
import { qoderAdapter } from '../../../src/core/command-generation/adapters/qoder.js';
import { qwenAdapter } from '../../../src/core/command-generation/adapters/qwen.js';
import { roocodeAdapter } from '../../../src/core/command-generation/adapters/roocode.js';
import { windsurfAdapter } from '../../../src/core/command-generation/adapters/windsurf.js';
import type { CommandContent } from '../../../src/core/command-generation/types.js';

describe('command-generation/adapters', () => {
  const sampleContent: CommandContent = {
    id: 'explore',
    name: 'OpenSpec Explore',
    description: 'Enter explore mode for thinking',
    category: 'Workflow',
    tags: ['workflow', 'explore', 'experimental'],
    body: 'This is the command body.\n\nWith multiple lines.',
  };

  describe('claudeAdapter', () => {
    it('should have correct toolId', () => {
      expect(claudeAdapter.toolId).toBe('claude');
    });

    it('should generate correct file path', () => {
      const filePath = claudeAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.claude', 'commands', 'opsx', 'explore.md'));
    });

    it('should generate correct file path for different command IDs', () => {
      expect(claudeAdapter.getFilePath('new')).toBe(path.join('.claude', 'commands', 'opsx', 'new.md'));
      expect(claudeAdapter.getFilePath('bulk-archive')).toBe(path.join('.claude', 'commands', 'opsx', 'bulk-archive.md'));
    });

    it('should format file with correct YAML frontmatter', () => {
      const output = claudeAdapter.formatFile(sampleContent);

      expect(output).toContain('---\n');
      expect(output).toContain('name: OpenSpec Explore');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('category: Workflow');
      expect(output).toContain('tags: [workflow, explore, experimental]');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.\n\nWith multiple lines.');
    });

    it('should handle empty tags', () => {
      const contentNoTags: CommandContent = { ...sampleContent, tags: [] };
      const output = claudeAdapter.formatFile(contentNoTags);
      expect(output).toContain('tags: []');
    });
  });

  describe('cursorAdapter', () => {
    it('should have correct toolId', () => {
      expect(cursorAdapter.toolId).toBe('cursor');
    });

    it('should generate correct file path with opsx- prefix', () => {
      const filePath = cursorAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.cursor', 'commands', 'opsx-explore.md'));
    });

    it('should generate correct file paths for different commands', () => {
      expect(cursorAdapter.getFilePath('new')).toBe(path.join('.cursor', 'commands', 'opsx-new.md'));
      expect(cursorAdapter.getFilePath('bulk-archive')).toBe(path.join('.cursor', 'commands', 'opsx-bulk-archive.md'));
    });

    it('should format file with Cursor-specific frontmatter', () => {
      const output = cursorAdapter.formatFile(sampleContent);

      expect(output).toContain('---\n');
      expect(output).toContain('name: /opsx-explore');
      expect(output).toContain('id: opsx-explore');
      expect(output).toContain('category: Workflow');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });

    it('should not include tags in Cursor format', () => {
      const output = cursorAdapter.formatFile(sampleContent);
      expect(output).not.toContain('tags:');
    });
  });

  describe('windsurfAdapter', () => {
    it('should have correct toolId', () => {
      expect(windsurfAdapter.toolId).toBe('windsurf');
    });

    it('should generate correct file path', () => {
      const filePath = windsurfAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.windsurf', 'workflows', 'opsx-explore.md'));
    });

    it('should format file similar to Claude format', () => {
      const output = windsurfAdapter.formatFile(sampleContent);

      expect(output).toContain('---\n');
      expect(output).toContain('name: OpenSpec Explore');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('category: Workflow');
      expect(output).toContain('tags: [workflow, explore, experimental]');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('amazonQAdapter', () => {
    it('should have correct toolId', () => {
      expect(amazonQAdapter.toolId).toBe('amazon-q');
    });

    it('should generate correct file path', () => {
      const filePath = amazonQAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.amazonq', 'prompts', 'opsx-explore.md'));
    });

    it('should format file with description frontmatter', () => {
      const output = amazonQAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('antigravityAdapter', () => {
    it('should have correct toolId', () => {
      expect(antigravityAdapter.toolId).toBe('antigravity');
    });

    it('should generate correct file path', () => {
      const filePath = antigravityAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.agent', 'workflows', 'opsx-explore.md'));
    });

    it('should format file with description frontmatter', () => {
      const output = antigravityAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('auggieAdapter', () => {
    it('should have correct toolId', () => {
      expect(auggieAdapter.toolId).toBe('auggie');
    });

    it('should generate correct file path', () => {
      const filePath = auggieAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.augment', 'commands', 'opsx-explore.md'));
    });

    it('should format file with description and argument-hint', () => {
      const output = auggieAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('argument-hint: command arguments');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('clineAdapter', () => {
    it('should have correct toolId', () => {
      expect(clineAdapter.toolId).toBe('cline');
    });

    it('should generate correct file path', () => {
      const filePath = clineAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.clinerules', 'workflows', 'opsx-explore.md'));
    });

    it('should format file with markdown header (no YAML frontmatter)', () => {
      const output = clineAdapter.formatFile(sampleContent);
      expect(output).toContain('# OpenSpec Explore');
      expect(output).toContain('Enter explore mode for thinking');
      expect(output).toContain('This is the command body.');
      expect(output).not.toContain('---');
    });
  });

  describe('codexAdapter', () => {
    it('should have correct toolId', () => {
      expect(codexAdapter.toolId).toBe('codex');
    });

    it('should return an absolute path', () => {
      const filePath = codexAdapter.getFilePath('explore');
      expect(path.isAbsolute(filePath)).toBe(true);
    });

    it('should generate path ending with correct structure', () => {
      const filePath = codexAdapter.getFilePath('explore');
      expect(filePath).toMatch(/prompts[/\\]opsx-explore\.md$/);
    });

    it('should default to homedir/.codex', () => {
      const original = process.env.CODEX_HOME;
      delete process.env.CODEX_HOME;
      try {
        const filePath = codexAdapter.getFilePath('explore');
        const expected = path.join(os.homedir(), '.codex', 'prompts', 'opsx-explore.md');
        expect(filePath).toBe(expected);
      } finally {
        if (original !== undefined) {
          process.env.CODEX_HOME = original;
        }
      }
    });

    it('should respect CODEX_HOME env var', () => {
      const original = process.env.CODEX_HOME;
      process.env.CODEX_HOME = '/custom/codex-home';
      try {
        const filePath = codexAdapter.getFilePath('explore');
        expect(filePath).toBe(path.join(path.resolve('/custom/codex-home'), 'prompts', 'opsx-explore.md'));
      } finally {
        if (original !== undefined) {
          process.env.CODEX_HOME = original;
        } else {
          delete process.env.CODEX_HOME;
        }
      }
    });

    it('should format file with description and argument-hint', () => {
      const output = codexAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('argument-hint: command arguments');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('codebuddyAdapter', () => {
    it('should have correct toolId', () => {
      expect(codebuddyAdapter.toolId).toBe('codebuddy');
    });

    it('should generate correct file path with nested opsx folder', () => {
      const filePath = codebuddyAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.codebuddy', 'commands', 'opsx', 'explore.md'));
    });

    it('should format file with name, description, and argument-hint', () => {
      const output = codebuddyAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('name: OpenSpec Explore');
      expect(output).toContain('description: "Enter explore mode for thinking"');
      expect(output).toContain('argument-hint: "[command arguments]"');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('continueAdapter', () => {
    it('should have correct toolId', () => {
      expect(continueAdapter.toolId).toBe('continue');
    });

    it('should generate correct file path with .prompt extension', () => {
      const filePath = continueAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.continue', 'prompts', 'opsx-explore.prompt'));
    });

    it('should format file with name, description, and invokable', () => {
      const output = continueAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('name: opsx-explore');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('invokable: true');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('costrictAdapter', () => {
    it('should have correct toolId', () => {
      expect(costrictAdapter.toolId).toBe('costrict');
    });

    it('should generate correct file path', () => {
      const filePath = costrictAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.cospec', 'openspec', 'commands', 'opsx-explore.md'));
    });

    it('should format file with description and argument-hint', () => {
      const output = costrictAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('description: "Enter explore mode for thinking"');
      expect(output).toContain('argument-hint: command arguments');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('crushAdapter', () => {
    it('should have correct toolId', () => {
      expect(crushAdapter.toolId).toBe('crush');
    });

    it('should generate correct file path with nested opsx folder', () => {
      const filePath = crushAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.crush', 'commands', 'opsx', 'explore.md'));
    });

    it('should format file with name, description, category, and tags', () => {
      const output = crushAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('name: OpenSpec Explore');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('category: Workflow');
      expect(output).toContain('tags: [workflow, explore, experimental]');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('factoryAdapter', () => {
    it('should have correct toolId', () => {
      expect(factoryAdapter.toolId).toBe('factory');
    });

    it('should generate correct file path', () => {
      const filePath = factoryAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.factory', 'commands', 'opsx-explore.md'));
    });

    it('should format file with description and argument-hint', () => {
      const output = factoryAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('argument-hint: command arguments');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('geminiAdapter', () => {
    it('should have correct toolId', () => {
      expect(geminiAdapter.toolId).toBe('gemini');
    });

    it('should generate correct file path with .toml extension', () => {
      const filePath = geminiAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.gemini', 'commands', 'opsx', 'explore.toml'));
    });

    it('should format file in TOML format', () => {
      const output = geminiAdapter.formatFile(sampleContent);
      expect(output).toContain('description = "Enter explore mode for thinking"');
      expect(output).toContain('prompt = """');
      expect(output).toContain('This is the command body.');
      expect(output).toContain('"""');
    });
  });

  describe('githubCopilotAdapter', () => {
    it('should have correct toolId', () => {
      expect(githubCopilotAdapter.toolId).toBe('github-copilot');
    });

    it('should generate correct file path with .prompt.md extension', () => {
      const filePath = githubCopilotAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.github', 'prompts', 'opsx-explore.prompt.md'));
    });

    it('should format file with description frontmatter', () => {
      const output = githubCopilotAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('iflowAdapter', () => {
    it('should have correct toolId', () => {
      expect(iflowAdapter.toolId).toBe('iflow');
    });

    it('should generate correct file path', () => {
      const filePath = iflowAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.iflow', 'commands', 'opsx-explore.md'));
    });

    it('should format file with name, id, category, and description', () => {
      const output = iflowAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('name: /opsx-explore');
      expect(output).toContain('id: opsx-explore');
      expect(output).toContain('category: Workflow');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('kilocodeAdapter', () => {
    it('should have correct toolId', () => {
      expect(kilocodeAdapter.toolId).toBe('kilocode');
    });

    it('should generate correct file path', () => {
      const filePath = kilocodeAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.kilocode', 'workflows', 'opsx-explore.md'));
    });

    it('should format file without frontmatter', () => {
      const output = kilocodeAdapter.formatFile(sampleContent);
      expect(output).not.toContain('---');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('opencodeAdapter', () => {
    it('should have correct toolId', () => {
      expect(opencodeAdapter.toolId).toBe('opencode');
    });

    it('should generate correct file path', () => {
      const filePath = opencodeAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.opencode', 'command', 'opsx-explore.md'));
    });

    it('should format file with description frontmatter', () => {
      const output = opencodeAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });

    it('should transform colon-based command references to hyphen-based', () => {
      const contentWithCommands: CommandContent = {
        ...sampleContent,
        body: 'Use /opsx:new to start, then /opsx:apply to implement.',
      };
      const output = opencodeAdapter.formatFile(contentWithCommands);
      expect(output).toContain('/opsx-new');
      expect(output).toContain('/opsx-apply');
      expect(output).not.toContain('/opsx:new');
      expect(output).not.toContain('/opsx:apply');
    });

    it('should handle multiple command references in body', () => {
      const contentWithMultipleCommands: CommandContent = {
        ...sampleContent,
        body: `/opsx:explore for ideas
/opsx:new to create
/opsx:continue to proceed
/opsx:apply to implement`,
      };
      const output = opencodeAdapter.formatFile(contentWithMultipleCommands);
      expect(output).toContain('/opsx-explore');
      expect(output).toContain('/opsx-new');
      expect(output).toContain('/opsx-continue');
      expect(output).toContain('/opsx-apply');
    });
  });

  describe('qoderAdapter', () => {
    it('should have correct toolId', () => {
      expect(qoderAdapter.toolId).toBe('qoder');
    });

    it('should generate correct file path with nested opsx folder', () => {
      const filePath = qoderAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.qoder', 'commands', 'opsx', 'explore.md'));
    });

    it('should format file with name, description, category, and tags', () => {
      const output = qoderAdapter.formatFile(sampleContent);
      expect(output).toContain('---\n');
      expect(output).toContain('name: OpenSpec Explore');
      expect(output).toContain('description: Enter explore mode for thinking');
      expect(output).toContain('category: Workflow');
      expect(output).toContain('tags: [workflow, explore, experimental]');
      expect(output).toContain('---\n\n');
      expect(output).toContain('This is the command body.');
    });
  });

  describe('qwenAdapter', () => {
    it('should have correct toolId', () => {
      expect(qwenAdapter.toolId).toBe('qwen');
    });

    it('should generate correct file path with .toml extension', () => {
      const filePath = qwenAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.qwen', 'commands', 'opsx-explore.toml'));
    });

    it('should format file in TOML format', () => {
      const output = qwenAdapter.formatFile(sampleContent);
      expect(output).toContain('description = "Enter explore mode for thinking"');
      expect(output).toContain('prompt = """');
      expect(output).toContain('This is the command body.');
      expect(output).toContain('"""');
    });
  });

  describe('roocodeAdapter', () => {
    it('should have correct toolId', () => {
      expect(roocodeAdapter.toolId).toBe('roocode');
    });

    it('should generate correct file path', () => {
      const filePath = roocodeAdapter.getFilePath('explore');
      expect(filePath).toBe(path.join('.roo', 'commands', 'opsx-explore.md'));
    });

    it('should format file with markdown header (no YAML frontmatter)', () => {
      const output = roocodeAdapter.formatFile(sampleContent);
      expect(output).toContain('# OpenSpec Explore');
      expect(output).toContain('Enter explore mode for thinking');
      expect(output).toContain('This is the command body.');
      expect(output).not.toContain('---');
    });
  });

  describe('cross-platform path handling', () => {
    it('Claude adapter uses path.join for paths', () => {
      // path.join handles platform-specific separators
      const filePath = claudeAdapter.getFilePath('test');
      // On any platform, path.join returns the correct separator
      expect(filePath.split(path.sep)).toEqual(['.claude', 'commands', 'opsx', 'test.md']);
    });

    it('Cursor adapter uses path.join for paths', () => {
      const filePath = cursorAdapter.getFilePath('test');
      expect(filePath.split(path.sep)).toEqual(['.cursor', 'commands', 'opsx-test.md']);
    });

    it('Windsurf adapter uses path.join for paths', () => {
      const filePath = windsurfAdapter.getFilePath('test');
      expect(filePath.split(path.sep)).toEqual(['.windsurf', 'workflows', 'opsx-test.md']);
    });

    it('All adapters use path.join for paths', () => {
      // Verify all adapters produce valid paths
      const adapters = [
        amazonQAdapter, antigravityAdapter, auggieAdapter, clineAdapter,
        codexAdapter, codebuddyAdapter, continueAdapter, costrictAdapter,
        crushAdapter, factoryAdapter, geminiAdapter, githubCopilotAdapter,
        iflowAdapter, kilocodeAdapter, opencodeAdapter, qoderAdapter,
        qwenAdapter, roocodeAdapter
      ];
      for (const adapter of adapters) {
        const filePath = adapter.getFilePath('test');
        expect(filePath.length).toBeGreaterThan(0);
        expect(filePath.includes(path.sep) || filePath.includes('.')).toBe(true);
      }
    });
  });
});
