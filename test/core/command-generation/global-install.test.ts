import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';
import { claudeAdapter } from '../../../src/core/command-generation/adapters/claude.js';
import { opencodeAdapter } from '../../../src/core/command-generation/adapters/opencode.js';
import { codexAdapter } from '../../../src/core/command-generation/adapters/codex.js';
import { cursorAdapter } from '../../../src/core/command-generation/adapters/cursor.js';
import { windsurfAdapter } from '../../../src/core/command-generation/adapters/windsurf.js';
import { CommandAdapterRegistry } from '../../../src/core/command-generation/registry.js';
import { resolveGlobalRoot } from '../../../src/core/command-generation/global-root.js';

describe('getGlobalRoot()', () => {
  describe('claudeAdapter', () => {
    it('should return ~/.claude/ on macOS/Linux', () => {
      if (process.platform !== 'win32') {
        const root = claudeAdapter.getGlobalRoot!();
        expect(root).toBe(path.join(os.homedir(), '.claude'));
      }
    });

    it('should return an absolute path', () => {
      const root = claudeAdapter.getGlobalRoot!();
      expect(root).not.toBeNull();
      expect(path.isAbsolute(root!)).toBe(true);
    });
  });

  describe('opencodeAdapter', () => {
    let originalXdg: string | undefined;

    beforeEach(() => {
      originalXdg = process.env.XDG_CONFIG_HOME;
    });

    afterEach(() => {
      if (originalXdg !== undefined) {
        process.env.XDG_CONFIG_HOME = originalXdg;
      } else {
        delete process.env.XDG_CONFIG_HOME;
      }
    });

    it('should return ~/.config/opencode/ by default on macOS/Linux', () => {
      delete process.env.XDG_CONFIG_HOME;
      if (process.platform !== 'win32') {
        const root = opencodeAdapter.getGlobalRoot!();
        expect(root).toBe(path.join(os.homedir(), '.config', 'opencode'));
      }
    });

    it('should respect XDG_CONFIG_HOME', () => {
      process.env.XDG_CONFIG_HOME = '/custom/config';
      if (process.platform !== 'win32') {
        const root = opencodeAdapter.getGlobalRoot!();
        expect(root).toBe(path.join('/custom/config', 'opencode'));
      }
    });

    it('should return an absolute path', () => {
      const root = opencodeAdapter.getGlobalRoot!();
      expect(root).not.toBeNull();
      expect(path.isAbsolute(root!)).toBe(true);
    });
  });

  describe('codexAdapter', () => {
    let originalCodexHome: string | undefined;

    beforeEach(() => {
      originalCodexHome = process.env.CODEX_HOME;
    });

    afterEach(() => {
      if (originalCodexHome !== undefined) {
        process.env.CODEX_HOME = originalCodexHome;
      } else {
        delete process.env.CODEX_HOME;
      }
    });

    it('should return ~/.codex/ by default', () => {
      delete process.env.CODEX_HOME;
      const root = codexAdapter.getGlobalRoot!();
      expect(root).toBe(path.join(os.homedir(), '.codex'));
    });

    it('should respect CODEX_HOME env var', () => {
      process.env.CODEX_HOME = '/custom/codex';
      const root = codexAdapter.getGlobalRoot!();
      expect(root).toBe(path.resolve('/custom/codex'));
    });
  });

  describe('adapters without global support', () => {
    it('cursorAdapter should return null', () => {
      expect(cursorAdapter.getGlobalRoot!()).toBeNull();
    });

    it('windsurfAdapter should return null', () => {
      expect(windsurfAdapter.getGlobalRoot!()).toBeNull();
    });
  });
});

describe('resolveGlobalRoot()', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.OPENSPEC_GLOBAL_ROOT;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.OPENSPEC_GLOBAL_ROOT = originalEnv;
    } else {
      delete process.env.OPENSPEC_GLOBAL_ROOT;
    }
  });

  it('should return adapter global root when env var is not set', () => {
    delete process.env.OPENSPEC_GLOBAL_ROOT;
    const root = resolveGlobalRoot(claudeAdapter);
    expect(root).toBe(claudeAdapter.getGlobalRoot!());
  });

  it('should return null for adapters without global support when env var is not set', () => {
    delete process.env.OPENSPEC_GLOBAL_ROOT;
    const root = resolveGlobalRoot(cursorAdapter);
    expect(root).toBeNull();
  });

  it('should override with OPENSPEC_GLOBAL_ROOT when set', () => {
    process.env.OPENSPEC_GLOBAL_ROOT = '/override/path';
    const root = resolveGlobalRoot(claudeAdapter);
    expect(root).toBe(path.resolve('/override/path', 'claude'));
  });

  it('should use env var even for adapters without native global support', () => {
    process.env.OPENSPEC_GLOBAL_ROOT = '/override/path';
    const root = resolveGlobalRoot(cursorAdapter);
    expect(root).toBe(path.resolve('/override/path', 'cursor'));
  });
});

describe('CommandAdapterRegistry.getGlobalAdapters()', () => {
  it('should return only adapters with global support', () => {
    const globalAdapters = CommandAdapterRegistry.getGlobalAdapters();
    expect(globalAdapters.length).toBeGreaterThanOrEqual(3); // claude, opencode, codex

    const toolIds = globalAdapters.map((a) => a.toolId);
    expect(toolIds).toContain('claude');
    expect(toolIds).toContain('opencode');
    expect(toolIds).toContain('codex');
  });

  it('should not include adapters without global support', () => {
    const globalAdapters = CommandAdapterRegistry.getGlobalAdapters();
    const toolIds = globalAdapters.map((a) => a.toolId);
    expect(toolIds).not.toContain('cursor');
    expect(toolIds).not.toContain('windsurf');
  });

  it('should return fewer adapters than getAll()', () => {
    const all = CommandAdapterRegistry.getAll();
    const global = CommandAdapterRegistry.getGlobalAdapters();
    expect(global.length).toBeLessThan(all.length);
  });
});
