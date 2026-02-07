import { describe, it, expect } from 'vitest';
import { GlobalConfigSchema, validateConfigKeyPath, DEFAULT_CONFIG } from '../../src/core/config-schema.js';

describe('config-schema - specStructure', () => {
  describe('GlobalConfigSchema - specStructure field', () => {
    it('should accept valid specStructure configuration', () => {
      const config = {
        featureFlags: {},
        specStructure: {
          structure: 'hierarchical' as const,
          maxDepth: 5,
          allowMixed: false,
          validatePaths: true,
        },
      };

      const result = GlobalConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should accept auto structure mode', () => {
      const config = {
        specStructure: {
          structure: 'auto' as const,
        },
      };

      const result = GlobalConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should accept flat structure mode', () => {
      const config = {
        specStructure: {
          structure: 'flat' as const,
        },
      };

      const result = GlobalConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid structure values', () => {
      const config = {
        specStructure: {
          structure: 'invalid',
        },
      };

      const result = GlobalConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should accept maxDepth within valid range (1-10)', () => {
      const validDepths = [1, 4, 7, 10];

      validDepths.forEach(depth => {
        const config = {
          specStructure: { maxDepth: depth },
        };
        const result = GlobalConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });

    it('should reject maxDepth outside valid range', () => {
      const invalidDepths = [0, -1, 11, 20];

      invalidDepths.forEach(depth => {
        const config = {
          specStructure: { maxDepth: depth },
        };
        const result = GlobalConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
    });

    it('should reject non-integer maxDepth', () => {
      const config = {
        specStructure: { maxDepth: 3.5 },
      };

      const result = GlobalConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should accept boolean values for allowMixed', () => {
      const configTrue = { specStructure: { allowMixed: true } };
      const configFalse = { specStructure: { allowMixed: false } };

      expect(GlobalConfigSchema.safeParse(configTrue).success).toBe(true);
      expect(GlobalConfigSchema.safeParse(configFalse).success).toBe(true);
    });

    it('should accept boolean values for validatePaths', () => {
      const configTrue = { specStructure: { validatePaths: true } };
      const configFalse = { specStructure: { validatePaths: false } };

      expect(GlobalConfigSchema.safeParse(configTrue).success).toBe(true);
      expect(GlobalConfigSchema.safeParse(configFalse).success).toBe(true);
    });

    it('should apply default values when fields are omitted', () => {
      const config = { specStructure: {} };

      const result = GlobalConfigSchema.parse(config);

      expect(result.specStructure?.structure).toBe('auto');
      expect(result.specStructure?.maxDepth).toBe(4);
      expect(result.specStructure?.allowMixed).toBe(true);
      expect(result.specStructure?.validatePaths).toBe(true);
    });

    it('should include specStructure in DEFAULT_CONFIG', () => {
      expect(DEFAULT_CONFIG.specStructure).toBeDefined();
      expect(DEFAULT_CONFIG.specStructure?.structure).toBe('auto');
      expect(DEFAULT_CONFIG.specStructure?.maxDepth).toBe(4);
      expect(DEFAULT_CONFIG.specStructure?.allowMixed).toBe(true);
      expect(DEFAULT_CONFIG.specStructure?.validatePaths).toBe(true);
    });
  });

  describe('validateConfigKeyPath - specStructure nested keys', () => {
    it('should accept specStructure as top-level key', () => {
      const result = validateConfigKeyPath('specStructure');
      expect(result.valid).toBe(true);
    });

    it('should accept valid specStructure nested keys', () => {
      const validKeys = [
        'specStructure.structure',
        'specStructure.maxDepth',
        'specStructure.allowMixed',
        'specStructure.validatePaths',
      ];

      validKeys.forEach(key => {
        const result = validateConfigKeyPath(key);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid specStructure nested keys', () => {
      const result = validateConfigKeyPath('specStructure.invalidKey');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Unknown specStructure key');
      expect(result.reason).toContain('structure, maxDepth, allowMixed, validatePaths');
    });

    it('should reject deeply nested specStructure keys', () => {
      const result = validateConfigKeyPath('specStructure.structure.deeply.nested');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('do not support deeply nested keys');
    });

    it('should provide helpful error message for unknown specStructure keys', () => {
      const result = validateConfigKeyPath('specStructure.unknown');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('structure');
      expect(result.reason).toContain('maxDepth');
      expect(result.reason).toContain('allowMixed');
      expect(result.reason).toContain('validatePaths');
    });
  });
});
