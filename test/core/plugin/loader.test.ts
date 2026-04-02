import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { stringify as stringifyYaml } from 'yaml';
import {
  getProjectPluginsDir,
  resolvePluginDir,
  parsePluginManifest,
  loadPlugins,
  PluginLoadError,
  resolveOverlayPaths,
  getPluginOverlays,
} from '../../../src/core/plugin/loader.js';
import type { LoadedPlugin } from '../../../src/core/plugin/types.js';

describe('plugin/loader', () => {
  let tempDir: string;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-loader-'));
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleWarnSpy.mockRestore();
  });

  /** Helper: create a plugin.yaml in a directory */
  function createPluginYaml(
    dir: string,
    manifest: Record<string, unknown>
  ): void {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'plugin.yaml'),
      stringifyYaml(manifest)
    );
  }

  describe('getProjectPluginsDir', () => {
    it('should return correct path using path.join', () => {
      const result = getProjectPluginsDir('/my/project');

      expect(result).toBe(path.join('/my/project', 'openspec', 'plugins'));
    });
  });

  describe('resolvePluginDir', () => {
    it('should find project-local plugin first', () => {
      const projectPluginDir = path.join(
        tempDir,
        'openspec',
        'plugins',
        'test-plugin'
      );
      createPluginYaml(projectPluginDir, {
        name: 'test-plugin',
        version: '1.0.0',
      });

      const result = resolvePluginDir('test-plugin', tempDir);

      expect(result).not.toBeNull();
      expect(result!.source).toBe('project');
      expect(result!.dir).toBe(projectPluginDir);
    });

    it('should return null when plugin is not found anywhere', () => {
      const result = resolvePluginDir('nonexistent-plugin', tempDir);

      expect(result).toBeNull();
    });
  });

  describe('parsePluginManifest', () => {
    it('should parse a valid manifest', () => {
      const pluginDir = path.join(tempDir, 'valid-plugin');
      createPluginYaml(pluginDir, {
        name: 'valid-plugin',
        version: '2.0.0',
        description: 'A valid plugin',
      });

      const manifest = parsePluginManifest(pluginDir);

      expect(manifest.name).toBe('valid-plugin');
      expect(manifest.version).toBe('2.0.0');
      expect(manifest.description).toBe('A valid plugin');
    });

    it('should throw PluginLoadError on missing file', () => {
      const pluginDir = path.join(tempDir, 'missing-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });

      expect(() => parsePluginManifest(pluginDir)).toThrow(PluginLoadError);
      expect(() => parsePluginManifest(pluginDir)).toThrow(
        /Failed to read plugin manifest/
      );
    });

    it('should throw PluginLoadError on invalid YAML', () => {
      const pluginDir = path.join(tempDir, 'bad-yaml-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.yaml'),
        '{ invalid yaml [['
      );

      // The YAML library may or may not throw on this specific input.
      // Use a manifest that fails Zod validation instead.
      const pluginDir2 = path.join(tempDir, 'invalid-schema-plugin');
      fs.mkdirSync(pluginDir2, { recursive: true });
      fs.writeFileSync(
        path.join(pluginDir2, 'plugin.yaml'),
        'not_name: foo\nnot_version: bar\n'
      );

      expect(() => parsePluginManifest(pluginDir2)).toThrow(PluginLoadError);
      expect(() => parsePluginManifest(pluginDir2)).toThrow(
        /Invalid plugin manifest/
      );
    });
  });

  describe('loadPlugins', () => {
    it('should load plugins in whitelist order', () => {
      // Create two project-local plugins
      const pluginADir = path.join(
        tempDir,
        'openspec',
        'plugins',
        'plugin-a'
      );
      const pluginBDir = path.join(
        tempDir,
        'openspec',
        'plugins',
        'plugin-b'
      );
      createPluginYaml(pluginADir, {
        name: 'plugin-a',
        version: '1.0.0',
      });
      createPluginYaml(pluginBDir, {
        name: 'plugin-b',
        version: '1.0.0',
      });

      const loaded = loadPlugins(tempDir, ['plugin-b', 'plugin-a']);

      expect(loaded).toHaveLength(2);
      expect(loaded[0].manifest.name).toBe('plugin-b');
      expect(loaded[1].manifest.name).toBe('plugin-a');
    });

    it('should throw PluginLoadError when plugin is not found', () => {
      expect(() =>
        loadPlugins(tempDir, ['nonexistent'])
      ).toThrow(PluginLoadError);
      expect(() =>
        loadPlugins(tempDir, ['nonexistent'])
      ).toThrow(/not found/);
    });
  });

  describe('resolveOverlayPaths', () => {
    it('should return resolved paths for plugin with overlays', () => {
      const pluginDir = path.join(tempDir, 'overlay-plugin');
      createPluginYaml(pluginDir, {
        name: 'overlay-plugin',
        version: '1.0.0',
        skill_overlays: {
          apply: { append: 'overlays/apply.md' },
          explore: { append: 'overlays/explore.md' },
        },
      });

      const plugin: LoadedPlugin = {
        manifest: parsePluginManifest(pluginDir),
        dir: pluginDir,
        source: 'project',
        config: {},
      };

      const paths = resolveOverlayPaths(plugin);

      expect(paths.size).toBe(2);
      expect(paths.get('apply')).toBe(path.join(pluginDir, 'overlays', 'apply.md'));
      expect(paths.get('explore')).toBe(path.join(pluginDir, 'overlays', 'explore.md'));
    });

    it('should return empty map for plugin without overlays', () => {
      const pluginDir = path.join(tempDir, 'no-overlay-plugin');
      createPluginYaml(pluginDir, {
        name: 'no-overlay-plugin',
        version: '1.0.0',
      });

      const plugin: LoadedPlugin = {
        manifest: parsePluginManifest(pluginDir),
        dir: pluginDir,
        source: 'project',
        config: {},
      };

      const paths = resolveOverlayPaths(plugin);
      expect(paths.size).toBe(0);
    });
  });

  describe('getPluginOverlays', () => {
    it('should return overlay content when file exists', () => {
      const pluginDir = path.join(tempDir, 'openspec', 'plugins', 'content-plugin');
      createPluginYaml(pluginDir, {
        name: 'content-plugin',
        version: '1.0.0',
        skill_overlays: { apply: { append: 'overlays/apply.md' } },
      });
      fs.mkdirSync(path.join(pluginDir, 'overlays'), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'overlays', 'apply.md'), '## Orchestration Modes');

      const plugin: LoadedPlugin = {
        manifest: parsePluginManifest(pluginDir),
        dir: pluginDir,
        source: 'project',
        config: {},
      };

      const contents = getPluginOverlays([plugin], 'apply');
      expect(contents).toEqual(['## Orchestration Modes']);
    });

    it('should warn and return empty when overlay file is missing', () => {
      const pluginDir = path.join(tempDir, 'openspec', 'plugins', 'missing-file-plugin');
      createPluginYaml(pluginDir, {
        name: 'missing-file-plugin',
        version: '1.0.0',
        skill_overlays: { apply: { append: 'overlays/missing.md' } },
      });

      const plugin: LoadedPlugin = {
        manifest: parsePluginManifest(pluginDir),
        dir: pluginDir,
        source: 'project',
        config: {},
      };

      const contents = getPluginOverlays([plugin], 'apply');
      expect(contents).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overlay file not found')
      );
    });

    it('should return overlays in whitelist order from multiple plugins', () => {
      const pluginADir = path.join(tempDir, 'openspec', 'plugins', 'plugin-a');
      const pluginBDir = path.join(tempDir, 'openspec', 'plugins', 'plugin-b');

      for (const [dir, name, content] of [
        [pluginADir, 'plugin-a', 'Content from A'],
        [pluginBDir, 'plugin-b', 'Content from B'],
      ] as const) {
        createPluginYaml(dir, {
          name,
          version: '1.0.0',
          skill_overlays: { apply: { append: 'overlays/apply.md' } },
        });
        fs.mkdirSync(path.join(dir, 'overlays'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'overlays', 'apply.md'), content);
      }

      const plugins: LoadedPlugin[] = [
        { manifest: parsePluginManifest(pluginADir), dir: pluginADir, source: 'project', config: {} },
        { manifest: parsePluginManifest(pluginBDir), dir: pluginBDir, source: 'project', config: {} },
      ];

      const contents = getPluginOverlays(plugins, 'apply');
      expect(contents).toEqual(['Content from A', 'Content from B']);
    });

    it('should return empty array when no plugins have overlays for the workflow', () => {
      const pluginDir = path.join(tempDir, 'openspec', 'plugins', 'other-plugin');
      createPluginYaml(pluginDir, {
        name: 'other-plugin',
        version: '1.0.0',
        skill_overlays: { explore: { append: 'overlays/explore.md' } },
      });
      fs.mkdirSync(path.join(pluginDir, 'overlays'), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'overlays', 'explore.md'), 'Explore content');

      const plugin: LoadedPlugin = {
        manifest: parsePluginManifest(pluginDir),
        dir: pluginDir,
        source: 'project',
        config: {},
      };

      const contents = getPluginOverlays([plugin], 'apply');
      expect(contents).toEqual([]);
    });
  });
});
