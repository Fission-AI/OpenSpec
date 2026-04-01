import { describe, it, expect } from 'vitest';
import {
  validatePluginConfig,
  validateAllPluginConfigs,
  flattenConfigToEnvVars,
} from '../../../src/core/plugin/config-validator.js';
import type { PluginManifest, LoadedPlugin } from '../../../src/core/plugin/types.js';

/** Helper: build a minimal PluginManifest */
function makeManifest(
  name: string,
  config?: PluginManifest['config']
): PluginManifest {
  return {
    name,
    version: '1.0.0',
    config,
  };
}

/** Helper: build a LoadedPlugin from a manifest */
function makeLoadedPlugin(
  manifest: PluginManifest,
  source: 'project' | 'user' | 'package' = 'project'
): LoadedPlugin {
  return {
    manifest,
    dir: '/fake/dir',
    source,
    config: {},
  };
}

describe('plugin/config-validator', () => {
  describe('validatePluginConfig', () => {
    it('should return empty resolved and no errors when manifest has no config section', () => {
      const manifest = makeManifest('no-config');

      const { resolved, errors } = validatePluginConfig(
        'no-config',
        manifest,
        undefined
      );

      expect(errors).toEqual([]);
      expect(resolved).toEqual({});
    });

    it('should return error when required field is missing', () => {
      const manifest = makeManifest('req-plugin', {
        general: {
          apiKey: {
            type: 'string',
            required: true,
          },
        },
      });

      const { errors } = validatePluginConfig('req-plugin', manifest, undefined);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Missing required config');
      expect(errors[0]).toContain('general.apiKey');
    });

    it('should return error on type mismatch', () => {
      const manifest = makeManifest('type-plugin', {
        general: {
          port: {
            type: 'number',
          },
        },
      });

      const { errors } = validatePluginConfig('type-plugin', manifest, {
        general: { port: 'not-a-number' },
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('expected number, got string');
    });

    it('should apply defaults for optional fields', () => {
      const manifest = makeManifest('default-plugin', {
        general: {
          retries: {
            type: 'number',
            default: 3,
          },
          verbose: {
            type: 'boolean',
            default: false,
          },
        },
      });

      const { resolved, errors } = validatePluginConfig(
        'default-plugin',
        manifest,
        undefined
      );

      expect(errors).toEqual([]);
      expect(resolved.general.retries).toBe(3);
      expect(resolved.general.verbose).toBe(false);
    });
  });

  describe('validateAllPluginConfigs', () => {
    it('should filter out invalid plugins', () => {
      const goodManifest = makeManifest('good-plugin');
      const badManifest = makeManifest('bad-plugin', {
        general: {
          secret: { type: 'string', required: true },
        },
      });
      const goodPlugin = makeLoadedPlugin(goodManifest);
      const badPlugin = makeLoadedPlugin(badManifest);

      const { plugins, errors } = validateAllPluginConfigs(
        [goodPlugin, badPlugin],
        undefined
      );

      expect(plugins).toHaveLength(1);
      expect(plugins[0].manifest.name).toBe('good-plugin');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should warn about unknown plugin config keys', () => {
      const manifest = makeManifest('known-plugin');
      const plugin = makeLoadedPlugin(manifest);

      const { errors } = validateAllPluginConfigs([plugin], {
        'unknown-plugin': { foo: 'bar' },
      });

      expect(errors).toContainEqual(
        expect.stringContaining('Config for unknown plugin: "unknown-plugin"')
      );
    });
  });

  describe('flattenConfigToEnvVars', () => {
    it('should convert nested config to flat env vars', () => {
      const config = {
        general: {
          port: 8080,
          host: 'localhost',
        },
      };

      const env = flattenConfigToEnvVars('my-plugin', config);

      expect(env.OPENSPEC_PLUGIN_CONFIG_GENERAL_PORT).toBe('8080');
      expect(env.OPENSPEC_PLUGIN_CONFIG_GENERAL_HOST).toBe('localhost');
    });

    it('should handle hyphens by converting to underscores', () => {
      const config = {
        'my-category': {
          'vault-path': '/some/path',
        },
      };

      const env = flattenConfigToEnvVars('my-plugin', config);

      expect(env.OPENSPEC_PLUGIN_CONFIG_MY_CATEGORY_VAULT_PATH).toBe(
        '/some/path'
      );
    });

    it('should handle booleans as true/false strings', () => {
      const config = {
        flags: {
          enabled: true,
          debug: false,
        },
      };

      const env = flattenConfigToEnvVars('my-plugin', config);

      expect(env.OPENSPEC_PLUGIN_CONFIG_FLAGS_ENABLED).toBe('true');
      expect(env.OPENSPEC_PLUGIN_CONFIG_FLAGS_DEBUG).toBe('false');
    });
  });
});
