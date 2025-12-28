import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  resolveSchema,
  listSchemas,
  SchemaLoadError,
  getSchemaDir,
  getPackageSchemasDir,
  getUserSchemasDir,
} from '../../../src/core/artifact-graph/resolver.js';

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

  describe('getPackageSchemasDir', () => {
    it('should return a valid path', () => {
      const schemasDir = getPackageSchemasDir();
      expect(typeof schemasDir).toBe('string');
      expect(schemasDir.length).toBeGreaterThan(0);
    });
  });

  describe('getUserSchemasDir', () => {
    it('should use XDG_DATA_HOME when set', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userDir = getUserSchemasDir();
      expect(userDir).toBe(path.join(tempDir, 'openspec', 'schemas'));
    });
  });

  describe('getSchemaDir', () => {
    it('should return null for non-existent schema', () => {
      const dir = getSchemaDir('nonexistent-schema');
      expect(dir).toBeNull();
    });

    it('should return package dir for built-in schema', () => {
      const dir = getSchemaDir('spec-driven');
      expect(dir).not.toBeNull();
      expect(dir).toContain('schemas');
      expect(dir).toContain('spec-driven');
    });

    it('should prefer user override directory', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(userSchemaDir, 'schema.yaml'),
        'name: custom\nversion: 1\nartifacts: []'
      );

      const dir = getSchemaDir('spec-driven');
      expect(dir).toBe(userSchemaDir);
    });
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

    it('should prefer user override over built-in', () => {
      // Set up global data dir
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });

      // Create a custom schema with same name as built-in
      const customSchema = `
name: custom-override
version: 99
artifacts:
  - id: custom
    generates: custom.md
    description: Custom artifact
    template: custom.md
`;
      fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), customSchema);

      const schema = resolveSchema('spec-driven');

      expect(schema.name).toBe('custom-override');
      expect(schema.version).toBe(99);
    });

    it('should validate user override and throw on invalid schema', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });

      // Create an invalid schema (missing required fields)
      const invalidSchema = `
name: invalid
version: 1
artifacts:
  - id: broken
    # missing generates, description, template
`;
      fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), invalidSchema);

      expect(() => resolveSchema('spec-driven')).toThrow(SchemaLoadError);
    });

    it('should include file path in validation error message', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });

      const invalidSchema = `
name: invalid
version: 1
artifacts:
  - id: broken
`;
      const schemaPath = path.join(userSchemaDir, 'schema.yaml');
      fs.writeFileSync(schemaPath, invalidSchema);

      try {
        resolveSchema('spec-driven');
        expect.fail('Should have thrown');
      } catch (e) {
        const error = e as SchemaLoadError;
        expect(error.message).toContain(schemaPath);
        expect(error.schemaPath).toBe(schemaPath);
        expect(error.cause).toBeDefined();
      }
    });

    it('should detect cycles in user override schemas', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });

      // Create a schema with cyclic dependencies
      const cyclicSchema = `
name: cyclic
version: 1
artifacts:
  - id: a
    generates: a.md
    description: A
    template: a.md
    requires: [b]
  - id: b
    generates: b.md
    description: B
    template: b.md
    requires: [a]
`;
      fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), cyclicSchema);

      expect(() => resolveSchema('spec-driven')).toThrow(/Cyclic dependency/);
    });

    it('should detect invalid requires references in user override schemas', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });

      // Create a schema with invalid requires reference
      const invalidRefSchema = `
name: invalid-ref
version: 1
artifacts:
  - id: a
    generates: a.md
    description: A
    template: a.md
    requires: [nonexistent]
`;
      fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), invalidRefSchema);

      expect(() => resolveSchema('spec-driven')).toThrow(/does not exist/);
    });

    it('should throw SchemaLoadError on YAML syntax errors', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });

      // Create malformed YAML
      const malformedYaml = `
name: bad
version: [[[invalid yaml
`;
      const schemaPath = path.join(userSchemaDir, 'schema.yaml');
      fs.writeFileSync(schemaPath, malformedYaml);

      try {
        resolveSchema('spec-driven');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SchemaLoadError);
        const error = e as SchemaLoadError;
        expect(error.message).toContain('Failed to parse');
        expect(error.message).toContain(schemaPath);
      }
    });

    it('should fall back to built-in when user override not found', () => {
      process.env.XDG_DATA_HOME = tempDir;
      // Don't create any user schemas

      const schema = resolveSchema('spec-driven');

      expect(schema.name).toBe('spec-driven');
      expect(schema.version).toBe(1);
    });

    it('should throw when schema not found', () => {
      expect(() => resolveSchema('nonexistent-schema')).toThrow(/not found/);
    });

    it('should list available schemas in error message', () => {
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

    it('should include user override schemas', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'custom-workflow');
      fs.mkdirSync(userSchemaDir, { recursive: true });
      fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), 'name: custom\nversion: 1\nartifacts: []');

      const schemas = listSchemas();

      expect(schemas).toContain('custom-workflow');
      expect(schemas).toContain('spec-driven');
    });

    it('should deduplicate schemas with same name', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });
      // Override spec-driven
      fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), 'name: custom\nversion: 1\nartifacts: []');

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

    it('should only include directories with schema.yaml', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemasBase = path.join(tempDir, 'openspec', 'schemas');

      // Create a directory without schema.yaml
      const emptyDir = path.join(userSchemasBase, 'empty-dir');
      fs.mkdirSync(emptyDir, { recursive: true });

      // Create a valid schema directory
      const validDir = path.join(userSchemasBase, 'valid-schema');
      fs.mkdirSync(validDir, { recursive: true });
      fs.writeFileSync(path.join(validDir, 'schema.yaml'), 'name: valid\nversion: 1\nartifacts: []');

      const schemas = listSchemas();

      expect(schemas).toContain('valid-schema');
      expect(schemas).not.toContain('empty-dir');
    });
  });
});
