import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { validateSchemaDirectory } from '../../../src/core/artifact-graph/schema-directory.js';

function schemaYaml(name: string, template = 'proposal.md'): string {
  return `name: ${name}
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: ${template}
    requires: []
`;
}

describe('validateSchemaDirectory', () => {
  let schemaDir: string;

  beforeEach(() => {
    schemaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-directory-'));
  });

  afterEach(() => {
    fs.rmSync(schemaDir, { recursive: true, force: true });
  });

  it('returns a parsed remote schema only when templates stay in templates/', () => {
    fs.mkdirSync(path.join(schemaDir, 'templates'));
    fs.writeFileSync(path.join(schemaDir, 'schema.yaml'), schemaYaml('qeda-sdd'));
    fs.writeFileSync(path.join(schemaDir, 'templates', 'proposal.md'), '# Proposal\n');

    expect(
      validateSchemaDirectory(schemaDir, {
        expectedName: 'qeda-sdd',
        requireTemplatesDirectory: true,
      }).schema.name
    ).toBe('qeda-sdd');
  });

  it('accepts nested template paths inside templates/', () => {
    fs.mkdirSync(path.join(schemaDir, 'templates', 'nested'), { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      schemaYaml('qeda-sdd', 'nested/proposal.md')
    );
    fs.writeFileSync(
      path.join(schemaDir, 'templates', 'nested', 'proposal.md'),
      '# Proposal\n'
    );

    expect(
      validateSchemaDirectory(schemaDir, {
        expectedName: 'qeda-sdd',
        requireTemplatesDirectory: true,
      }).templatePaths.proposal
    ).toBe(path.join(schemaDir, 'templates', 'nested', 'proposal.md'));
  });

  it.each([
    ['missing schema', false, true, 'proposal.md', /schema.yaml not found/],
    ['missing templates directory', true, false, 'proposal.md', /templates directory not found/],
    ['missing referenced template', true, true, 'missing.md', /Template file 'missing.md' not found/],
    ['parent template escape', true, true, '../outside.md', /unsafe template path/],
    ['absolute template escape', true, true, '/outside.md', /unsafe template path/],
    ['backslash template path', true, true, String.raw`nested\proposal.md`, /unsafe template path/],
  ])('rejects %s', (_name, withSchema, withTemplates, template, expected) => {
    if (withSchema) {
      fs.writeFileSync(path.join(schemaDir, 'schema.yaml'), schemaYaml('qeda-sdd', template));
    }
    if (withTemplates) {
      fs.mkdirSync(path.join(schemaDir, 'templates'));
    }
    expect(() =>
      validateSchemaDirectory(schemaDir, {
        expectedName: 'qeda-sdd',
        requireTemplatesDirectory: true,
      })
    ).toThrow(expected);
  });

  it('rejects schema and template symlinks', (ctx) => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-outside-'));
    fs.writeFileSync(path.join(outsideDir, 'schema.yaml'), schemaYaml('qeda-sdd'));
    fs.writeFileSync(path.join(outsideDir, 'proposal.md'), '# Proposal\n');
    try {
      fs.symlinkSync(path.join(outsideDir, 'schema.yaml'), path.join(schemaDir, 'schema.yaml'));
      fs.mkdirSync(path.join(schemaDir, 'templates'));
      fs.symlinkSync(
        path.join(outsideDir, 'proposal.md'),
        path.join(schemaDir, 'templates', 'proposal.md')
      );
    } catch {
      fs.rmSync(outsideDir, { recursive: true, force: true });
      ctx.skip();
      return;
    }

    try {
      expect(() =>
        validateSchemaDirectory(schemaDir, {
          expectedName: 'qeda-sdd',
          requireTemplatesDirectory: true,
        })
      ).toThrow(/schema.yaml must be a regular file/);

      fs.rmSync(path.join(schemaDir, 'schema.yaml'));
      fs.writeFileSync(path.join(schemaDir, 'schema.yaml'), schemaYaml('qeda-sdd'));
      expect(() =>
        validateSchemaDirectory(schemaDir, {
          expectedName: 'qeda-sdd',
          requireTemplatesDirectory: true,
        })
      ).toThrow(/Template file 'proposal.md' not found/);
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('rejects a bundle whose parsed schema name conflicts with the declaration', () => {
    fs.mkdirSync(path.join(schemaDir, 'templates'));
    fs.writeFileSync(path.join(schemaDir, 'schema.yaml'), schemaYaml('other-name'));
    fs.writeFileSync(path.join(schemaDir, 'templates', 'proposal.md'), '# Proposal\n');

    expect(() =>
      validateSchemaDirectory(schemaDir, {
        expectedName: 'qeda-sdd',
        requireTemplatesDirectory: true,
      })
    ).toThrow(/declared as 'qeda-sdd'.*name is 'other-name'/);
  });
});
