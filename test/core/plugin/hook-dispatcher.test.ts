import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { dispatchHooks } from '../../../src/core/plugin/hook-dispatcher.js';
import type { HookContext } from '../../../src/core/plugin/hook-dispatcher.js';
import type { LoadedPlugin } from '../../../src/core/plugin/types.js';

describe('plugin/hook-dispatcher', () => {
  let tempDir: string;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-hooks-'));
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleWarnSpy.mockRestore();
  });

  /** Helper: build a minimal HookContext */
  function makeContext(overrides?: Partial<HookContext>): HookContext {
    return {
      changeName: 'test-change',
      changeDir: path.join(tempDir, 'changes', 'test-change'),
      schema: 'sdd',
      projectRoot: tempDir,
      phase: 'propose',
      hookPoint: 'propose.pre',
      ...overrides,
    };
  }

  /** Helper: build a LoadedPlugin with hooks */
  function makePlugin(
    name: string,
    hooks: LoadedPlugin['manifest']['hooks'],
    pluginDir?: string
  ): LoadedPlugin {
    return {
      manifest: {
        name,
        version: '1.0.0',
        hooks,
      },
      dir: pluginDir ?? path.join(tempDir, 'plugins', name),
      source: 'project',
      config: {},
    };
  }

  describe('dispatchHooks', () => {
    it('should return empty result when no plugins are provided', async () => {
      const context = makeContext();

      const result = await dispatchHooks([], 'propose.pre', context);

      expect(result.executed).toEqual([]);
      expect(result.pending).toEqual([]);
    });

    it('should return empty result when plugins have no hooks for the point', async () => {
      const plugin = makePlugin('no-hooks', {});
      const context = makeContext();

      const result = await dispatchHooks([plugin], 'propose.pre', context);

      expect(result.executed).toEqual([]);
      expect(result.pending).toEqual([]);
    });

    it('should execute command handlers', async () => {
      const plugin = makePlugin('cmd-plugin', {
        'propose.pre': [
          {
            id: 'echo-test',
            handler: {
              type: 'command',
              run: 'node -e "console.log(\'hello from hook\')"',
              ignore_failure: false,
            },
          },
        ],
      });
      const context = makeContext();

      const result = await dispatchHooks([plugin], 'propose.pre', context);

      expect(result.executed).toHaveLength(1);
      expect(result.executed[0].id).toBe('echo-test');
      expect(result.executed[0].status).toBe('success');
      expect(result.executed[0].output).toContain('hello from hook');
    });

    it('should handle command failure', async () => {
      const plugin = makePlugin('fail-plugin', {
        'propose.pre': [
          {
            id: 'fail-cmd',
            handler: {
              type: 'command',
              run: 'node -e "process.exit(1)"',
              ignore_failure: false,
            },
          },
        ],
      });
      const context = makeContext();

      const result = await dispatchHooks([plugin], 'propose.pre', context);

      expect(result.executed).toHaveLength(1);
      expect(result.executed[0].status).toBe('failed');
    });

    it('should respect ignore_failure', async () => {
      const plugin = makePlugin('ignore-plugin', {
        'propose.pre': [
          {
            id: 'ignored-fail',
            handler: {
              type: 'command',
              run: 'node -e "process.exit(1)"',
              ignore_failure: true,
            },
          },
          {
            id: 'after-fail',
            handler: {
              type: 'command',
              run: 'node -e "console.log(\'still running\')"',
              ignore_failure: false,
            },
          },
        ],
      });
      const context = makeContext();

      const result = await dispatchHooks([plugin], 'propose.pre', context);

      // Both hooks should execute because first failure is ignored
      expect(result.executed).toHaveLength(2);
      expect(result.executed[0].id).toBe('ignored-fail');
      expect(result.executed[0].status).toBe('failed');
      expect(result.executed[1].id).toBe('after-fail');
      expect(result.executed[1].status).toBe('success');
    });

    it('should halt on non-ignored failure', async () => {
      const plugin = makePlugin('halt-plugin', {
        'propose.pre': [
          {
            id: 'hard-fail',
            handler: {
              type: 'command',
              run: 'node -e "process.exit(1)"',
              ignore_failure: false,
            },
          },
          {
            id: 'never-runs',
            handler: {
              type: 'command',
              run: 'node -e "console.log(\'should not run\')"',
              ignore_failure: false,
            },
          },
        ],
      });
      const context = makeContext();

      const result = await dispatchHooks([plugin], 'propose.pre', context);

      expect(result.executed).toHaveLength(1);
      expect(result.executed[0].id).toBe('hard-fail');
    });

    it('should halt on non-ignored failure for both type handler', async () => {
      const pluginDir = path.join(tempDir, 'plugins', 'both-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.writeFileSync(
        path.join(pluginDir, 'prompt.md'),
        'This is a prompt template.'
      );

      const plugin = makePlugin(
        'both-plugin',
        {
          'propose.pre': [
            {
              id: 'both-fail',
              handler: {
                type: 'both',
                run: 'node -e "process.exit(1)"',
                file: 'prompt.md',
                ignore_failure: false,
              },
            },
            {
              id: 'after-both',
              handler: {
                type: 'command',
                run: 'node -e "console.log(\'should not run\')"',
                ignore_failure: false,
              },
            },
          ],
        },
        pluginDir
      );
      const context = makeContext();

      const result = await dispatchHooks([plugin], 'propose.pre', context);

      // both handler fails, no prompt returned, next hook skipped
      expect(result.executed).toHaveLength(1);
      expect(result.executed[0].id).toBe('both-fail');
      expect(result.executed[0].status).toBe('failed');
      expect(result.pending).toHaveLength(0);
    });

    it('should render prompt templates with variable substitution', async () => {
      const pluginDir = path.join(tempDir, 'plugins', 'prompt-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.writeFileSync(
        path.join(pluginDir, 'review.md'),
        'Review change {{change_name}} in schema {{schema}} at phase {{phase}}.'
      );

      const plugin = makePlugin(
        'prompt-plugin',
        {
          'propose.post': [
            {
              id: 'review-prompt',
              handler: {
                type: 'prompt',
                file: 'review.md',
                ignore_failure: false,
              },
            },
          ],
        },
        pluginDir
      );
      const context = makeContext({
        hookPoint: 'propose.post',
        changeName: 'my-feature',
        schema: 'sdd',
        phase: 'propose',
      });

      const result = await dispatchHooks([plugin], 'propose.post', context);

      expect(result.pending).toHaveLength(1);
      expect(result.pending[0].id).toBe('review-prompt');
      expect(result.pending[0].prompt).toBe(
        'Review change my-feature in schema sdd at phase propose.'
      );
      expect(result.executed).toHaveLength(0);
    });

    it('should set environment variables for commands', async () => {
      const plugin: LoadedPlugin = {
        manifest: {
          name: 'env-plugin',
          version: '1.0.0',
          hooks: {
            'propose.pre': [
              {
                id: 'env-check',
                handler: {
                  type: 'command',
                  run: 'node -e "console.log(process.env.OPENSPEC_CHANGE_NAME + \'|\' + process.env.OPENSPEC_SCHEMA)"',
                  ignore_failure: false,
                },
              },
            ],
          },
        },
        dir: path.join(tempDir, 'plugins', 'env-plugin'),
        source: 'project',
        config: {},
      };
      const context = makeContext({
        changeName: 'env-test',
        schema: 'bugfix',
      });

      const result = await dispatchHooks([plugin], 'propose.pre', context);

      expect(result.executed).toHaveLength(1);
      expect(result.executed[0].status).toBe('success');
      expect(result.executed[0].output).toContain('env-test|bugfix');
    });

    it('should follow plugin whitelist order', async () => {
      const pluginA = makePlugin('alpha', {
        'apply.pre': [
          {
            id: 'alpha-hook',
            handler: {
              type: 'command',
              run: 'node -e "console.log(\'alpha\')"',
              ignore_failure: false,
            },
          },
        ],
      });
      const pluginB = makePlugin('beta', {
        'apply.pre': [
          {
            id: 'beta-hook',
            handler: {
              type: 'command',
              run: 'node -e "console.log(\'beta\')"',
              ignore_failure: false,
            },
          },
        ],
      });
      const context = makeContext({ hookPoint: 'apply.pre', phase: 'apply' });

      // Order: beta first, then alpha
      const result = await dispatchHooks(
        [pluginB, pluginA],
        'apply.pre',
        context
      );

      expect(result.executed).toHaveLength(2);
      expect(result.executed[0].id).toBe('beta-hook');
      expect(result.executed[0].output).toContain('beta');
      expect(result.executed[1].id).toBe('alpha-hook');
      expect(result.executed[1].output).toContain('alpha');
    });
  });
});
