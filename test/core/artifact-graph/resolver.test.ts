import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  resolveSchema,
  listSchemas,
  listSchemasWithInfo,
  SchemaLoadError,
  getSchemaDir,
  getPackageSchemasDir,
  getProjectSchemasDir,
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

  describe('getProjectSchemasDir', () => {
    it('should return openspec/schemas relative to cwd', () => {
      const projectDir = getProjectSchemasDir();
      expect(projectDir).toBe(path.join(process.cwd(), 'openspec', 'schemas'));
    });

    it('should return correct path when cwd changes', () => {
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/mock/project');
      try {
        const projectDir = getProjectSchemasDir();
        expect(projectDir).toBe('/mock/project/openspec/schemas');
      } finally {
        cwdSpy.mockRestore();
      }
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

    it('should prefer project-local directory over user override', () => {
      // Set up user override
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(userSchemaDir, 'schema.yaml'),
        'name: user-override\nversion: 1\nartifacts: []'
      );

      // Set up project-local
      const projectSchemaDir = path.join(tempDir, 'project', 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(projectSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectSchemaDir, 'schema.yaml'),
        'name: project-local\nversion: 1\nartifacts: []'
      );

      // Mock cwd to point to project directory
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.join(tempDir, 'project'));
      try {
        const dir = getSchemaDir('spec-driven');
        expect(dir).toBe(projectSchemaDir);
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('should fall back to user override when project-local not found', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'my-schema');
      fs.mkdirSync(userSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(userSchemaDir, 'schema.yaml'),
        'name: user-schema\nversion: 1\nartifacts: []'
      );

      // Project-local does not have this schema
      const projectDir = path.join(tempDir, 'project', 'openspec', 'schemas');
      fs.mkdirSync(projectDir, { recursive: true });

      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.join(tempDir, 'project'));
      try {
        const dir = getSchemaDir('my-schema');
        expect(dir).toBe(userSchemaDir);
      } finally {
        cwdSpy.mockRestore();
      }
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

    it('should include project-local schemas', () => {
      const projectDir = path.join(tempDir, 'project', 'openspec', 'schemas', 'project-schema');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectDir, 'schema.yaml'),
        'name: project-schema\nversion: 1\nartifacts: []'
      );

      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.join(tempDir, 'project'));
      try {
        const schemas = listSchemas();
        expect(schemas).toContain('project-schema');
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('should deduplicate project-local schemas with same name as user/package schemas', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });
      fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), 'name: user\nversion: 1\nartifacts: []');

      const projectSchemaDir = path.join(tempDir, 'project', 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(projectSchemaDir, { recursive: true });
      fs.writeFileSync(path.join(projectSchemaDir, 'schema.yaml'), 'name: project\nversion: 1\nartifacts: []');

      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.join(tempDir, 'project'));
      try {
        const schemas = listSchemas();
        const count = schemas.filter((s) => s === 'spec-driven').length;
        expect(count).toBe(1);
      } finally {
        cwdSpy.mockRestore();
      }
    });
  });

  describe('listSchemasWithInfo', () => {
    it('should return schema info with source field', () => {
      const schemas = listSchemasWithInfo();

      expect(schemas.length).toBeGreaterThan(0);
      const specDriven = schemas.find((s) => s.name === 'spec-driven');
      expect(specDriven).toBeDefined();
      expect(specDriven?.source).toBe('package');
      expect(specDriven?.description).toBeDefined();
      expect(specDriven?.artifacts).toBeDefined();
      expect(Array.isArray(specDriven?.artifacts)).toBe(true);
    });

    it('should mark user override schemas with source "user"', () => {
      process.env.XDG_DATA_HOME = tempDir;
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'user-custom');
      fs.mkdirSync(userSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(userSchemaDir, 'schema.yaml'),
        `name: user-custom
version: 1
description: A custom user schema
artifacts:
  - id: artifact1
    generates: artifact1.md
    description: First artifact
    template: artifact1.md
`
      );

      const schemas = listSchemasWithInfo();

      const userSchema = schemas.find((s) => s.name === 'user-custom');
      expect(userSchema).toBeDefined();
      expect(userSchema?.source).toBe('user');
      expect(userSchema?.description).toBe('A custom user schema');
      expect(userSchema?.artifacts).toContain('artifact1');
    });

    it('should mark project-local schemas with source "project"', () => {
      const projectSchemaDir = path.join(tempDir, 'project', 'openspec', 'schemas', 'project-custom');
      fs.mkdirSync(projectSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectSchemaDir, 'schema.yaml'),
        `name: project-custom
version: 1
description: A project-local schema
artifacts:
  - id: task
    generates: task.md
    description: Task artifact
    template: task.md
`
      );

      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.join(tempDir, 'project'));
      try {
        const schemas = listSchemasWithInfo();

        const projectSchema = schemas.find((s) => s.name === 'project-custom');
        expect(projectSchema).toBeDefined();
        expect(projectSchema?.source).toBe('project');
        expect(projectSchema?.description).toBe('A project-local schema');
        expect(projectSchema?.artifacts).toContain('task');
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('should give project-local schemas highest precedence', () => {
      process.env.XDG_DATA_HOME = tempDir;

      // Create user override for spec-driven
      const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(userSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(userSchemaDir, 'schema.yaml'),
        `name: spec-driven
version: 1
description: User override
artifacts:
  - id: user-artifact
    generates: user.md
    description: User artifact
    template: user.md
`
      );

      // Create project-local for spec-driven
      const projectSchemaDir = path.join(tempDir, 'project', 'openspec', 'schemas', 'spec-driven');
      fs.mkdirSync(projectSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectSchemaDir, 'schema.yaml'),
        `name: spec-driven
version: 1
description: Project local
artifacts:
  - id: project-artifact
    generates: project.md
    description: Project artifact
    template: project.md
`
      );

      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.join(tempDir, 'project'));
      try {
        const schemas = listSchemasWithInfo();

        const specDriven = schemas.find((s) => s.name === 'spec-driven');
        expect(specDriven).toBeDefined();
        expect(specDriven?.source).toBe('project');
        expect(specDriven?.description).toBe('Project local');
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('should return sorted list', () => {
      const schemas = listSchemasWithInfo();

      const names = schemas.map((s) => s.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it('should skip invalid schemas silently', () => {
      const projectSchemaDir = path.join(tempDir, 'project', 'openspec', 'schemas', 'invalid-schema');
      fs.mkdirSync(projectSchemaDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectSchemaDir, 'schema.yaml'),
        'not valid yaml: [[[invalid'
      );

      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(path.join(tempDir, 'project'));
      try {
        // Should not throw
        const schemas = listSchemasWithInfo();
        expect(schemas.find((s) => s.name === 'invalid-schema')).toBeUndefined();
      } finally {
        cwdSpy.mockRestore();
      }
    });
  });
});
