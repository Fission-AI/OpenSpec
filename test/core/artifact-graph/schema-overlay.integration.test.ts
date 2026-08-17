import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  getSchemaDir,
  listSchemasWithInfo,
  resolveSchema,
  resolveSchemaSources,
  resolveSchemaTemplate,
  SchemaLoadError,
} from '../../../src/core/artifact-graph/resolver.js';

describe('layered global schema overlays', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-overlay-test-'))
    );
    originalEnv = { ...process.env };
    process.env.XDG_DATA_HOME = tempDir;
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeOverlay(content: string): string {
    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(path.join(schemaDir, 'schema.override.yaml'), content);
    return schemaDir;
  }

  it('composes a user overlay with the package schema', () => {
    writeOverlay(`
patchVersion: 1
artifacts:
  tasks:
    instruction:
      append: Personal global task rule
`);

    const sources = resolveSchemaSources('spec-driven');
    const schema = resolveSchema('spec-driven');

    expect(sources?.mode).toBe('package-with-user-overlay');
    expect(getSchemaDir('spec-driven')).toBe(sources?.base.dir);
    expect(schema.artifacts.find((artifact) => artifact.id === 'tasks')?.instruction)
      .toContain('Personal global task rule');
    expect(schema.artifacts.find((artifact) => artifact.id === 'proposal')?.instruction)
      .toContain('Create the proposal document');
  });

  it('keeps a project schema authoritative over conflicting user customizations', () => {
    const userSchemaDir = writeOverlay('patchVersion: 1\ndescription: User overlay\n');
    fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), `
name: spec-driven
version: 1
description: Complete user schema
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`);
    const projectRoot = path.join(tempDir, 'project');
    const projectSchemaDir = path.join(projectRoot, 'openspec', 'schemas', 'spec-driven');
    fs.mkdirSync(projectSchemaDir, { recursive: true });
    fs.writeFileSync(path.join(projectSchemaDir, 'schema.yaml'), `
name: spec-driven
version: 1
description: Project schema
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`);

    expect(resolveSchemaSources('spec-driven', projectRoot)?.mode).toBe('project');
    expect(resolveSchema('spec-driven', projectRoot).description).toBe('Project schema');
  });

  it('rejects simultaneous complete user replacement and layered override', () => {
    const userSchemaDir = writeOverlay('patchVersion: 1\n');
    fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), `
name: spec-driven
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`);

    expect(() => resolveSchemaSources('spec-driven')).toThrow(SchemaLoadError);
    expect(() => resolveSchemaSources('spec-driven')).toThrow(/both a complete user replacement/u);
  });

  it('rejects an overlay with no packaged base', () => {
    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'custom');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(path.join(schemaDir, 'schema.override.yaml'), 'patchVersion: 1\n');

    expect(() => resolveSchemaSources('custom')).toThrow(/no packaged schema/u);
  });

  it('lists effective composed metadata and overlay source', () => {
    writeOverlay('patchVersion: 1\ndescription: Personal effective schema\n');

    const info = listSchemasWithInfo().find((schema) => schema.name === 'spec-driven');
    expect(info).toMatchObject({
      name: 'spec-driven',
      description: 'Personal effective schema',
      source: 'package',
      overlay: { source: 'user' },
    });
  });

  it('uses a user template when present and package fallback otherwise', () => {
    const userSchemaDir = writeOverlay('patchVersion: 1\n');
    const templatesDir = path.join(userSchemaDir, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, 'tasks.md'), '# Personal tasks\n');

    const tasks = resolveSchemaTemplate('spec-driven', 'tasks.md');
    const proposal = resolveSchemaTemplate('spec-driven', 'proposal.md');

    expect(tasks.source).toBe('user');
    expect(tasks.path).toBe(
      fs.realpathSync.native(path.join(templatesDir, 'tasks.md'))
    );
    expect(fs.readFileSync(tasks.path, 'utf-8')).toContain('Personal tasks');
    expect(proposal.source).toBe('package');
  });

  it('rejects a user template symlink that escapes the overlay template root', () => {
    if (process.platform === 'win32') return;

    const userSchemaDir = writeOverlay('patchVersion: 1\n');
    const templatesDir = path.join(userSchemaDir, 'templates');
    const outsideTemplate = path.join(tempDir, 'outside-tasks.md');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(outsideTemplate, '# Outside\n');
    fs.symlinkSync(outsideTemplate, path.join(templatesDir, 'tasks.md'));

    expect(() => resolveSchemaTemplate('spec-driven', 'tasks.md')).toThrow(
      /outside the allowed directory/u
    );
  });

  it('does not give complete user replacements package template fallback', () => {
    const userSchemaDir = path.join(tempDir, 'openspec', 'schemas', 'spec-driven');
    fs.mkdirSync(userSchemaDir, { recursive: true });
    fs.writeFileSync(path.join(userSchemaDir, 'schema.yaml'), `
name: spec-driven
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
`);

    expect(resolveSchemaSources('spec-driven')?.mode).toBe('user-replacement');
    expect(() => resolveSchemaTemplate('spec-driven', 'proposal.md')).toThrow(
      /Template not found/u
    );
  });
});
