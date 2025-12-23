import { describe, it, expect } from 'vitest';

import {
  getNestedValue,
  setNestedValue,
  deleteNestedValue,
  coerceValue,
  formatValueYaml,
  validateConfig,
  GlobalConfigSchema,
  DEFAULT_CONFIG,
} from '../../src/core/config-schema.js';

describe('config-schema', () => {
  describe('getNestedValue', () => {
    it('should get a top-level value', () => {
      const obj = { foo: 'bar' };
      expect(getNestedValue(obj, 'foo')).toBe('bar');
    });

    it('should get a nested value with dot notation', () => {
      const obj = { a: { b: { c: 'deep' } } };
      expect(getNestedValue(obj, 'a.b.c')).toBe('deep');
    });

    it('should return undefined for non-existent path', () => {
      const obj = { foo: 'bar' };
      expect(getNestedValue(obj, 'baz')).toBeUndefined();
    });

    it('should return undefined for non-existent nested path', () => {
      const obj = { a: { b: 'value' } };
      expect(getNestedValue(obj, 'a.b.c')).toBeUndefined();
    });

    it('should return undefined when traversing through null', () => {
      const obj = { a: null };
      expect(getNestedValue(obj as Record<string, unknown>, 'a.b')).toBeUndefined();
    });

    it('should return undefined when traversing through primitive', () => {
      const obj = { a: 'string' };
      expect(getNestedValue(obj, 'a.b')).toBeUndefined();
    });

    it('should get object values', () => {
      const obj = { a: { b: 'value' } };
      expect(getNestedValue(obj, 'a')).toEqual({ b: 'value' });
    });

    it('should handle array values', () => {
      const obj = { arr: [1, 2, 3] };
      expect(getNestedValue(obj, 'arr')).toEqual([1, 2, 3]);
    });
  });

  describe('setNestedValue', () => {
    it('should set a top-level value', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, 'foo', 'bar');
      expect(obj.foo).toBe('bar');
    });

    it('should set a nested value', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, 'a.b.c', 'deep');
      expect((obj.a as Record<string, unknown>).b).toEqual({ c: 'deep' });
    });

    it('should create intermediate objects', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, 'x.y.z', 'value');
      expect(obj).toEqual({ x: { y: { z: 'value' } } });
    });

    it('should overwrite existing values', () => {
      const obj: Record<string, unknown> = { a: 'old' };
      setNestedValue(obj, 'a', 'new');
      expect(obj.a).toBe('new');
    });

    it('should overwrite primitive with object when setting nested path', () => {
      const obj: Record<string, unknown> = { a: 'string' };
      setNestedValue(obj, 'a.b', 'value');
      expect(obj.a).toEqual({ b: 'value' });
    });

    it('should preserve other keys when setting nested value', () => {
      const obj: Record<string, unknown> = { a: { existing: 'keep' } };
      setNestedValue(obj, 'a.new', 'added');
      expect(obj.a).toEqual({ existing: 'keep', new: 'added' });
    });
  });

  describe('deleteNestedValue', () => {
    it('should delete a top-level key', () => {
      const obj: Record<string, unknown> = { foo: 'bar', baz: 'qux' };
      const result = deleteNestedValue(obj, 'foo');
      expect(result).toBe(true);
      expect(obj).toEqual({ baz: 'qux' });
    });

    it('should delete a nested key', () => {
      const obj: Record<string, unknown> = { a: { b: 'value', c: 'keep' } };
      const result = deleteNestedValue(obj, 'a.b');
      expect(result).toBe(true);
      expect(obj.a).toEqual({ c: 'keep' });
    });

    it('should return false for non-existent key', () => {
      const obj: Record<string, unknown> = { foo: 'bar' };
      const result = deleteNestedValue(obj, 'baz');
      expect(result).toBe(false);
    });

    it('should return false for non-existent nested path', () => {
      const obj: Record<string, unknown> = { a: { b: 'value' } };
      const result = deleteNestedValue(obj, 'a.c');
      expect(result).toBe(false);
    });

    it('should return false when intermediate path does not exist', () => {
      const obj: Record<string, unknown> = { a: 'string' };
      const result = deleteNestedValue(obj, 'a.b.c');
      expect(result).toBe(false);
    });
  });

  describe('coerceValue', () => {
    it('should coerce "true" to boolean true', () => {
      expect(coerceValue('true')).toBe(true);
    });

    it('should coerce "false" to boolean false', () => {
      expect(coerceValue('false')).toBe(false);
    });

    it('should coerce integer string to number', () => {
      expect(coerceValue('42')).toBe(42);
    });

    it('should coerce float string to number', () => {
      expect(coerceValue('3.14')).toBe(3.14);
    });

    it('should coerce negative number string to number', () => {
      expect(coerceValue('-10')).toBe(-10);
    });

    it('should keep regular strings as strings', () => {
      expect(coerceValue('hello')).toBe('hello');
    });

    it('should keep strings that start with numbers but are not numbers', () => {
      expect(coerceValue('123abc')).toBe('123abc');
    });

    it('should keep empty string as string', () => {
      expect(coerceValue('')).toBe('');
    });

    it('should keep whitespace-only string as string', () => {
      expect(coerceValue('   ')).toBe('   ');
    });

    it('should force string when forceString is true', () => {
      expect(coerceValue('true', true)).toBe('true');
      expect(coerceValue('42', true)).toBe('42');
      expect(coerceValue('hello', true)).toBe('hello');
    });

    it('should not coerce Infinity to number (not finite)', () => {
      // Infinity is not a useful config value, so we keep it as string
      expect(coerceValue('Infinity')).toBe('Infinity');
    });

    it('should handle scientific notation', () => {
      expect(coerceValue('1e10')).toBe(1e10);
    });
  });

  describe('formatValueYaml', () => {
    it('should format null as "null"', () => {
      expect(formatValueYaml(null)).toBe('null');
    });

    it('should format undefined as "null"', () => {
      expect(formatValueYaml(undefined)).toBe('null');
    });

    it('should format boolean as string', () => {
      expect(formatValueYaml(true)).toBe('true');
      expect(formatValueYaml(false)).toBe('false');
    });

    it('should format number as string', () => {
      expect(formatValueYaml(42)).toBe('42');
      expect(formatValueYaml(3.14)).toBe('3.14');
    });

    it('should format string as-is', () => {
      expect(formatValueYaml('hello')).toBe('hello');
    });

    it('should format empty array as "[]"', () => {
      expect(formatValueYaml([])).toBe('[]');
    });

    it('should format empty object as "{}"', () => {
      expect(formatValueYaml({})).toBe('{}');
    });

    it('should format object with key-value pairs', () => {
      const result = formatValueYaml({ foo: 'bar' });
      expect(result).toBe('foo: bar');
    });

    it('should format nested objects with indentation', () => {
      const result = formatValueYaml({ a: { b: 'value' } });
      expect(result).toContain('a:');
      expect(result).toContain('b: value');
    });
  });

  describe('validateConfig', () => {
    it('should accept valid config with featureFlags', () => {
      const result = validateConfig({ featureFlags: { test: true } });
      expect(result.success).toBe(true);
    });

    it('should accept empty featureFlags', () => {
      const result = validateConfig({ featureFlags: {} });
      expect(result.success).toBe(true);
    });

    it('should accept config without featureFlags (uses default)', () => {
      const result = validateConfig({});
      expect(result.success).toBe(true);
    });

    it('should accept unknown fields (passthrough)', () => {
      const result = validateConfig({ featureFlags: {}, unknownField: 'value' });
      expect(result.success).toBe(true);
    });

    it('should accept unknown fields with various types', () => {
      const result = validateConfig({
        featureFlags: {},
        futureStringField: 'value',
        futureNumberField: 123,
        futureObjectField: { nested: 'data' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-boolean values in featureFlags', () => {
      const result = validateConfig({ featureFlags: { test: 'string' } });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include path in error message for invalid featureFlags', () => {
      const result = validateConfig({ featureFlags: { someFlag: 'notABoolean' } });
      expect(result.success).toBe(false);
      expect(result.error).toContain('featureFlags');
    });

    it('should reject non-object featureFlags', () => {
      const result = validateConfig({ featureFlags: 'string' });
      expect(result.success).toBe(false);
    });

    it('should reject number values in featureFlags', () => {
      const result = validateConfig({ featureFlags: { flag: 123 } });
      expect(result.success).toBe(false);
    });
  });

  describe('config set simulation', () => {
    // These tests simulate the full config set flow: coerce value → set nested → validate

    it('should accept setting unknown top-level key (forward compatibility)', () => {
      const config: Record<string, unknown> = { featureFlags: {} };
      const value = coerceValue('123');
      setNestedValue(config, 'someFutureKey', value);

      const result = validateConfig(config);
      expect(result.success).toBe(true);
      expect(config.someFutureKey).toBe(123);
    });

    it('should reject setting non-boolean to featureFlags', () => {
      const config: Record<string, unknown> = { featureFlags: {} };
      const value = coerceValue('notABoolean'); // stays as string
      setNestedValue(config, 'featureFlags.someFlag', value);

      const result = validateConfig(config);
      expect(result.success).toBe(false);
      expect(result.error).toContain('featureFlags');
    });

    it('should accept setting boolean to featureFlags', () => {
      const config: Record<string, unknown> = { featureFlags: {} };
      const value = coerceValue('true'); // coerces to boolean
      setNestedValue(config, 'featureFlags.newFlag', value);

      const result = validateConfig(config);
      expect(result.success).toBe(true);
      expect((config.featureFlags as Record<string, unknown>).newFlag).toBe(true);
    });

    it('should create featureFlags object when setting nested flag', () => {
      const config: Record<string, unknown> = {};
      const value = coerceValue('false');
      setNestedValue(config, 'featureFlags.experimental', value);

      const result = validateConfig(config);
      expect(result.success).toBe(true);
      expect((config.featureFlags as Record<string, unknown>).experimental).toBe(false);
    });
  });

  describe('GlobalConfigSchema', () => {
    it('should parse valid config', () => {
      const result = GlobalConfigSchema.safeParse({ featureFlags: { test: true } });
      expect(result.success).toBe(true);
    });

    it('should provide defaults for missing featureFlags', () => {
      const result = GlobalConfigSchema.parse({});
      expect(result.featureFlags).toEqual({});
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have empty featureFlags', () => {
      expect(DEFAULT_CONFIG.featureFlags).toEqual({});
    });
  });
});
