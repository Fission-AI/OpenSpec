import { describe, it, expect } from 'vitest';
import { resolveOrchestration } from '../../../src/core/orchestration/resolver.js';
import type { LoadedPlugin } from '../../../src/core/plugin/types.js';
import type { SchemaParallelGroup } from '../../../src/core/artifact-graph/types.js';

function makePlugin(overrides: Partial<LoadedPlugin> & { manifest: LoadedPlugin['manifest'] }): LoadedPlugin {
  return {
    dir: '/test/plugin',
    source: 'project',
    config: {},
    ...overrides,
  };
}

describe('resolver', () => {
  describe('resolveOrchestration', () => {
    it('should return empty groups when no plugins or schema', () => {
      const result = resolveOrchestration([], undefined, 'gates');
      expect(result.groups).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should resolve bidirectional parallel_with from plugins', () => {
      const plugin = makePlugin({
        manifest: {
          name: 'dual-review',
          version: '1.0.0',
          gates: [
            {
              id: 'claude-review',
              handler: { type: 'prompt' as const, file: 'gates/claude.md', ignore_failure: false },
              orchestration: { parallel_with: ['codex-review'], preferred_mode: 'teams' },
            },
            {
              id: 'codex-review',
              handler: { type: 'prompt' as const, file: 'gates/codex.md', ignore_failure: false },
              orchestration: { parallel_with: ['claude-review'], preferred_mode: 'teams' },
            },
          ],
        },
      });

      const result = resolveOrchestration([plugin], undefined, 'gates');

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].ids).toEqual(['claude-review', 'codex-review']);
      expect(result.groups[0].parallel).toBe(true);
      expect(result.groups[0].mode).toBe('teams');
      expect(result.groups[0].resolved_from).toBe('plugin');
      expect(result.warnings).toEqual([]);
    });

    it('should warn on unidirectional parallel_with', () => {
      const plugin = makePlugin({
        manifest: {
          name: 'one-way',
          version: '1.0.0',
          gates: [
            {
              id: 'gate-a',
              handler: { type: 'prompt' as const, file: 'a.md', ignore_failure: false },
              orchestration: { parallel_with: ['gate-b'] },
            },
            {
              id: 'gate-b',
              handler: { type: 'prompt' as const, file: 'b.md', ignore_failure: false },
              // No parallel_with back to gate-a
            },
          ],
        },
      });

      const result = resolveOrchestration([plugin], undefined, 'gates');

      expect(result.groups).toEqual([]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Unidirectional');
      expect(result.warnings[0]).toContain('gate-a');
      expect(result.warnings[0]).toContain('gate-b');
    });

    it('should let schema override plugin declarations', () => {
      const plugin = makePlugin({
        manifest: {
          name: 'review',
          version: '1.0.0',
          gates: [
            {
              id: 'claude-review',
              handler: { type: 'prompt' as const, file: 'claude.md', ignore_failure: false },
              orchestration: { parallel_with: ['codex-review'] },
            },
            {
              id: 'codex-review',
              handler: { type: 'prompt' as const, file: 'codex.md', ignore_failure: false },
              orchestration: { parallel_with: ['claude-review'] },
            },
          ],
        },
      });

      const schemaGroups: SchemaParallelGroup[] = [
        {
          gates: ['claude-review', 'codex-review'],
          parallel: true,
          mode: 'subagents',
          synthesis: 'require-both-pass',
        },
      ];

      const result = resolveOrchestration([plugin], schemaGroups, 'gates');

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].mode).toBe('subagents');
      expect(result.groups[0].synthesis).toBe('require-both-pass');
      expect(result.groups[0].resolved_from).toBe('schema');
    });

    it('should warn when schema references non-existent gate', () => {
      const schemaGroups: SchemaParallelGroup[] = [
        {
          gates: ['nonexistent-gate'],
          parallel: true,
        },
      ];

      const result = resolveOrchestration([], schemaGroups, 'gates');

      expect(result.groups).toHaveLength(1);
      expect(result.warnings.some((w) => w.includes('nonexistent-gate'))).toBe(true);
    });

    it('should handle hooks resolution', () => {
      const plugin = makePlugin({
        manifest: {
          name: 'hook-plugin',
          version: '1.0.0',
          hooks: {
            'apply.post': [
              {
                id: 'hook-a',
                handler: { type: 'command' as const, run: 'echo a', ignore_failure: false },
                orchestration: { parallel_with: ['hook-b'] },
              },
              {
                id: 'hook-b',
                handler: { type: 'command' as const, run: 'echo b', ignore_failure: false },
                orchestration: { parallel_with: ['hook-a'] },
              },
            ],
          },
        },
      });

      const result = resolveOrchestration([plugin], undefined, 'hooks');

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].ids).toEqual(['hook-a', 'hook-b']);
      expect(result.groups[0].parallel).toBe(true);
      expect(result.groups[0].resolved_from).toBe('plugin');
    });

    it('should handle schema with sequential (non-parallel) groups', () => {
      const schemaGroups: SchemaParallelGroup[] = [
        {
          gates: ['structural', 'semantic'],
          parallel: false,
        },
      ];

      const result = resolveOrchestration([], schemaGroups, 'gates');

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].parallel).toBe(false);
    });

    it('should use preferred_mode from first item in group', () => {
      const plugin = makePlugin({
        manifest: {
          name: 'mode-test',
          version: '1.0.0',
          gates: [
            {
              id: 'a',
              handler: { type: 'prompt' as const, file: 'a.md', ignore_failure: false },
              orchestration: { parallel_with: ['b'], preferred_mode: 'subagents' },
            },
            {
              id: 'b',
              handler: { type: 'prompt' as const, file: 'b.md', ignore_failure: false },
              orchestration: { parallel_with: ['a'] },
            },
          ],
        },
      });

      const result = resolveOrchestration([plugin], undefined, 'gates');

      expect(result.groups[0].mode).toBe('subagents');
    });

    it('should handle multiple plugins with gates', () => {
      const plugin1 = makePlugin({
        manifest: {
          name: 'plugin-1',
          version: '1.0.0',
          gates: [
            {
              id: 'gate-1',
              handler: { type: 'prompt' as const, file: '1.md', ignore_failure: false },
              orchestration: { parallel_with: ['gate-2'] },
            },
          ],
        },
      });

      const plugin2 = makePlugin({
        manifest: {
          name: 'plugin-2',
          version: '1.0.0',
          gates: [
            {
              id: 'gate-2',
              handler: { type: 'prompt' as const, file: '2.md', ignore_failure: false },
              orchestration: { parallel_with: ['gate-1'] },
            },
          ],
        },
      });

      const result = resolveOrchestration([plugin1, plugin2], undefined, 'gates');

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].ids).toEqual(['gate-1', 'gate-2']);
    });
  });
});
