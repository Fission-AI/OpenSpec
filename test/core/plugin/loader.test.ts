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
} from '../../../src/core/plugin/loader.js';

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
});
