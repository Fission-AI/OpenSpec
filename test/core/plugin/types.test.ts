import { describe, it, expect } from 'vitest';
import {
  PluginManifestSchema,
  ConfigFieldSchema,
  HandlerConfigSchema,
  SkillOverlaySchema,
  SkillOverlaysSchema,
  OrchestrationDeclSchema,
  GateDefinitionSchema,
  HookDefinitionSchema,
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

  describe('SkillOverlaySchema', () => {
    it('should accept valid append overlay', () => {
      const result = SkillOverlaySchema.safeParse({ append: 'overlays/apply.md' });
      expect(result.success).toBe(true);
    });

    it('should reject unknown operation key (strict mode)', () => {
      const result = SkillOverlaySchema.safeParse({ unknown_op: 'file.md' });
      expect(result.success).toBe(false);
    });

    it('should reject extra keys alongside append (strict mode)', () => {
      const result = SkillOverlaySchema.safeParse({ append: 'a.md', prepend: 'b.md' });
      expect(result.success).toBe(false);
    });
  });

  describe('SkillOverlaysSchema', () => {
    it('should accept empty record', () => {
      const result = SkillOverlaysSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept multiple workflows', () => {
      const result = SkillOverlaysSchema.safeParse({
        apply: { append: 'overlays/apply.md' },
        explore: { append: 'overlays/explore.md' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.apply.append).toBe('overlays/apply.md');
        expect(result.data.explore.append).toBe('overlays/explore.md');
      }
    });

    it('should reject invalid overlay value', () => {
      const result = SkillOverlaysSchema.safeParse({
        apply: 'just-a-string',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PluginManifestSchema with skill_overlays', () => {
    it('should parse manifest with skill_overlays', () => {
      const input = {
        name: 'overlay-plugin',
        version: '1.0.0',
        skill_overlays: {
          apply: { append: 'overlays/apply.md' },
        },
      };
      const result = PluginManifestSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skill_overlays?.apply.append).toBe('overlays/apply.md');
      }
    });

    it('should parse manifest without skill_overlays (backwards compatible)', () => {
      const input = {
        name: 'no-overlay-plugin',
        version: '1.0.0',
      };
      const result = PluginManifestSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skill_overlays).toBeUndefined();
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

  describe('OrchestrationDeclSchema', () => {
    it('should accept valid orchestration with parallel_with and preferred_mode', () => {
      const result = OrchestrationDeclSchema.safeParse({
        parallel_with: ['codex-review'],
        preferred_mode: 'teams',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parallel_with).toEqual(['codex-review']);
        expect(result.data.preferred_mode).toBe('teams');
      }
    });

    it('should accept empty orchestration (all fields optional)', () => {
      const result = OrchestrationDeclSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept orchestration with only parallel_with', () => {
      const result = OrchestrationDeclSchema.safeParse({
        parallel_with: ['gate-a', 'gate-b'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parallel_with).toEqual(['gate-a', 'gate-b']);
        expect(result.data.preferred_mode).toBeUndefined();
      }
    });

    it('should reject invalid preferred_mode value', () => {
      const result = OrchestrationDeclSchema.safeParse({
        preferred_mode: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid preferred_mode values', () => {
      for (const mode of ['default', 'subagents', 'teams']) {
        const result = OrchestrationDeclSchema.safeParse({ preferred_mode: mode });
        expect(result.success).toBe(true);
      }
    });

    it('should reject unknown fields (strict mode)', () => {
      const result = OrchestrationDeclSchema.safeParse({
        parallel_with: ['a'],
        unknown_field: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('GateDefinitionSchema with orchestration', () => {
    it('should accept gate with orchestration', () => {
      const result = GateDefinitionSchema.safeParse({
        id: 'claude-review',
        handler: { type: 'prompt', file: 'gates/claude-review.md' },
        orchestration: {
          parallel_with: ['codex-review'],
          preferred_mode: 'teams',
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.orchestration?.parallel_with).toEqual(['codex-review']);
      }
    });

    it('should accept gate without orchestration (backwards compatible)', () => {
      const result = GateDefinitionSchema.safeParse({
        id: 'security-scan',
        handler: { type: 'command', run: 'npm run security' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.orchestration).toBeUndefined();
      }
    });
  });

  describe('HookDefinitionSchema with orchestration', () => {
    it('should accept hook with orchestration', () => {
      const result = HookDefinitionSchema.safeParse({
        id: 'review-trigger',
        handler: { type: 'prompt', file: 'hooks/review.md' },
        orchestration: {
          parallel_with: [],
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.orchestration?.parallel_with).toEqual([]);
      }
    });

    it('should accept hook without orchestration (backwards compatible)', () => {
      const result = HookDefinitionSchema.safeParse({
        id: 'lint-check',
        handler: { type: 'command', run: 'npm run lint' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.orchestration).toBeUndefined();
      }
    });
  });

  describe('PluginManifestSchema with orchestration', () => {
    it('should parse manifest with orchestrated gates', () => {
      const input = {
        name: 'dual-review',
        version: '0.1.0',
        gates: [
          {
            id: 'claude-review',
            handler: { type: 'prompt', file: 'gates/claude.md' },
            orchestration: { parallel_with: ['codex-review'], preferred_mode: 'teams' },
          },
          {
            id: 'codex-review',
            handler: { type: 'prompt', file: 'gates/codex.md' },
            orchestration: { parallel_with: ['claude-review'], preferred_mode: 'teams' },
          },
        ],
      };
      const result = PluginManifestSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gates).toHaveLength(2);
        expect(result.data.gates![0].orchestration?.parallel_with).toEqual(['codex-review']);
        expect(result.data.gates![1].orchestration?.parallel_with).toEqual(['claude-review']);
      }
    });
  });
});
