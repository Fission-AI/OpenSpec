import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  getInvocationStyleForAdapter,
  getInvocationStyleForPath,
} from '../../../src/core/command-generation/invocation.js';
import { CommandAdapterRegistry } from '../../../src/core/command-generation/registry.js';
import { resolveCommandInvocationStyle } from '../../../src/core/command-surface.js';
import { generateCommand } from '../../../src/core/command-generation/generator.js';
import type { CommandContent } from '../../../src/core/command-generation/types.js';
import { ALL_WORKFLOWS } from '../../../src/core/profiles.js';

/**
 * Tools whose command files live in an `opsx/` directory, so the tool
 * namespaces the command and registers `/opsx:<id>`. Every other registered
 * adapter writes `opsx-<id>` as the filename and therefore registers
 * `/opsx-<id>`.
 *
 * This list is a tripwire, not the source of truth: production classifies a
 * tool from its own `getFilePath`. A new adapter that lands on the wrong side
 * of the split fails here, which is the point.
 */
const NAMESPACED_TOOLS = ['claude', 'codebuddy', 'crush', 'gemini', 'lingma', 'qoder', 'zcode'];

const sampleContent: CommandContent = {
  id: 'apply',
  name: 'OpenSpec Apply',
  description: 'Implement tasks',
  category: 'Workflow',
  tags: ['openspec'],
  body: 'Run /opsx:archive when done. See /opsx:continue for the next artifact.',
};

describe('command-generation/invocation', () => {
  describe('getInvocationStyleForPath', () => {
    it('classifies an opsx- prefixed filename as flat', () => {
      expect(getInvocationStyleForPath(path.join('.cursor', 'commands', 'opsx-apply.md'))).toBe('flat');
      expect(getInvocationStyleForPath(path.join('.github', 'prompts', 'opsx-apply.prompt.md'))).toBe('flat');
    });

    it('classifies a file inside an opsx/ directory as namespaced', () => {
      expect(getInvocationStyleForPath(path.join('.claude', 'commands', 'opsx', 'apply.md'))).toBe('namespaced');
      expect(getInvocationStyleForPath(path.join('.gemini', 'commands', 'opsx', 'apply.toml'))).toBe('namespaced');
    });
  });

  describe('every registered adapter', () => {
    it('is classified by the command files it writes, not by a hand-kept list', () => {
      for (const adapter of CommandAdapterRegistry.getAll()) {
        const expected = NAMESPACED_TOOLS.includes(adapter.toolId) ? 'namespaced' : 'flat';
        expect(
          getInvocationStyleForAdapter(adapter),
          `${adapter.toolId} writes ${adapter.getFilePath('apply')}`
        ).toBe(expected);
      }
    });

    it('classifies every command id as that adapter is expected to be classified', () => {
      for (const adapter of CommandAdapterRegistry.getAll()) {
        const expected = NAMESPACED_TOOLS.includes(adapter.toolId) ? 'namespaced' : 'flat';
        for (const id of ALL_WORKFLOWS) {
          expect(
            getInvocationStyleForPath(adapter.getFilePath(id)),
            `${adapter.toolId} ${id}`
          ).toBe(expected);
        }
      }
    });
  });

  describe('resolveCommandInvocationStyle', () => {
    it('resolves the style for every registered tool', () => {
      // Compared against the expected table, not against
      // getInvocationStyleForAdapter — asserting f(x) === f(x) can never fail.
      for (const adapter of CommandAdapterRegistry.getAll()) {
        const expected = NAMESPACED_TOOLS.includes(adapter.toolId) ? 'namespaced' : 'flat';
        expect(resolveCommandInvocationStyle(adapter.toolId), adapter.toolId).toBe(expected);
      }
      expect(resolveCommandInvocationStyle('cursor')).toBe('flat');
      expect(resolveCommandInvocationStyle('claude')).toBe('namespaced');
    });

    it('returns undefined for tools with no command adapter', () => {
      // These tools receive skills only, so they have no command name to spell.
      for (const toolId of ['codex', 'kimi', 'vibe', 'hermes', 'not-a-tool']) {
        expect(resolveCommandInvocationStyle(toolId), toolId).toBeUndefined();
      }
    });
  });

  describe('generateCommand', () => {
    it('rewrites command references to the names a flat tool registers', () => {
      for (const toolId of ['cursor', 'github-copilot', 'windsurf', 'opencode', 'qwen']) {
        const adapter = CommandAdapterRegistry.get(toolId)!;
        const { fileContent } = generateCommand(sampleContent, adapter);
        expect(fileContent, toolId).toContain('/opsx-archive');
        expect(fileContent, toolId).toContain('/opsx-continue');
        expect(fileContent, toolId).not.toContain('/opsx:');
      }
    });

    it('leaves command references alone for namespaced tools', () => {
      for (const toolId of NAMESPACED_TOOLS) {
        const adapter = CommandAdapterRegistry.get(toolId)!;
        const { fileContent } = generateCommand(sampleContent, adapter);
        expect(fileContent, toolId).toContain('/opsx:archive');
        expect(fileContent, toolId).not.toContain('/opsx-archive');
      }
    });

    it('rewrites nothing but the command references', () => {
      const adapter = CommandAdapterRegistry.get('cursor')!;
      const plain = { ...sampleContent, body: 'Plain body. See docs/opsx.md and openspec/changes/.' };
      const { fileContent } = generateCommand(plain, adapter);
      expect(fileContent).toContain('Plain body. See docs/opsx.md and openspec/changes/.');
    });

    it('leaves the adapters themselves as pure formatters', () => {
      // generateCommand owns the rewrite; an adapter that re-added its own
      // body transform would break this contract even though the output of
      // generateCommand happens to be identical (the rewrite is idempotent).
      for (const toolId of ['bob', 'oh-my-pi', 'opencode', 'pi', 'qwen', 'cursor']) {
        const adapter = CommandAdapterRegistry.get(toolId)!;
        expect(adapter.formatFile(sampleContent), toolId).toContain('/opsx:archive');
      }
    });
  });
});
