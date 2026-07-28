import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  formatCommandInvocation,
  getInvocationForAdapter,
  getInvocationStyleForPath,
  needsInvocationRewrite,
} from '../../../src/core/command-generation/invocation.js';
import { CommandAdapterRegistry } from '../../../src/core/command-generation/registry.js';
import { resolveCommandInvocation } from '../../../src/core/command-surface.js';
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

/**
 * Tools whose command name is wrapped in something other than a slash. The
 * prefix cannot be read off the file path, so it is adapter metadata — and
 * this list is the tripwire that a new one was declared deliberately. Amazon Q
 * loads its `.amazonq/prompts/` files into its prompt library, invoked as
 * `@opsx-<id>`.
 */
const NON_SLASH_PREFIXES: Record<string, string> = { 'amazon-q': '@' };

const expectedInvocation = (toolId: string) => ({
  style: NAMESPACED_TOOLS.includes(toolId) ? ('namespaced' as const) : ('flat' as const),
  prefix: NON_SLASH_PREFIXES[toolId] ?? '/',
});

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
        expect(
          getInvocationForAdapter(adapter),
          `${adapter.toolId} writes ${adapter.getFilePath('apply')}`
        ).toEqual(expectedInvocation(adapter.toolId));
      }
    });

    it('defaults to the slash prefix unless the adapter declares another', () => {
      // The prefix is the one part that cannot be derived from the file path,
      // so an adapter that quietly grew one should show up here.
      for (const adapter of CommandAdapterRegistry.getAll()) {
        expect(adapter.invocationPrefix, adapter.toolId).toBe(
          NON_SLASH_PREFIXES[adapter.toolId]
        );
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

  describe('resolveCommandInvocation', () => {
    it('resolves the invocation for every registered tool', () => {
      // Compared against the expected table, not against
      // getInvocationForAdapter — asserting f(x) === f(x) can never fail.
      for (const adapter of CommandAdapterRegistry.getAll()) {
        expect(resolveCommandInvocation(adapter.toolId), adapter.toolId).toEqual(
          expectedInvocation(adapter.toolId)
        );
      }
      expect(resolveCommandInvocation('cursor')).toEqual({ style: 'flat', prefix: '/' });
      expect(resolveCommandInvocation('claude')).toEqual({ style: 'namespaced', prefix: '/' });
      expect(resolveCommandInvocation('amazon-q')).toEqual({ style: 'flat', prefix: '@' });
    });

    it('returns undefined for tools with no command adapter', () => {
      // These tools receive skills only, so they have no command name to spell.
      for (const toolId of ['codex', 'kimi', 'vibe', 'hermes', 'not-a-tool']) {
        expect(resolveCommandInvocation(toolId), toolId).toBeUndefined();
      }
    });
  });

  describe('formatCommandInvocation', () => {
    it('spells each shape the way the tool registers it', () => {
      expect(formatCommandInvocation({ style: 'namespaced', prefix: '/' }, 'apply')).toBe('/opsx:apply');
      expect(formatCommandInvocation({ style: 'flat', prefix: '/' }, 'apply')).toBe('/opsx-apply');
      expect(formatCommandInvocation({ style: 'flat', prefix: '@' }, 'bulk-archive')).toBe(
        '@opsx-bulk-archive'
      );
    });

    it('rewrites only what differs from the canonical authored form', () => {
      expect(needsInvocationRewrite({ style: 'namespaced', prefix: '/' })).toBe(false);
      expect(needsInvocationRewrite({ style: 'flat', prefix: '/' })).toBe(true);
      expect(needsInvocationRewrite({ style: 'namespaced', prefix: '@' })).toBe(true);
    });
  });

  describe('generateCommand', () => {
    it('rewrites command references to the names a flat tool registers', () => {
      for (const toolId of ['cursor', 'github-copilot', 'windsurf', 'devin', 'opencode', 'qwen']) {
        const adapter = CommandAdapterRegistry.get(toolId)!;
        const { fileContent } = generateCommand(sampleContent, adapter);
        expect(fileContent, toolId).toContain('/opsx-archive');
        expect(fileContent, toolId).toContain('/opsx-continue');
        expect(fileContent, toolId).not.toContain('/opsx:');
      }
    });

    it("writes Amazon Q's prompt-library form, not a slash command", () => {
      // .amazonq/prompts/opsx-<id>.md is a prompt, invoked with @ — a body
      // telling the user to type /opsx-archive names nothing Amazon Q registers.
      const adapter = CommandAdapterRegistry.get('amazon-q')!;
      const { fileContent } = generateCommand(sampleContent, adapter);
      expect(fileContent).toContain('@opsx-archive');
      expect(fileContent).toContain('@opsx-continue');
      expect(fileContent).not.toContain('/opsx-');
      expect(fileContent).not.toContain('/opsx:');
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
