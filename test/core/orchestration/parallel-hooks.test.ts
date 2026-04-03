import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { dispatchHooks, buildParallelGroups } from '../../../src/core/plugin/hook-dispatcher.js';
import type { HookContext } from '../../../src/core/plugin/hook-dispatcher.js';
import type { LoadedPlugin } from '../../../src/core/plugin/types.js';

describe('parallel hook dispatch', () => {
  let tempDir: string;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-parallel-hooks-'));
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleWarnSpy.mockRestore();
  });

  function makeContext(overrides?: Partial<HookContext>): HookContext {
    return {
      changeName: 'test-change',
      changeDir: path.join(tempDir, 'changes', 'test-change'),
      schema: 'sdd',
      projectRoot: tempDir,
      phase: 'apply',
      hookPoint: 'apply.post',
      ...overrides,
    };
  }

  function makePlugin(
    name: string,
    hooks: LoadedPlugin['manifest']['hooks'],
    pluginDir?: string
  ): LoadedPlugin {
    return {
      manifest: { name, version: '1.0.0', hooks },
      dir: pluginDir ?? path.join(tempDir, 'plugins', name),
      source: 'project',
      config: {},
    };
  }

  describe('buildParallelGroups', () => {
    it('should detect bidirectional parallel_with pairs', () => {
      const entries = [
        {
          plugin: {} as LoadedPlugin,
          hook: {
            id: 'hook-a',
            handler: { type: 'command' as const, run: 'echo a', ignore_failure: false },
            orchestration: { parallel_with: ['hook-b'] },
          },
        },
        {
          plugin: {} as LoadedPlugin,
          hook: {
            id: 'hook-b',
            handler: { type: 'command' as const, run: 'echo b', ignore_failure: false },
            orchestration: { parallel_with: ['hook-a'] },
          },
        },
      ];

      const groups = buildParallelGroups(entries);

      expect(groups).toHaveLength(1);
      expect(groups[0].ids).toEqual(['hook-a', 'hook-b']);
      expect(groups[0].parallel).toBe(true);
    });

    it('should not group unidirectional declarations', () => {
      const entries = [
        {
          plugin: {} as LoadedPlugin,
          hook: {
            id: 'hook-a',
            handler: { type: 'command' as const, run: 'echo a', ignore_failure: false },
            orchestration: { parallel_with: ['hook-b'] },
          },
        },
        {
          plugin: {} as LoadedPlugin,
          hook: {
            id: 'hook-b',
            handler: { type: 'command' as const, run: 'echo b', ignore_failure: false },
          },
        },
      ];

      const groups = buildParallelGroups(entries);

      expect(groups).toEqual([]);
    });

    it('should return empty for hooks without orchestration', () => {
      const entries = [
        {
          plugin: {} as LoadedPlugin,
          hook: {
            id: 'hook-a',
            handler: { type: 'command' as const, run: 'echo a', ignore_failure: false },
          },
        },
      ];

      const groups = buildParallelGroups(entries);

      expect(groups).toEqual([]);
    });
  });

  describe('dispatchHooks with orchestrationMode', () => {
    it('should execute command hooks in parallel within groups', async () => {
      const plugin = makePlugin('parallel-plugin', {
        'apply.post': [
          {
            id: 'cmd-a',
            handler: { type: 'command' as const, run: 'echo alpha', ignore_failure: false },
            orchestration: { parallel_with: ['cmd-b'] },
          },
          {
            id: 'cmd-b',
            handler: { type: 'command' as const, run: 'echo beta', ignore_failure: false },
            orchestration: { parallel_with: ['cmd-a'] },
          },
        ],
      });
      const context = makeContext();

      const result = await dispatchHooks([plugin], 'apply.post', context, 'teams');

      expect(result.executed).toHaveLength(2);
      expect(result.executed.map((e) => e.id).sort()).toEqual(['cmd-a', 'cmd-b']);
      expect(result.executed.every((e) => e.status === 'success')).toBe(true);
    });

    it('should return prompt hooks as pending with parallel_group metadata', async () => {
      const pluginDir = path.join(tempDir, 'plugins', 'prompt-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.writeFileSync(
        path.join(pluginDir, 'prompt-a.md'),
        'Review {{change_name}}',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(pluginDir, 'prompt-b.md'),
        'Check {{change_name}}',
        'utf-8'
      );

      const plugin = makePlugin(
        'prompt-plugin',
        {
          'apply.post': [
            {
              id: 'prompt-a',
              handler: { type: 'prompt' as const, file: 'prompt-a.md', ignore_failure: false },
              orchestration: { parallel_with: ['prompt-b'] },
            },
            {
              id: 'prompt-b',
              handler: { type: 'prompt' as const, file: 'prompt-b.md', ignore_failure: false },
              orchestration: { parallel_with: ['prompt-a'] },
            },
          ],
        },
        pluginDir
      );
      const context = makeContext();

      const result = await dispatchHooks([plugin], 'apply.post', context, 'teams');

      expect(result.pending).toHaveLength(2);
      expect(result.pending[0].parallel_group).toEqual(['prompt-a', 'prompt-b']);
      expect(result.pending[1].parallel_group).toEqual(['prompt-a', 'prompt-b']);
    });

    it('should handle mixed parallel and sequential hooks', async () => {
      const plugin = makePlugin('mixed-plugin', {
        'apply.post': [
          {
            id: 'parallel-a',
            handler: { type: 'command' as const, run: 'echo parallel-a', ignore_failure: false },
            orchestration: { parallel_with: ['parallel-b'] },
          },
          {
            id: 'parallel-b',
            handler: { type: 'command' as const, run: 'echo parallel-b', ignore_failure: false },
            orchestration: { parallel_with: ['parallel-a'] },
          },
          {
            id: 'sequential-c',
            handler: { type: 'command' as const, run: 'echo sequential-c', ignore_failure: false },
          },
        ],
      });
      const context = makeContext();

      const result = await dispatchHooks([plugin], 'apply.post', context, 'teams');

      expect(result.executed).toHaveLength(3);
      const ids = result.executed.map((e) => e.id);
      expect(ids).toContain('parallel-a');
      expect(ids).toContain('parallel-b');
      expect(ids).toContain('sequential-c');
    });

    it('should fall back to sequential execution without orchestrationMode', async () => {
      const plugin = makePlugin('fallback-plugin', {
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
      });
      const context = makeContext();

      // Without orchestrationMode — sequential
      const result = await dispatchHooks([plugin], 'apply.post', context);

      expect(result.executed).toHaveLength(2);
      // Both should succeed
      expect(result.executed.every((e) => e.status === 'success')).toBe(true);
      // No parallel_group metadata on pending
      expect(result.pending).toEqual([]);
    });

    it('should handle command failure in parallel group', async () => {
      const plugin = makePlugin('fail-plugin', {
        'apply.post': [
          {
            id: 'good-hook',
            handler: { type: 'command' as const, run: 'echo ok', ignore_failure: false },
            orchestration: { parallel_with: ['bad-hook'] },
          },
          {
            id: 'bad-hook',
            handler: { type: 'command' as const, run: 'exit 1', ignore_failure: false },
            orchestration: { parallel_with: ['good-hook'] },
          },
        ],
      });
      const context = makeContext();

      const result = await dispatchHooks([plugin], 'apply.post', context, 'teams');

      expect(result.executed).toHaveLength(2);
      const good = result.executed.find((e) => e.id === 'good-hook');
      const bad = result.executed.find((e) => e.id === 'bad-hook');
      expect(good?.status).toBe('success');
      expect(bad?.status).toBe('failed');
    });
  });
});
