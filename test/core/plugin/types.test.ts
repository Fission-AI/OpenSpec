import { describe, it, expect } from 'vitest';
import {
  PluginManifestSchema,
  ConfigFieldSchema,
  HandlerConfigSchema,
} from '../../../src/core/plugin/types.js';

describe('plugin/types', () => {
  describe('PluginManifestSchema', () => {
    it('should parse a valid complete manifest', () => {
      const input = {
        name: 'my-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        openspec: '>=1.0.0',
        schemas: ['sdd', 'bugfix'],
        config: {
          general: {
            apiKey: { type: 'string', required: true, description: 'API key' },
          },
        },
        hooks: {
          'propose.pre': [
            {
              id: 'lint-check',
              handler: { type: 'command', run: 'npm run lint' },
              description: 'Run lint before propose',
            },
          ],
        },
        gates: [
          {
            id: 'security-scan',
            handler: { type: 'command', run: 'npm run security' },
            description: 'Security gate',
          },
        ],
      };

      const result = PluginManifestSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('my-plugin');
        expect(result.data.version).toBe('1.0.0');
        expect(result.data.description).toBe('A test plugin');
        expect(result.data.schemas).toEqual(['sdd', 'bugfix']);
        expect(result.data.hooks?.['propose.pre']).toHaveLength(1);
        expect(result.data.gates).toHaveLength(1);
      }
    });

    it('should fail when required name field is missing', () => {
      const input = {
        version: '1.0.0',
      };

      const result = PluginManifestSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const nameIssue = result.error.issues.find((i) =>
          i.path.includes('name')
        );
        expect(nameIssue).toBeDefined();
      }
    });

    it('should fail when required version field is missing', () => {
      const input = {
        name: 'my-plugin',
      };

      const result = PluginManifestSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const versionIssue = result.error.issues.find((i) =>
          i.path.includes('version')
        );
        expect(versionIssue).toBeDefined();
      }
    });

    it('should strip invalid hook point keys (Zod strips unknown keys by default)', () => {
      const input = {
        name: 'my-plugin',
        version: '1.0.0',
        hooks: {
          'build.pre': [
            {
              id: 'build-hook',
              handler: { type: 'command', run: 'make build' },
            },
          ],
        },
      };

      const result = PluginManifestSchema.safeParse(input);

      // Zod z.object strips unknown keys, so 'build.pre' is silently removed
      expect(result.success).toBe(true);
      if (result.success) {
        expect(
          (result.data.hooks as Record<string, unknown>)?.['build.pre']
        ).toBeUndefined();
        // No valid hook points remain
        expect(result.data.hooks?.['propose.pre']).toBeUndefined();
      }
    });

    it('should allow optional fields to be omitted', () => {
      const input = {
        name: 'minimal-plugin',
        version: '0.1.0',
      };

      const result = PluginManifestSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeUndefined();
        expect(result.data.openspec).toBeUndefined();
        expect(result.data.schemas).toBeUndefined();
        expect(result.data.config).toBeUndefined();
        expect(result.data.hooks).toBeUndefined();
        expect(result.data.gates).toBeUndefined();
      }
    });

    it('should parse schemas array correctly', () => {
      const input = {
        name: 'schema-plugin',
        version: '1.0.0',
        schemas: ['sdd', 'bugfix', 'refactor'],
      };

      const result = PluginManifestSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.schemas).toEqual(['sdd', 'bugfix', 'refactor']);
      }
    });
  });

  describe('ConfigFieldSchema', () => {
    it('should validate type enum values', () => {
      for (const type of ['string', 'boolean', 'number']) {
        const result = ConfigFieldSchema.safeParse({ type });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid type enum', () => {
      const result = ConfigFieldSchema.safeParse({ type: 'array' });

      expect(result.success).toBe(false);
    });

    it('should apply default value for required field', () => {
      const result = ConfigFieldSchema.safeParse({ type: 'string' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.required).toBe(false);
      }
    });

    it('should accept default values of matching types', () => {
      const result = ConfigFieldSchema.safeParse({
        type: 'string',
        required: true,
        default: 'hello',
        description: 'A string field',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.default).toBe('hello');
      }
    });
  });

  describe('HandlerConfigSchema', () => {
    it('should validate type enum values', () => {
      for (const type of ['command', 'prompt', 'both']) {
        const result = HandlerConfigSchema.safeParse({ type });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid handler type', () => {
      const result = HandlerConfigSchema.safeParse({ type: 'webhook' });

      expect(result.success).toBe(false);
    });

    it('should default ignore_failure to false', () => {
      const result = HandlerConfigSchema.safeParse({ type: 'command', run: 'echo ok' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ignore_failure).toBe(false);
      }
    });
  });
});
