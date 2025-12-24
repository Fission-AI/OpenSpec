import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveSchema, listSchemas } from '../../../src/core/artifact-graph/resolver.js';
import { BUILTIN_SCHEMAS } from '../../../src/core/artifact-graph/builtin-schemas.js';

describe('artifact-graph/resolver', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `openspec-resolver-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('resolveSchema', () => {
    it('should return built-in spec-driven schema', () => {
      const schema = resolveSchema('spec-driven');

      expect(schema.name).toBe('spec-driven');
      expect(schema.version).toBe(1);
      expect(schema.artifacts.length).toBeGreaterThan(0);
    });

    it('should return built-in tdd schema', () => {
      const schema = resolveSchema('tdd');

      expect(schema.name).toBe('tdd');
      expect(schema.version).toBe(1);
      expect(schema.artifacts.length).toBeGreaterThan(0);
    });

    it('should strip .yaml extension from name', () => {
      const schema1 = resolveSchema('spec-driven');
      const schema2 = resolveSchema('spec-driven.yaml');

      expect(schema1).toEqual(schema2);
    });

    it('should strip .yml extension from name', () => {
      const schema1 = resolveSchema('spec-driven');
      const schema2 = resolveSchema('spec-driven.yml');

      expect(schema1).toEqual(schema2);
    });

    it('should prefer global override over built-in', () => {
      // Set up global data dir
      process.env.XDG_DATA_HOME = tempDir;
      const globalSchemaDir = path.join(tempDir, 'openspec', 'schemas');
      fs.mkdirSync(globalSchemaDir, { recursive: true });

      // Create a custom schema with same name as built-in
      const customSchema = `
name: custom-override
version: 99
artifacts:
  - id: custom
    generates: custom.md
    description: Custom artifact
    template: templates/custom.md
`;
      fs.writeFileSync(path.join(globalSchemaDir, 'spec-driven.yaml'), customSchema);

      const schema = resolveSchema('spec-driven');

      expect(schema.name).toBe('custom-override');
      expect(schema.version).toBe(99);
    });

    it('should fall back to built-in when global not found', () => {
      process.env.XDG_DATA_HOME = tempDir;
      // Don't create any global schemas

      const schema = resolveSchema('spec-driven');

      expect(schema.name).toBe('spec-driven');
      expect(schema).toEqual(BUILTIN_SCHEMAS['spec-driven']);
    });

    it('should throw when schema not found', () => {
      expect(() => resolveSchema('nonexistent-schema')).toThrow(/not found/);
    });

    it('should list available built-in schemas in error message', () => {
      try {
        resolveSchema('nonexistent');
        expect.fail('Should have thrown');
      } catch (e) {
        const error = e as Error;
        expect(error.message).toContain('spec-driven');
        expect(error.message).toContain('tdd');
      }
    });
  });

  describe('listSchemas', () => {
    it('should list built-in schemas', () => {
      const schemas = listSchemas();

      expect(schemas).toContain('spec-driven');
      expect(schemas).toContain('tdd');
    });

    it('should include global override schemas', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const globalSchemaDir = path.join(tempDir, 'openspec', 'schemas');
      fs.mkdirSync(globalSchemaDir, { recursive: true });
      fs.writeFileSync(path.join(globalSchemaDir, 'custom-workflow.yaml'), 'name: custom');

      const schemas = listSchemas();

      expect(schemas).toContain('custom-workflow');
      expect(schemas).toContain('spec-driven');
    });

    it('should deduplicate schemas with same name', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const globalSchemaDir = path.join(tempDir, 'openspec', 'schemas');
      fs.mkdirSync(globalSchemaDir, { recursive: true });
      // Override spec-driven
      fs.writeFileSync(path.join(globalSchemaDir, 'spec-driven.yaml'), 'name: custom');

      const schemas = listSchemas();

      // Should only appear once
      const count = schemas.filter(s => s === 'spec-driven').length;
      expect(count).toBe(1);
    });

    it('should return sorted list', () => {
      const schemas = listSchemas();

      const sorted = [...schemas].sort();
      expect(schemas).toEqual(sorted);
    });
  });
});
